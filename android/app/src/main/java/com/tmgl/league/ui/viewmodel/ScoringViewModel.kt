package com.tmgl.league.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.ScorecardHole
import com.tmgl.league.data.model.ScorecardStatus
import com.tmgl.league.data.model.ScoringTarget
import com.tmgl.league.data.offline.OfflineScoreQueue
import com.tmgl.league.data.offline.PendingScore
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.CompetitionRepository
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.isRetryableWriteError
import com.tmgl.league.data.scoring.CompletionCheck
import com.tmgl.league.data.scoring.ExpectedHole
import com.tmgl.league.data.scoring.MAX_STROKES
import com.tmgl.league.data.scoring.buildScorecardHoles
import com.tmgl.league.data.scoring.expectedHoles
import com.tmgl.league.data.scoring.isValidStrokes
import com.tmgl.league.data.scoring.nextStatus
import com.tmgl.league.data.scoring.statusWireValue
import com.tmgl.league.data.scoring.validateCompletion
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val AUTOSAVE_DELAY_MS = 1200L

data class ScoringUiState(
    val isLoading: Boolean = true,
    val target: ScoringTarget = ScoringTarget.None,
    val scorecardId: String? = null,
    val expectedHoles: List<ExpectedHole> = emptyList(),
    val strokes: Map<Int, Int?> = emptyMap(),
    val isSaving: Boolean = false,
    val hasUnsavedChanges: Boolean = false,
    val isPendingSync: Boolean = false,
    val message: String? = null,
    val errorMessage: String? = null
) {
    val completion: CompletionCheck
        get() = validateCompletion(expectedHoles, strokes)

    val enteredCount: Int
        get() = completion.enteredHoleCount

    val canSubmit: Boolean
        get() = scorecardId != null && completion.isComplete && !isSaving
}

private data class SaveOutcome(val pendingSync: Boolean, val failure: String?)

