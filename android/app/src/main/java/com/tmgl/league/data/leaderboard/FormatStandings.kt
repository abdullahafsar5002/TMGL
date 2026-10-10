package com.tmgl.league.data.leaderboard

object FormatStandings {

    const val SCRAMBLE_GROUP_SIZE = 4
    const val FULL_ROUND_HOLES = 18

    data class HoleScore(
        val playerId: String,
        val holeNumber: Int,
        val strokes: Int
    )

    data class Unit(
        val id: String,
        val label: String,
        val playerIds: List<String>,
        val playerNames: List<String>,
        val handicapAllowance: Int
    )

    data class PairMember(
        val playerId: String,
        val playerName: String,
        val handicapIndex: Double,
        val pairingNo: Int,
        val flightId: String? = null
    )

    data class HoleResult(
        val holeNumber: Int,
        val par: Int,
        val bestScore: Int?
    ) {
        val toPar: Int? get() = bestScore?.minus(par)
    }

    data class PairSummary(
        val unit: Unit,
        val holes: List<HoleResult>,
        val holesPlayed: Int,
        val strokesToPar: Int,
        val netToPar: Int
    )

    data class MatchResult(
        val unit: Unit,
        val holesWon: Int,
        val holesLost: Int,
        val holesTied: Int,
        val margin: Int,
        val holesPlayed: Int,
        val netToPar: Int
    )

    data class NassauResult(
        val unit: Unit,
        val frontNine: Int?,
        val backNine: Int?,
        val total: Int?,
        val netToPar: Int,
        val holesPlayed: Int
    )

    data class BestBallResult(
        val unit: Unit,
        val totalStrokes: Int,
        val totalToPar: Int,
        val netToPar: Int,
        val holesPlayed: Int,
        val eachHoleCounted: Int
    )

    data class Standing(
        val unitId: String,
        val label: String,
        val position: Int,
        val playerIds: List<String>,
        val playerNames: List<String>,
        val metricValue: Int,
        val displayValue: String,
        val holesPlayed: Int,
        val holesWon: Int,
        val holesLost: Int,
        val strokesToPar: Int?,
        val netToPar: Int?,
        val memberCount: Int
    )

    data class Ranked(
        val rows: List<Standing>,
        val skipped: Int
    )

    fun usesTeams(format: String): Boolean = format == "best_ball" || format == "scramble"

    fun usesPairings(format: String): Boolean = format == "match_play" || format == "nassau"

    fun isUnitFormat(format: String): Boolean =
        format == "match_play" || format == "nassau" || format == "best_ball" || format == "scramble"

    private fun unitAllowance(unit: Unit): Int {
        if (unit.handicapAllowance > 0) return unit.handicapAllowance
        return 0
    }

    private fun proratedAllowance(unit: Unit, holesPlayed: Int, fullRoundHoles: Int): Int {
        val allowance = unitAllowance(unit)
        if (allowance <= 0 || holesPlayed <= 0) return 0
        if (holesPlayed >= fullRoundHoles) return allowance
        return ((allowance.toLong() * holesPlayed) / fullRoundHoles).toInt()
    }

    fun bestScoreForHole(scores: List<HoleScore>, unit: Unit): Int? {
        var best: Int? = null
        for (score in scores) {
            if (!unit.playerIds.contains(score.playerId)) continue
            if (best == null || score.strokes < best) best = score.strokes
        }
        return best
    }

    fun summarisePair(
        unit: Unit,
        scores: List<HoleScore>,
        pars: Map<Int, Int>,
        fullRoundHoles: Int = FULL_ROUND_HOLES
    ): PairSummary {
        val holes = ArrayList<HoleResult>(fullRoundHoles)
        var strokesToPar = 0
        var holesPlayed = 0

        for (holeNumber in 1..fullRoundHoles) {
            val par = pars[holeNumber] ?: 4
            val best = bestScoreForHole(
                scores.filter { it.holeNumber == holeNumber },
                unit
            )
            if (best == null) {
                holes.add(HoleResult(holeNumber, par, null))
                continue
            }
            holesPlayed += 1
            strokesToPar += best - par
            holes.add(HoleResult(holeNumber, par, best))
        }

        val allowance = proratedAllowance(unit, holesPlayed, fullRoundHoles)
        return PairSummary(unit, holes, holesPlayed, strokesToPar, strokesToPar - allowance)
    }

    private fun matchIndex(unitId: String): Int {
        if (!unitId.startsWith("pair-")) return Int.MAX_VALUE
        return unitId.removePrefix("pair-").toIntOrNull() ?: Int.MAX_VALUE
    }

