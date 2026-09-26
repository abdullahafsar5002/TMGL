package com.tmgl.league.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.jan.supabase.gotrue.user.UserSession
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EncryptedAuthStorage @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs: SharedPreferences = sharedPrefs(context.applicationContext)

    fun saveSession(session: UserSession) {
        prefs.edit { putString(KEY_SESSION, encodeSession(session)) }
    }

    fun loadSession(): UserSession? {
        val stored = prefs.getString(KEY_SESSION, null) ?: return null
        return try {
            decodeSession(stored)
        } catch (e: Exception) {
            prefs.edit { remove(KEY_SESSION) }
            null
        }
    }

    fun clearSession() {
        prefs.edit { clear() }
    }

    companion object {
        private const val PREFS_NAME = "tmgl_secure_auth"
        private const val KEY_SESSION = "session"

        private val sessionJson = Json {
            ignoreUnknownKeys = true
            encodeDefaults = true
        }

        internal fun encodeSession(session: UserSession): String =
            sessionJson.encodeToString(UserSession.serializer(), session)

        internal fun decodeSession(stored: String): UserSession =
            sessionJson.decodeFromString(UserSession.serializer(), stored)

        @Volatile
        private var backingStore: SharedPreferences? = null

        private fun sharedPrefs(context: Context): SharedPreferences {
            return backingStore ?: synchronized(this) {
                backingStore ?: createPrefs(context).also { backingStore = it }
            }
        }

        private fun createPrefs(context: Context): SharedPreferences {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            return EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        }
    }
}
