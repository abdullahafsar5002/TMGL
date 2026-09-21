package com.tmgl.league

import com.tmgl.league.data.model.*
import com.tmgl.league.data.repository.ScoringFormatsRepository
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class ScoringFormatsRepositoryTest {

    private lateinit var repository: ScoringFormatsRepository

    @Before
    fun setup() {
        repository = ScoringFormatsRepository()
    }

    @Test
    fun `stableford birdie gives 3 points`() {
        val points = repository.calculateStableford(holeScore = 3, par = 4)
        assertEquals(3, points)
    }

    @Test
    fun `stableford par gives 2 points`() {
        val points = repository.calculateStableford(holeScore = 4, par = 4)
        assertEquals(2, points)
    }

    @Test
    fun `stableford bogey gives 1 point`() {
        val points = repository.calculateStableford(holeScore = 5, par = 4)
        assertEquals(1, points)
    }

    @Test
    fun `stableford eagle gives 4 points`() {
        val points = repository.calculateStableford(holeScore = 2, par = 4)
        assertEquals(4, points)
    }

    @Test
    fun `stableford double eagle gives 5 points`() {
        val points = repository.calculateStableford(holeScore = 1, par = 4)
        assertEquals(5, points)
    }

    @Test
    fun `stableford double bogey gives 0 points`() {
        val points = repository.calculateStableford(holeScore = 6, par = 4)
        assertEquals(0, points)
    }

    @Test
    fun `match play player1 wins`() {
        val result = repository.calculateMatchPlay(
            holeScores1 = listOf(3, 4, 5),
            holeScores2 = listOf(4, 5, 5)
        )
        assertEquals(2, result.player1Wins)
        assertEquals(0, result.player2Wins)
    }

    @Test
    fun `match play all square`() {
        val result = repository.calculateMatchPlay(
            holeScores1 = listOf(4, 4, 4),
            holeScores2 = listOf(4, 4, 4)
        )
        assertEquals(0, result.player1Wins)
        assertEquals(0, result.player2Wins)
        assertEquals("All square", result.status)
    }

    @Test
    fun `match play player2 wins`() {
        val result = repository.calculateMatchPlay(
            holeScores1 = listOf(5, 5, 5),
            holeScores2 = listOf(4, 4, 4)
        )
        assertEquals(0, result.player1Wins)
        assertEquals(3, result.player2Wins)
    }

    @Test
    fun `nassau front 9 player1 up`() {
        val result = repository.calculateNassau(
            front9Scores1 = listOf(4, 4, 3, 5, 4, 4, 3, 5, 4),
            back9Scores1 = listOf(4, 4, 4, 4, 4, 4, 4, 4, 4),
            front9Scores2 = listOf(5, 5, 4, 5, 5, 5, 4, 5, 5),
            back9Scores2 = listOf(4, 4, 4, 4, 4, 4, 4, 4, 4),
            pars = listOf(4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4)
        )
        assertTrue(result.front9 < 0)
    }

    @Test
    fun `net score calculation`() {
        val net = repository.getNetScore(grossScore = 80, handicap = 12.0)
        assertEquals(68, net)
    }

    @Test
    fun `best ball takes lowest score`() {
        val best = repository.calculateBestBall(
            teamScores = listOf(listOf(4, 5, 3), listOf(5, 4, 4))
        )
        assertEquals(3, best)
    }

    @Test
    fun `getScoreDisplay for stroke play`() {
        val display = repository.getScoreDisplay(score = 4, par = 4, format = ScoringFormat.STROKE_PLAY)
        assertEquals("4", display)
    }

    @Test
    fun `getScoreDisplay for stableford`() {
        val display = repository.getScoreDisplay(score = 3, par = 4, format = ScoringFormat.STABLEFORD)
        assertEquals("3 pts", display)
    }
}
