package com.tmgl.league.data.leaderboard

object LeaderboardStandings {

    const val FULL_ROUND_HOLES = 18

    data class PlayerInfo(
        val playerId: String,
        val fullName: String = "",
        val handicapIndex: Double? = null
    )

    data class GrossTotal(
        val playerId: String,
        val grossStrokes: Int = 0,
        val holesCompleted: Int = 0,
        val toPar: Int = 0,
        val scorecardId: String? = null,
        val scorecardStatus: String? = null
    )

    data class Standing(
        val playerId: String,
        val playerName: String,
        val handicapIndex: Double?,
        val grossStrokes: Int,
        val toPar: Int,
        val handicapAllowance: Int,
        val netStrokes: Int,
        val netToPar: Int,
        val holesCompleted: Int,
        val position: Int,
        val scorecardId: String? = null,
        val scorecardStatus: String? = null
    )

    fun handicapAllowance(handicapIndex: Double?, holesCompleted: Int): Int {
        val handicap = handicapIndex ?: return 0
        if (handicap <= 0.0 || holesCompleted <= 0) return 0
        if (holesCompleted >= FULL_ROUND_HOLES) return handicap.toInt()
        return ((handicap * holesCompleted) / FULL_ROUND_HOLES).toInt()
    }

    fun netStrokes(grossStrokes: Int, handicapIndex: Double?, holesCompleted: Int): Int =
        grossStrokes - handicapAllowance(handicapIndex, holesCompleted)

    fun netToPar(toPar: Int, handicapIndex: Double?, holesCompleted: Int): Int =
        toPar - handicapAllowance(handicapIndex, holesCompleted)

    fun build(players: List<PlayerInfo>, totals: List<GrossTotal>): List<Standing> {
        val infoById = players.associateBy { it.playerId }
        val rows = totals.map { total ->
            val info = infoById[total.playerId]
            val handicap = info?.handicapIndex
            val name = info?.fullName?.takeIf { it.isNotBlank() } ?: "Player"
            Standing(
                playerId = total.playerId,
                playerName = name,
                handicapIndex = handicap,
                grossStrokes = total.grossStrokes,
                toPar = total.toPar,
                handicapAllowance = handicapAllowance(handicap, total.holesCompleted),
                netStrokes = netStrokes(total.grossStrokes, handicap, total.holesCompleted),
                netToPar = netToPar(total.toPar, handicap, total.holesCompleted),
                holesCompleted = total.holesCompleted,
                position = 0,
                scorecardId = total.scorecardId,
                scorecardStatus = total.scorecardStatus
            )
        }
        val sorted = rows.sortedWith(
            compareBy<Standing> { it.netStrokes }
                .thenBy { it.grossStrokes }
                .thenBy { it.netToPar }
                .thenBy { it.playerName.lowercase() }
                .thenBy { it.playerId }
        )
        return assignPositions(sorted)
    }

    fun assignPositions(sorted: List<Standing>): List<Standing> {
        var previous: Standing? = null
        var lastPosition = 1
        return sorted.mapIndexed { index, standing ->
            val earlier = previous
            val tied = earlier != null &&
                earlier.netStrokes == standing.netStrokes &&
                earlier.grossStrokes == standing.grossStrokes
            val position = if (tied) lastPosition else index + 1
            lastPosition = position
            previous = standing
            standing.copy(position = position)
        }
    }
}
