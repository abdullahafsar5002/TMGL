package com.tmgl.league.ui.viewmodel

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.auth.BiometricAuthManager
import com.tmgl.league.data.offline.OfflineCache
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val isDarkMode: Boolean = false,
    val isBiometricEnabled: Boolean = false,
    val isBiometricAvailable: Boolean = false,
    val notificationsEnabled: Boolean = true,
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val biometricAuthManager: BiometricAuthManager
) : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            OfflineCache.getDarkMode(context).collect { darkMode ->
                _uiState.value = _uiState.value.copy(isDarkMode = darkMode)
            }
        }
        viewModelScope.launch {
            OfflineCache.isBiometricEnabled(context).collect { enabled ->
                _uiState.value = _uiState.value.copy(isBiometricEnabled = enabled)
            }
        }
        viewModelScope.launch {
            OfflineCache.isNotificationEnabled(context).collect { enabled ->
                _uiState.value = _uiState.value.copy(notificationsEnabled = enabled)
            }
        }
        viewModelScope.launch {
            OfflineCache.isSoundEnabled(context).collect { enabled ->
                _uiState.value = _uiState.value.copy(soundEnabled = enabled)
            }
        }
        viewModelScope.launch {
            OfflineCache.isVibrationEnabled(context).collect { enabled ->
                _uiState.value = _uiState.value.copy(vibrationEnabled = enabled)
            }
        }
        _uiState.value = _uiState.value.copy(
            isBiometricAvailable = biometricAuthManager.isBiometricAvailable.value
        )
    }

    fun setDarkMode(enabled: Boolean) {
        viewModelScope.launch {
            OfflineCache.saveDarkMode(context, enabled)
            _uiState.value = _uiState.value.copy(isDarkMode = enabled)
        }
    }

    fun setBiometricEnabled(enabled: Boolean) {
        viewModelScope.launch {
            OfflineCache.saveBiometricEnabled(context, enabled)
            biometricAuthManager.setBiometricEnabled(enabled)
            _uiState.value = _uiState.value.copy(isBiometricEnabled = enabled)
        }
    }

    fun setNotificationsEnabled(enabled: Boolean) {
        viewModelScope.launch {
            OfflineCache.saveNotificationSettings(
                context,
                enabled,
                _uiState.value.soundEnabled,
                _uiState.value.vibrationEnabled
            )
            _uiState.value = _uiState.value.copy(notificationsEnabled = enabled)
        }
    }

    fun setSoundEnabled(enabled: Boolean) {
        viewModelScope.launch {
            OfflineCache.saveNotificationSettings(
                context,
                _uiState.value.notificationsEnabled,
                enabled,
                _uiState.value.vibrationEnabled
            )
            _uiState.value = _uiState.value.copy(soundEnabled = enabled)
        }
    }

    fun setVibrationEnabled(enabled: Boolean) {
        viewModelScope.launch {
            OfflineCache.saveNotificationSettings(
                context,
                _uiState.value.notificationsEnabled,
                _uiState.value.soundEnabled,
                enabled
            )
            _uiState.value = _uiState.value.copy(vibrationEnabled = enabled)
        }
    }

    fun rateApp() {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.tmgl.league"))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (e: Exception) {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.tmgl.league"))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
    }

    fun sendFeedback() {
        val intent = Intent(Intent.ACTION_SENDTO).apply {
            data = Uri.parse("mailto:")
            putExtra(Intent.EXTRA_EMAIL, arrayOf("support@tmgl.app"))
            putExtra(Intent.EXTRA_SUBJECT, "TMGL App Feedback")
            putExtra(Intent.EXTRA_TEXT, "Device: ${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}\nAndroid: ${android.os.Build.VERSION.RELEASE}\nApp Version: 1.0.0\n\nFeedback:\n")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(Intent.createChooser(intent, "Send Feedback"))
    }

    fun openPrivacyPolicy() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://tmgl.app/privacy"))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    fun openTerms() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://tmgl.app/terms"))
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
}
