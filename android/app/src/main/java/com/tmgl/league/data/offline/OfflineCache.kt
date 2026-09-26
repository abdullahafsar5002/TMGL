package com.tmgl.league.data.offline

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "tmgl_cache")

data class NotificationSettings(
    val notificationsEnabled: Boolean = true,
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true
)

object OfflineCache {
    // Keys
    private val DARK_MODE_KEY = booleanPreferencesKey("dark_mode")
    private val NOTIFICATION_ENABLED_KEY = booleanPreferencesKey("notifications_enabled")
    private val SOUND_ENABLED_KEY = booleanPreferencesKey("sound_enabled")
    private val VIBRATION_ENABLED_KEY = booleanPreferencesKey("vibration_enabled")
    private val BIOMETRIC_ENABLED_KEY = booleanPreferencesKey("biometric_enabled")

    @Volatile
    private var cachedNotificationSettings = NotificationSettings()

    fun notificationSettings(): NotificationSettings = cachedNotificationSettings

    // Dark Mode
    suspend fun saveDarkMode(context: Context, enabled: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[DARK_MODE_KEY] = enabled
        }
    }

    fun getDarkMode(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { prefs -> prefs[DARK_MODE_KEY] ?: false }
    }

    // Notification Settings
    suspend fun saveNotificationSettings(context: Context, enabled: Boolean, sound: Boolean, vibration: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[NOTIFICATION_ENABLED_KEY] = enabled
            prefs[SOUND_ENABLED_KEY] = sound
            prefs[VIBRATION_ENABLED_KEY] = vibration
        }
        cachedNotificationSettings = NotificationSettings(
            notificationsEnabled = enabled,
            soundEnabled = sound,
            vibrationEnabled = vibration
        )
    }

    suspend fun readNotificationSettings(context: Context): NotificationSettings {
        val settings = NotificationSettings(
            notificationsEnabled = isNotificationEnabled(context).first(),
            soundEnabled = isSoundEnabled(context).first(),
            vibrationEnabled = isVibrationEnabled(context).first()
        )
        cachedNotificationSettings = settings
        return settings
    }

    fun isNotificationEnabled(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { prefs -> prefs[NOTIFICATION_ENABLED_KEY] ?: true }
    }

    fun isSoundEnabled(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { prefs -> prefs[SOUND_ENABLED_KEY] ?: true }
    }

    fun isVibrationEnabled(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { prefs -> prefs[VIBRATION_ENABLED_KEY] ?: true }
    }

    // Biometric
    suspend fun saveBiometricEnabled(context: Context, enabled: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[BIOMETRIC_ENABLED_KEY] = enabled
        }
    }

    fun isBiometricEnabled(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { prefs -> prefs[BIOMETRIC_ENABLED_KEY] ?: false }
    }
}
