package com.tmgl.league

import com.tmgl.league.data.model.UserRole
import com.tmgl.league.data.model.Profile
import com.tmgl.league.data.repository.AuthState
import org.junit.Assert.*
import org.junit.Test

class AuthRepositoryTest {

    @Test
    fun `auth state loading is initial state`() {
        val state = AuthState.Loading
        assertTrue(state is AuthState.Loading)
    }

    @Test
    fun `unauthenticated state has no user`() {
        val state = AuthState.Unauthenticated
        assertTrue(state is AuthState.Unauthenticated)
    }

    @Test
    fun `authenticated state contains user data`() {
        val state = AuthState.Authenticated(
            userId = "test-123",
            email = "test@example.com",
            profile = null
        )
        assertTrue(state is AuthState.Authenticated)
        assertEquals("test-123", (state as AuthState.Authenticated).userId)
        assertEquals("test@example.com", state.email)
    }

    @Test
    fun `authenticated state with profile`() {
        val profile = Profile(
            id = "test-123",
            fullName = "John Doe",
            handicapIndex = 12.5,
            role = UserRole.PLAYER
        )
        val state = AuthState.Authenticated(
            userId = "test-123",
            email = "test@example.com",
            profile = profile
        )
        val auth = state as AuthState.Authenticated
        assertNotNull(auth.profile)
        assertEquals("John Doe", auth.profile?.fullName)
        assertEquals(12.5, auth.profile?.handicapIndex ?: 0.0, 0.01)
    }

    @Test
    fun `authenticated state with null email`() {
        val state = AuthState.Authenticated(
            userId = "test-456",
            email = null,
            profile = null
        )
        val auth = state as AuthState.Authenticated
        assertNull(auth.email)
        assertEquals("test-456", auth.userId)
    }

    @Test
    fun `loading and unauthenticated are different types`() {
        val loading = AuthState.Loading
        val unauth = AuthState.Unauthenticated
        assertFalse(loading == unauth)
    }

    @Test
    fun `loading and authenticated are different types`() {
        val loading = AuthState.Loading
        val auth = AuthState.Authenticated("id", "e@e.com", null)
        assertFalse(loading == auth)
    }

    @Test
    fun `auth result success`() {
        val result = com.tmgl.league.data.repository.AuthResult.Success
        assertTrue(result is com.tmgl.league.data.repository.AuthResult.Success)
    }

    @Test
    fun `auth result error contains message`() {
        val result = com.tmgl.league.data.repository.AuthResult.Error("Sign in failed")
        assertTrue(result is com.tmgl.league.data.repository.AuthResult.Error)
        assertEquals("Sign in failed", (result as com.tmgl.league.data.repository.AuthResult.Error).message)
    }

    @Test
    fun `authenticated states are equal when same values`() {
        val state1 = AuthState.Authenticated("id", "e@e.com", null)
        val state2 = AuthState.Authenticated("id", "e@e.com", null)
        assertEquals(state1.userId, state2.userId)
        assertEquals(state1.email, state2.email)
    }
}
