package com.tmgl.league

import com.tmgl.league.auth.EncryptedAuthStorage
import io.github.jan.supabase.gotrue.user.UserInfo
import io.github.jan.supabase.gotrue.user.UserSession
import kotlinx.datetime.Instant
import org.junit.Assert.*
import org.junit.Test

class EncryptedSessionStorageTest {

    private val expiresAt = Instant.parse("2026-01-01T00:00:00Z")

    private fun session(accessToken: String = "access-token", refreshToken: String = "refresh-token"): UserSession {
        val user = UserInfo(
            id = "user-1",
            aud = "authenticated",
            email = "player@example.com"
        )
        return UserSession(
            accessToken = accessToken,
            refreshToken = refreshToken,
            providerRefreshToken = null,
            providerToken = null,
            expiresIn = 3600L,
            tokenType = "bearer",
            user = user,
            type = "session",
            expiresAt = expiresAt
        )
    }

    @Test
    fun `stored session survives a save and load round trip`() {
        val original = session()
        val restored = EncryptedAuthStorage.decodeSession(EncryptedAuthStorage.encodeSession(original))

        assertEquals(original, restored)
        assertEquals("access-token", restored.accessToken)
        assertEquals("refresh-token", restored.refreshToken)
        assertEquals("user-1", restored.user?.id)
        assertEquals("player@example.com", restored.user?.email)
        assertEquals(expiresAt, restored.expiresAt)
    }

    @Test
    fun `rotated refresh token is persisted`() {
        val restored = EncryptedAuthStorage.decodeSession(
            EncryptedAuthStorage.encodeSession(session(refreshToken = "rotated-refresh-token"))
        )

        assertEquals("rotated-refresh-token", restored.refreshToken)
    }

    @Test
    fun `corrupted session payload is rejected`() {
        assertThrows(Exception::class.java) {
            EncryptedAuthStorage.decodeSession("not-json")
        }
    }
}