    private fun shareMatchPair(a: String, b: String): Boolean {
        val indexA = matchIndex(a)
        val indexB = matchIndex(b)
        if (indexA == Int.MAX_VALUE || indexB == Int.MAX_VALUE) return false
        return (indexA - 1) / 2 == (indexB - 1) / 2
    }

    fun computeMatchPlay(
        units: List<Unit>,
        scores: List<HoleScore>,
        pars: Map<Int, Int>,
        fullRoundHoles: Int = FULL_ROUND_HOLES
    ): List<MatchResult> {
        val summaries = units.map { summarisePair(it, scores, pars, fullRoundHoles) }
        return summaries.map { summary ->
            var holesWon = 0
            var holesLost = 0
            var holesTied = 0
            for (hole in summary.holes) {
                val best = hole.bestScore ?: continue
                val rival = summaries.firstOrNull {
                    it.unit.id != summary.unit.id && shareMatchPair(it.unit.id, summary.unit.id)
                } ?: continue
                val rivalHole = rival.holes.firstOrNull { it.holeNumber == hole.holeNumber } ?: continue
                val rivalBest = rivalHole.bestScore ?: continue
                if (best < rivalBest) holesWon += 1 else if (best > rivalBest) holesLost += 1 else holesTied += 1
            }
            MatchResult(
                summary.unit,
                holesWon,
                holesLost,
                holesTied,
                holesWon - holesLost,
                summary.holesPlayed,
                summary.netToPar
            )
        }
    }

    private fun sumRange(summary: PairSummary, from: Int, to: Int): Int? {
        var total = 0
        var played = 0
        for (holeNumber in from..to) {
            val hole = summary.holes.firstOrNull { it.holeNumber == holeNumber } ?: continue
            val toPar = hole.toPar ?: continue
            total += toPar
            played += 1
        }
        return if (played > 0) total else null
    }

    fun computeNassau(
        units: List<Unit>,
        scores: List<HoleScore>,
        pars: Map<Int, Int>,
        fullRoundHoles: Int = FULL_ROUND_HOLES
    ): List<NassauResult> {
        return units.map { summarisePair(it, scores, pars, fullRoundHoles) }.map { summary ->
            val front = sumRange(summary, 1, 9)
            val back = sumRange(summary, 10, fullRoundHoles)
            NassauResult(
                summary.unit,
                front,
                back,
                if (front != null && back != null) front + back else null,
                summary.netToPar,
                summary.holesPlayed
            )
        }
    }

    fun computeBestBall(
        units: List<Unit>,
        scores: List<HoleScore>,
        pars: Map<Int, Int>,
        fullRoundHoles: Int = FULL_ROUND_HOLES
    ): List<BestBallResult> {
        return units.map { summarisePair(it, scores, pars, fullRoundHoles) }.map { summary ->
            var totalStrokes = 0
            var counted = 0
            for (hole in summary.holes) {
                val best = hole.bestScore ?: continue
                totalStrokes += best
                counted += 1
            }
            val allowance = proratedAllowance(summary.unit, summary.holesPlayed, fullRoundHoles)
            BestBallResult(
                summary.unit,
                totalStrokes,
                summary.strokesToPar,
                summary.strokesToPar - allowance,
                summary.holesPlayed,
                counted
            )
        }
    }

    fun pairsFromPairings(members: List<PairMember>): List<Unit> {
        val pairs = LinkedHashMap<String, MutableList<PairMember>>()
        for (member in members) {
            val pairNo = (member.pairingNo + 1) / 2
            val key = "${member.flightId ?: "f"}:$pairNo"
            pairs.getOrPut(key) { mutableListOf() }.add(member)
        }
        return pairs.entries.mapIndexed { index, entry ->
            val sorted = entry.value.sortedBy { it.pairingNo }
            val names = sorted.map { it.playerName }
            val total = sorted.sumOf { maxOf(0, kotlin.math.round(it.handicapIndex).toInt()) }
            Unit(
                id = "pair-${index + 1}",
                label = names.joinToString(" / "),
                playerIds = sorted.map { it.playerId },
                playerNames = names,
                handicapAllowance = if (sorted.size >= 2) total / sorted.size else total
            )
        }.filter { it.playerIds.size >= 2 }
    }

