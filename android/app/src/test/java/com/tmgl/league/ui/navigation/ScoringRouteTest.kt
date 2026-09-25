package com.tmgl.league.ui.navigation

import com.tmgl.league.data.model.ScoringTarget
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ScoringRouteTest {

    @Test
    fun `tournament round entry keeps the round id in the route`() {
        val route = Screen.Scoring.createRoute(
            ScoringTarget(roundId = "round-1", playerId = "player-1")
        )

        assertEquals("scoring?round_id=round-1&player_id=player-1", route)
    }

    @Test
    fun `route round trips the full target`() {
        val target = ScoringTarget(
            roundId = "round-1",
            playerId = "player-1",
            matchId = "match-1",
            scorecardId = "scorecard-1"
        )

        val route = Screen.Scoring.createRoute(target)
        val parsed = Screen.Scoring.parseTarget(
            roundId = queryValue(route, "round_id"),
            playerId = queryValue(route, "player_id"),
            matchId = queryValue(route, "match_id"),
            scorecardId = queryValue(route, "scorecard_id")
        )

        assertEquals(target, parsed)
    }

    @Test
    fun `match entry carries the match id and the player id`() {
        val route = Screen.Scoring.createRoute(ScoringTarget(playerId = "player-1", matchId = "match-1"))

        assertEquals("scoring?player_id=player-1&match_id=match-1", route)
    }

    @Test
    fun `target without identifiers is not resolvable`() {
        assertNull(Screen.Scoring.parseTarget(null, null, null, null))
        assertNull(Screen.Scoring.parseTarget("", "", "", ""))
    }

    @Test
    fun `scorecard only target is resolvable`() {
        val parsed = Screen.Scoring.parseTarget(null, null, null, "scorecard-1")

        assertEquals("scorecard-1", parsed?.scorecardId)
    }

    private fun queryValue(route: String, key: String): String? =
        route.substringAfter('?')
            .split('&')
            .map { it.substringBefore('=') to it.substringAfter('=', "") }
            .firstOrNull { it.first == key }
            ?.second
            ?.takeIf { it.isNotEmpty() }
}
