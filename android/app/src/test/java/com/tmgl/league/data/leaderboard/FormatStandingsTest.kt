package com.tmgl.league.data.leaderboard

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class FormatStandingsTest {

    private val pars = (1..18).associateWith { 4 }

    private fun unit(id: String, vararg playerIds: String) = FormatStandings.Unit(
        id = id,
        label = playerIds.joinToString(" / "),
        playerIds = playerIds.toList(),
        playerNames = playerIds.map { it.uppercase() },
        handicapAllowance = 0
    )

    private fun score(playerId: String, holeNumber: Int, strokes: Int) =
        FormatStandings.HoleScore(playerId, holeNumber, strokes)

    private fun fullRound(playerId: String, strokesFor: (Int) -> Int): List<FormatStandings.HoleScore> =
        (1..18).map { score(playerId, it, strokesFor(it)) }

    private fun member(
        playerId: String,
        pairingNo: Int,
        handicap: Double = 8.0,
        flightId: String? = null
    ) = FormatStandings.PairMember(playerId, playerId, handicap, pairingNo, flightId)

    @Test
    fun `takes the lowest score inside the unit`() {
        val team = unit("pair-1", "a", "b")
        assertEquals(
            4,
            FormatStandings.bestScoreForHole(listOf(score("a", 1, 5), score("b", 1, 4)), team)
        )
    }

    @Test
    fun `ignores players outside the unit`() {
        val team = unit("pair-1", "a", "b")
        assertEquals(
            5,
            FormatStandings.bestScoreForHole(listOf(score("c", 1, 3), score("a", 1, 5)), team)
        )
    }

    @Test
    fun `returns null when nobody in the unit has played`() {
        val team = unit("pair-1", "a", "b")
        assertNull(FormatStandings.bestScoreForHole(listOf(score("c", 1, 3)), team))
    }

    @Test
    fun `counts one hole per unit using the best score`() {
        val team = unit("pair-1", "a", "b")
        val scores = fullRound("a") { 5 } + fullRound("b") { 4 }
        val summary = FormatStandings.summarisePair(team, scores, pars)
        assertEquals(18, summary.holesPlayed)
        assertEquals(0, summary.strokesToPar)
    }

    @Test
    fun `marks holes nobody played as unplayed`() {
        val team = unit("pair-1", "a", "b")
        val summary = FormatStandings.summarisePair(team, listOf(score("a", 1, 4), score("b", 2, 3)), pars)
        assertEquals(2, summary.holesPlayed)
        assertNull(summary.holes[2].bestScore)
    }

    @Test
    fun `subtracts the handicap allowance before the cut`() {
        val team = unit("pair-1", "a", "b").copy(handicapAllowance = 18)
        val scores = fullRound("a") { 4 } + fullRound("b") { 4 }
        assertEquals(-18, FormatStandings.summarisePair(team, scores, pars).netToPar)
    }

    @Test
    fun `prorates the allowance for a partial round`() {
        val team = unit("pair-1", "a", "b").copy(handicapAllowance = 18)
        val scores = (1..9).map { score("a", it, 4) }
        assertEquals(-9, FormatStandings.summarisePair(team, scores, pars).netToPar)
    }

    @Test
    fun `wins a hole on the lower pair score`() {
        val a = unit("pair-1", "a1", "a2")
        val b = unit("pair-2", "b1", "b2")
        val scores = fullRound("a1") { 3 } + fullRound("a2") { 3 } + fullRound("b1") { 4 } + fullRound("b2") { 4 }
        val results = FormatStandings.computeMatchPlay(listOf(a, b), scores, pars)
        assertEquals(18, results[0].holesWon)
        assertEquals(18, results[1].holesLost)
    }

    @Test
    fun `never pairs a pair with one from another match`() {
        val a = unit("pair-1", "a1", "a2")
        val b = unit("pair-2", "b1", "b2")
        val c = unit("pair-3", "c1", "c2")
        val results = FormatStandings.computeMatchPlay(listOf(a, b, c), fullRound("c1") { 2 }, pars)
        val third = results.first { it.unit.id == "pair-3" }
        assertEquals(0, third.holesWon + third.holesLost + third.holesTied)
    }

    @Test
    fun `splits nassau into front nine back nine and total`() {
        val a = unit("pair-1", "a1", "a2")
        val scores = (1..9).map { score("a1", it, 4) } + (10..18).map { score("a1", it, 5) }
        val result = FormatStandings.computeNassau(listOf(a), scores, pars)[0]
        assertEquals(0, result.frontNine)
        assertEquals(9, result.backNine)
        assertEquals(9, result.total)
    }

    @Test
    fun `returns null nassau segments for an unplayed nine`() {
        val a = unit("pair-1", "a1", "a2")
        val result = FormatStandings.computeNassau(listOf(a), (1..9).map { score("a1", it, 4) }, pars)[0]
        assertEquals(0, result.frontNine)
        assertNull(result.backNine)
        assertNull(result.total)
    }

    @Test
    fun `counts only the best score on each hole for a team`() {
        val team = unit("group-1", "a", "b")
        val scores = fullRound("a") { if (it <= 9) 4 else 6 } + fullRound("b") { if (it <= 9) 3 else 4 }
        val result = FormatStandings.computeBestBall(listOf(team), scores, pars)[0]
        assertEquals(18, result.eachHoleCounted)
        assertEquals(9 * 3 + 9 * 4, result.totalStrokes)
        assertEquals(-9, result.totalToPar)
    }

    @Test
    fun `numbers derived pairs in sequence so neighbours meet`() {
        val members = (1..8).map { member("p$it", it) }
        val pairs = FormatStandings.pairsFromPairings(members)
        assertEquals(listOf("pair-1", "pair-2", "pair-3", "pair-4"), pairs.map { it.id })
    }

    @Test
    fun `lets the first two derived pairs play each other`() {
        val members = (1..8).map { member("p$it", it) }
        val pairs = FormatStandings.pairsFromPairings(members)
        val scores = fullRound("p1") { 3 } + fullRound("p3") { 4 } + fullRound("p5") { 3 } + fullRound("p7") { 4 }
        val results = FormatStandings.computeMatchPlay(pairs, scores, pars)
        val first = results.first { it.unit.id == "pair-1" }
        val second = results.first { it.unit.id == "pair-2" }
        assertEquals(18, first.holesWon)
        assertEquals(18, second.holesLost)
        assertEquals("pair-1", FormatStandings.rankMatchPlay(results).rows.first().unitId)
    }

    @Test
    fun `keeps separate flights apart`() {
        val members = listOf(
            member("a", 1, flightId = "f1"),
            member("b", 2, flightId = "f1"),
            member("e", 1, flightId = "f2"),
            member("f", 2, flightId = "f2")
        )
        assertEquals(2, FormatStandings.pairsFromPairings(members).size)
    }

    @Test
    fun `drops a lone pairing number`() {
        assertEquals(0, FormatStandings.pairsFromPairings(listOf(member("a", 1))).size)
    }

    @Test
    fun `averages the two handicaps as the pair allowance`() {
        val members = listOf(member("a", 1, 2.0), member("b", 2, 6.0))
        assertEquals(4, FormatStandings.pairsFromPairings(members).first().handicapAllowance)
    }

    @Test
    fun `splits the field into scramble groups of four`() {
        val members = (1..9).map { member("p$it", it) }
        val groups = FormatStandings.scrambleGroups(members)
        assertEquals(2, groups.size)
        assertEquals(4, groups[0].playerIds.size)
        assertEquals(4, groups[1].playerIds.size)
    }

    @Test
    fun `builds two player teams for best ball`() {
        val members = (1..4).map { member("p$it", it) }
        val teams = FormatStandings.scrambleGroups(members, 2)
        assertEquals(2, teams.size)
        assertEquals(listOf("p1", "p2"), teams[0].playerIds)
    }

    @Test
    fun `resolves pairs for match play and groups for team formats`() {
        val members = listOf(
            member("a", 1), member("b", 2), member("c", 3), member("d", 4)
        )
        assertEquals(2, FormatStandings.resolveUnits("match_play", members).size)
        assertEquals(2, FormatStandings.resolveUnits("nassau", members).size)
        assertEquals(2, FormatStandings.resolveUnits("best_ball", members).size)
        assertEquals(1, FormatStandings.resolveUnits("scramble", members).size)
    }

    @Test
    fun `ranks match play by holes up and shares ties`() {
        val units = listOf(unit("pair-1", "a"), unit("pair-2", "b"), unit("pair-3", "c"), unit("pair-4", "d"))
        val scores = fullRound("a") { 4 } + fullRound("b") { 4 } + fullRound("c") { 5 } + fullRound("d") { 3 }
        val rows = FormatStandings.rankMatchPlay(FormatStandings.computeMatchPlay(units, scores, pars)).rows
        val byId = rows.associateBy { it.unitId }
        assertEquals(1, byId["pair-4"]!!.position)
        assertEquals(2, byId["pair-1"]!!.position)
        assertEquals(2, byId["pair-2"]!!.position)
        assertEquals(4, byId["pair-3"]!!.position)
        assertEquals("All square", byId["pair-1"]!!.displayValue)
        assertEquals("18 up", byId["pair-4"]!!.displayValue)
    }

    @Test
    fun `removes cut units from best ball and reports the skip`() {
        val units = listOf(unit("group-1", "a"), unit("group-2", "b"))
        val scores = fullRound("a") { 4 } + fullRound("b") { 6 }
        val ranked = FormatStandings.rankBestBall(
            FormatStandings.computeBestBall(units, scores, pars),
            setOf("group-1")
        )
        assertEquals(1, ranked.skipped)
        assertEquals(1, ranked.rows.size)
        assertEquals("group-2", ranked.rows.first().unitId)
    }

    @Test
    fun `numbers best ball positions by competition ranking`() {
        val results = listOf(
            FormatStandings.BestBallResult(unit("group-1", "a"), 70, -2, -2, 18, 18),
            FormatStandings.BestBallResult(unit("group-2", "b"), 72, 0, 0, 18, 18),
            FormatStandings.BestBallResult(unit("group-3", "c"), 72, 0, 0, 18, 18)
        )
        assertEquals(listOf(1, 2, 2), FormatStandings.rankBestBall(results).rows.map { it.position })
    }

    @Test
    fun `identifies which formats need units`() {
        assertTrue(FormatStandings.isUnitFormat("match_play"))
        assertTrue(FormatStandings.isUnitFormat("scramble"))
        assertTrue(!FormatStandings.isUnitFormat("stroke_play"))
        assertTrue(!FormatStandings.isUnitFormat("stableford"))
        assertTrue(FormatStandings.usesTeams("best_ball"))
        assertTrue(!FormatStandings.usesTeams("match_play"))
    }

    @Test
    fun `formats to par with a sign`() {
        assertEquals("E", FormatStandings.toParText(0))
        assertEquals("+3", FormatStandings.toParText(3))
        assertEquals("-4", FormatStandings.toParText(-4))
        assertEquals(4, abs(-4))
    }
}