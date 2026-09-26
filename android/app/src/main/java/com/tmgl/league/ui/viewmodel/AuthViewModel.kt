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

private const val AUTH_CHECK_TIMEOUT_MS = 15_000L
private const val AUTH_REQUEST_TIMEOUT_MS = 20_000L

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
            val state = withTimeoutOrNull(AUTH_CHECK_TIMEOUT_MS) {
                authRepository.getCurrentUser()
            }
            if (state == null) {
                val recovered = recoverFromTimeout()
                applyState(recovered)
                if (recovered is AuthState.Authenticated && recovered.profile == null) {
                    refreshProfileInBackground()
                }
            } else {
                applyState(state)
            }
        }
    }

    fun signIn(email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            val result = withTimeoutOrNull(AUTH_REQUEST_TIMEOUT_MS) {
                try {
                    authRepository.signIn(email, password)
                } catch (e: Exception) {
                    Log.e("AuthViewModel", "signIn exception", e)
                    AuthResult.Error(e.message ?: "Sign in failed")
                }
            }

            if (result == null) {
                if (establishSessionFromTimeout("signIn")) {
                    onSuccess()
                } else {
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
            val result = withTimeoutOrNull(AUTH_REQUEST_TIMEOUT_MS) {
                try {
                    authRepository.signUp(email, password, fullName)
                } catch (e: Exception) {
                    Log.e("AuthViewModel", "signUp exception", e)
                    AuthResult.Error(e.message ?: "Sign up failed")
                }
            }

            if (result == null) {
                if (establishSessionFromTimeout("signUp")) {
                    onSuccess()
                } else {
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
        val trimmedEmail = email.trim()
        if (trimmedEmail.isEmpty()) {
            onError("Enter the email address for your account.")
            return
        }
        viewModelScope.launch {
            var failureMessage: String? = null
            val accepted = withTimeoutOrNull(AUTH_REQUEST_TIMEOUT_MS) {
                try {
                    authRepository.resetPassword(trimmedEmail)
                    true
                } catch (e: Exception) {
                    Log.e("AuthViewModel", "resetPassword failed", e)
                    failureMessage = e.message?.takeIf { it.isNotBlank() }
                        ?: "Could not send the reset email. Please try again."
                    false
                }
            }
            when {
                accepted == true -> onSuccess()
                accepted == false -> onError(failureMessage ?: "Could not send the reset email. Please try again.")
                else -> onError("Connection timed out. Check your internet and try again.")
            }
        }
    }

    private fun recoverFromTimeout(): AuthState {
        val userId = authRepository.currentUserId()
        if (userId.isNullOrBlank()) {
            Log.w("AuthViewModel", "Auth check timed out with no stored session")
            return AuthState.Unauthenticated
        }
        Log.w("AuthViewModel", "Auth check timed out, keeping stored session for $userId")
        return AuthState.Authenticated(userId, authRepository.currentUserEmail(), null)
    }

    private fun establishSessionFromTimeout(operation: String): Boolean {
        val userId = authRepository.currentUserId()
        if (userId.isNullOrBlank() || !authRepository.hasActiveSession()) {
            Log.e("AuthViewModel", "$operation timed out without a usable session")
            return false
        }
        Log.w("AuthViewModel", "$operation timed out but a session exists for $userId")
        onSessionEstablished()
        return true
    }

    private fun onSessionEstablished() {
        val userId = authRepository.currentUserId().orEmpty()
        val email = authRepository.currentUserEmail()
        _authState.value = AuthState.Authenticated(userId, email, null)
        if (userId.isNotEmpty()) {
            CrashlyticsHelper.setUserId(userId)
        }
        refreshProfileInBackground()
    }

    private fun refreshProfileInBackground() {
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
