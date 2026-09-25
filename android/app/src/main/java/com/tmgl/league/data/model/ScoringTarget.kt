package com.tmgl.league.data.model

data class ScoringTarget(
    val roundId: String = "",
    val playerId: String = "",
    val matchId: String? = null,
    val scorecardId: String? = null
) {
    val hasRound: Boolean
        get() = roundId.isNotBlank()

    val hasMatch: Boolean
        get() = !matchId.isNullOrBlank()

    val hasScorecard: Boolean
        get() = !scorecardId.isNullOrBlank()

    val isResolvable: Boolean
        get() = hasRound || hasMatch || hasScorecard

    fun withRound(resolvedRoundId: String): ScoringTarget = copy(roundId = resolvedRoundId)

    fun withPlayer(resolvedPlayerId: String): ScoringTarget = copy(playerId = resolvedPlayerId)

    fun withScorecard(resolvedScorecardId: String): ScoringTarget = copy(scorecardId = resolvedScorecardId)

    companion object {
        val None = ScoringTarget()
    }
}
