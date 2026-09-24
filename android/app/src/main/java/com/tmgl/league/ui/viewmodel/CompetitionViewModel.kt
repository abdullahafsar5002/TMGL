package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.Match
import com.tmgl.league.data.model.Scorecard
import com.tmgl.league.data.model.ScorecardHole
import com.tmgl.league.data.model.Tournament
import com.tmgl.league.data.repository.CompetitionRepository
import com.tmgl.league.data.repository.DataResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CompetitionViewModel @Inject constructor(
    val repository: CompetitionRepository
) : ViewModel() {

    private val _tournament = MutableStateFlow<Tournament?>(null)
    val tournament: StateFlow<Tournament?> = _tournament

    private val _matches = MutableStateFlow<List<Match>>(emptyList())
    val matches: StateFlow<List<Match>> = _matches

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun loadTournament(tournamentId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = repository.getTournament(tournamentId)) {
                is DataResult.Success -> _tournament.value = result.data
                is DataResult.Error -> _error.value = result.message
            }
            _isLoading.value = false
        }
    }

    fun loadTournamentMatches(tournamentId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = repository.getTournamentMatches(tournamentId)) {
                is DataResult.Success -> _matches.value = result.data
                is DataResult.Error -> _error.value = result.message
            }
            _isLoading.value = false
        }
    }

    fun loadScorecard(matchId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = repository.getScorecard(matchId)) {
                is DataResult.Success -> { /* handled by caller */ }
                is DataResult.Error -> _error.value = result.message
            }
            _isLoading.value = false
        }
    }

    fun submitScorecard(matchId: String, holes: List<ScorecardHole>) {
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = repository.upsertScorecardHoles(matchId, holes)) {
                is DataResult.Success -> { /* success */ }
                is DataResult.Error -> _error.value = result.message
            }
            _isLoading.value = false
        }
    }

    fun loadLeaderboard(tournamentId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            when (val result = repository.getTournamentLeaderboard(tournamentId)) {
                is DataResult.Success -> { /* handled by caller */ }
                is DataResult.Error -> _error.value = result.message
            }
            _isLoading.value = false
        }
    }

    fun clearError() {
        _error.value = null
    }
}
