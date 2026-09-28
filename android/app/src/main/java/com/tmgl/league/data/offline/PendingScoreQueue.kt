package com.tmgl.league.data.offline

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class PendingScore(
    @SerialName("scorecard_id") val scorecardId: String,
    @SerialName("hole_number") val holeNumber: Int,
    val score: Int,
    val par: Int = 4,
    @SerialName("queued_at") val queuedAtMillis: Long = 0L,
    val attempts: Int = 0
) {
    fun dedupeKey(): String = "$scorecardId:$holeNumber"

    fun isValid(): Boolean = scorecardId.isNotBlank()
        && holeNumber in 1..18
        && score in 1..MAX_STROKES
        && par in 3..6

    fun payload(): Map<String, Any> = mapOf(
        "scorecard_id" to scorecardId,
        "hole_number" to holeNumber,
        "par" to par,
        "strokes" to score,
        "score_to_par" to (score - par)
    )

    companion object {
        const val MIN_STROKES = 1
        const val MAX_STROKES = 20
        const val DEFAULT_PAR = 4
    }
}

@Serializable
data class PendingScoreQueueFile(
    val version: Int = 3,
    val items: List<PendingScore> = emptyList()
)

class PendingScoreQueue(val maxItems: Int = DEFAULT_MAX_ITEMS) {

    private val items = mutableListOf<PendingScore>()

    val queueJson = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Synchronized
    fun snapshot(): List<PendingScore> = items.toList()

    @Synchronized
    fun size(): Int = items.size

    @Synchronized
    fun isEmpty(): Boolean = items.isEmpty()

    @Synchronized
    fun contains(scorecardId: String, holeNumber: Int): Boolean =
        items.any { it.scorecardId == scorecardId && it.holeNumber == holeNumber }

    @Synchronized
    fun enqueue(score: PendingScore, nowMillis: Long = System.currentTimeMillis()): Boolean {
        if (!score.isValid()) return false
        val existingIndex = items.indexOfFirst { it.dedupeKey() == score.dedupeKey() }
        if (existingIndex >= 0) {
            val existing = items[existingIndex]
            if (existing.score == score.score) return false
            items[existingIndex] = score.copy(queuedAtMillis = nowMillis, attempts = existing.attempts)
            return true
        }
        items.add(score.copy(queuedAtMillis = nowMillis))
        trim()
        return true
    }

    @Synchronized
    fun remove(scorecardId: String, holeNumber: Int): Boolean {
        val removed = items.removeAll { it.scorecardId == scorecardId && it.holeNumber == holeNumber }
        return removed
    }

    @Synchronized
    fun markAttempt(scorecardId: String, holeNumber: Int) {
        val index = items.indexOfFirst { it.scorecardId == scorecardId && it.holeNumber == holeNumber }
        if (index >= 0) {
            items[index] = items[index].copy(attempts = items[index].attempts + 1)
        }
    }

    @Synchronized
    fun markAllAttempted() {
        for (index in items.indices) {
            items[index] = items[index].copy(attempts = items[index].attempts + 1)
        }
    }

    @Synchronized
    fun clear() {
        items.clear()
    }

    @Synchronized
    fun replaceAll(values: List<PendingScore>) {
        items.clear()
        items.addAll(values.filter { it.isValid() })
        trim()
    }

    @Synchronized
    fun deserialize(raw: String): Boolean {
        return try {
            val file = queueJson.decodeFromString(PendingScoreQueueFile.serializer(), raw)
            replaceAll(file.items)
            true
        } catch (_: Exception) {
            false
        }
    }

    @Synchronized
    fun serialize(): String = queueJson.encodeToString(
        PendingScoreQueueFile.serializer(),
        PendingScoreQueueFile(items = snapshot())
    )

    private fun trim() {
        while (items.size > maxItems) {
            items.removeAt(0)
        }
    }

    companion object {
        const val DEFAULT_MAX_ITEMS = 200
        const val CURRENT_VERSION = 3
    }
}
