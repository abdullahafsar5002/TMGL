package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.Player
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.LeagueRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val leagueRepository: LeagueRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _players = MutableStateFlow<List<Player>>(emptyList())
    val players: StateFlow<List<Player>> = _players

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun loadPlayers() {
        viewModelScope.launch { refreshPlayers() }
    }

    suspend fun refreshPlayers() {
        _isLoading.value = true; _error.value = null
        val authState = authRepository.getCurrentUser()
        if (authState !is AuthState.Authenticated) {
            _error.value = "Please sign in to view this content"
            _isLoading.value = false
            return
        }
        when (val result = leagueRepository.getPlayers()) {
            is DataResult.Success -> _players.value = result.data
            is DataResult.Error -> _error.value = result.message
        }
        _isLoading.value = false
    }
}
