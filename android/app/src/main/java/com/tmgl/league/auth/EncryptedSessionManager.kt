package com.tmgl.league.auth

import io.github.jan.supabase.gotrue.SessionManager
import io.github.jan.supabase.gotrue.user.UserSession

class EncryptedSessionManager(
    private val storage: EncryptedAuthStorage
) : SessionManager {

    override suspend fun saveSession(session: UserSession) {
        storage.saveSession(session)
    }

    override suspend fun loadSession(): UserSession? = storage.loadSession()

    override suspend fun deleteSession() {
        storage.clearSession()
    }
}
