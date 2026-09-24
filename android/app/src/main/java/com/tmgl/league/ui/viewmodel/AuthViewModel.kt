package com.tmgl.league.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.auth.EncryptedAuthStorage
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
    private val authRepository: AuthRepository,
    private val encryptedStorage: EncryptedAuthStorage
) : ViewModel() {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState

    init {
        checkAuth()
    }

    fun checkAuth() {
        viewModelScope.launch {
            val state = withTimeoutOrNull(10_000L) {
                authRepository.getCurrentUser()
            } ?: AuthState.Unauthenticated
            _authState.value = state
            if (state is AuthState.Authenticated) {
                CrashlyticsHelper.setUserId(state.userId)
                CrashlyticsHelper.setCustomKey("user_role", state.profile?.role?.name ?: "unknown")
            }
        }
    }

    fun signIn(email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            val result = withTimeoutOrNull(15_000L) {
                try {
                    authRepository.signIn(email, password)
                } catch (e: Exception) {
                    Log.e("AuthViewModel", "signIn exception", e)
                    AuthResult.Error(e.message ?: "Sign in failed")
                }
            }

            if (result == null) {
                Log.e("AuthViewModel", "signIn timed out")
                onError("Connection timed out. Check your internet and try again.")
                return@launch
            }

            when (result) {
                is AuthResult.Success -> {
                    val userId = encryptedStorage.getUserId() ?: ""
                    val userEmail = encryptedStorage.getUserEmail()
                    Log.d("AuthViewModel", "signIn success: userId=$userId")
                    _authState.value = AuthState.Authenticated(userId, userEmail, null)
                    onSuccess()
                    viewModelScope.launch {
                        try {
                            val fullState = authRepository.getCurrentUser()
                            _authState.value = fullState
                        } catch (e: Exception) {
                            Log.e("AuthViewModel", "background profile fetch failed", e)
                        }
                    }
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
            val result = withTimeoutOrNull(15_000L) {
                try {
                    authRepository.signUp(email, password, fullName)
                } catch (e: Exception) {
                    Log.e("AuthViewModel", "signUp exception", e)
                    AuthResult.Error(e.message ?: "Sign up failed")
                }
            }

            if (result == null) {
                onError("Connection timed out. Check your internet and try again.")
                return@launch
            }

            when (result) {
                is AuthResult.Success -> {
                    val userId = encryptedStorage.getUserId() ?: ""
                    val userEmail = encryptedStorage.getUserEmail()
                    _authState.value = AuthState.Authenticated(userId, userEmail, null)
                    onSuccess()
                    viewModelScope.launch {
                        try {
                            val fullState = authRepository.getCurrentUser()
                            _authState.value = fullState
                        } catch (_: Exception) {}
                    }
                }
                is AuthResult.Error -> {
                    onError(result.message)
                }
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
