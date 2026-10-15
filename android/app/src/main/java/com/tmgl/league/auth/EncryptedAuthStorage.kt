package com.tmgl.league.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

data class StoredSession(
    val userId: String,
    val email: String?,
    val accessToken: String,
    val refreshToken: String,
    val expiresAtMillis: Long
)

@Singleton
class EncryptedAuthStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {
    // Built lazily and defensively. The Android keystore entry becomes
    // unreadable when the app is reinstalled with a different signature, and
    // MasterKey.Builder().build() throws in that case. Because this class is
    // constructor-injected into AuthRepository, DeviceRepository and the scoring
    // view models, an eager build here took the whole app down at launch. Fall
    // back to clearing the unreadable store so the user simply signs in again.
    private val prefs: SharedPreferences by lazy { createPrefs() }

    private fun createPrefs(): SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (error: Throwable) {
        runCatching { context.deleteSharedPreferences(PREFS_NAME) }
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun saveSession(
        accessToken: String,
        refreshToken: String,
        userId: String,
        email: String?,
        expiresAtMillis: Long
    ) {
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_REFRESH_TOKEN, refreshToken)
            .putString(KEY_USER_ID, userId)
            .putString(KEY_USER_EMAIL, email)
            .putLong(KEY_TOKEN_EXPIRY, expiresAtMillis)
            .apply()
    }

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)

    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)

    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun getUserEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)

    fun getTokenExpiry(): Long = prefs.getLong(KEY_TOKEN_EXPIRY, 0L)

    fun getSession(): StoredSession? {
        val userId = getUserId() ?: return null
        val accessToken = getAccessToken() ?: return null
        val refreshToken = getRefreshToken() ?: return null
        return StoredSession(
            userId = userId,
            email = getUserEmail(),
            accessToken = accessToken,
            refreshToken = refreshToken,
            expiresAtMillis = getTokenExpiry()
        )
    }

    fun clearSession() {
        prefs.edit().clear().apply()
    }

    fun hasSession(): Boolean = getSession() != null

    companion object {
        private const val PREFS_NAME = "tmgl_secure_auth"
        private const val KEY_ACCESS_TOKEN = "access_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_TOKEN_EXPIRY = "token_expiry"
    }
}
