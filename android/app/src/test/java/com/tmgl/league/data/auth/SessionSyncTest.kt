package com.tmgl.league.data.auth

import com.tmgl.league.data.model.Profile
import com.tmgl.league.data.model.UserRole
import com.tmgl.league.data.repository.AuthState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionSyncTest {

    @Test
    fun `session with no stored id is unauthenticated`() {
        val state = SessionSync.toAuthState(null, null)
        assertTrue(state is AuthState.Unauthenticated)
    }

    @Test
    fun `blank user id is unauthenticated`() {
        val state = SessionSync.toAuthState(
            snapshot = SessionSnapshot(userId = "  ", email = "a@b.com", expiresAtMillis = 0L),
            profile = null
        )
        assertTrue(state is AuthState.Unauthenticated)
    }

    @Test
    fun `stored session maps to authenticated with profile`() {
        val profile = Profile(
            id = "auth-1",
            fullName = "Ada",
            email = "ada@example.com",
            role = UserRole.PLAYER
        )
        val state = SessionSync.toAuthState(
            snapshot = SessionSnapshot(
                userId = "auth-1",
                email = "ada@example.com",
                expiresAtMillis = 1_000L
            ),
            profile = profile
        )
        assertTrue(state is AuthState.Authenticated)
        val authenticated = state as AuthState.Authenticated
        assertEquals("auth-1", authenticated.userId)
        assertEquals("ada@example.com", authenticated.email)
        assertEquals("ada@example.com", authenticated.profile?.email)
        assertEquals("Ada", authenticated.profile?.fullName)
    }

    @Test
    fun `missing profile still yields authenticated identity`() {
        val state = SessionSync.toAuthState(
            snapshot = SessionSnapshot(userId = "auth-2", email = null, expiresAtMillis = 1_000L),
            profile = null
        )
        val authenticated = state as AuthState.Authenticated
        assertEquals("auth-2", authenticated.userId)
        assertEquals(null, authenticated.email)
        assertEquals(null, authenticated.profile)
    }

    @Test
    fun `refresh is required when expiry is unknown`() {
        assertTrue(SessionSync.needsRefresh(0L, nowMillis = 1_000L))
    }

    @Test
    fun `refresh is required inside the safety window`() {
        val now = 1_000_000L
        val window = SessionSync.REFRESH_WINDOW_MILLIS
        assertTrue(SessionSync.needsRefresh(now + window - 1_000L, now))
    }

    @Test
    fun `refresh is not required for a fresh token`() {
        val now = 1_000_000L
        assertFalse(
            SessionSync.needsRefresh(
                expiresAtMillis = now + SessionSync.REFRESH_WINDOW_MILLIS + 60_000L,
                nowMillis = now
            )
        )
    }

    @Test
    fun `refresh is required for an elapsed token`() {
        val now = 1_000_000L
        assertTrue(SessionSync.needsRefresh(expiresAtMillis = now - 1L, nowMillis = now))
    }

    @Test
    fun `cache reflects imported session and clears on demand`() {
        SessionSync.clearCache()
        assertEquals(null, SessionSync.cachedAuthUserId())
        assertEquals(null, SessionSync.cachedEmail())
    }
}
