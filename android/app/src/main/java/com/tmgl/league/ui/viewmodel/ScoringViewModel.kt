package com.tmgl.league.ui.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.auth.EncryptedAuthStorage
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

data class ScoringHole(
    val holeNumber: Int,
    val par: Int,
    val scoreText: String = ""
) {
    val score: Int? get() = scoreText.toIntOrNull()?.takeIf { ScoreCalculations.isValidScore(it) }
}

data class ScoringUiState(
    val isLoading: Boolean = true,
    val isSubmitting: Boolean = false,
    val roundId: String? = null,
    val matchId: String? = null,
    val scorecardId: String? = null,
    val holes: List<ScoringHole> = emptyList(),
    val totalStrokes: Int = 0,
    val totalToPar: Int = 0,
    val message: String? = null,
    val error: String? = null,
    val isQueuedOffline: Boolean = false
)

@HiltViewModel
class ScoringViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val competitionRepository: CompetitionRepository,
    private val currentPlayerRepository: CurrentPlayerRepository,
    private val encryptedStorage: EncryptedAuthStorage
) : ViewModel() {

    private val _uiState = MutableStateFlow(ScoringUiState())
    val uiState: StateFlow<ScoringUiState> = _uiState

    fun load(roundId: String?, matchId: String?) {
        if (_uiState.value.isLoading && _uiState.value.scorecardId != null) return
        _uiState.value = ScoringUiState(isLoading = true, roundId = roundId, matchId = matchId)
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
                        courseId = courseId,
                        matchId = matchId
                    )
                ) {
                    is DataResult.Success -> result.data
                    is DataResult.Error -> {
                        fail(result.message)
                        return@launch
                    }
                }
                val pars = competitionRepository.getCoursePars(scorecard.courseId ?: courseId)
                val existing = when (val holes = competitionRepository.getScorecardHoles(scorecard.id)) {
                    is DataResult.Success -> holes.data
                    is DataResult.Error -> emptyList()
                }
                val holeCount = if (pars.isNotEmpty()) pars.size else DEFAULT_HOLE_COUNT
                val entries = (1..holeCount).map { hole ->
                    ScoringHole(
                        holeNumber = hole,
                        par = pars[hole] ?: DEFAULT_PAR,
                        scoreText = existing.find { it.holeNumber == hole && it.score > 0 }
                            ?.score?.toString().orEmpty()
                    )
                }
                val totals = totalsFor(entries)
                _uiState.value = ScoringUiState(
                    isLoading = false,
                    roundId = resolvedRoundId,
                    matchId = matchId,
                    scorecardId = scorecard.id,
                    holes = entries,
                    totalStrokes = totals.totalStrokes,
                    totalToPar = totals.totalToPar
                )
            } catch (e: Exception) {
                fail(e.message ?: "Unable to load scorecard")
            }
        }
    }

    fun setScore(holeNumber: Int, value: String) {
        val sanitized = value.filter { it.isDigit() }.take(2)
        val updated = _uiState.value.holes.map { hole ->
            if (hole.holeNumber == holeNumber) hole.copy(scoreText = sanitized) else hole
        }
        val totals = totalsFor(updated)
        _uiState.value = _uiState.value.copy(
            holes = updated,
            totalStrokes = totals.totalStrokes,
            totalToPar = totals.totalToPar,
            error = null
        )
    }

    fun submit() {
        val state = _uiState.value
        val cardId = state.scorecardId
        if (cardId.isNullOrBlank()) {
            fail("No scorecard loaded")
            return
        }
        val writes = state.holes
            .mapNotNull { hole -> hole.score?.let { ScorecardHoleWrite(cardId, hole.holeNumber, it, hole.par) } }
        if (writes.isEmpty()) {
            fail("Enter at least one score")
            return
        }
        _uiState.value = state.copy(isSubmitting = true, error = null, message = null)
        viewModelScope.launch {
            when (val result = competitionRepository.upsertScorecardHoles(writes)) {
                is DataResult.Success -> {
                    val totals = totalsFor(state.holes)
                    val update = competitionRepository.updateScorecard(
                        scorecardId = cardId,
                        totalStrokes = totals.totalStrokes,
                        totalScoreToPar = totals.totalToPar,
                        status = ScorecardStatus.SUBMITTED
                    )
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        message = if (update is DataResult.Error) {
                            update.message
                        } else {
                            "Scorecard saved (${writes.size} holes, ${totals.totalStrokes} strokes)"
                        },
                        error = if (update is DataResult.Error) update.message else null
                    )
                }
                is DataResult.Error -> {
                    OfflineScoreQueue.addAll(
                        context,
                        writes.map { PendingScore(scorecardId = it.scorecardId, holeNumber = it.holeNumber, score = it.score, par = it.par) }
                    )
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        isQueuedOffline = true,
                        message = "Saved offline (${writes.size} holes). Scores will sync when you reconnect."
                    )
                }
            }
        }
    }

    fun syncPending() {
        viewModelScope.launch {
            val summary = OfflineScoreQueue.syncAll(context, encryptedStorage) { scorecardId ->
                competitionRepository.recalculateScorecardTotals(scorecardId, ScorecardStatus.SUBMITTED)
            }
            val pending = OfflineScoreQueue.pendingCount.value
            _uiState.value = _uiState.value.copy(
                isQueuedOffline = pending > 0,
                message = if (summary.synced > 0) "Synced ${summary.synced} queued scores" else _uiState.value.message,
                error = if (summary.failed > 0) "Some queued scores could not sync" else _uiState.value.error
            )
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

    private fun totalsFor(holes: List<ScoringHole>) = ScoreCalculations.totals(
        holes.mapNotNull { hole ->
            hole.score?.let { HoleScoreInput(hole.holeNumber, hole.par, it) }
        }
    )

    private fun fail(message: String) {
        _uiState.value = _uiState.value.copy(isLoading = false, isSubmitting = false, error = message)
    }

    private companion object {
        const val DEFAULT_PAR = 4
        const val DEFAULT_HOLE_COUNT = 18
    }
}
