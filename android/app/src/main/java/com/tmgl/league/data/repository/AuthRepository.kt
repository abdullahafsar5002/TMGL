package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Profile
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.Serializable

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

class AuthRepository {
    private val auth = SupabaseConfig.client.auth
    private val postgrest = SupabaseConfig.client

    suspend fun signIn(email: String, password: String): AuthResult {
        return try {
            auth.signInWith(Email) {
                this.email = email
                this.password = password
            }
            AuthResult.Success
        } catch (e: Exception) {
            AuthResult.Error(e.message ?: "Sign in failed")
        }
    }

    suspend fun signUp(email: String, password: String, fullName: String): AuthResult {
        return try {
            auth.signUpWith(Email) {
                this.email = email
                this.password = password
            }
            AuthResult.Success
        } catch (e: Exception) {
            AuthResult.Error(e.message ?: "Sign up failed")
        }
    }

    suspend fun resetPassword(email: String) {
        SupabaseConfig.client.auth.resetPasswordForEmail(email)
    }

    suspend fun signOut() {
        auth.signOut()
    }

    suspend fun getCurrentUser(): AuthState {
        return try {
            var session = auth.currentSessionOrNull()
            if (session == null) {
                kotlinx.coroutines.delay(500)
                session = auth.currentSessionOrNull()
            }
            if (session == null) {
                AuthState.Unauthenticated
            } else {
                val userId = session.user?.id ?: return AuthState.Unauthenticated
                val email = session.user?.email
                val profile = fetchProfile(userId)
                AuthState.Authenticated(userId, email, profile)
            }
        } catch (e: Exception) {
            AuthState.Unauthenticated
        }
    }

    suspend fun refreshSession(): AuthState {
        return try {
            val session = auth.currentSessionOrNull()
            if (session != null) {
                val refreshedSession = auth.refreshSession(session.refreshToken)
                val userId = refreshedSession.user?.id ?: return AuthState.Unauthenticated
                val email = refreshedSession.user?.email
                val profile = fetchProfile(userId)
                AuthState.Authenticated(userId, email, profile)
            } else {
                getCurrentUser()
            }
        } catch (e: Exception) {
            AuthState.Unauthenticated
        }
    }

    private suspend fun fetchProfile(userId: String): Profile? {
        return try {
            postgrest.from("profiles")
                .select(Columns.raw("id, full_name, email, avatar_url, role, handicap_index, created_at, updated_at")) {
                    filter { eq("id", userId) }
                }
                .decodeList<Profile>()
                .firstOrNull()
        } catch (e: Exception) {
            null
        }
    }
}
