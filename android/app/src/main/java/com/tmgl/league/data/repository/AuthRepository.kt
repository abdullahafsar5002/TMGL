package com.tmgl.league.data.repository

import android.util.Log
import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Profile
import io.github.jan.supabase.gotrue.SignOutScope
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.exception.AuthRestException
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.gotrue.user.UserSession
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.datetime.Clock
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthResult {
    data object Success : AuthResult()
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

internal const val PROFILE_COLUMNS = "id,full_name,avatar_url,role,handicap_index,created_at,updated_at"

private const val PROFILE_LOOKUP_TIMEOUT_MS = 5_000L

internal fun profileInsertPayload(userId: String, fullName: String?): Map<String, String> = mapOf(
    "id" to userId,
    "full_name" to (fullName?.trim()?.takeIf { it.isNotEmpty() } ?: "TMGL Member"),
    "role" to "player"
)

@Singleton
class AuthRepository @Inject constructor(
    val encryptedStorage: EncryptedAuthStorage
) {
    private val auth get() = SupabaseConfig.client.auth

    fun currentUserId(): String? = auth.currentUserOrNull()?.id

    fun currentUserEmail(): String? = auth.currentUserOrNull()?.email

    fun hasActiveSession(): Boolean = auth.currentSessionOrNull() != null

    suspend fun signIn(email: String, password: String): AuthResult {
        return try {
            auth.signInWith(Email) {
                this.email = email.trim()
                this.password = password
            }
            val user = auth.currentUserOrNull()
            if (user == null) {
                AuthResult.Error("Sign in failed: no session was created")
            } else {
                Log.d("AuthRepository", "Sign in succeeded for ${user.id}")
                AuthResult.Success
            }
        } catch (e: Exception) {
            Log.e("AuthRepository", "Sign in failed", e)
            AuthResult.Error(mapAuthError(e))
        }
    }

    suspend fun signUp(email: String, password: String, fullName: String): AuthResult {
        return try {
            auth.signUpWith(Email) {
                this.email = email.trim()
                this.password = password
                data = buildJsonObject { put("full_name", fullName.trim()) }
            }
            val user = auth.currentUserOrNull()
            if (user == null) {
                AuthResult.Error("Check your email to confirm your account, then sign in.")
            } else {
                ensureProfileExists(user.id, fullName)
                AuthResult.Success
            }
        } catch (e: Exception) {
            Log.e("AuthRepository", "Sign up failed", e)
            AuthResult.Error(mapAuthError(e))
        }
    }

    suspend fun resetPassword(email: String) {
        auth.resetPasswordForEmail(email.trim())
    }

    suspend fun signOut() {
        try {
            auth.signOut(SignOutScope.LOCAL)
        } catch (e: Exception) {
            Log.w("AuthRepository", "Remote sign out failed, clearing local session", e)
        } finally {
            runCatching { auth.clearSession() }
            encryptedStorage.clearSession()
        }
    }

    suspend fun getCurrentUser(): AuthState {
        return try {
            auth.awaitInitialization()
            if (restoreSession() == null) return clearSessionState()
            val user = auth.currentUserOrNull() ?: return clearSessionState()
            val profile = withTimeoutOrNull(PROFILE_LOOKUP_TIMEOUT_MS) { fetchProfile(user.id) }
            if (profile == null) {
                ensureProfileExists(user.id, null)
            }
            AuthState.Authenticated(user.id, user.email, profile)
        } catch (e: Exception) {
            Log.e("AuthRepository", "Session restore failed", e)
            AuthState.Unauthenticated
        }
    }

    private suspend fun restoreSession(): UserSession? {
        val session = auth.currentSessionOrNull() ?: return null
        if (session.expiresAt > Clock.System.now()) return session
        return try {
            auth.refreshCurrentSession()
            auth.currentSessionOrNull()
        } catch (e: Exception) {
            if (e is AuthRestException) {
                Log.w("AuthRepository", "Session refresh rejected, signing out", e)
                runCatching { auth.clearSession() }
                encryptedStorage.clearSession()
                null
            } else {
                Log.w("AuthRepository", "Session refresh failed, keeping stored session", e)
                auth.currentSessionOrNull()
            }
        }
    }

    private fun clearSessionState(): AuthState {
        encryptedStorage.clearSession()
        return AuthState.Unauthenticated
    }

    private suspend fun fetchProfile(userId: String): Profile? {
        return try {
            SupabaseConfig.client.from("profiles")
                .select(Columns.raw(PROFILE_COLUMNS)) { filter { eq("id", userId) } }
                .decodeList<Profile>()
                .firstOrNull()
        } catch (e: Exception) {
            Log.e("AuthRepository", "Profile fetch failed", e)
            null
        }
    }

    private suspend fun ensureProfileExists(userId: String, fullName: String?) {
        try {
            val existing = SupabaseConfig.client.from("profiles")
                .select(Columns.raw("id")) { filter { eq("id", userId) } }
                .decodeList<Map<String, Any>>()
            if (existing.isNotEmpty()) return

            SupabaseConfig.client.from("profiles").insert(profileInsertPayload(userId, fullName))
        } catch (e: Exception) {
            Log.w("AuthRepository", "Profile self-provisioning skipped for $userId", e)
        }
    }

    private fun mapAuthError(error: Throwable): String {
        val detail = error.message?.trim().orEmpty()
        val message = when {
            detail.contains("Invalid login credentials", ignoreCase = true) ->
                "Incorrect email or password. Please try again."
            detail.contains("Email not confirmed", ignoreCase = true) ->
                "Please confirm your email address before signing in."
            detail.contains("User not found", ignoreCase = true) ->
                "No account found with this email. Please sign up first."
            detail.contains("already registered", ignoreCase = true) ||
                detail.contains("already been registered", ignoreCase = true) ->
                "An account with this email already exists."
            detail.contains("rate limit", ignoreCase = true) ||
                detail.contains("too many requests", ignoreCase = true) ->
                "Too many attempts. Please wait a moment and try again."
            detail.contains("unable to validate email", ignoreCase = true) ||
                detail.contains("invalid email", ignoreCase = true) ->
                "Please enter a valid email address."
            detail.contains("Password should be", ignoreCase = true) ||
                detail.contains("at least 6 characters", ignoreCase = true) ->
                "Password must be at least 6 characters."
            detail.contains("Signup is disabled", ignoreCase = true) ->
                "Registration is currently disabled. Please contact support."
            detail.isBlank() -> "Something went wrong. Please try again."
            else -> detail
        }
        Log.w("AuthRepository", "Mapped auth error: $detail")
        return message
    }
}
