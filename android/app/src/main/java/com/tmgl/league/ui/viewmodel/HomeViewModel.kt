package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.LeaderboardEntry
import com.tmgl.league.data.repository.CompetitionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
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
            try {
                val userId = SupabaseConfig.client.auth.currentUserOrNull()?.id
                if (userId == null) {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        userName = "Player",
                        handicap = "--",
                        totalRounds = "0"
                    )
                    return@launch
                }

                val profile = SupabaseConfig.client.from("profiles")
                    .select { filter { eq("id", userId) } }
                    .decodeList<Map<String, Any>>()
                    .firstOrNull()

                val userName = profile?.get("full_name")?.toString() ?: "Player"
                val handicap = profile?.get("handicap_index")?.toString() ?: "--"

                val rounds = SupabaseConfig.client.from("practice_rounds")
                    .select { filter { eq("user_id", userId) } }
                    .decodeList<Map<String, Any>>()

                val recentScores = try {
                    val scorecards = SupabaseConfig.client.from("scorecards")
                        .select {
                            filter { eq("player_id", userId) }
                            order("created_at", io.github.jan.supabase.postgrest.query.Order.DESCENDING)
                            limit(5)
                        }
                        .decodeList<Map<String, Any>>()
                    scorecards.map { sc ->
                        val total = sc["total_strokes"]?.toString() ?: "0"
                        val toPar = sc["total_score_to_par"]?.toString()?.toIntOrNull() ?: 0
                        val label = sc["status"]?.toString() ?: "Round"
                        val score = if (toPar == 0) "E" else if (toPar > 0) "+$toPar" else "$toPar"
                        label to "$total ($score)"
                    }
                } catch (_: Exception) {
                    emptyList()
                }

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    userName = userName,
                    handicap = handicap,
                    totalRounds = rounds.size.toString(),
                    recentScores = recentScores
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load data"
                )
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true)
            loadHomeData()
            _uiState.value = _uiState.value.copy(isRefreshing = false)
        }
    }
}
