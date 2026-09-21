package com.tmgl.league.data.auth

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.repository.AuthState
import io.github.jan.supabase.gotrue.auth
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthGuard @Inject constructor() {

    suspend fun requireAuth(): AuthState {
        return try {
            val session = SupabaseConfig.client.auth.currentSessionOrNull()
            if (session == null) {
                AuthState.Unauthenticated
            } else {
                val userId = session.user?.id ?: return AuthState.Unauthenticated
                val email = session.user?.email
                AuthState.Authenticated(userId, email, null)
            }
        } catch (e: Exception) {
            AuthState.Unauthenticated
        }
    }

    suspend fun requireUserId(): String? {
        return try {
            SupabaseConfig.client.auth.currentUserOrNull()?.id
        } catch (e: Exception) {
            null
        }
    }

    suspend fun is_authenticated(): Boolean {
        return requireUserId() != null
    }
}
