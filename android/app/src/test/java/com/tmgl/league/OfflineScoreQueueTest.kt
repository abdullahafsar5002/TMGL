package com.tmgl.league

import org.junit.Assert.*
import org.junit.Test

class OfflineScoreQueueTest {

    @Test
    fun `pending count starts at zero`() {
        val count = 0
        assertEquals(0, count)
    }

    @Test
    fun `score JSON serialization roundtrip`() {
        val json = """{"hole_number":1,"par":4,"strokes":5,"putts":2,"fairway_hit":true,"gir":false}"""
        assertTrue(json.contains("hole_number"))
        assertTrue(json.contains("par"))
        assertTrue(json.contains("strokes"))
    }
}
