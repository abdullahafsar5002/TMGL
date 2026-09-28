package com.tmgl.league.data.pairing

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FlightsBuilderTest {

    private fun player(id: String, handicap: Double?) =
        FlightsBuilder.PairingPlayer(playerId = id, fullName = "Player $id", handicapIndex = handicap)

    @Test
    fun `orders players by ascending handicap index`() {
        val ordered = FlightsBuilder.orderPlayers(
            listOf(player("c", 20.0), player("a", 3.0), player("b", 12.4))
        )
        assertEquals(listOf("a", "b", "c"), ordered.map { it.playerId })
    }

    @Test
    fun `null handicap is treated as the average handicap`() {
        val players = listOf(player("low", 2.0), player("unknown", null), player("high", 20.0))
        assertEquals(11.0, FlightsBuilder.averageHandicap(players), 0.0001)
        val ordered = FlightsBuilder.orderPlayers(players)
        assertEquals(listOf("low", "unknown", "high"), ordered.map { it.playerId })
    }

    @Test
    fun `all null handicaps fall back to a stable name ordering`() {
        val players = listOf(player("z", null), player("a", null), player("m", null))
        assertEquals(0.0, FlightsBuilder.averageHandicap(players), 0.0001)
        assertEquals(listOf("a", "m", "z"), FlightsBuilder.orderPlayers(players).map { it.playerId })
    }

    @Test
    fun `empty player list produces no flights`() {
        assertTrue(FlightsBuilder.buildFlights(emptyList()).isEmpty())
    }

    @Test
    fun `best two players in a flight get pairing one and two`() {
        val members = FlightsBuilder.assignPairings(
            listOf(player("best", 1.0), player("second", 8.0), player("third", 14.0), player("fourth", 22.0))
        )
        assertEquals(1, members[0].pairingNo)
        assertEquals(2, members[1].pairingNo)
        assertEquals("best", members[0].playerId)
        assertEquals("second", members[1].playerId)
    }

    @Test
    fun `single flight with two players assigns pairing one and two`() {
        val plan = FlightsBuilder.buildFlights(
            players = listOf(player("p2", 9.0), player("p1", 4.0)),
            flightCount = 1
        ).single()
        assertEquals(0, plan.orderIndex)
        assertEquals("Flight A", plan.name)
        assertEquals(listOf("p1", "p2"), plan.members.map { it.playerId })
        assertEquals(listOf(1, 2), plan.members.map { it.pairingNo })
    }

    @Test
    fun `single flight with one player assigns pairing one`() {
        val plan = FlightsBuilder.buildFlights(
            players = listOf(player("solo", 11.0)),
            flightCount = 1
        ).single()
        assertEquals(1, plan.members.size)
        assertEquals(1, plan.members.single().pairingNo)
    }

    @Test
    fun `odd player count spreads the remainder into the first flights`() {
        val players = (1..7).map { player("p$it", it.toDouble()) }
        val plans = FlightsBuilder.buildFlights(players, flightCount = 3)
        assertEquals(3, plans.size)
        assertEquals(listOf(3, 3, 1), plans.map { it.members.size })
        assertEquals(7, plans.sumOf { it.members.size })
        assertEquals(listOf("p1", "p2", "p3"), plans[0].members.map { it.playerId })
        assertEquals(listOf("p4", "p5", "p6"), plans[1].members.map { it.playerId })
        assertEquals(listOf("p7"), plans[2].members.map { it.playerId })
        assertEquals(listOf(1, 2, 3), plans[0].members.map { it.pairingNo })
        assertEquals(listOf(1), plans[2].members.map { it.pairingNo })
    }

    @Test
    fun `flight count never exceeds the number of players`() {
        val players = (1..2).map { player("p$it", it.toDouble()) }
        val plans = FlightsBuilder.buildFlights(players, flightCount = 6)
        assertEquals(2, plans.size)
        assertEquals(listOf("Flight A", "Flight B"), plans.map { it.name })
    }

    @Test
    fun `flight count defaults to one when not specified`() {
        val players = (1..5).map { player("p$it", it.toDouble()) }
        val plans = FlightsBuilder.buildFlights(players)
        assertEquals(1, plans.size)
        assertEquals("Flight A", plans.single().name)
    }

    @Test
    fun `formats tee times as zero padded HH colon MM`() {
        assertEquals("08:00", FlightsBuilder.formatTeeTime(8 * 60))
        assertEquals("00:00", FlightsBuilder.formatTeeTime(0))
        assertEquals("09:05", FlightsBuilder.formatTeeTime(9 * 60 + 5))
        assertEquals("23:59", FlightsBuilder.formatTeeTime(23 * 60 + 59))
    }

    @Test
    fun `parses tee times from text values and falls back to the default`() {
        assertEquals(8 * 60, FlightsBuilder.parseTeeTime("08:00"))
        assertEquals(8 * 60, FlightsBuilder.parseTeeTime("08:00:00"))
        assertEquals(14 * 60 + 30, FlightsBuilder.parseTeeTime("14:30"))
        assertEquals(FlightsBuilder.DEFAULT_FIRST_TEE_MINUTES, FlightsBuilder.parseTeeTime(null))
        assertEquals(FlightsBuilder.DEFAULT_FIRST_TEE_MINUTES, FlightsBuilder.parseTeeTime(""))
        assertEquals(FlightsBuilder.DEFAULT_FIRST_TEE_MINUTES, FlightsBuilder.parseTeeTime("not-a-time"))
    }

    @Test
    fun `tee time increases by the interval for each pairing index`() {
        assertEquals("08:00", FlightsBuilder.computeTeeTime(0, "08:00", 9))
        assertEquals("08:09", FlightsBuilder.computeTeeTime(1, "08:00", 9))
        assertEquals("08:18", FlightsBuilder.computeTeeTime(2, "08:00", 9))
        assertEquals("09:05", FlightsBuilder.computeTeeTime(3, "08:32", 11))
    }

    @Test
    fun `tee time wraps modulo twenty four hours`() {
        assertEquals("00:03", FlightsBuilder.computeTeeTime(107, "08:00", 9))
        assertEquals("00:12", FlightsBuilder.computeTeeTime(108, "08:00", 9))
        assertEquals("00:06", FlightsBuilder.computeTeeTime(4, "23:30", 9))
        assertEquals("14:00", FlightsBuilder.computeTeeTime(200, "08:00", 9))
        assertEquals("23:00", FlightsBuilder.formatTeeTime(-60))
    }

    @Test
    fun `compute tee times returns one entry per flight`() {
        val times = FlightsBuilder.computeTeeTimes(4, "23:30", 9)
        assertEquals(listOf("23:30", "23:39", "23:48", "23:57"), times)
        assertTrue(FlightsBuilder.computeTeeTimes(0, "08:00", 9).isEmpty())
    }

    @Test
    fun `non positive interval falls back to the nine minute default`() {
        assertEquals("08:00", FlightsBuilder.computeTeeTime(0, "08:00", 0))
        assertEquals("08:09", FlightsBuilder.computeTeeTime(1, "08:00", 0))
        assertEquals("08:09", FlightsBuilder.computeTeeTime(1, "08:00", -5))
    }

    @Test
    fun `every member of a plan carries the flight tee time`() {
        val players = (1..6).map { player("p$it", it.toDouble()) }
        val plans = FlightsBuilder.buildFlights(players, flightCount = 2, firstTeeTime = "07:45", intervalMinutes = 10)
        assertEquals(listOf("07:45", "07:55"), plans.map { it.teeTime })
        plans.forEach { plan ->
            plan.members.forEach { member ->
                assertEquals(plan.teeTime, member.teeTime)
            }
        }
        assertEquals(listOf(0, 1), plans.map { it.orderIndex })
        assertEquals(listOf("Flight A", "Flight B"), plans.map { it.name })
    }

    @Test
    fun `build flights is deterministic regardless of input order`() {
        val ordered = (1..8).map { player("p$it", (9 - it).toDouble()) }
        val shuffled = ordered.reversed()
        assertEquals(FlightsBuilder.buildFlights(ordered, 2, "08:00", 9), FlightsBuilder.buildFlights(shuffled, 2, "08:00", 9))
    }

    @Test
    fun `resolve flight count coerces invalid values`() {
        assertEquals(1, FlightsBuilder.resolveFlightCount(null, 10))
        assertEquals(1, FlightsBuilder.resolveFlightCount(0, 10))
        assertEquals(3, FlightsBuilder.resolveFlightCount(3, 10))
        assertEquals(2, FlightsBuilder.resolveFlightCount(5, 2))
        assertEquals(1, FlightsBuilder.resolveFlightCount(0, 0))
    }
}