    fun scrambleGroups(members: List<PairMember>, groupSize: Int = SCRAMBLE_GROUP_SIZE): List<Unit> {
        val size = maxOf(2, groupSize)
        val groups = mutableListOf<Unit>()
        var index = 0
        while (index < members.size) {
            val slice = members.subList(index, minOf(index + size, members.size))
            if (slice.size < 2) break
            val average = slice.sumOf { maxOf(0, kotlin.math.round(it.handicapIndex).toInt()) }.toDouble() / slice.size
            groups.add(
                Unit(
                    id = "group-${index / size + 1}",
                    label = "Group ${index / size + 1}",
                    playerIds = slice.map { it.playerId },
                    playerNames = slice.map { it.playerName },
                    handicapAllowance = kotlin.math.round(average).toInt()
                )
            )
            index += size
        }
        return groups
    }

    fun resolveUnits(format: String, members: List<PairMember>, scrambleGroupSize: Int = SCRAMBLE_GROUP_SIZE): List<Unit> {
        return when (format) {
            "best_ball" -> scrambleGroups(members, 2)
            "scramble" -> scrambleGroups(members, scrambleGroupSize)
            else -> pairsFromPairings(members)
        }
    }

    private fun competitionNumbers(values: List<Int>): List<Int> {
        val positions = mutableListOf<Int>()
        var previous: Int? = null
        var lastPosition = 1
        for ((index, value) in values.withIndex()) {
            if (previous == null || value != previous) lastPosition = index + 1
            positions.add(lastPosition)
            previous = value
        }
        return positions
    }

    fun toParText(value: Int): String = when {
        value == 0 -> "E"
        value > 0 -> "+$value"
        else -> "$value"
    }

    fun rankMatchPlay(results: List<MatchResult>): Ranked {
        val sorted = results.sortedWith(
            compareByDescending<MatchResult> { it.margin }
                .thenByDescending { it.holesWon }
                .thenBy { it.netToPar }
                .thenBy { it.unit.label }
        )
        val positions = competitionNumbers(sorted.map { -it.margin })
        return Ranked(
            sorted.mapIndexed { index, entry ->
                Standing(
                    entry.unit.id,
                    entry.unit.label,
                    positions[index],
                    entry.unit.playerIds,
                    entry.unit.playerNames,
                    entry.margin,
                    when {
                        entry.margin == 0 -> "All square"
                        entry.margin > 0 -> "${entry.margin} up"
                        else -> "${-entry.margin} down"
                    },
                    entry.holesPlayed,
                    entry.holesWon,
                    entry.holesLost,
                    null,
                    entry.netToPar,
                    entry.unit.playerIds.size
                )
            },
            0
        )
    }

    fun rankNassau(results: List<NassauResult>): Ranked {
        val sorted = results.sortedWith(
            compareBy<NassauResult> { it.netToPar }
                .thenBy { it.total ?: 0 }
                .thenBy { it.unit.label }
        )
        val positions = competitionNumbers(sorted.map { it.netToPar })
        return Ranked(
            sorted.mapIndexed { index, entry ->
                Standing(
                    entry.unit.id,
                    entry.unit.label,
                    positions[index],
                    entry.unit.playerIds,
                    entry.unit.playerNames,
                    entry.netToPar,
                    when {
                        entry.holesPlayed == 0 -> "Not started"
                        entry.netToPar == 0 -> "All square (E)"
                        entry.netToPar > 0 -> "${entry.netToPar} up (${toParText(entry.netToPar)})"
                        else -> "${-entry.netToPar} down (${toParText(entry.netToPar)})"
                    },
                    entry.holesPlayed,
                    0,
                    0,
                    entry.total,
                    entry.netToPar,
                    entry.unit.playerIds.size
                )
            },
            0
        )
    }

    fun rankBestBall(results: List<BestBallResult>, cutUnitIds: Set<String> = emptySet()): Ranked {
        val cut = if (cutUnitIds.isEmpty()) emptySet() else cutUnitIds
        val live = results.filter { !cut.contains(it.unit.id) }
        val sorted = live.sortedWith(
            compareBy<BestBallResult> { it.netToPar }
                .thenBy { it.totalStrokes }
                .thenBy { it.unit.label }
        )
        val positions = competitionNumbers(sorted.map { it.netToPar })
        return Ranked(
            sorted.mapIndexed { index, entry ->
                Standing(
                    entry.unit.id,
                    entry.unit.label,
                    positions[index],
                    entry.unit.playerIds,
                    entry.unit.playerNames,
                    entry.netToPar,
                    toParText(entry.netToPar),
                    entry.holesPlayed,
                    0,
                    0,
                    entry.totalToPar,
                    entry.netToPar,
                    entry.unit.playerIds.size
                )
            },
            results.size - live.size
        )
    }
}