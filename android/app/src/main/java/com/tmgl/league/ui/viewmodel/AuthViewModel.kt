package com.tmgl.league.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.crashlytics.CrashlyticsHelper
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthResult
import com.tmgl.league.data.repository.AuthState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
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
            val state = withTimeoutOrNull(15_000L) {
                authRepository.getCurrentUser()
            } ?: AuthState.Unauthenticated
            applyState(state)
        }
    }

    fun signIn(email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            val result = withTimeoutOrNull(20_000L) {
                try {
                    authRepository.signIn(email, password)
                } catch (e: Exception) {
                    Log.e("AuthViewModel", "signIn exception", e)
                    AuthResult.Error(e.message ?: "Sign in failed")
                }
            }

            if (result == null) {
                if (authRepository.hasActiveSession()) {
                    onSessionEstablished()
                    onSuccess()
                } else {
                    Log.e("AuthViewModel", "signIn timed out")
                    onError("Connection timed out. Check your internet and try again.")
                }
                return@launch
            }

            when (result) {
                is AuthResult.Success -> {
                    onSessionEstablished()
                    onSuccess()
                }
                is AuthResult.Error -> {
                    Log.e("AuthViewModel", "signIn error: ${result.message}")
                    onError(result.message)
                }
            }
        }
    }

    fun signUp(email: String, password: String, fullName: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            val result = withTimeoutOrNull(20_000L) {
                try {
                    authRepository.signUp(email, password, fullName)
                } catch (e: Exception) {
                    Log.e("AuthViewModel", "signUp exception", e)
                    AuthResult.Error(e.message ?: "Sign up failed")
                }
            }

            if (result == null) {
                if (authRepository.hasActiveSession()) {
                    onSessionEstablished()
                    onSuccess()
                } else {
                    Log.e("AuthViewModel", "signUp timed out")
                    onError("Connection timed out. Check your internet and try again.")
                }
                return@launch
            }

            when (result) {
                is AuthResult.Success -> {
                    onSessionEstablished()
                    onSuccess()
                }
                is AuthResult.Error -> {
                    Log.e("AuthViewModel", "signUp error: ${result.message}")
                    onError(result.message)
                }
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            authRepository.signOut()
            CrashlyticsHelper.setUserId("")
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

    private fun onSessionEstablished() {
        val userId = authRepository.currentUserId().orEmpty()
        val email = authRepository.currentUserEmail()
        _authState.value = AuthState.Authenticated(userId, email, null)
        if (userId.isNotEmpty()) {
            CrashlyticsHelper.setUserId(userId)
        }
        viewModelScope.launch {
            val state = authRepository.getCurrentUser()
            if (state is AuthState.Authenticated) {
                applyState(state)
            }
        }
    }

    private fun applyState(state: AuthState) {
        _authState.value = state
        if (state is AuthState.Authenticated) {
            CrashlyticsHelper.setUserId(state.userId)
            CrashlyticsHelper.setCustomKey("user_role", state.profile?.role?.name ?: "unknown")
        }
    }
}
