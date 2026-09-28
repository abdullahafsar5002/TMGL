package com.tmgl.league

import com.tmgl.league.data.model.*
import com.tmgl.league.data.repository.ScoringFormatsRepository
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class ScoringFormatsAdvancedTest {

    private lateinit var repo: ScoringFormatsRepository

    @Before
    fun setup() {
        repo = ScoringFormatsRepository()
    }

    @Test
    fun `stableford triple bogey or worse gives 0`() {
        assertEquals(0, repo.calculateStableford(8, 4))
        assertEquals(0, repo.calculateStableford(10, 3))
    }

    @Test
    fun `stableford with custom points`() {
        val custom = StablefordPoints(
            doubleEagle = 6,
            eagle = 5,
            birdie = 4,
            par = 2,
            bogey = 1,
            doubleBogey = 0,
            tripleOrWorse = -1
        )
        assertEquals(6, repo.calculateStableford(1, 4, custom))
        assertEquals(-1, repo.calculateStableford(8, 4, custom))
    }

    @Test
    fun `stableford default points match standard scoring`() {
        val defaults = StablefordPoints()
        assertEquals(5, defaults.doubleEagle)
        assertEquals(4, defaults.eagle)
        assertEquals(3, defaults.birdie)
        assertEquals(2, defaults.par)
        assertEquals(1, defaults.bogey)
        assertEquals(0, defaults.doubleBogey)
        assertEquals(0, defaults.tripleOrWorse)
    }

    @Test
    fun `stableford par 3 hole`() {
        assertEquals(4, repo.calculateStableford(1, 3))
        assertEquals(3, repo.calculateStableford(2, 3))
        assertEquals(2, repo.calculateStableford(3, 3))
        assertEquals(1, repo.calculateStableford(4, 3))
        assertEquals(0, repo.calculateStableford(5, 3))
    }

    @Test
    fun `stableford par 5 hole`() {
        assertEquals(5, repo.calculateStableford(2, 5))
        assertEquals(4, repo.calculateStableford(3, 5))
        assertEquals(3, repo.calculateStableford(4, 5))
        assertEquals(2, repo.calculateStableford(5, 5))
        assertEquals(1, repo.calculateStableford(6, 5))
        assertEquals(0, repo.calculateStableford(7, 5))
    }

    @Test
    fun `match play with 18 holes completed`() {
        val p1 = listOf(4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4)
        val p2 = listOf(5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5, 4, 5, 5, 5)
        val result = repo.calculateMatchPlay(p1, p2)
        assertEquals(0, result.holesRemaining)
        assertEquals(14, result.player1Wins)
        assertEquals(0, result.player2Wins)
        assertTrue(result.status.contains("Player 1 wins"))
    }

    @Test
    fun `match play with partial holes`() {
        val p1 = listOf(4, 3, 4)
        val p2 = listOf(5, 4, 4)
        val result = repo.calculateMatchPlay(p1, p2)
        assertEquals(15, result.holesRemaining)
        assertEquals(2, result.player1Wins)
        assertEquals(0, result.player2Wins)
    }

    @Test
    fun `nassau tied match`() {
        val pars = listOf(4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4)
        val result = repo.calculateNassau(
            front9Scores1 = pars.take(9),
            back9Scores1 = pars.drop(9),
            front9Scores2 = pars.take(9),
            back9Scores2 = pars.drop(9),
            pars = pars
        )
        assertEquals(0, result.front9)
        assertEquals(0, result.back9)
        assertEquals(0, result.total)
        assertEquals("tied", result.front9Status)
    }

    @Test
    fun `nassau player1 wins front 9`() {
        val pars = listOf(4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4)
        val result = repo.calculateNassau(
            front9Scores1 = listOf(3, 3, 3, 3, 3, 3, 3, 3, 3),
            back9Scores1 = pars.drop(9),
            front9Scores2 = pars.take(9),
            back9Scores2 = pars.drop(9),
            pars = pars
        )
        assertEquals(-9, result.front9)
        assertEquals("Player 1 +9", result.front9Status)
    }

    @Test
    fun `nassau player2 wins total`() {
        val pars = listOf(4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4)
        val result = repo.calculateNassau(
            front9Scores1 = pars.take(9),
            back9Scores1 = pars.drop(9),
            front9Scores2 = listOf(3, 3, 3, 3, 3, 3, 3, 3, 3),
            back9Scores2 = listOf(3, 3, 3, 3, 3, 3, 3, 3, 3),
            pars = pars
        )
        assertEquals(18, result.total)
        assertEquals("Player 2 +18", result.totalStatus)
    }

    @Test
    fun `best ball with empty teams`() {
        assertEquals(0, repo.calculateBestBall(emptyList()))
    }

    @Test
    fun `best ball single team`() {
        assertEquals(3, repo.calculateBestBall(listOf(listOf(3, 4, 5))))
    }

    @Test
    fun `best ball takes lowest across teams`() {
        val result = repo.calculateBestBall(
            listOf(
                listOf(5, 6, 5),
                listOf(4, 4, 4),
                listOf(3, 5, 6)
            )
        )
        assertEquals(3, result)
    }

    @Test
    fun `net score with zero handicap`() {
        assertEquals(75, repo.getNetScore(75, 0.0))
    }

    @Test
    fun `net score with handicap`() {
        assertEquals(68, repo.getNetScore(80, 12.0))
    }

    @Test
    fun `net score with fractional handicap`() {
        assertEquals(73, repo.getNetScore(85, 12.7))
    }

    @Test
    fun `getScoreDisplay match play up`() {
        val display = repo.getScoreDisplay(3, 4, ScoringFormat.MATCH_PLAY)
        assertEquals("1 up", display)
    }

    @Test
    fun `getScoreDisplay match play down`() {
        val display = repo.getScoreDisplay(5, 4, ScoringFormat.MATCH_PLAY)
        assertEquals("1 down", display)
    }

    @Test
    fun `getScoreDisplay match play all square`() {
        val display = repo.getScoreDisplay(4, 4, ScoringFormat.MATCH_PLAY)
        assertEquals("AS", display)
    }

    @Test
    fun `getScoreDisplay stroke play`() {
        assertEquals("4", repo.getScoreDisplay(4, 4, ScoringFormat.STROKE_PLAY))
        assertEquals("5", repo.getScoreDisplay(5, 4, ScoringFormat.STROKE_PLAY))
    }

    @Test
    fun `getScoreDisplay scramble`() {
        assertEquals("4", repo.getScoreDisplay(4, 4, ScoringFormat.SCRAMBLE))
    }

    @Test
    fun `getScoreDisplay nassau`() {
        assertEquals("4", repo.getScoreDisplay(4, 4, ScoringFormat.NASSAU))
    }

    @Test
    fun `getScoreDisplay best ball`() {
        assertEquals("4", repo.getScoreDisplay(4, 4, ScoringFormat.BEST_BALL))
    }

    @Test
    fun `match play differential is correct`() {
        val result = repo.calculateMatchPlay(
            listOf(4, 4, 4, 4, 4),
            listOf(5, 5, 5, 5, 5)
        )
        assertEquals(5, result.player1Wins)
        assertEquals(0, result.player2Wins)
        assertTrue(result.status.contains("5"))
    }

    @Test
    fun `scoring format enum values`() {
        assertEquals(6, ScoringFormat.entries.size)
        assertEquals("Stroke Play", ScoringFormat.STROKE_PLAY.displayName)
        assertEquals("Stableford", ScoringFormat.STABLEFORD.displayName)
        assertEquals("Match Play", ScoringFormat.MATCH_PLAY.displayName)
        assertEquals("Scramble", ScoringFormat.SCRAMBLE.displayName)
        assertEquals("Best Ball", ScoringFormat.BEST_BALL.displayName)
        assertEquals("Nassau", ScoringFormat.NASSAU.displayName)
    }

    @Test
    fun `match play result defaults`() {
        val result = MatchPlayResult()
        assertEquals(0, result.player1Wins)
        assertEquals(0, result.player2Wins)
        assertEquals(0, result.holesRemaining)
        assertEquals("", result.status)
    }

    @Test
    fun `nassau result defaults`() {
        val result = NassauResult()
        assertEquals(0, result.front9)
        assertEquals(0, result.back9)
        assertEquals(0, result.total)
        assertEquals("tied", result.front9Status)
        assertEquals("tied", result.back9Status)
        assertEquals("tied", result.totalStatus)
    }
}
