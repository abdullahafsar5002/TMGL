package com.tmgl.league.data.model

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FriendlyMatchStatusTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `statuses match the database contract`() {
        assertEquals(4, FriendlyMatchStatus.entries.size)
        assertEquals(
            listOf("active", "rejected", "in_progress", "completed"),
            FriendlyMatchStatus.entries.map { it.dbValue() }
        )
    }

    @Test
    fun `status serializes to the database value`() {
        val encoded = json.encodeToString(FriendlyMatchStatus.serializer(), FriendlyMatchStatus.IN_PROGRESS)
        assertEquals("\"in_progress\"", encoded)
    }

    @Test
    fun `status deserializes from the database value`() {
        val decoded = json.decodeFromString(FriendlyMatchStatus.serializer(), "\"completed\"")
        assertEquals(FriendlyMatchStatus.COMPLETED, decoded)
    }

    @Test
    fun `unknown status falls back to active`() {
        assertEquals(FriendlyMatchStatus.ACTIVE, friendlyMatchStatusFrom("cancelled"))
        assertEquals(FriendlyMatchStatus.ACTIVE, friendlyMatchStatusFrom(null))
        assertEquals(FriendlyMatchStatus.ACTIVE, friendlyMatchStatusFrom("  ACTIVE "))
    }

    @Test
    fun `known status is mapped case insensitively`() {
        assertEquals(FriendlyMatchStatus.IN_PROGRESS, friendlyMatchStatusFrom("In_Progress"))
        assertEquals(FriendlyMatchStatus.REJECTED, friendlyMatchStatusFrom("rejected"))
    }

    @Test
    fun `scoring is enabled for active and in progress only`() {
        assertTrue(FriendlyMatchStatus.ACTIVE.isScoringEnabled())
        assertTrue(FriendlyMatchStatus.IN_PROGRESS.isScoringEnabled())
        assertFalse(FriendlyMatchStatus.COMPLETED.isScoringEnabled())
        assertFalse(FriendlyMatchStatus.REJECTED.isScoringEnabled())
    }

    @Test
    fun `status flow advances from active to in progress to completed`() {
        assertEquals(
            FriendlyMatchStatusFlow.IN_PROGRESS,
            FriendlyMatchStatus.ACTIVE.nextStatus()
        )
        assertEquals(
            FriendlyMatchStatusFlow.COMPLETED,
            FriendlyMatchStatus.IN_PROGRESS.nextStatus()
        )
        assertEquals(
            FriendlyMatchStatusFlow.COMPLETED,
            FriendlyMatchStatus.COMPLETED.nextStatus()
        )
        assertEquals(
            FriendlyMatchStatusFlow.REJECTED,
            FriendlyMatchStatus.REJECTED.nextStatus()
        )
    }

    @Test
    fun `invitation statuses match the database contract`() {
        assertEquals(3, InvitationStatus.entries.size)
        assertEquals(
            listOf("pending", "accepted", "rejected"),
            InvitationStatus.entries.map { it.name.lowercase() }
        )
    }

    @Test
    fun `match formats match the database contract`() {
        assertEquals(
            listOf("stroke_play", "stableford", "match_play", "best_ball", "scramble"),
            FriendlyMatchFormat.entries.map { it.dbValue() }
        )
        assertEquals(FriendlyMatchFormat.BEST_BALL, friendlyMatchFormatFrom("best_ball"))
        assertEquals(FriendlyMatchFormat.MATCH_PLAY, friendlyMatchFormatFrom("match_play"))
        assertEquals(FriendlyMatchFormat.STROKE_PLAY, friendlyMatchFormatFrom("unknown"))
    }

    @Test
    fun `display labels are human readable`() {
        assertEquals("Open", FriendlyMatchStatus.ACTIVE.displayName())
        assertEquals("In progress", FriendlyMatchStatus.IN_PROGRESS.displayName())
        assertEquals("Stroke Play", FriendlyMatchFormat.STROKE_PLAY.displayName())
    }

    @Test
    fun `participant handicap is transient and not serialized`() {
        val encoded = json.encodeToString(
            FriendlyMatchPlayer.serializer(),
            FriendlyMatchPlayer(                id = "row-1",
                matchId = "match-1",
                playerId = "player-1",
                fullName = "Ada",
                handicapIndex = 12.5
            )
        )
        assertFalse(encoded.contains("handicapIndex"))
        assertFalse(encoded.contains("handicap_index"))
        assertFalse(encoded.contains("fullName"))
        assertTrue(encoded.contains("player_id"))
    }
}
