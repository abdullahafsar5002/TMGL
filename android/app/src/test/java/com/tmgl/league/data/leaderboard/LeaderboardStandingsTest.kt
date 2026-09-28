package com.tmgl.league.data.leaderboard

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LeaderboardStandingsTest {

    private fun info(id: String, name: String, handicap: Double?) =
        LeaderboardStandings.PlayerInfo(playerId = id, fullName = name, handicapIndex = handicap)

    private fun total(id: String, gross: Int, holes: Int, toPar: Int) =
        LeaderboardStandings.GrossTotal(
            playerId = id,
            grossStrokes = gross,
            holesCompleted = holes,
            toPar = toPar,
            scorecardId = "sc-$id"
        )

    @Test
    fun `allowance is the full handicap over eighteen holes`() {
        assertEquals(12, LeaderboardStandings.handicapAllowance(12.0, 18))
        assertEquals(12, LeaderboardStandings.handicapAllowance(12.4, 18))
        assertEquals(12, LeaderboardStandings.handicapAllowance(12.9, 25))
    }

    @Test
    fun `allowance is pro rated for a partial round`() {
        assertEquals(6, LeaderboardStandings.handicapAllowance(12.0, 9))
        assertEquals(3, LeaderboardStandings.handicapAllowance(12.0, 5))
        assertEquals(0, LeaderboardStandings.handicapAllowance(12.0, 0))
    }

    @Test
    fun `zero and unknown handicaps get no allowance`() {
        assertEquals(0, LeaderboardStandings.handicapAllowance(0.0, 18))
        assertEquals(0, LeaderboardStandings.handicapAllowance(null, 18))
    }

    @Test
    fun `net strokes subtract the handicap from the gross`() {
        assertEquals(70, LeaderboardStandings.netStrokes(82, 12.0, 18))
        assertEquals(72, LeaderboardStandings.netStrokes(72, 0.0, 18))
        assertEquals(72, LeaderboardStandings.netStrokes(72, null, 18))
        assertEquals(6, LeaderboardStandings.netStrokes(12, 12.0, 9))
    }

    @Test
    fun `net to par subtracts the handicap from the to par total`() {
        assertEquals(4, LeaderboardStandings.netToPar(16, 12.0, 18))
        assertEquals(1, LeaderboardStandings.netToPar(7, 12.0, 9))
        assertEquals(7, LeaderboardStandings.netToPar(7, null, 18))
    }

    @Test
    fun `standings rank by net and then by gross`() {
        val standings = LeaderboardStandings.build(
            players = listOf(
                info("p1", "Alpha", 10.0),
                info("p2", "Bravo", 0.0),
                info("p3", "Charlie", 4.0)
            ),
            totals = listOf(
                total("p1", 84, 18, 12),
                total("p2", 78, 18, 6),
                total("p3", 80, 18, 8)
            )
        )
        assertEquals(listOf("p1", "p3", "p2"), standings.map { it.playerId })
        assertEquals(listOf(1, 2, 3), standings.map { it.position })
        assertEquals(listOf(74, 76, 78), standings.map { it.netStrokes })
        assertEquals(listOf(2, 4, 6), standings.map { it.netToPar })
    }

    @Test
    fun `equal net and equal gross share a competition position`() {
        val standings = LeaderboardStandings.build(
            players = listOf(
                info("p1", "Alpha", 0.0),
                info("p2", "Bravo", 0.0),
                info("p3", "Charlie", 0.0),
                info("p4", "Delta", 0.0),
                info("p5", "Echo", 0.0)
            ),
            totals = listOf(
                total("p1", 70, 18, -2),
                total("p2", 72, 18, 0),
                total("p3", 72, 18, 0),
                total("p4", 74, 18, 2),
                total("p5", 76, 18, 4)
            )
        )
        assertEquals(listOf(1, 2, 2, 4, 5), standings.map { it.position })
        assertEquals(listOf("p1", "p2", "p3", "p4", "p5"), standings.map { it.playerId })
    }

    @Test
    fun `higher handicap wins the same gross score`() {
        val standings = LeaderboardStandings.build(
            players = listOf(
                info("scratch", "Scratch Golfer", 0.0),
                info("high", "High Marker", 24.0)
            ),
            totals = listOf(
                total("scratch", 84, 18, 12),
                total("high", 84, 18, 12)
            )
        )
        assertEquals(listOf("high", "scratch"), standings.map { it.playerId })
        assertEquals(listOf(60, 84), standings.map { it.netStrokes })
        assertEquals(listOf(1, 2), standings.map { it.position })
    }

    @Test
    fun `partial rounds apply a pro rated handicap allowance`() {
        val standings = LeaderboardStandings.build(
            players = listOf(
                info("finished", "Finished", 10.0),
                info("partial", "Partial", 20.0)
            ),
            totals = listOf(
                total("finished", 80, 18, 8),
                total("partial", 38, 9, 2)
            )
        )
        assertEquals("partial", standings[0].playerId)
        assertEquals(10, standings[0].handicapAllowance)
        assertEquals(28, standings[0].netStrokes)
        assertEquals(9, standings[0].holesCompleted)
        assertEquals(10, standings[1].handicapAllowance)
        assertEquals(70, standings[1].netStrokes)
        assertEquals(18, standings[1].holesCompleted)
    }

    @Test
    fun `unknown player falls back to a placeholder name and zero handicap`() {
        val standings = LeaderboardStandings.build(
            players = emptyList(),
            totals = listOf(total("ghost", 80, 18, 8))
        )
        assertEquals("Player", standings.single().playerName)
        assertEquals(80, standings.single().netStrokes)
        assertEquals(1, standings.single().position)
    }

    @Test
    fun `no totals produces no standings`() {
        assertTrue(LeaderboardStandings.build(listOf(info("p1", "Alpha", 1.0)), emptyList()).isEmpty())
    }

    @Test
    fun `equal net with different gross does not share a position`() {
        val standings = LeaderboardStandings.build(
            players = listOf(
                info("p1", "Alpha", 10.0),
                info("p2", "Bravo", 0.0)
            ),
            totals = listOf(
                total("p1", 84, 18, 12),
                total("p2", 74, 18, 2)
            )
        )
        assertEquals(listOf(74, 74), standings.map { it.netStrokes })
        assertEquals(listOf(1, 2), standings.map { it.position })
    }

    @Test
    fun `scorecard identifiers are carried through to the standings`() {
        val standings = LeaderboardStandings.build(
            players = listOf(info("p1", "Alpha", 5.0)),
            totals = listOf(total("p1", 80, 18, 8))
        )
        assertEquals("sc-p1", standings.single().scorecardId)
    }
}
