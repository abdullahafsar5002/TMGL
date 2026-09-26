package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.Tournament
import com.tmgl.league.data.repository.CompetitionRepository
import com.tmgl.league.data.repository.DataResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TournamentViewModel @Inject constructor(
    private val competitionRepository: CompetitionRepository
) : ViewModel() {
    private val _tournaments = MutableStateFlow<List<Tournament>>(emptyList())
    val tournaments: StateFlow<List<Tournament>> = _tournaments

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun loadTournaments() {
        viewModelScope.launch { refreshTournaments() }
    }

    suspend fun refreshTournaments() {
        _isLoading.value = true
        _error.value = null
        when (val result = competitionRepository.getTournaments()) {
            is DataResult.Success -> _tournaments.value = result.data
            is DataResult.Error -> _error.value = result.message
        }
        _isLoading.value = false
    }
}
