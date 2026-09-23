package com.tmgl.league.ui.viewmodel

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.CourseHole
import io.github.jan.supabase.postgrest.from
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HoleEntry(
    val holeNumber: Int,
    val par: Int,
    val strokes: Int? = null,
    val putts: Int? = null,
    val fairwayHit: Boolean? = null,
    val gir: Boolean? = null
)

data class FastScoringUiState(
    val currentHole: Int = 1,
    val totalHoles: Int = 18,
    val courseHoles: List<CourseHole> = emptyList(),
    val entries: List<HoleEntry> = emptyList(),
    val selectedScore: Int? = null,
    val selectedPutts: Int = 0,
    val fairwayHit: Boolean? = null,
    val gir: Boolean? = null,
    val isSaving: Boolean = false,
    val isComplete: Boolean = false,
    val errorMsg: String? = null
)

@HiltViewModel
class FastScoringViewModel @Inject constructor(
    @ApplicationContext private val context: Context
) : ViewModel() {
    private val _uiState = MutableStateFlow(FastScoringUiState())
    val uiState: StateFlow<FastScoringUiState> = _uiState

    fun selectScore(score: Int) {
        _uiState.value = _uiState.value.copy(selectedScore = score, errorMsg = null)
    }

    fun selectPutts(putts: Int) {
        _uiState.value = _uiState.value.copy(selectedPutts = putts)
    }

    fun toggleFairway() {
        _uiState.value = _uiState.value.copy(
            fairwayHit = if (_uiState.value.fairwayHit == true) null else true
        )
    }

    fun toggleGir() {
        _uiState.value = _uiState.value.copy(
            gir = if (_uiState.value.gir == true) null else true
        )
    }

    fun saveAndNext(matchId: String?) {
        val state = _uiState.value
        if (state.selectedScore == null) {
            _uiState.value = state.copy(errorMsg = "Select a score")
            return
        }

        val par = state.courseHoles.find { it.holeNumber == state.currentHole }?.par ?: 4
        val newEntry = HoleEntry(
            holeNumber = state.currentHole,
            par = par,
            strokes = state.selectedScore,
            putts = state.selectedPutts,
            fairwayHit = state.fairwayHit,
            gir = state.gir
        )

        val updatedEntries = state.entries.filter { it.holeNumber != state.currentHole } + newEntry

        if (state.currentHole < state.totalHoles) {
            _uiState.value = state.copy(
                currentHole = state.currentHole + 1,
                entries = updatedEntries,
                selectedScore = null,
                selectedPutts = 0,
                fairwayHit = null,
                gir = null,
                errorMsg = null
            )
        } else {
            _uiState.value = state.copy(entries = updatedEntries, isSaving = true)
            submitScores(matchId, updatedEntries)
        }
    }

    fun previousHole() {
        val state = _uiState.value
        if (state.currentHole > 1) {
            val prevEntry = state.entries.find { it.holeNumber == state.currentHole - 1 }
            _uiState.value = state.copy(
                currentHole = state.currentHole - 1,
                selectedScore = prevEntry?.strokes,
                selectedPutts = prevEntry?.putts ?: 0,
                fairwayHit = prevEntry?.fairwayHit,
                gir = prevEntry?.gir,
                errorMsg = null
            )
        }
    }

    private fun submitScores(matchId: String?, entries: List<HoleEntry>) {
        viewModelScope.launch {
            try {
                for (entry in entries.filter { it.strokes != null }) {
                    val scoreData = mapOf<String, Any>(
                        "match_id" to (matchId ?: ""),
                        "hole_number" to entry.holeNumber,
                        "par" to entry.par,
                        "strokes" to (entry.strokes ?: 0),
                        "score_to_par" to ((entry.strokes ?: 0) - entry.par),
                        "putts" to (entry.putts ?: 0),
                        "fairway_hit" to (entry.fairwayHit ?: false),
                        "green_in_regulation" to (entry.gir ?: false)
                    )
                    SupabaseConfig.client.from("scorecard_holes").insert(scoreData)
                }
                _uiState.value = _uiState.value.copy(isComplete = true, isSaving = false)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMsg = e.message ?: "Save failed",
                    isSaving = false
                )
            }
        }
    }

    fun shareScore() {
        val state = _uiState.value
        val totalStrokes = state.entries.sumOf { it.strokes ?: 0 }
        val totalToPar = state.entries.sumOf { (it.strokes ?: 0) - it.par }
        val scoreText = if (totalToPar == 0) "E" else if (totalToPar > 0) "+$totalToPar" else "$totalToPar"

        val shareText = buildString {
            appendLine("🏌️ TMGL Scorecard")
            appendLine("━━━━━━━━━━━━━━━")
            state.entries.filter { it.strokes != null }.forEach { entry ->
                val name = "Hole ${entry.holeNumber}"
                val par = "Par ${entry.par}"
                val score = entry.strokes ?: 0
                val toPar = score - entry.par
                val label = when {
                    toPar <= -2 -> "🦅 Eagle"
                    toPar == -1 -> "🐦 Birdie"
                    toPar == 0 -> "👏 Par"
                    toPar == 1 -> "Bogey"
                    toPar == 2 -> "Double Bogey"
                    else -> "+$toPar"
                }
                appendLine("$name ($par): $score $label")
            }
            appendLine("━━━━━━━━━━━━━━━")
            appendLine("Total: $totalStrokes ($scoreText)")
            appendLine("Played on TMGL app")
        }

        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, shareText)
            type = "text/plain"
        }
        val shareIntent = Intent.createChooser(sendIntent, "Share Scorecard")
        shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(shareIntent)
    }
}
