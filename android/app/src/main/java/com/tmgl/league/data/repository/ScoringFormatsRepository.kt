package com.tmgl.league.data.repository

import com.tmgl.league.data.model.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ScoringFormatsRepository @Inject constructor() {

    fun calculateStableford(holeScore: Int, par: Int, points: StablefordPoints = StablefordPoints()): Int {
        val diff = holeScore - par
        return when {
            diff <= -3 -> points.doubleEagle
            diff == -2 -> points.eagle
            diff == -1 -> points.birdie
            diff == 0 -> points.par
            diff == 1 -> points.bogey
            diff == 2 -> points.doubleBogey
            else -> points.tripleOrWorse
        }
    }

    fun calculateMatchPlay(holeScores1: List<Int>, holeScores2: List<Int>): MatchPlayResult {
        var wins1 = 0
        var wins2 = 0
        var tied = 0

        val holesPlayed = minOf(holeScores1.size, holeScores2.size)

        for (i in 0 until holesPlayed) {
            when {
                holeScores1[i] < holeScores2[i] -> wins1++
                holeScores2[i] < holeScores1[i] -> wins2++
                else -> tied++
            }
        }

        val holesRemaining = 18 - holesPlayed
        val margin = wins1 - wins2

        val status = when {
            margin > 0 && holesRemaining < margin -> "Player 1 wins ${margin} & ${holesRemaining}"
            wins2 > 0 && holesRemaining < (wins2 - wins1) -> "Player 2 wins ${wins2 - wins1} & ${holesRemaining}"
            margin > 0 -> "Player 1 up $margin"
            wins2 > 0 -> "Player 2 up ${wins2 - wins1}"
            else -> "All square"
        }

        return MatchPlayResult(
            player1Wins = wins1,
            player2Wins = wins2,
            holesRemaining = holesRemaining,
            status = status
        )
    }

    fun calculateNassau(
        front9Scores1: List<Int>,
        back9Scores1: List<Int>,
        front9Scores2: List<Int>,
        back9Scores2: List<Int>,
        pars: List<Int>
    ): NassauResult {
        val front9Pars = pars.take(9)
        val back9Pars = pars.drop(9).take(9)
        val totalPars = pars.take(18)

        val front9Diff1 = front9Scores1.zip(front9Pars).sumOf { it.first - it.second }
        val front9Diff2 = front9Scores2.zip(front9Pars).sumOf { it.first - it.second }
        val back9Diff1 = back9Scores1.zip(back9Pars).sumOf { it.first - it.second }
        val back9Diff2 = back9Scores2.zip(back9Pars).sumOf { it.first - it.second }
        val totalDiff1 = front9Diff1 + back9Diff1
        val totalDiff2 = front9Diff2 + back9Diff2

        val front9Result = front9Diff1 - front9Diff2
        val back9Result = back9Diff1 - back9Diff2
        val totalResult = totalDiff1 - totalDiff2

        return NassauResult(
            front9 = front9Result,
            back9 = back9Result,
            total = totalResult,
            front9Status = when {
                front9Result > 0 -> "Player 1 +${front9Result}"
                front9Result < 0 -> "Player 2 +${-front9Result}"
                else -> "tied"
            },
            back9Status = when {
                back9Result > 0 -> "Player 1 +${back9Result}"
                back9Result < 0 -> "Player 2 +${-back9Result}"
                else -> "tied"
            },
            totalStatus = when {
                totalResult > 0 -> "Player 1 +${totalResult}"
                totalResult < 0 -> "Player 2 +${-totalResult}"
                else -> "tied"
            }
        )
    }

    fun calculateBestBall(teamScores: List<List<Int>>): Int {
        if (teamScores.isEmpty()) return 0
        return teamScores.map { scores -> scores.minOrNull() ?: 0 }.minOrNull() ?: 0
    }

    fun getScoreDisplay(score: Int, par: Int, format: ScoringFormat): String {
        val diff = score - par
        return when (format) {
            ScoringFormat.STABLEFORD -> {
                val points = calculateStableford(score, par)
                "$points pts"
            }
            ScoringFormat.MATCH_PLAY -> {
                when {
                    diff < 0 -> "${-diff} up"
                    diff > 0 -> "$diff down"
                    else -> "AS"
                }
            }
            ScoringFormat.SCRAMBLE -> "$score"
            ScoringFormat.BEST_BALL -> "$score"
            ScoringFormat.NASSAU -> "$score"
            ScoringFormat.STROKE_PLAY -> "$score"
        }
    }

    fun getNetScore(grossScore: Int, handicap: Double): Int {
        return grossScore - handicap.toInt()
    }
}
