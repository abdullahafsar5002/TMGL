package com.tmgl.league.data.model

enum class ScoringFormat(val displayName: String) {
    STROKE_PLAY("Stroke Play"),
    STABLEFORD("Stableford"),
    MATCH_PLAY("Match Play"),
    SCRAMBLE("Scramble"),
    BEST_BALL("Best Ball"),
    NASSAU("Nassau")
}

data class StablefordPoints(
    val doubleEagle: Int = 5,
    val eagle: Int = 4,
    val birdie: Int = 3,
    val par: Int = 2,
    val bogey: Int = 1,
    val doubleBogey: Int = 0,
    val tripleOrWorse: Int = 0
)

data class MatchPlayResult(
    val player1Wins: Int = 0,
    val player2Wins: Int = 0,
    val holesRemaining: Int = 0,
    val status: String = ""
)

data class NassauResult(
    val front9: Int = 0,
    val back9: Int = 0,
    val total: Int = 0,
    val front9Status: String = "tied",
    val back9Status: String = "tied",
    val totalStatus: String = "tied"
)
