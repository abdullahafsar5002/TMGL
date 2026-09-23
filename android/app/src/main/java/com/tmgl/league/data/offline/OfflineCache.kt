package com.tmgl.league.data.offline

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "tmgl_cache")

object OfflineCache {
    // Keys
    private val DARK_MODE_KEY = booleanPreferencesKey("dark_mode")
    private val LAST_SYNC_KEY = longPreferencesKey("last_sync_timestamp")
    private val USER_ID_KEY = stringPreferencesKey("user_id")
    private val USER_NAME_KEY = stringPreferencesKey("user_name")
    private val USER_ROLE_KEY = stringPreferencesKey("user_role")
    private val USER_AVATAR_KEY = stringPreferencesKey("user_avatar")
    private val NOTIFICATION_ENABLED_KEY = booleanPreferencesKey("notifications_enabled")
    private val SOUND_ENABLED_KEY = booleanPreferencesKey("sound_enabled")
    private val VIBRATION_ENABLED_KEY = booleanPreferencesKey("vibration_enabled")
    private val BIOMETRIC_ENABLED_KEY = booleanPreferencesKey("biometric_enabled")
    private val CACHE_VERSION_KEY = intPreferencesKey("cache_version")
    private val LAST_NOTIFICATION_ID_KEY = intPreferencesKey("last_notification_id")
    private val OFFLINE_SCORES_COUNT_KEY = intPreferencesKey("offline_scores_count")
    private val SELECTED_COURSE_ID_KEY = stringPreferencesKey("selected_course_id")
    private val LAST_TOURNAMENT_VIEW_KEY = stringPreferencesKey("last_tournament_view")
    private val QUICK_ACTION_TOURNAMENT_KEY = stringPreferencesKey("quick_action_tournament")

    const val CACHE_VERSION = 1

    // Dark Mode
    suspend fun saveDarkMode(context: Context, enabled: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[DARK_MODE_KEY] = enabled
        }
    }

    fun getDarkMode(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { prefs -> prefs[DARK_MODE_KEY] ?: false }
    }

    // Last Sync
    suspend fun saveLastSyncTimestamp(context: Context, timestamp: Long) {
        context.dataStore.edit { prefs ->
            prefs[LAST_SYNC_KEY] = timestamp
        }
    }

    fun getLastSyncTimestamp(context: Context): Flow<Long> {
        return context.dataStore.data.map { prefs -> prefs[LAST_SYNC_KEY] ?: 0L }
    }

    // User Info
    suspend fun saveUserInfo(context: Context, userId: String, name: String, role: String, avatarUrl: String? = null) {
        context.dataStore.edit { prefs ->
            prefs[USER_ID_KEY] = userId
            prefs[USER_NAME_KEY] = name
            prefs[USER_ROLE_KEY] = role
            avatarUrl?.let { prefs[USER_AVATAR_KEY] = it }
        }
    }

    fun getUserId(context: Context): Flow<String> {
        return context.dataStore.data.map { prefs -> prefs[USER_ID_KEY] ?: "" }
    }

    fun getUserName(context: Context): Flow<String> {
        return context.dataStore.data.map { prefs -> prefs[USER_NAME_KEY] ?: "" }
    }

    fun getUserRole(context: Context): Flow<String> {
        return context.dataStore.data.map { prefs -> prefs[USER_ROLE_KEY] ?: "player" }
    }

    fun getUserAvatar(context: Context): Flow<String?> {
        return context.dataStore.data.map { prefs -> prefs[USER_AVATAR_KEY] }
    }

    // Notification Settings
    suspend fun saveNotificationSettings(context: Context, enabled: Boolean, sound: Boolean, vibration: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[NOTIFICATION_ENABLED_KEY] = enabled
            prefs[SOUND_ENABLED_KEY] = sound
            prefs[VIBRATION_ENABLED_KEY] = vibration
        }
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

    // Cache Version
    suspend fun saveCacheVersion(context: Context, version: Int) {
        context.dataStore.edit { prefs ->
            prefs[CACHE_VERSION_KEY] = version
        }
    }

    fun getCacheVersion(context: Context): Flow<Int> {
        return context.dataStore.data.map { prefs -> prefs[CACHE_VERSION_KEY] ?: 0 }
    }

    // Notification ID
    suspend fun saveLastNotificationId(context: Context, id: Int) {
        context.dataStore.edit { prefs ->
            prefs[LAST_NOTIFICATION_ID_KEY] = id
        }
    }

    fun getLastNotificationId(context: Context): Flow<Int> {
        return context.dataStore.data.map { prefs -> prefs[LAST_NOTIFICATION_ID_KEY] ?: 0 }
    }

    // Offline Scores Count
    suspend fun saveOfflineScoresCount(context: Context, count: Int) {
        context.dataStore.edit { prefs ->
            prefs[OFFLINE_SCORES_COUNT_KEY] = count
        }
    }

    fun getOfflineScoresCount(context: Context): Flow<Int> {
        return context.dataStore.data.map { prefs -> prefs[OFFLINE_SCORES_COUNT_KEY] ?: 0 }
    }

    // Selected Course
    suspend fun saveSelectedCourseId(context: Context, courseId: String) {
        context.dataStore.edit { prefs ->
            prefs[SELECTED_COURSE_ID_KEY] = courseId
        }
    }

    fun getSelectedCourseId(context: Context): Flow<String> {
        return context.dataStore.data.map { prefs -> prefs[SELECTED_COURSE_ID_KEY] ?: "" }
    }

    // Last Tournament View
    suspend fun saveLastTournamentView(context: Context, tournamentId: String) {
        context.dataStore.edit { prefs ->
            prefs[LAST_TOURNAMENT_VIEW_KEY] = tournamentId
        }
    }

    fun getLastTournamentView(context: Context): Flow<String> {
        return context.dataStore.data.map { prefs -> prefs[LAST_TOURNAMENT_VIEW_KEY] ?: "" }
    }

    // Quick Action Tournament
    suspend fun saveQuickActionTournament(context: Context, tournamentId: String) {
        context.dataStore.edit { prefs ->
            prefs[QUICK_ACTION_TOURNAMENT_KEY] = tournamentId
        }
    }

    fun getQuickActionTournament(context: Context): Flow<String> {
        return context.dataStore.data.map { prefs -> prefs[QUICK_ACTION_TOURNAMENT_KEY] ?: "" }
    }

    // Clear all
    suspend fun clearAll(context: Context) {
        context.dataStore.edit { prefs ->
            prefs.clear()
        }
    }

    // Clear user data
    suspend fun clearUserData(context: Context) {
        context.dataStore.edit { prefs ->
            prefs.remove(USER_ID_KEY)
            prefs.remove(USER_NAME_KEY)
            prefs.remove(USER_ROLE_KEY)
            prefs.remove(USER_AVATAR_KEY)
        }
    }
}
