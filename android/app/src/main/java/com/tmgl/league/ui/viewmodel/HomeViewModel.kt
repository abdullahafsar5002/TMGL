package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.SupabaseConfig
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val userName: String = "Player",
    val handicap: String = "--",
    val totalRounds: String = "0",
    val recentScores: List<Pair<String, String>> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor() : ViewModel() {
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState

    init {
        loadHomeData()
    }

    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            fetchHomeData()
            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true, error = null)
            fetchHomeData()
            _uiState.value = _uiState.value.copy(isRefreshing = false)
        }
    }

    private suspend fun fetchHomeData() {
        val userId = SupabaseConfig.client.auth.currentUserOrNull()?.id
        if (userId.isNullOrBlank()) {
            _uiState.value = _uiState.value.copy(
                userName = "Player",
                handicap = "--",
                totalRounds = "0",
                recentScores = emptyList()
            )
            return
        }

        val failures = mutableListOf<String>()

        suspend fun <T> attempt(message: String, fallback: T, block: suspend () -> T): T =
            try {
                block()
            } catch (e: Exception) {
                failures += message
                fallback
            }

        val profile = attempt("Your profile could not be loaded", null) { loadProfile(userId) }
        val playerId = attempt("Your player record could not be loaded", null) { loadPlayerId(userId) }

        val practiceRounds = if (playerId.isNullOrBlank()) {
            emptyList()
        } else {
            attempt("Your practice rounds could not be loaded", emptyList()) {
                loadPracticeRounds(playerId)
            }
        }

        val recentScores = if (playerId.isNullOrBlank()) {
            emptyList()
        } else {
            attempt("Your recent scores could not be loaded", emptyList()) {
                loadRecentScores(playerId)
            }
        }

        _uiState.value = _uiState.value.copy(
            userName = profile?.fullName?.takeIf { it.isNotBlank() } ?: "Player",
            handicap = profile?.handicapIndex?.toString() ?: "--",
            totalRounds = practiceRounds.size.toString(),
            recentScores = recentScores,
            error = failures.firstOrNull()
        )
    }

    private suspend fun loadProfile(userId: String): HomeProfileRow? =
        SupabaseConfig.client.from("profiles")
            .select(Columns.raw(PROFILE_COLUMNS)) { filter { eq("id", userId) } }
            .decodeList<HomeProfileRow>()
            .firstOrNull()

    private suspend fun loadPlayerId(profileId: String): String? =
        SupabaseConfig.client.from("players")
            .select(Columns.raw("id")) { filter { eq("profile_id", profileId) } }
            .decodeList<PlayerIdRow>()
            .firstOrNull()
            ?.id
            ?.takeIf { it.isNotBlank() }

    private suspend fun loadPracticeRounds(playerId: String): List<HomePracticeRoundRow> =
        SupabaseConfig.client.from("practice_rounds")
            .select(Columns.raw("id,player_id,status,total_to_par")) {
                filter { eq("player_id", playerId) }
            }
            .decodeList<HomePracticeRoundRow>()

    private suspend fun loadRecentScores(playerId: String?): List<Pair<String, String>> {
        if (playerId.isNullOrBlank()) return emptyList()
        val scorecards = SupabaseConfig.client.from("scorecards")
            .select(Columns.raw(SCORECARD_COLUMNS)) {
                filter { eq("player_id", playerId) }
                order("created_at", Order.DESCENDING)
                limit(5)
            }
            .decodeList<HomeScorecardRow>()
        if (scorecards.isEmpty()) return emptyList()

        val roundIds = scorecards.map { it.roundId }.filter { it.isNotBlank() }.distinct()
        val rounds = if (roundIds.isEmpty()) {
            emptyList()
        } else {
            try {
                SupabaseConfig.client.from("rounds")
                    .select(Columns.raw("id,name,round_number")) {
                        filter { isIn("id", roundIds) }
                    }
                    .decodeList<HomeRoundRow>()
            } catch (_: Exception) {
                emptyList()
            }
        }
        val roundNames = rounds.associate { it.id to it.name }
        val roundNumbers = rounds.associate { it.id to it.roundNumber }

        return scorecards.map { card ->
            val label = roundNames[card.roundId]?.takeIf { it.isNotBlank() }
                ?: roundNumbers[card.roundId]?.let { "Round $it" }
                ?: "Round"
            label to formatScore(card.totalStrokes, card.totalScoreToPar)
        }
    }

    private fun formatScore(totalStrokes: Int?, totalScoreToPar: Int?): String {
        val total = totalStrokes?.toString() ?: "--"
        val toPar = when {
            totalScoreToPar == null -> "--"
            totalScoreToPar == 0 -> "E"
            totalScoreToPar > 0 -> "+$totalScoreToPar"
            else -> "$totalScoreToPar"
        }
        return "$total ($toPar)"
    }
}

private const val PROFILE_COLUMNS = "id,full_name,handicap_index"
private const val SCORECARD_COLUMNS = "id,round_id,total_strokes,total_score_to_par,created_at"

@Serializable
private data class HomeProfileRow(
    val id: String = "",
    @SerialName("full_name") val fullName: String = "",
    @SerialName("handicap_index") val handicapIndex: Double? = null
)

@Serializable
private data class PlayerIdRow(val id: String = "")

@Serializable
private data class HomePracticeRoundRow(
    val id: String = "",
    @SerialName("player_id") val playerId: String = "",
    val status: String = "",
    @SerialName("total_to_par") val totalToPar: Int? = null
)

@Serializable
private data class HomeScorecardRow(
    val id: String = "",
    @SerialName("round_id") val roundId: String = "",
    @SerialName("total_strokes") val totalStrokes: Int? = null,
    @SerialName("total_score_to_par") val totalScoreToPar: Int? = null
)

@Serializable
private data class HomeRoundRow(
    val id: String = "",
    val name: String = "",
    @SerialName("round_number") val roundNumber: Int = 0
)
