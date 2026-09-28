package com.tmgl.league.ui.viewmodel

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.model.CourseHole
import com.tmgl.league.data.model.HoleScoreInput
import com.tmgl.league.data.model.ScoreCalculations
import com.tmgl.league.data.model.ScorecardHoleWrite
import com.tmgl.league.data.model.ScorecardStatus
import com.tmgl.league.data.offline.OfflineScoreQueue
import com.tmgl.league.data.offline.PendingScore
import com.tmgl.league.data.repository.CompetitionRepository
import com.tmgl.league.data.repository.CurrentPlayerRepository
import com.tmgl.league.data.repository.DataResult
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HoleEntry(
    val holeNumber: Int,
    val par: Int,
    val score: Int? = null
)

data class FastScoringUiState(
    val currentHole: Int = 1,
    val totalHoles: Int = 18,
    val courseHoles: List<CourseHole> = emptyList(),
    val entries: List<HoleEntry> = emptyList(),
    val selectedScore: Int? = null,
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val isComplete: Boolean = false,
    val isQueuedOffline: Boolean = false,
    val scorecardId: String? = null,
    val roundId: String? = null,
    val totalStrokes: Int = 0,
    val totalToPar: Int = 0,
    val errorMsg: String? = null
)

@HiltViewModel
class FastScoringViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val competitionRepository: CompetitionRepository,
    private val currentPlayerRepository: CurrentPlayerRepository,
    private val encryptedStorage: EncryptedAuthStorage
) : ViewModel() {

    private val _uiState = MutableStateFlow(FastScoringUiState())
    val uiState: StateFlow<FastScoringUiState> = _uiState

    private var scorecardId: String? = null

    fun startScoring(roundId: String?, matchId: String?) {
        if (_uiState.value.isLoading) return
        _uiState.value = _uiState.value.copy(isLoading = true, errorMsg = null)
        viewModelScope.launch {
            try {
                val resolvedRoundId = resolveRoundId(roundId, matchId)
                if (resolvedRoundId.isNullOrBlank()) {
                    fail("Select a round before entering scores.")
                    return@launch
                }
                val playerId = currentPlayerRepository.getCurrentPlayerId()
                if (playerId.isNullOrBlank()) {
                    fail("No player record is linked to this account.")
                    return@launch
                }
                val courseId = when (val course = competitionRepository.getCourseIdForRound(resolvedRoundId)) {
                    is DataResult.Success -> course.data
                    is DataResult.Error -> null
                }
                val scorecard = when (
                    val result = competitionRepository.getOrCreateScorecard(
                        roundId = resolvedRoundId,
                        playerId = playerId,
                        courseId = courseId
                    )
                ) {
                    is DataResult.Success -> result.data
                    is DataResult.Error -> {
                        fail(result.message)
                        return@launch
                    }
                }
                scorecardId = scorecard.id
                val pars = competitionRepository.getCoursePars(scorecard.courseId ?: courseId)
                val existing = when (val holes = competitionRepository.getScorecardHoles(scorecard.id)) {
                    is DataResult.Success -> holes.data
                    is DataResult.Error -> emptyList()
                }
                val holeCount = if (pars.isNotEmpty()) pars.size else DEFAULT_HOLE_COUNT
                _uiState.value = FastScoringUiState(
                    currentHole = 1,
                    totalHoles = holeCount,
                    entries = existing.filter { it.score > 0 }.map { hole ->
                        HoleEntry(
                            holeNumber = hole.holeNumber,
                            par = pars[hole.holeNumber] ?: DEFAULT_PAR,
                            score = hole.score
                        )
                    },
                    scorecardId = scorecard.id,
                    roundId = resolvedRoundId,
                    totalStrokes = existing.sumOf { it.score },
                    totalToPar = existing.sumOf { it.score - (pars[it.holeNumber] ?: DEFAULT_PAR) },
                    isLoading = false
                )
            } catch (e: Exception) {
                fail(e.message ?: "Unable to start scoring")
            }
        }
    }

    fun selectScore(score: Int) {
        if (!ScoreCalculations.isValidScore(score)) return
        _uiState.value = _uiState.value.copy(selectedScore = score, errorMsg = null)
    }

    fun selectHole(holeNumber: Int) {
        val state = _uiState.value
        if (holeNumber !in 1..state.totalHoles) return
        val entry = state.entries.find { it.holeNumber == holeNumber }
        _uiState.value = state.copy(
            currentHole = holeNumber,
            selectedScore = entry?.score,
            errorMsg = null
        )
    }

    fun saveAndNext() {
        val state = _uiState.value
        val score = state.selectedScore
        if (score == null) {
            _uiState.value = state.copy(errorMsg = "Select a score for this hole")
            return
        }
        val par = parsFor(state, state.currentHole)
        val updatedEntries = state.entries
            .filterNot { it.holeNumber == state.currentHole }
            .plus(HoleEntry(holeNumber = state.currentHole, par = par, score = score))
            .sortedBy { it.holeNumber }
        val totals = ScoreCalculations.totals(
            updatedEntries.filter { it.score != null }.map { HoleScoreInput(it.holeNumber, it.par, it.score ?: 0) }
        )
        if (state.currentHole < state.totalHoles) {
            _uiState.value = state.copy(
                currentHole = state.currentHole + 1,
                entries = updatedEntries,
                selectedScore = null,
                totalStrokes = totals.totalStrokes,
                totalToPar = totals.totalToPar,
                errorMsg = null
            )
        } else {
            _uiState.value = state.copy(
                entries = updatedEntries,
                totalStrokes = totals.totalStrokes,
                totalToPar = totals.totalToPar,
                selectedScore = null,
                isSaving = true,
                errorMsg = null
            )
            submitScores()
        }
    }

    fun previousHole() {
        val state = _uiState.value
        if (state.currentHole <= 1) return
        val target = state.currentHole - 1
        selectHole(target)
    }

    fun syncPendingScores() {
        viewModelScope.launch {
            val summary = OfflineScoreQueue.syncAll(context, encryptedStorage) { scorecard ->
                competitionRepository.recalculateScorecardTotals(scorecard, ScorecardStatus.SUBMITTED)
            }
            if (summary.synced > 0) {
                _uiState.value = _uiState.value.copy(
                    isQueuedOffline = false,
                    errorMsg = null
                )
            }
            val pending = OfflineScoreQueue.pendingCount.value
            if (pending > 0) {
                _uiState.value = _uiState.value.copy(
                    errorMsg = "${OfflineScoreQueue.lastError.value ?: "Scores waiting to sync"} ($pending pending)"
                )
            }
        }
    }

    fun shareScore() {
        val state = _uiState.value
        val shareText = buildString {
            appendLine("TMGL Scorecard")
            state.entries.filter { it.score != null }.forEach { entry ->
                val score = entry.score ?: 0
                appendLine(
                    "Hole ${entry.holeNumber} (Par ${entry.par}): $score " +
                        ScoreCalculations.holeLabel(score, entry.par)
                )
            }
            appendLine("Total: ${state.totalStrokes} (${ScoreCalculations.toParLabel(state.totalToPar)})")
        }
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_TEXT, shareText)
            type = "text/plain"
        }
        val chooser = Intent.createChooser(sendIntent, "Share Scorecard")
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(chooser)
    }

    private fun submitScores() {
        val state = _uiState.value
        val cardId = scorecardId
        if (cardId.isNullOrBlank()) {
            fail("No scorecard is available for this round")
            return
        }
        val writes = state.entries
            .filter { it.score != null }
            .map { ScorecardHoleWrite(cardId, it.holeNumber, it.score ?: 0, parsFor(state, it.holeNumber)) }
        viewModelScope.launch {
            when (val result = competitionRepository.upsertScorecardHoles(writes)) {
                is DataResult.Success -> {
                    val update = competitionRepository.updateScorecard(
                        scorecardId = cardId,
                        totalStrokes = state.totalStrokes,
                        totalScoreToPar = state.totalToPar,
                        status = ScorecardStatus.SUBMITTED
                    )
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        isComplete = true,
                        errorMsg = if (update is DataResult.Error) update.message else null
                    )
                }
                is DataResult.Error -> {
                    OfflineScoreQueue.addAll(
                        context,
                        writes.map { PendingScore(scorecardId = it.scorecardId, holeNumber = it.holeNumber, score = it.score, par = it.par) }
                    )
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        isComplete = true,
                        isQueuedOffline = true,
                        errorMsg = "Saved offline. Scores will sync when you are back online."
                    )
                }
            }
        }
    }

    private suspend fun resolveRoundId(roundId: String?, matchId: String?): String? {
        if (!roundId.isNullOrBlank()) return roundId
        if (matchId.isNullOrBlank()) return null
        return when (val result = competitionRepository.getRoundIdForMatch(matchId)) {
            is DataResult.Success -> result.data
            is DataResult.Error -> null
        }
    }

    private fun parsFor(state: FastScoringUiState, holeNumber: Int): Int {
        val coursePar = state.courseHoles.find { it.holeNumber == holeNumber }?.par
        val entryPar = state.entries.find { it.holeNumber == holeNumber }?.par
        return coursePar ?: entryPar ?: DEFAULT_PAR
    }

    private fun fail(message: String) {
        _uiState.value = _uiState.value.copy(isLoading = false, isSaving = false, errorMsg = message)
    }

    private companion object {
        const val DEFAULT_PAR = 4
        const val DEFAULT_HOLE_COUNT = 18
    }
}
