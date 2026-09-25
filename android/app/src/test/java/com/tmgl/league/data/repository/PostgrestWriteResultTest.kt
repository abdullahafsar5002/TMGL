package com.tmgl.league.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PostgrestWriteResultTest {

    @Test
    fun `empty body is not an error`() {
        assertNull(postgrestWriteError(null))
        assertNull(postgrestWriteError(""))
        assertNull(postgrestWriteError("   "))
    }

    @Test
    fun `returned rows mean the write succeeded`() {
        assertNull(postgrestWriteError("""[{"id":"reg-1","player_id":"player-1"}]"""))
    }

    @Test
    fun `policy rejection is surfaced as an error`() {
        val message = postgrestWriteError(
            """{"message":"new row violates row-level security policy","code":"42501"}"""
        )

        assertNotNull(message)
        assertTrue(message!!.contains("row-level security"))
        assertTrue(message.contains("42501"))
    }

    @Test
    fun `malformed body is surfaced instead of ignored`() {
        val message = postgrestWriteError("<html>gateway</html>")

        assertNotNull(message)
        assertTrue(message!!.startsWith("Unexpected server response"))
    }

    @Test
    fun `policy rejections are not treated as retryable`() {
        val message = postgrestWriteError("""{"message":"row-level security policy","code":"42501"}""")

        assertFalse(isRetryableWriteError(message))
        assertTrue(isRetryableWriteError("Unable to resolve host"))
    }
}
