package com.tmgl.league.ui.viewmodel

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.net.toUri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.BuildConfig
import com.tmgl.league.auth.BiometricAuthManager
import com.tmgl.league.data.offline.OfflineCache
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject

data class SettingsUiState(
    val isDarkMode: Boolean = false,
    val isBiometricEnabled: Boolean = false,
    val isBiometricAvailable: Boolean = false,
    val notificationsEnabled: Boolean = true,
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true,
    val versionName: String = BuildConfig.VERSION_NAME,
    val versionCode: Int = BuildConfig.VERSION_CODE,
    val message: String? = null
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val biometricAuthManager: BiometricAuthManager
) : ViewModel() {
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState

    private val settingsMutex = Mutex()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            OfflineCache.getDarkMode(context).collect { darkMode ->
                _uiState.update { it.copy(isDarkMode = darkMode) }
            }
        }
        viewModelScope.launch {
            OfflineCache.isBiometricEnabled(context).collect { enabled ->
                biometricAuthManager.setBiometricEnabled(enabled)
                _uiState.update { it.copy(isBiometricEnabled = enabled) }
            }
        }
        viewModelScope.launch {
            OfflineCache.isNotificationEnabled(context).collect { enabled ->
                _uiState.update { it.copy(notificationsEnabled = enabled) }
            }
        }
        viewModelScope.launch {
            OfflineCache.isSoundEnabled(context).collect { enabled ->
                _uiState.update { it.copy(soundEnabled = enabled) }
            }
        }
        viewModelScope.launch {
            OfflineCache.isVibrationEnabled(context).collect { enabled ->
                _uiState.update { it.copy(vibrationEnabled = enabled) }
            }
        }
        _uiState.update { it.copy(isBiometricAvailable = biometricAuthManager.isBiometricAvailable.value) }
    }

    fun setDarkMode(enabled: Boolean) {
        viewModelScope.launch {
            settingsMutex.withLock {
                OfflineCache.saveDarkMode(context, enabled)
                _uiState.update { it.copy(isDarkMode = enabled) }
            }
        }
    }

    fun setBiometricEnabled(enabled: Boolean) {
        viewModelScope.launch {
            settingsMutex.withLock {
                if (enabled && !biometricAuthManager.isBiometricAvailable.value) return@withLock
                OfflineCache.saveBiometricEnabled(context, enabled)
                biometricAuthManager.setBiometricEnabled(enabled)
                _uiState.update { it.copy(isBiometricEnabled = enabled) }
            }
        }
    }

    fun setNotificationsEnabled(enabled: Boolean) {
        updateNotificationSettings(notificationsEnabled = enabled)
    }

    fun setSoundEnabled(enabled: Boolean) {
        updateNotificationSettings(soundEnabled = enabled)
    }

    fun setVibrationEnabled(enabled: Boolean) {
        updateNotificationSettings(vibrationEnabled = enabled)
    }

    private fun updateNotificationSettings(
        notificationsEnabled: Boolean? = null,
        soundEnabled: Boolean? = null,
        vibrationEnabled: Boolean? = null
    ) {
        viewModelScope.launch {
            settingsMutex.withLock {
                val current = _uiState.value
                val nextNotifications = notificationsEnabled ?: current.notificationsEnabled
                val nextSound = soundEnabled ?: current.soundEnabled
                val nextVibration = vibrationEnabled ?: current.vibrationEnabled
                OfflineCache.saveNotificationSettings(
                    context,
                    nextNotifications,
                    nextSound,
                    nextVibration
                )
                _uiState.update {
                    it.copy(
                        notificationsEnabled = nextNotifications,
                        soundEnabled = nextSound,
                        vibrationEnabled = nextVibration
                    )
                }
            }
        }
    }

    fun consumeMessage() {
        _uiState.update { if (it.message != null) it.copy(message = null) else it }
    }

    fun rateApp() {
        val playStoreUri = "https://play.google.com/store/apps/details?id=${context.packageName}"
        openExternalUri(
            "market://details?id=${context.packageName}".toUri() to "The Play Store app is not installed on this device.",
            playStoreUri.toUri() to "Couldn't open the Play Store."
        )
    }

    fun sendFeedback() {
        val intent = Intent(Intent.ACTION_SENDTO).apply {
            data = "mailto:".toUri()
            putExtra(Intent.EXTRA_EMAIL, arrayOf("support@tmgl.app"))
            putExtra(Intent.EXTRA_SUBJECT, "TMGL App Feedback")
            putExtra(Intent.EXTRA_TEXT, feedbackBody())
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val chooser = Intent.createChooser(intent, "Send Feedback")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (chooser.resolveActivity(context.packageManager) == null) {
            showMessage("No email app is available on this device.")
            return
        }
        if (runCatching { context.startActivity(chooser) }.isFailure) {
            showMessage("Couldn't open an email app on this device.")
        }
    }

    fun openPrivacyPolicy() {
        openExternalUri("https://tmgl.app/privacy".toUri() to "Couldn't open the privacy policy.")
    }

    fun openTerms() {
        openExternalUri("https://tmgl.app/terms".toUri() to "Couldn't open the terms of service.")
    }

    private fun feedbackBody(): String = buildString {
        append("Device: ${Build.MANUFACTURER} ${Build.MODEL}\n")
        append("Android: ${Build.VERSION.RELEASE}\n")
        append("App Version: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})\n")
        append("\nFeedback:\n")
    }

    private fun openExternalUri(vararg candidates: Pair<Uri, String>) {
        for ((uri, _) in candidates) {
            val intent = Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (intent.resolveActivity(context.packageManager) == null) continue
            if (runCatching { context.startActivity(intent) }.isSuccess) return
        }
        showMessage(candidates.lastOrNull()?.second ?: "No app on this device can open that link.")
    }

    private fun showMessage(message: String) {
        _uiState.update { it.copy(message = message) }
    }
}
