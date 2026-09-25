package com.tmgl.league.data.offline

import com.tmgl.league.data.repository.isRetryableWriteError
import com.tmgl.league.data.repository.postgrestWriteError
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class OfflineScoreQueueTest {

    private val encodingJson = Json { encodeDefaults = true }
    private val decodingJson = Json { ignoreUnknownKeys = true }

    @Test
    fun `pending score only writes valid scorecard holes columns`() {
        val row = PendingScore(
            scorecardId = "sc-1",
            holeNumber = 4,
            par = 4,
            strokes = 5,
            scoreToPar = 1,
            status = "in_progress"
        ).toInsertRow()

        assertEquals(
            setOf("scorecard_id", "hole_number", "par", "strokes", "score_to_par"),
            row.keys
        )
    }

    @Test
    fun `pending score is keyed by scorecard rather than match`() {
        val first = PendingScore(scorecardId = "sc-1", holeNumber = 1, par = 4, strokes = 4, scoreToPar = 0)
        val second = PendingScore(scorecardId = "sc-2", holeNumber = 1, par = 4, strokes = 5, scoreToPar = 1)

        assertEquals("sc-1", first.scorecardId)
        assertEquals("sc-2", second.scorecardId)
        assertNotEquals(first, second)
    }

    @Test
    fun `pending score defaults to in progress`() {
        val score = PendingScore(scorecardId = "sc-1", holeNumber = 1, par = 4, strokes = 4, scoreToPar = 0)

        assertEquals("in_progress", score.status)
    }

    @Test
    fun `pending score survives a round trip through json`() {
        val original = PendingScore(
            scorecardId = "sc-9",
            holeNumber = 11,
            par = 3,
            strokes = 2,
            scoreToPar = -1,
            status = "submitted",
            timestamp = 1_700_000_000_000L
        )

        val encoded = encodingJson.encodeToString(original)
        val restored = decodingJson.decodeFromString<PendingScore>(encoded)

        assertEquals(original, restored)
    }

    @Test
    fun `write result treats an empty body as success`() {
        assertNull(postgrestWriteError(null))
        assertNull(postgrestWriteError(""))
        assertNull(postgrestWriteError("   "))
    }

    @Test
    fun `write result treats a returned array as success`() {
        assertNull(postgrestWriteError("""[{"hole_number":1,"strokes":4}]"""))
    }

    @Test
    fun `write result surfaces the server error message`() {
        val error = postgrestWriteError(
            """{"message":"null value in column \"scorecard_id\" violates not-null constraint","code":"23502"}"""
        )

        assertTrue(error!!.contains("scorecard_id"))
        assertTrue(error.contains("23502"))
    }

    @Test
    fun `write result rejects unexpected payloads`() {
        val error = postgrestWriteError("<html>gateway</html>")

        assertTrue(error!!.contains("Unexpected server response"))
    }

    @Test
    fun `connectivity failures are retryable`() {
        assertTrue(isRetryableWriteError(null))
        assertTrue(isRetryableWriteError(""))
        assertTrue(isRetryableWriteError("Unable to resolve host \"api.supabase.co\""))
        assertTrue(isRetryableWriteError("SocketTimeoutException: timeout"))
        assertTrue(isRetryableWriteError("Unexpected server response: <html>"))
    }

    @Test
    fun `server rejections are not retryable`() {
        assertFalse(isRetryableWriteError("new row violates row-level security policy"))
        assertFalse(isRetryableWriteError("Scorecard has 15 of 18 holes. Missing holes: 3, 7"))
        assertFalse(isRetryableWriteError("null value in column \"strokes\" violates not-null constraint 23502"))
    }
}
