package com.tmgl.league.data.repository

import android.content.Context
import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.auth.SessionSnapshot
import com.tmgl.league.data.auth.SessionSync
import com.tmgl.league.data.model.Profile
import com.tmgl.league.data.offline.OfflineCache
import com.tmgl.league.data.offline.OfflineScoreQueue
import dagger.hilt.android.qualifiers.ApplicationContext
import io.github.jan.supabase.exceptions.RestException
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthResult {
    data object Success : AuthResult()
    data object RequiresConfirmation : AuthResult()
    data class Error(val message: String) : AuthResult()
}

sealed class AuthState {
    data object Loading : AuthState()
    data object Unauthenticated : AuthState()
    data class Authenticated(
        val userId: String,
        val email: String?,
        val profile: Profile?
    ) : AuthState()
}

@Singleton
class AuthRepository @Inject constructor(
    private val encryptedStorage: EncryptedAuthStorage,
    private val deviceRepository: DeviceRepository,
    private val currentPlayerRepository: CurrentPlayerRepository,
    @ApplicationContext private val context: Context
) {

    suspend fun signIn(email: String, password: String): AuthResult {
        return try {
            SupabaseConfig.client.auth.signInWith(Email) {
                this.email = email.trim()
                this.password = password
            }
            val session = SupabaseConfig.client.auth.currentSessionOrNull()
            if (session == null) {
                AuthResult.Error("Sign in did not return a session")
            } else {
                SessionSync.persist(SupabaseConfig.client, session, encryptedStorage)
                completeSignIn()
                AuthResult.Success
            }
        } catch (e: Exception) {
            AuthResult.Error(mapAuthError(e))
        }
    }

    suspend fun signUp(email: String, password: String, fullName: String): AuthResult {
        return try {
            val result = SupabaseConfig.client.auth.signUpWith(Email) {
                this.email = email.trim()
                this.password = password
                data = buildJsonObject { put("full_name", fullName.trim()) }
            }
            val session = SupabaseConfig.client.auth.currentSessionOrNull()
            if (result == null && session == null) {
                AuthResult.RequiresConfirmation
            } else if (session != null) {
                SessionSync.persist(SupabaseConfig.client, session, encryptedStorage)
                completeSignIn(fullName.trim())
                AuthResult.Success
            } else {
                AuthResult.RequiresConfirmation
            }
        } catch (e: Exception) {
            AuthResult.Error(mapAuthError(e))
        }
    }

    suspend fun resetPassword(email: String) {
        SupabaseConfig.client.auth.resetPasswordForEmail(email.trim())
    }

    suspend fun signOut() {
        SessionSync.signOut(
            storage = encryptedStorage,
            onAuthenticatedCleanup = {
                deviceRepository.unregisterCurrentToken()
                currentPlayerRepository.clearCache()
            }
        )
        OfflineScoreQueue.clear()
        OfflineCache.clearUserData(context)
    }

    suspend fun getCurrentUser(): AuthState {
        if (SupabaseConfig.client.auth.currentSessionOrNull() == null) {
            val restored = SessionSync.restore(encryptedStorage)
            if (!restored) {
                encryptedStorage.clearSession()
                currentPlayerRepository.clearCache()
                return AuthState.Unauthenticated
            }
        } else if (SessionSync.needsRefresh(
                encryptedStorage.getTokenExpiry(),
                System.currentTimeMillis()
            ) && !SessionSync.refresh(encryptedStorage)
        ) {
            return AuthState.Unauthenticated
        }

        val userId = SessionSync.authUserId() ?: return AuthState.Unauthenticated
        val session = SupabaseConfig.client.auth.currentSessionOrNull()
        if (session != null) {
            SessionSync.persist(SupabaseConfig.client, session, encryptedStorage)
        }
        val email = session?.user?.email ?: encryptedStorage.getUserEmail()
        val profile = fetchProfile(userId) ?: ensureProfileExists(userId, email, null)
        return SessionSync.toAuthState(
            snapshot = SessionSnapshot(
                userId = userId,
                email = email,
                expiresAtMillis = encryptedStorage.getTokenExpiry()
            ),
            profile = profile
        )
    }

    private suspend fun completeSignIn(fullName: String? = null) {
        val userId = SessionSync.authUserId() ?: return
        val email = SupabaseConfig.client.auth.currentSessionOrNull()?.user?.email
            ?: encryptedStorage.getUserEmail()
        ensureProfileExists(userId, email, fullName)
        currentPlayerRepository.getCurrentPlayerId()
        deviceRepository.registerCurrentToken()
    }

    suspend fun fetchProfile(userId: String): Profile? {
        return try {
            SupabaseConfig.client.from("profiles")
                .select { filter { eq("id", userId) } }
                .decodeList<Profile>()
                .firstOrNull()
        } catch (_: Exception) {
            null
        }
    }

    private suspend fun ensureProfileExists(userId: String, email: String?, fullName: String?): Profile? {
        val existing = fetchProfile(userId)
        if (existing != null) return existing
        return try {
            val payload = mutableMapOf<String, Any?>(
                "id" to userId,
                "role" to "player"
            )
            if (!email.isNullOrBlank()) payload["email"] = email
            if (!fullName.isNullOrBlank()) payload["full_name"] = fullName
            SupabaseConfig.client.from("profiles").insert(payload) { select() }
                .decodeList<Profile>()
                .firstOrNull()
        } catch (_: Exception) {
            null
        }
    }

    private fun mapAuthError(error: Exception): String {
        val rawError = when (error) {
            is RestException -> error.message ?: "Request failed"
            else -> error.message ?: "Unexpected error"
        }
        val status = (error as? RestException)?.statusCode
        return when {
            status == 429 || rawError.contains("rate limit", ignoreCase = true) ->
                "Too many attempts. Please wait a moment and try again."
            rawError.contains("Invalid login credentials", ignoreCase = true) ->
                "Incorrect email or password. Please try again."
            rawError.contains("Email not confirmed", ignoreCase = true) ->
                "Please confirm your email address before signing in."
            rawError.contains("User not found", ignoreCase = true) ->
                "No account found with this email. Please sign up first."
            rawError.contains("already registered", ignoreCase = true) ->
                "An account with this email already exists. Try signing in."
            rawError.contains("Password should be", ignoreCase = true) ->
                "Password must be at least 6 characters."
            rawError.contains("Signup is disabled", ignoreCase = true) ->
                "Registration is currently disabled. Please contact support."
            rawError.contains("Unable to validate email", ignoreCase = true) ||
                rawError.contains("Invalid email", ignoreCase = true) ->
                "Please enter a valid email address."
            else -> rawError
        }
    }
}
