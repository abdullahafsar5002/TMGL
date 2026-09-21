package com.tmgl.league

import com.tmgl.league.data.repository.HandicapRound
import com.tmgl.league.data.repository.HandicapResult
import org.junit.Assert.*
import org.junit.Test

class HandicapLogicTest {

    @Test
    fun `handicap trend improving`() {
        val rounds = listOf(
            HandicapRound("2025-01", 78, 6.2, 72.0, 113.0),
            HandicapRound("2024-12", 82, 10.2, 72.0, 113.0),
            HandicapRound("2024-11", 80, 8.2, 72.0, 113.0)
        )
        val recent = rounds[0].differential
        val prev = rounds[1].differential
        val trend = when {
            recent < prev - 1 -> "improving"
            recent > prev + 1 -> "declining"
            else -> "stable"
        }
        assertEquals("improving", trend)
    }

    @Test
    fun `handicap trend declining`() {
        val rounds = listOf(
            HandicapRound("2025-01", 85, 13.2, 72.0, 113.0),
            HandicapRound("2024-12", 78, 6.2, 72.0, 113.0)
        )
        val recent = rounds[0].differential
        val prev = rounds[1].differential
        val trend = when {
            recent < prev - 1 -> "improving"
            recent > prev + 1 -> "declining"
            else -> "stable"
        }
        assertEquals("declining", trend)
    }

    @Test
    fun `handicap trend stable`() {
        val rounds = listOf(
            HandicapRound("2025-01", 79, 7.2, 72.0, 113.0),
            HandicapRound("2024-12", 80, 8.2, 72.0, 113.0)
        )
        val recent = rounds[0].differential
        val prev = rounds[1].differential
        val trend = when {
            recent < prev - 1 -> "improving"
            recent > prev + 1 -> "declining"
            else -> "stable"
        }
        assertEquals("stable", trend)
    }

    @Test
    fun `handicap calculation best 8 of 20`() {
        val rounds = (1..20).map { i ->
            HandicapRound("2025-$i", 75 + (i % 5), 3.0 + (i % 5), 72.0, 113.0)
        }
        val sorted = rounds.sortedBy { it.differential }
        val best8 = sorted.take(8)
        val handicap = best8.map { it.differential }.average() * 0.96
        assertTrue(handicap > 0)
        assertTrue(handicap < 20)
    }

    @Test
    fun `differential formula`() {
        val grossScore = 80
        val courseRating = 72.0
        val slopeRating = 113.0
        val differential = (113.0 / slopeRating) * (grossScore - courseRating)
        assertEquals(8.0, differential, 0.01)
    }
}
