package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.crashlytics.CrashlyticsHelper
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState

    init {
        checkAuth()
    }

    fun checkAuth() {
        viewModelScope.launch {
            _authState.value = authRepository.getCurrentUser()
            _authState.value.let { state ->
                if (state is AuthState.Authenticated) {
                    CrashlyticsHelper.setUserId(state.userId)
                    CrashlyticsHelper.setCustomKey("user_role", state.profile?.role?.name ?: "unknown")
                }
            }
        }
    }

    fun signIn(email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val result = authRepository.signIn(email, password)
                when (result) {
                    is com.tmgl.league.data.repository.AuthResult.Success -> {
                        kotlinx.coroutines.delay(300)
                        _authState.value = authRepository.getCurrentUser()
                        onSuccess()
                    }
                    is com.tmgl.league.data.repository.AuthResult.Error -> {
                        onError(result.message)
                    }
                }
            } catch (e: Exception) {
                CrashlyticsHelper.recordException(e, "Sign in failed for $email")
                onError(e.message ?: "Sign in failed")
            }
        }
    }

    fun signUp(email: String, password: String, fullName: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val result = authRepository.signUp(email, password, fullName)
                when (result) {
                    is com.tmgl.league.data.repository.AuthResult.Success -> {
                        _authState.value = authRepository.getCurrentUser()
                        onSuccess()
                    }
                    is com.tmgl.league.data.repository.AuthResult.Error -> {
                        onError(result.message)
                    }
                }
            } catch (e: Exception) {
                CrashlyticsHelper.recordException(e, "Sign up failed for $email")
                onError(e.message ?: "Sign up failed")
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            authRepository.signOut()
            _authState.value = AuthState.Unauthenticated
        }
    }

    fun resetPassword(email: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                authRepository.resetPassword(email)
                onSuccess()
            } catch (e: Exception) {
                onError(e.message ?: "Reset failed")
            }
        }
    }
}
