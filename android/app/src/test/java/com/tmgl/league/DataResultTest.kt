package com.tmgl.league

import com.tmgl.league.data.repository.DataResult
import org.junit.Assert.*
import org.junit.Test

class DataResultTest {

    @Test
    fun `success contains data`() {
        val result = DataResult.Success("hello")
        assertTrue(result is DataResult.Success)
        assertEquals("hello", (result as DataResult.Success).data)
    }

    @Test
    fun `error contains message`() {
        val result = DataResult.Error("not found")
        assertTrue(result is DataResult.Error)
        assertEquals("not found", (result as DataResult.Error).message)
    }

    @Test
    fun `success and error are different types`() {
        val success = DataResult.Success(42)
        val error = DataResult.Error("fail")
        assertFalse(success is DataResult.Error)
        assertFalse(error is DataResult.Success)
    }

    @Test
    fun `success with list data`() {
        val list = listOf(1, 2, 3)
        val result = DataResult.Success(list)
        assertEquals(list, (result as DataResult.Success).data)
    }

    @Test
    fun `success with empty list`() {
        val result = DataResult.Success(emptyList<String>())
        assertTrue((result as DataResult.Success).data.isEmpty())
    }

    @Test
    fun `error with different messages`() {
        val error1 = DataResult.Error("not found")
        val error2 = DataResult.Error("timeout")
        assertEquals("not found", (error1 as DataResult.Error).message)
        assertEquals("timeout", (error2 as DataResult.Error).message)
    }

    @Test
    fun `success with data class`() {
        data class Player(val name: String, val score: Int)
        val player = Player("John", 72)
        val result = DataResult.Success(player)
        val data = (result as DataResult.Success).data
        assertEquals("John", data.name)
        assertEquals(72, data.score)
    }

    @Test
    fun `success with nullable data`() {
        val result = DataResult.Success(null)
        assertNull((result as DataResult.Success).data)
    }

    @Test
    fun `success with nested result`() {
        val inner = DataResult.Success("inner")
        val outer = DataResult.Success(inner)
        val data = (outer as DataResult.Success).data
        assertTrue(data is DataResult.Success)
        assertEquals("inner", (data as DataResult.Success).data)
    }

    @Test
    fun `error with exception message`() {
        val errorMsg = try {
            throw RuntimeException("network error")
        } catch (e: Exception) {
            e.message ?: "unknown"
        }
        val result = DataResult.Error(errorMsg)
        assertEquals("network error", (result as DataResult.Error).message)
    }

    @Test
    fun `result can be used in when expression`() {
        val result: DataResult<String> = DataResult.Success("ok")
        val message = when (result) {
            is DataResult.Success -> "Got: ${result.data}"
            is DataResult.Error -> "Error: ${result.message}"
        }
        assertEquals("Got: ok", message)
    }

    @Test
    fun `error result in when expression`() {
        val result: DataResult<String> = DataResult.Error("fail")
        val message = when (result) {
            is DataResult.Success -> "Got: ${result.data}"
            is DataResult.Error -> "Error: ${result.message}"
        }
        assertEquals("Error: fail", message)
    }
}
