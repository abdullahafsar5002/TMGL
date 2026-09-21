package com.tmgl.league.data.offline

import android.content.Context
import android.util.Log
import com.tmgl.league.data.SupabaseConfig
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

@Serializable
data class PendingScore(
    val eventId: String,
    val matchId: String,
    val holeNumber: Int,
    val par: Int,
    val strokes: Int,
    val scoreToPar: Int,
    val putts: Int = 0,
    val fairwayHit: Boolean = false,
    val gir: Boolean = false,
    val timestamp: Long = System.currentTimeMillis()
)

object OfflineScoreQueue {
    private const val QUEUE_FILE = "pending_scores.json"
    private val _pendingCount = MutableStateFlow(0)
    val pendingCount: StateFlow<Int> = _pendingCount
    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing
    private val queue = mutableListOf<PendingScore>()

    fun load(context: Context) {
        try {
            val file = File(context.filesDir, QUEUE_FILE)
            if (file.exists()) {
                val json = file.readText()
                queue.clear()
                queue.addAll(Json.decodeFromString<List<PendingScore>>(json))
                _pendingCount.value = queue.size
            }
        } catch (e: Exception) {
            Log.e("OfflineScoreQueue", "Load failed", e)
        }
    }

    fun add(context: Context, score: PendingScore) {
        queue.add(score)
        save(context)
        _pendingCount.value = queue.size
    }

    private fun save(context: Context) {
        try {
            val file = File(context.filesDir, QUEUE_FILE)
            file.writeText(Json.encodeToString(queue))
        } catch (e: Exception) {
            Log.e("OfflineScoreQueue", "Save failed", e)
        }
    }

    suspend fun syncAll(context: Context) {
        if (_isSyncing.value || queue.isEmpty()) return
        _isSyncing.value = true
        val iterator = queue.iterator()
        while (iterator.hasNext()) {
            val score = iterator.next()
            try {
                SupabaseConfig.client.from("scorecard_holes").insert(
                    mapOf<String, Any>(
                        "match_id" to score.matchId,
                        "hole_number" to score.holeNumber,
                        "par" to score.par,
                        "strokes" to score.strokes,
                        "score_to_par" to score.scoreToPar,
                        "putts" to score.putts,
                        "fairway_hit" to score.fairwayHit,
                        "green_in_regulation" to score.gir
                    )
                )
                iterator.remove()
            } catch (e: Exception) {
                Log.e("OfflineScoreQueue", "Sync failed for score", e)
                break
            }
        }
        save(context)
        _pendingCount.value = queue.size
        _isSyncing.value = false
    }
}
