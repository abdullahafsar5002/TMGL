package com.tmgl.league.data.pairing

object FlightsBuilder {

    const val DEFAULT_FLIGHT_COUNT = 1
    const val DEFAULT_TEE_INTERVAL_MINUTES = 9
    const val DEFAULT_FIRST_TEE_MINUTES = 8 * 60
    const val MINUTES_PER_DAY = 24 * 60

    data class PairingPlayer(
        val playerId: String,
        val fullName: String = "",
        val handicapIndex: Double? = null
    )

    data class FlightMember(
        val playerId: String,
        val fullName: String = "",
        val handicapIndex: Double? = null,
        val pairingNo: Int? = null,
        val teeTime: String = ""
    )

    data class FlightPlan(
        val name: String,
        val orderIndex: Int,
        val teeTime: String,
        val members: List<FlightMember>
    )

    fun averageHandicap(players: List<PairingPlayer>): Double {
        val known = players.mapNotNull { it.handicapIndex }
        if (known.isEmpty()) return 0.0
        return known.average()
    }

    fun orderPlayers(players: List<PairingPlayer>): List<PairingPlayer> {
        val average = averageHandicap(players)
        return players.sortedWith(
            compareBy<PairingPlayer> { it.handicapIndex ?: average }
                .thenBy { it.fullName.lowercase() }
                .thenBy { it.playerId }
        )
    }

    fun assignPairings(players: List<PairingPlayer>): List<FlightMember> =
        players.mapIndexed { index, player ->
            FlightMember(
                playerId = player.playerId,
                fullName = player.fullName,
                handicapIndex = player.handicapIndex,
                pairingNo = index + 1
            )
        }

    fun normalizeMinutes(totalMinutes: Int): Int {
        val wrapped = totalMinutes % MINUTES_PER_DAY
        return if (wrapped < 0) wrapped + MINUTES_PER_DAY else wrapped
    }

    fun parseTeeTime(value: String?): Int {
        val trimmed = value?.trim().orEmpty()
        if (trimmed.isEmpty()) return normalizeMinutes(DEFAULT_FIRST_TEE_MINUTES)
        val parts = trimmed.split(":")
        val hours = parts.getOrNull(0)?.trim()?.toIntOrNull()
            ?: return normalizeMinutes(DEFAULT_FIRST_TEE_MINUTES)
        val minutes = parts.getOrNull(1)?.trim()?.toIntOrNull() ?: 0
        return normalizeMinutes(hours * 60 + minutes)
    }

    fun formatTeeTime(minutesOfDay: Int): String {
        val normalized = normalizeMinutes(minutesOfDay)
        return "%02d:%02d".format(normalized / 60, normalized % 60)
    }

    fun computeTeeTime(pairingIndex: Int, firstTeeTime: String?, intervalMinutes: Int): String {
        val interval = if (intervalMinutes > 0) intervalMinutes else DEFAULT_TEE_INTERVAL_MINUTES
        val index = if (pairingIndex > 0) pairingIndex else 0
        return formatTeeTime(parseTeeTime(firstTeeTime) + index * interval)
    }

    fun computeTeeTimes(flightCount: Int, firstTeeTime: String?, intervalMinutes: Int): List<String> {
        val count = if (flightCount > 0) flightCount else 0
        return (0 until count).map { computeTeeTime(it, firstTeeTime, intervalMinutes) }
    }

    fun resolveFlightCount(requested: Int?, playerCount: Int): Int {
        val requestedPositive = (requested ?: DEFAULT_FLIGHT_COUNT).coerceAtLeast(1)
        if (playerCount <= 0) return requestedPositive
        return requestedPositive.coerceAtMost(playerCount)
    }

    fun flightName(index: Int, flightCount: Int): String =
        if (flightCount <= 1) "Flight A" else "Flight ${'A' + index}"

    fun buildFlights(
        players: List<PairingPlayer>,
        flightCount: Int = DEFAULT_FLIGHT_COUNT,
        firstTeeTime: String? = null,
        intervalMinutes: Int = DEFAULT_TEE_INTERVAL_MINUTES
    ): List<FlightPlan> {
        if (players.isEmpty()) return emptyList()
        val ordered = orderPlayers(players)
        val flights = resolveFlightCount(flightCount, ordered.size)
        val groupSize = (ordered.size + flights - 1) / flights
        val groups = ordered.chunked(groupSize)
        val teeTimes = computeTeeTimes(groups.size, firstTeeTime, intervalMinutes)
        return groups.mapIndexed { index, group ->
            val teeTime = teeTimes.getOrElse(index) { formatTeeTime(parseTeeTime(firstTeeTime)) }
            FlightPlan(
                name = flightName(index, groups.size),
                orderIndex = index,
                teeTime = teeTime,
                members = assignPairings(group).map { it.copy(teeTime = teeTime) }
            )
        }
    }
}
