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

    private val _isBusy = MutableStateFlow(false)
    val isBusy: StateFlow<Boolean> = _isBusy

    init {
        checkAuth()
    }

    fun checkAuth() {
        viewModelScope.launch {
            val state = withTimeoutOrNull(SESSION_TIMEOUT_MILLIS) {
                authRepository.getCurrentUser()
            } ?: AuthState.Unauthenticated
            applyState(state)
        }
    }

    fun signIn(email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (_isBusy.value) return
        _isBusy.value = true
        viewModelScope.launch {
            val result = withTimeoutOrNull(REQUEST_TIMEOUT_MILLIS) {
                runCatching { authRepository.signIn(email, password) }
                    .getOrElse { AuthResult.Error(it.message ?: "Sign in failed") }
            }
            _isBusy.value = false
            when (result) {
                is AuthResult.Success -> {
                    applyState(AuthState.Loading)
                    checkAuth()
                    onSuccess()
                }
                is AuthResult.Error -> onError(result.message)
                is AuthResult.RequiresConfirmation -> onError("Confirm your email address before signing in.")
                null -> onError("Connection timed out. Check your internet and try again.")
            }
        }
    }

    fun signUp(
        email: String,
        password: String,
        fullName: String,
        onSuccess: () -> Unit,
        onConfirmationRequired: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        if (_isBusy.value) return
        _isBusy.value = true
        viewModelScope.launch {
            val result = withTimeoutOrNull(REQUEST_TIMEOUT_MILLIS) {
                runCatching { authRepository.signUp(email, password, fullName) }
                    .getOrElse { AuthResult.Error(it.message ?: "Sign up failed") }
            }
            _isBusy.value = false
            when (result) {
                is AuthResult.Success -> {
                    applyState(AuthState.Loading)
                    checkAuth()
                    onSuccess()
                }
                is AuthResult.RequiresConfirmation ->
                    onConfirmationRequired("Check your inbox to confirm your email, then sign in.")
                is AuthResult.Error -> onError(result.message)
                null -> onError("Connection timed out. Check your internet and try again.")
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            runCatching { authRepository.signOut() }
                .onFailure { Log.e("AuthViewModel", "Sign out cleanup failed", it) }
            CrashlyticsHelper.setUserId("")
            applyState(AuthState.Unauthenticated)
        }
    }

    fun resetPassword(email: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            runCatching { authRepository.resetPassword(email) }
                .onSuccess { onSuccess() }
                .onFailure { onError(it.message ?: "Reset failed") }
        }
    }

    private fun applyState(state: AuthState) {
        _authState.value = state
        if (state is AuthState.Authenticated) {
            CrashlyticsHelper.setUserId(state.userId)
            CrashlyticsHelper.setCustomKey("user_role", state.profile?.role?.name ?: "unknown")
        }
    }

    private companion object {
        const val SESSION_TIMEOUT_MILLIS = 15_000L
        const val REQUEST_TIMEOUT_MILLIS = 20_000L
    }
}
