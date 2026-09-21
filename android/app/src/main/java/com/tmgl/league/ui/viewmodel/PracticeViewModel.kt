package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.PracticeRound
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.PracticeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PracticeViewModel @Inject constructor(
    private val practiceRepository: PracticeRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _rounds = MutableStateFlow<List<PracticeRound>>(emptyList())
    val rounds: StateFlow<List<PracticeRound>> = _rounds

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun loadRounds() {
        viewModelScope.launch {
            _isLoading.value = true; _error.value = null
            val authState = authRepository.getCurrentUser()
            if (authState is AuthState.Authenticated && authState.profile != null) {
                when (val playerResult = practiceRepository.getPlayerByProfileId(authState.profile.id)) {
                    is DataResult.Success -> {
                        when (val result = practiceRepository.getPracticeRoundsByPlayer(playerResult.data.id)) {
                            is DataResult.Success -> _rounds.value = result.data
                            is DataResult.Error -> _error.value = result.message
                        }
                    }
                    is DataResult.Error -> _error.value = playerResult.message
                }
            } else {
                _error.value = "Not authenticated"
            }
            _isLoading.value = false
        }
    }
}
