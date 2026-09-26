package com.tmgl.league

import com.tmgl.league.data.model.TournamentStatus
import org.junit.Assert.*
import org.junit.Test

class TournamentStatusTest {

    @Test
    fun `tournament has all required statuses`() {
        val statuses = TournamentStatus.entries
        assertEquals(6, statuses.size)
        assertTrue(statuses.contains(TournamentStatus.DRAFT))
        assertTrue(statuses.contains(TournamentStatus.OPEN))
        assertTrue(statuses.contains(TournamentStatus.CLOSED))
        assertTrue(statuses.contains(TournamentStatus.LIVE))
        assertTrue(statuses.contains(TournamentStatus.COMPLETED))
        assertTrue(statuses.contains(TournamentStatus.CANCELLED))
    }

    @Test
    fun `draft is initial status`() {
        assertEquals("draft", TournamentStatus.DRAFT.name.lowercase())
    }

    @Test
    fun `completed is terminal status`() {
        assertEquals("completed", TournamentStatus.COMPLETED.name.lowercase())
    }

    @Test
    fun `status enum ordinals are correct`() {
        assertEquals(0, TournamentStatus.DRAFT.ordinal)
        assertEquals(1, TournamentStatus.OPEN.ordinal)
        assertEquals(2, TournamentStatus.CLOSED.ordinal)
        assertEquals(3, TournamentStatus.LIVE.ordinal)
        assertEquals(4, TournamentStatus.COMPLETED.ordinal)
        assertEquals(5, TournamentStatus.CANCELLED.ordinal)
    }

    @Test
    fun `tournament defaults to draft status`() {
        val tournament = com.tmgl.league.data.model.Tournament()
        assertEquals(TournamentStatus.DRAFT, tournament.status)
    }

    @Test
    fun `tournament can have open status`() {
        val tournament = com.tmgl.league.data.model.Tournament(
            name = "Test Open",
            status = TournamentStatus.OPEN
        )
        assertEquals(TournamentStatus.OPEN, tournament.status)
    }

    @Test
    fun `tournament can be cancelled`() {
        val tournament = com.tmgl.league.data.model.Tournament(
            name = "Cancelled Event",
            status = TournamentStatus.CANCELLED
        )
        assertEquals(TournamentStatus.CANCELLED, tournament.status)
    }

    @Test
    fun `match status has 4 entries`() {
        val statuses = com.tmgl.league.data.model.MatchStatus.entries
        assertEquals(4, statuses.size)
        assertTrue(statuses.contains(com.tmgl.league.data.model.MatchStatus.SCHEDULED))
        assertTrue(statuses.contains(com.tmgl.league.data.model.MatchStatus.LIVE))
        assertTrue(statuses.contains(com.tmgl.league.data.model.MatchStatus.COMPLETED))
        assertTrue(statuses.contains(com.tmgl.league.data.model.MatchStatus.CANCELLED))
    }

    @Test
    fun `scorecard status has 6 entries`() {
        val statuses = com.tmgl.league.data.model.ScorecardStatus.entries
        assertEquals(6, statuses.size)
    }

    @Test
    fun `season status has 4 entries`() {
        val statuses = com.tmgl.league.data.model.SeasonStatus.entries
        assertEquals(4, statuses.size)
    }
}
