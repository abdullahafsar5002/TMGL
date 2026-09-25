package com.tmgl.league.data.competition

import com.tmgl.league.data.model.TournamentRegistration
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TournamentRegistrationAccessTest {

    private val profileId = "auth-user-uuid"
    private val playerId = "players-row-uuid"

    @Test
    fun `registration is matched by the resolved players id`() {
        val state = resolveTournamentRegistrationState(
            registrations = listOf(
                registration("reg-1", "other-player"),
                registration("reg-2", playerId)
            ),
            playerId = playerId,
            isAuthenticated = true
        )

        assertEquals("reg-2", state.registrationId)
        assertEquals(playerId, state.playerId)
        assertTrue(state.isRegistered)
        assertEquals(2, state.playerCount)
    }

    @Test
    fun `auth user id is not accepted as the player id`() {
        val state = resolveTournamentRegistrationState(
            registrations = listOf(registration("reg-1", profileId)),
            playerId = playerId,
            isAuthenticated = true
        )

        assertNull(state.registrationId)
        assertFalse(state.isRegistered)
        assertEquals(1, state.playerCount)
    }

    @Test
    fun `blank player id is never registered`() {
        val state = resolveTournamentRegistrationState(
            registrations = listOf(registration("reg-1", playerId)),
            playerId = "   ",
            isAuthenticated = true
        )

        assertNull(state.playerId)
        assertFalse(state.isRegistered)
        assertEquals(1, state.playerCount)
    }

    @Test
    fun `anonymous viewers see the player count but no registration`() {
        val state = resolveTournamentRegistrationState(
            registrations = listOf(
                registration("reg-1", playerId),
                registration("reg-2", "other-player")
            ),
            playerId = null,
            isAuthenticated = false
        )

        assertEquals(2, state.playerCount)
        assertFalse(state.isRegistered)
        assertFalse(canChangeTournamentRegistration(state))
        assertFalse(canEnterTournamentScores(state, canManageTournament = false))
    }

    @Test
    fun `player id is trimmed before matching`() {
        val state = resolveTournamentRegistrationState(
            registrations = listOf(registration("reg-1", playerId)),
            playerId = " $playerId ",
            isAuthenticated = true
        )

        assertEquals(playerId, state.playerId)
        assertTrue(state.isRegistered)
    }

    @Test
    fun `registered player can enter scores for a round`() {
        val state = registeredPlayer()

        assertTrue(canChangeTournamentRegistration(state))
        assertTrue(canEnterTournamentScores(state, canManageTournament = false))
    }

    @Test
    fun `authenticated player who never joined cannot enter scores`() {
        val state = resolveTournamentRegistrationState(
            registrations = listOf(registration("reg-1", "other-player")),
            playerId = playerId,
            isAuthenticated = true
        )

        assertTrue(canChangeTournamentRegistration(state))
        assertFalse(state.isRegistered)
        assertFalse(canEnterTournamentScores(state, canManageTournament = false))
    }

    @Test
    fun `player id without a session cannot join or leave`() {
        val state = resolveTournamentRegistrationState(
            registrations = emptyList(),
            playerId = playerId,
            isAuthenticated = false
        )

        assertFalse(canChangeTournamentRegistration(state))
        assertFalse(canEnterTournamentScores(state, canManageTournament = false))
    }

    @Test
    fun `session without a player record cannot join`() {
        val state = resolveTournamentRegistrationState(
            registrations = emptyList(),
            playerId = null,
            isAuthenticated = true
        )

        assertFalse(canChangeTournamentRegistration(state))
        assertFalse(canEnterTournamentScores(state, canManageTournament = false))
    }

    @Test
    fun `managers can enter scores without being registered`() {
        val unregisteredManager = resolveTournamentRegistrationState(
            registrations = emptyList(),
            playerId = playerId,
            isAuthenticated = true
        )

        assertTrue(canEnterTournamentScores(unregisteredManager, canManageTournament = true))
    }

    @Test
    fun `managers can enter scores without a session`() {
        val signedOutManager = TournamentRegistrationState()

        assertTrue(canEnterTournamentScores(signedOutManager, canManageTournament = true))
        assertFalse(canChangeTournamentRegistration(signedOutManager))
    }

    private fun registeredPlayer(): TournamentRegistrationState = resolveTournamentRegistrationState(
        registrations = listOf(registration("reg-1", playerId)),
        playerId = playerId,
        isAuthenticated = true
    )

    private fun registration(id: String, player: String) = TournamentRegistration(
        id = id,
        tournamentId = "tournament-1",
        playerId = player
    )
}
