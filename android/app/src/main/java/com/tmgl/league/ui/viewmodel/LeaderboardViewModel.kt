package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.LeaderboardEntry
import com.tmgl.league.data.model.Tournament
import com.tmgl.league.data.repository.CompetitionRepository
import com.tmgl.league.data.repository.DataResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LeaderboardViewModel @Inject constructor(
    private val competitionRepository: CompetitionRepository
) : ViewModel() {
    private val _entries = MutableStateFlow<List<LeaderboardEntry>>(emptyList())
    val entries: StateFlow<List<LeaderboardEntry>> = _entries

    private val _allEntries = MutableStateFlow<List<LeaderboardEntry>>(emptyList())

    private val _tournaments = MutableStateFlow<List<Tournament>>(emptyList())
    val tournaments: StateFlow<List<Tournament>> = _tournaments

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _isLoadingMore = MutableStateFlow(false)
    val isLoadingMore: StateFlow<Boolean> = _isLoadingMore

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private var currentPage = 0
    private val pageSize = 20

    init {
        loadTournaments()
    }

    fun loadTournaments() {
        viewModelScope.launch {
            when (val result = competitionRepository.getTournaments()) {
                is DataResult.Success -> {
                    _tournaments.value = result.data
                    if (result.data.isNotEmpty()) {
                        loadLeaderboardForTournament(result.data.first().id)
                    }
                }
                is DataResult.Error -> _error.value = result.message
            }
        }
    }

    fun loadLeaderboardForTournament(tournamentId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            currentPage = 0
            when (val roundsResult = competitionRepository.getRoundsByTournament(tournamentId)) {
                is DataResult.Success -> {
                    val rounds = roundsResult.data
                    if (rounds.isNotEmpty()) {
                        val latestRound = rounds.maxByOrNull { it.roundNumber }
                        if (latestRound != null) {
                            when (val leaderboardResult = competitionRepository.getLeaderboard(latestRound.id)) {
                                is DataResult.Success -> {
                                    _allEntries.value = leaderboardResult.data
                                    _entries.value = leaderboardResult.data.take(pageSize)
                                }
                                is DataResult.Error -> _error.value = leaderboardResult.message
                            }
                        } else {
                            _entries.value = emptyList()
                            _allEntries.value = emptyList()
                        }
                    } else {
                        _entries.value = emptyList()
                        _allEntries.value = emptyList()
                    }
                }
                is DataResult.Error -> _error.value = roundsResult.message
            }
            _isLoading.value = false
        }
    }

    fun loadMore() {
        if (_isLoadingMore.value) return
        val allEntries = _allEntries.value
        val nextOffset = (currentPage + 1) * pageSize
        if (nextOffset >= allEntries.size) return

        viewModelScope.launch {
            _isLoadingMore.value = true
            val nextEntries = allEntries.take(nextOffset + pageSize)
            _entries.value = nextEntries
            currentPage++
            _isLoadingMore.value = false
        }
    }

    val hasMore: Boolean
        get() = _entries.value.size < _allEntries.value.size
}
