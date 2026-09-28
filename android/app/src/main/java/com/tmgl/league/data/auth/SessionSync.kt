package com.tmgl.league.data.auth

import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Profile
import com.tmgl.league.data.repository.AuthState
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.SignOutScope
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.user.UserSession

data class SessionSnapshot(
    val userId: String,
    val email: String?,
    val expiresAtMillis: Long
)

object SessionSync {

    const val REFRESH_WINDOW_MILLIS = 5L * 60L * 1000L

    @Volatile
    private var cachedUserId: String? = null

    @Volatile
    private var cachedEmail: String? = null

    fun cachedAuthUserId(): String? = cachedUserId

    fun cachedEmail(): String? = cachedEmail

    fun clearCache() {
        cachedUserId = null
        cachedEmail = null
    }

    fun needsRefresh(expiresAtMillis: Long, nowMillis: Long, windowMillis: Long = REFRESH_WINDOW_MILLIS): Boolean {
        if (expiresAtMillis <= 0L) return true
        return nowMillis + windowMillis >= expiresAtMillis
    }

    fun toAuthState(snapshot: SessionSnapshot?, profile: Profile?): AuthState {
        if (snapshot == null || snapshot.userId.isBlank()) return AuthState.Unauthenticated
        return AuthState.Authenticated(snapshot.userId, snapshot.email, profile)
    }

    fun authUserId(client: SupabaseClient = SupabaseConfig.client): String? =
        client.auth.currentUserOrNull()?.id ?: cachedUserId

    fun snapshot(client: SupabaseClient = SupabaseConfig.client): SessionSnapshot? {
        val session = client.auth.currentSessionOrNull()
        val userId = session?.user?.id ?: cachedUserId
        if (userId.isNullOrBlank()) return null
        return SessionSnapshot(
            userId = userId,
            email = session?.user?.email ?: cachedEmail,
            expiresAtMillis = session?.expiresAt?.toEpochMilliseconds() ?: 0L
        )
    }

    fun persist(client: SupabaseClient, session: UserSession, storage: EncryptedAuthStorage) {
        val userId = session.user?.id ?: client.auth.currentUserOrNull()?.id
        val email = session.user?.email
        val expiresAt = session.expiresAt?.toEpochMilliseconds() ?: 0L
        if (!userId.isNullOrBlank()) {
            cachedUserId = userId
            if (!email.isNullOrBlank()) cachedEmail = email
            storage.saveSession(
                accessToken = session.accessToken,
                refreshToken = session.refreshToken,
                userId = userId,
                email = email ?: cachedEmail,
                expiresAtMillis = expiresAt
            )
        }
    }

    suspend fun importStoredSession(
        storage: EncryptedAuthStorage,
        client: SupabaseClient = SupabaseConfig.client
    ): Boolean {
        val stored = storage.getSession() ?: return false
        if (client.auth.currentSessionOrNull()?.accessToken == stored.accessToken) {
            cachedUserId = stored.userId
            cachedEmail = stored.email
            return true
        }
        client.auth.importAuthToken(
            accessToken = stored.accessToken,
            refreshToken = stored.refreshToken,
            retrieveUser = true,
            autoRefresh = false
        )
        cachedUserId = stored.userId
        cachedEmail = stored.email
        return true
    }

    suspend fun restore(
        storage: EncryptedAuthStorage,
        client: SupabaseClient = SupabaseConfig.client,
        nowMillis: Long = System.currentTimeMillis()
    ): Boolean {
        if (!importStoredSession(storage, client)) return false
        val stored = storage.getSession() ?: return false
        return if (needsRefresh(stored.expiresAtMillis, nowMillis)) {
            refresh(storage, client)
        } else {
            true
        }
    }

    suspend fun refresh(
        storage: EncryptedAuthStorage,
        client: SupabaseClient = SupabaseConfig.client
    ): Boolean {
        val stored = storage.getSession() ?: return false
        if (stored.refreshToken.isBlank()) {
            clearSession(storage, client)
            return false
        }
        return try {
            val refreshed = client.auth.refreshSession(stored.refreshToken)
            client.auth.importSession(refreshed)
            persist(client, refreshed, storage)
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun clearSession(storage: EncryptedAuthStorage, client: SupabaseClient = SupabaseConfig.client) {
        try {
            client.auth.clearSession()
        } catch (_: Exception) {
        }
        storage.clearSession()
        clearCache()
    }

    suspend fun signOut(
        storage: EncryptedAuthStorage,
        client: SupabaseClient = SupabaseConfig.client,
        onAuthenticatedCleanup: suspend () -> Unit = {}
    ) {
        try {
            client.auth.signOut(SignOutScope.GLOBAL)
        } catch (_: Exception) {
        }
        try {
            onAuthenticatedCleanup()
        } finally {
            clearSession(storage, client)
        }
    }
}
