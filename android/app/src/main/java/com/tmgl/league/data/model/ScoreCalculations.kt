package com.tmgl.league.data.model

data class HoleScoreInput(
    val holeNumber: Int,
    val par: Int,
    val score: Int
)

data class ScorecardTotals(
    val holesScored: Int = 0,
    val totalStrokes: Int = 0,
    val totalPar: Int = 0,
    val totalToPar: Int = 0
)

object ScoreCalculations {

    fun isValidScore(score: Int): Boolean = score in 1..20

    fun holeScoreToPar(score: Int, par: Int): Int = score - par

    fun totals(inputs: List<HoleScoreInput>): ScorecardTotals {
        val scored = inputs.filter { isValidScore(it.score) }
        val totalStrokes = scored.sumOf { it.score }
        val totalPar = scored.sumOf { it.par }
        return ScorecardTotals(
            holesScored = scored.size,
            totalStrokes = totalStrokes,
            totalPar = totalPar,
            totalToPar = totalStrokes - totalPar
        )
    }

    fun toParLabel(totalToPar: Int): String = when {
        totalToPar == 0 -> "E"
        totalToPar > 0 -> "+$totalToPar"
        else -> "$totalToPar"
    }

    fun holeLabel(score: Int, par: Int): String {
        val toPar = holeScoreToPar(score, par)
        return when {
            toPar <= -3 -> "Albatross"
            toPar == -2 -> "Eagle"
            toPar == -1 -> "Birdie"
            toPar == 0 -> "Par"
            toPar == 1 -> "Bogey"
            toPar == 2 -> "Double Bogey"
            else -> "+$toPar"
        }
    }

    fun netScore(grossScore: Int, handicapIndex: Double): Int =
        grossScore - handicapIndex.toInt()

    fun handicapAllowance(handicapIndex: Double, holesPlayed: Int): Int {
        if (handicapIndex <= 0.0 || holesPlayed <= 0) return 0
        return ((handicapIndex * holesPlayed) / 18.0).toInt()
    }
}
