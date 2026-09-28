package com.tmgl.league.data.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScoreCalculationsTest {

    @Test
    fun `totals ignore holes without a score`() {
        val totals = ScoreCalculations.totals(
            listOf(
                HoleScoreInput(1, 4, 4),
                HoleScoreInput(2, 4, 0),
                HoleScoreInput(3, 3, 3)
            )
        )
        assertEquals(2, totals.holesScored)
        assertEquals(7, totals.totalStrokes)
        assertEquals(7, totals.totalPar)
        assertEquals(0, totals.totalToPar)
    }

    @Test
    fun `totals compute relative to par`() {
        val totals = ScoreCalculations.totals(
            listOf(
                HoleScoreInput(1, 4, 3),
                HoleScoreInput(2, 5, 6)
            )
        )
        assertEquals(2, totals.holesScored)
        assertEquals(9, totals.totalStrokes)
        assertEquals(9, totals.totalPar)
        assertEquals(0, totals.totalToPar)
    }

    @Test
    fun `under par round reports negative to par`() {
        val totals = ScoreCalculations.totals(
            listOf(
                HoleScoreInput(1, 4, 3),
                HoleScoreInput(2, 5, 4)
            )
        )
        assertEquals(-2, totals.totalToPar)
    }

    @Test
    fun `to par labels follow golf convention`() {
        assertEquals("E", ScoreCalculations.toParLabel(0))
        assertEquals("+3", ScoreCalculations.toParLabel(3))
        assertEquals("-2", ScoreCalculations.toParLabel(-2))
    }

    @Test
    fun `hole labels follow golf convention`() {
        assertEquals("Albatross", ScoreCalculations.holeLabel(1, 4))
        assertEquals("Eagle", ScoreCalculations.holeLabel(2, 4))
        assertEquals("Birdie", ScoreCalculations.holeLabel(3, 4))
        assertEquals("Eagle", ScoreCalculations.holeLabel(3, 5))
        assertEquals("Birdie", ScoreCalculations.holeLabel(4, 5))
        assertEquals("Par", ScoreCalculations.holeLabel(4, 4))
        assertEquals("Bogey", ScoreCalculations.holeLabel(5, 4))
        assertEquals("Double Bogey", ScoreCalculations.holeLabel(6, 4))
        assertEquals("+3", ScoreCalculations.holeLabel(7, 4))
    }

    @Test
    fun `score validation accepts the database range only`() {
        assertFalse(ScoreCalculations.isValidScore(0))
        assertTrue(ScoreCalculations.isValidScore(1))
        assertTrue(ScoreCalculations.isValidScore(20))
        assertFalse(ScoreCalculations.isValidScore(21))
    }

    @Test
    fun `net score subtracts the handicap allowance`() {
        assertEquals(68, ScoreCalculations.netScore(80, 12.0))
        assertEquals(75, ScoreCalculations.netScore(75, 0.0))
        assertEquals(73, ScoreCalculations.netScore(85, 12.7))
    }

    @Test
    fun `handicap allowance scales with holes played`() {
        assertEquals(6, ScoreCalculations.handicapAllowance(12.0, 9))
        assertEquals(12, ScoreCalculations.handicapAllowance(12.0, 18))
        assertEquals(0, ScoreCalculations.handicapAllowance(0.0, 18))
        assertEquals(0, ScoreCalculations.handicapAllowance(12.0, 0))
    }

    @Test
    fun `scorecard hole write only exposes canonical columns`() {
        val payload = ScorecardHoleWrite(
            scorecardId = "scorecard-1",
            holeNumber = 4,
            score = 5,
            par = 4
        ).payload()
        assertEquals(setOf("scorecard_id", "hole_number", "par", "strokes", "score_to_par"), payload.keys)
        assertEquals("scorecard-1", payload["scorecard_id"])
        assertEquals(4, payload["hole_number"])
        assertEquals(4, payload["par"])
        assertEquals(5, payload["strokes"])
        assertEquals(1, payload["score_to_par"])
    }
}