@HiltViewModel
class ScoringViewModel @Inject constructor(
    private val repository: CompetitionRepository,
    private val authRepository: AuthRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(ScoringUiState())
    val uiState: StateFlow<ScoringUiState> = _uiState.asStateFlow()

    private var autosaveJob: Job? = null
    private var loadedScorecardStatus: ScorecardStatus = ScorecardStatus.DRAFT

    fun load(requested: ScoringTarget) {
        if (!requested.isResolvable) {
            fail("No round or match was provided for score entry.")
            return
        }
        viewModelScope.launch {
            _uiState.value = ScoringUiState(isLoading = true)
            val profileId = requested.playerId.ifBlank { authRepository.currentUserId().orEmpty() }
            if (profileId.isBlank()) {
                fail("Sign in before entering scores")
                return@launch
            }

            val playerId = when (val result = repository.resolvePlayerId(profileId)) {
                is DataResult.Success -> result.data
                is DataResult.Error -> {
                    fail(result.message)
                    return@launch
                }
            }

            val matchId = requested.matchId?.takeIf { it.isNotBlank() }
            val roundId = when {
                requested.hasRound -> requested.roundId
                matchId != null -> when (val result = repository.getMatch(matchId)) {
                    is DataResult.Success -> result.data.roundId
                    is DataResult.Error -> {
                        fail(result.message)
                        return@launch
                    }
                }
                else -> ""
            }

            if (roundId.isBlank() && !requested.hasScorecard) {
                fail("This match is not linked to a tournament round")
                return@launch
            }

            val scorecard = when {
                requested.hasScorecard -> {
                    val scorecardId = requireNotNull(requested.scorecardId)
                    when (val result = repository.getScorecard(scorecardId)) {
                        is DataResult.Success -> result.data
                        is DataResult.Error -> {
                            fail(result.message)
                            return@launch
                        }
                    }
                }
                else -> when (val result = repository.getOrCreateScorecard(roundId, playerId, matchId)) {
                    is DataResult.Success -> result.data
                    is DataResult.Error -> {
                        fail(result.message)
                        return@launch
                    }
                }
            }

            val expected = when (val result = repository.getExpectedHoles(scorecard.roundId)) {
                is DataResult.Success -> result.data
                is DataResult.Error -> expectedHoles()
            }

            val persisted = when (val result = repository.getScorecardHoles(scorecard.id)) {
                is DataResult.Success -> result.data
                is DataResult.Error -> emptyList()
            }

            loadedScorecardStatus = scorecard.status
            _uiState.value = ScoringUiState(
                isLoading = false,
                target = requested
                    .withPlayer(playerId)
                    .withRound(scorecard.roundId)
                    .withScorecard(scorecard.id),
                scorecardId = scorecard.id,
                expectedHoles = expected,
                strokes = expected.associate { hole ->
                    hole.holeNumber to (
                        OfflineScoreQueue.pendingFor(scorecard.id, hole.holeNumber)?.strokes
                            ?: persisted.firstOrNull { it.holeNumber == hole.holeNumber }?.strokes
                        )
                },
                isPendingSync = expected.any { OfflineScoreQueue.pendingFor(scorecard.id, it.holeNumber) != null }
            )
        }
    }

    fun setStrokes(holeNumber: Int, strokes: Int?) {
        val current = _uiState.value
        if (current.expectedHoles.none { it.holeNumber == holeNumber }) return
        if (strokes != null && (strokes < 1 || strokes > MAX_STROKES)) return
        _uiState.value = current.copy(
            strokes = current.strokes.toMutableMap().apply { put(holeNumber, strokes) },
            hasUnsavedChanges = true,
            errorMessage = null
        )
        scheduleAutosave()
    }

    fun submit() {
        autosaveJob?.cancel()
        persist(submitting = true, silent = false)
    }

    fun saveDraft() {
        autosaveJob?.cancel()
        persist(submitting = false, silent = false)
    }

    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null, errorMessage = null)
    }

    override fun onCleared() {
        autosaveJob?.cancel()
        super.onCleared()
    }

    private fun scheduleAutosave() {
        autosaveJob?.cancel()
        autosaveJob = viewModelScope.launch {
            delay(AUTOSAVE_DELAY_MS)
            persist(submitting = false, silent = true)
        }
    }

    private fun persist(submitting: Boolean, silent: Boolean) {
        val state = _uiState.value
        val scorecardId = state.scorecardId
        if (scorecardId == null) return
        if (state.strokes.values.none { isValidStrokes(it) }) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true)
            val check = state.completion
            val rows = buildScorecardHoles(scorecardId, state.expectedHoles, state.strokes)
            val status = nextStatus(check, loadedScorecardStatus, submitting)
            val outcome = saveRows(scorecardId, rows, status)
            _uiState.value = _uiState.value.copy(
                isSaving = false,
                hasUnsavedChanges = false,
                isPendingSync = outcome.pendingSync,
                errorMessage = outcome.failure
                    ?: if (submitting && !check.isComplete) check.missingHolesMessage() else null,
                message = when {
                    outcome.failure != null -> null
                    silent -> null
                    outcome.pendingSync -> "Saved on this device. It will sync when you are online."
                    status == ScorecardStatus.SUBMITTED -> "Scorecard submitted."
                    else -> "Progress saved."
                }
            )
        }
    }

    private suspend fun saveRows(
        scorecardId: String,
        rows: List<ScorecardHole>,
        status: ScorecardStatus
    ): SaveOutcome {
        return when (val result = repository.saveScorecardHoles(scorecardId, rows)) {
            is DataResult.Error -> {
                if (isRetryableWriteError(result.message)) {
                    enqueue(scorecardId, rows, status)
                    SaveOutcome(pendingSync = true, failure = null)
                } else {
                    SaveOutcome(pendingSync = false, failure = result.message)
                }
            }
            is DataResult.Success -> when (val statusResult = repository.updateScorecardStatus(scorecardId, status)) {
                is DataResult.Success -> {
                    loadedScorecardStatus = status
                    SaveOutcome(pendingSync = OfflineScoreQueue.hasPending(scorecardId), failure = null)
                }
                is DataResult.Error -> {
                    if (isRetryableWriteError(statusResult.message)) {
                        enqueue(scorecardId, rows, status)
                        SaveOutcome(pendingSync = true, failure = null)
                    } else {
                        SaveOutcome(pendingSync = false, failure = statusResult.message)
                    }
                }
            }
        }
    }

    private suspend fun enqueue(
        scorecardId: String,
        rows: List<ScorecardHole>,
        status: ScorecardStatus
    ) {
        if (rows.isEmpty()) return
        val now = System.currentTimeMillis()
        OfflineScoreQueue.enqueue(
            context,
            rows.map { hole ->
                PendingScore(
                    scorecardId = scorecardId,
                    holeNumber = hole.holeNumber,
                    par = hole.par,
                    strokes = hole.strokes,
                    scoreToPar = hole.scoreToPar,
                    status = statusWireValue(status),
                    timestamp = now
                )
            }
        )
    }

    private fun fail(message: String) {
        _uiState.value = ScoringUiState(isLoading = false, errorMessage = message)
    }
}
