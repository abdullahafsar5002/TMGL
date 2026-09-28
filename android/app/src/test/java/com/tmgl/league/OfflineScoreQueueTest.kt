package com.tmgl.league.data.offline

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OfflineScoreQueueTest {

    private fun score(scorecardId: String, holeNumber: Int, score: Int, par: Int = 4) = PendingScore(
        scorecardId = scorecardId,
        holeNumber = holeNumber,
        score = score,
        par = par
    )

    @Test
    fun `queue starts empty`() {
        val queue = PendingScoreQueue()
        assertTrue(queue.isEmpty())
        assertEquals(0, queue.size())
    }

    @Test
    fun `enqueue rejects invalid payloads`() {
        val queue = PendingScoreQueue()
        assertFalse(queue.enqueue(score("", 1, 4)))
        assertFalse(queue.enqueue(score("card", 0, 4)))
        assertFalse(queue.enqueue(score("card", 1, 0)))
        assertFalse(queue.enqueue(score("card", 1, 21)))
        assertTrue(queue.isEmpty())
    }

    @Test
    fun `enqueue deduplicates by scorecard and hole`() {
        val queue = PendingScoreQueue()
        assertTrue(queue.enqueue(score("card-1", 1, 4)))
        assertFalse(queue.enqueue(score("card-1", 1, 4)))
        assertEquals(1, queue.size())
        assertTrue(queue.contains("card-1", 1))
    }

    @Test
    fun `re-scoring the same hole replaces the queued value`() {
        val queue = PendingScoreQueue()
        queue.enqueue(score("card-1", 1, 4))
        assertTrue(queue.enqueue(score("card-1", 1, 6)))
        assertEquals(1, queue.size())
        assertEquals(6, queue.snapshot().first().score)
    }

    @Test
    fun `different scorecards and holes are tracked separately`() {
        val queue = PendingScoreQueue()
        queue.enqueue(score("card-1", 1, 4))
        queue.enqueue(score("card-1", 2, 5))
        queue.enqueue(score("card-2", 1, 3))
        assertEquals(3, queue.size())
    }

    @Test
    fun `queue drops the oldest entries when bounded`() {
        val queue = PendingScoreQueue(maxItems = 3)
        queue.enqueue(score("card", 1, 4))
        queue.enqueue(score("card", 2, 4))
        queue.enqueue(score("card", 3, 4))
        queue.enqueue(score("card", 4, 4))
        assertEquals(3, queue.size())
        assertEquals(listOf(2, 3, 4), queue.snapshot().map { it.holeNumber })
    }

    @Test
    fun `remove only drops the requested hole`() {
        val queue = PendingScoreQueue()
        queue.enqueue(score("card-1", 1, 4))
        queue.enqueue(score("card-1", 2, 4))
        assertTrue(queue.remove("card-1", 1))
        assertFalse(queue.remove("card-1", 1))
        assertEquals(1, queue.size())
        assertTrue(queue.contains("card-1", 2))
    }

    @Test
    fun `attempts are tracked per hole`() {
        val queue = PendingScoreQueue()
        queue.enqueue(score("card-1", 1, 4))
        queue.markAttempt("card-1", 1)
        queue.markAllAttempted()
        assertEquals(2, queue.snapshot().first().attempts)
    }

    @Test
    fun `serialized payload uses the canonical scorecard hole schema`() {
        val queue = PendingScoreQueue()
        queue.enqueue(score("card-1", 7, 5, 4), nowMillis = 1_700_000_000_000L)
        val raw = queue.serialize()
        assertTrue(raw.contains("\"scorecard_id\":\"card-1\""))
        assertTrue(raw.contains("\"hole_number\":7"))
        assertTrue(raw.contains("\"score\":5"))
        assertTrue(raw.contains("\"par\":4"))
        assertFalse(raw.contains("match_id"))
        assertFalse(raw.contains("putts"))
        assertFalse(raw.contains("fairway_hit"))
    }

    @Test
    fun `push payload writes strokes par and score to par`() {
        val payload = score("card-1", 9, 3, 5).payload()
        assertEquals("card-1", payload["scorecard_id"])
        assertEquals(9, payload["hole_number"])
        assertEquals(5, payload["par"])
        assertEquals(3, payload["strokes"])
        assertEquals(-2, payload["score_to_par"])
    }

    @Test
    fun `enqueue rejects an out of range par`() {
        val queue = PendingScoreQueue()
        assertFalse(queue.enqueue(score("card-1", 1, 4, 2)))
        assertTrue(queue.isEmpty())
    }

    @Test
    fun `deserialization restores queued items`() {
        val source = PendingScoreQueue()
        source.enqueue(score("card-1", 1, 4), nowMillis = 42L)
        source.enqueue(score("card-1", 2, 5), nowMillis = 43L)

        val restored = PendingScoreQueue()
        assertTrue(restored.deserialize(source.serialize()))
        assertEquals(2, restored.size())
        assertEquals(listOf(1, 2), restored.snapshot().map { it.holeNumber })
        assertEquals(listOf(42L, 43L), restored.snapshot().map { it.queuedAtMillis })
    }

    @Test
    fun `deserialization rejects corrupt payloads without throwing`() {
        val queue = PendingScoreQueue()
        assertFalse(queue.deserialize("not-json"))
        assertTrue(queue.isEmpty())
    }

    @Test
    fun `deserialization drops legacy entries with an invalid score`() {
        val queue = PendingScoreQueue()
        val legacy = """{"version":1,"items":[{"scorecard_id":"card-1","hole_number":1,"score":0}]}"""
        assertTrue(queue.deserialize(legacy))
        assertTrue(queue.isEmpty())
    }

    @Test
    fun `dedupe key is stable for a scorecard and hole`() {
        assertEquals("card-1:4", score("card-1", 4, 5).dedupeKey())
    }
}
