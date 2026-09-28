package com.tmgl.league.data.auth

import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.repository.AuthState
import io.github.jan.supabase.gotrue.auth
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthGuard @Inject constructor(
    private val storage: EncryptedAuthStorage
) {

    suspend fun requireAuth(): AuthState {
        return try {
            if (SupabaseConfig.client.auth.currentSessionOrNull() == null) {
                SessionSync.restore(storage)
            }
            val snapshot = SessionSync.snapshot()
            SessionSync.toAuthState(snapshot, null)
        } catch (_: Exception) {
            AuthState.Unauthenticated
        }
    }

    suspend fun requireUserId(): String? {
        return try {
            if (SupabaseConfig.client.auth.currentSessionOrNull() == null) {
                SessionSync.restore(storage)
            }
            SessionSync.authUserId()
        } catch (_: Exception) {
            null
        }
    }

    suspend fun isAuthenticated(): Boolean = requireUserId() != null
}
