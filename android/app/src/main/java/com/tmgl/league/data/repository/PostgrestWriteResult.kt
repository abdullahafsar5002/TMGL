package com.tmgl.league.data.repository

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

internal fun postgrestWriteError(data: String?): String? {
    val body = data?.trim().orEmpty()
    if (body.isEmpty()) return null
    return try {
        when (val element = Json.parseToJsonElement(body)) {
            is JsonArray -> null
            is JsonObject -> errorMessageFrom(element) ?: "The server rejected the request"
            else -> "Unexpected server response: ${body.take(200)}"
        }
    } catch (_: Exception) {
        "Unexpected server response: ${body.take(200)}"
    }
}

internal fun isRetryableWriteError(message: String?): Boolean {
    val detail = message?.trim()?.lowercase().orEmpty()
    if (detail.isEmpty()) return true
    return RETRYABLE_MARKERS.any { detail.contains(it) }
}

private val RETRYABLE_MARKERS = listOf(
    "unable to resolve host",
    "host is unknown",
    "no address associated",
    "connection",
    "connect timed out",
    "timeout",
    "timed out",
    "socket",
    "network",
    "unexpected server response",
    "reset by peer",
    "interrupted"
)

private fun errorMessageFrom(body: JsonObject): String? {
    val details = listOfNotNull(
        primitiveText(body["message"]),
        primitiveText(body["hint"]),
        primitiveText(body["code"])
    )
    return if (details.isEmpty()) null else details.joinToString(" ")
}

private fun primitiveText(element: Any?): String? =
    ((element as? JsonPrimitive)?.contentOrNull)?.takeIf { it.isNotBlank() }
