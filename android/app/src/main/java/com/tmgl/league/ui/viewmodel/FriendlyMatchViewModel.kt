package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.FriendlyMatch
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.FriendlyMatchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class FriendlyMatchViewModel @Inject constructor(
    private val friendlyMatchRepository: FriendlyMatchRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _matches = MutableStateFlow<List<FriendlyMatch>>(emptyList())
    val matches: StateFlow<List<FriendlyMatch>> = _matches

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun loadMatches() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val authState = authRepository.getCurrentUser()
                if (authState !is AuthState.Authenticated) {
                    _error.value = "Not authenticated"
                    return@launch
                }
                val playerId = when (val resolved = friendlyMatchRepository.resolveCurrentPlayerId()) {
                    is DataResult.Success -> resolved.data
                    is DataResult.Error -> {
                        _error.value = resolved.message
                        return@launch
                    }
                }
                when (val result = friendlyMatchRepository.getFriendlyMatchesByPlayer(playerId)) {
                    is DataResult.Success -> _matches.value = result.data
                    is DataResult.Error -> _error.value = result.message
                }
            } finally {
                _isLoading.value = false
            }
        }
    }
}
