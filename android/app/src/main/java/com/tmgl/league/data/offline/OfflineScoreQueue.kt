package com.tmgl.league.data.offline

import android.content.Context
import android.util.Log
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.ScorecardHole
import com.tmgl.league.data.model.ScorecardStatus
import com.tmgl.league.data.scoring.statusWireValue
import com.tmgl.league.data.scoring.totalsFromHoles
import com.tmgl.league.data.repository.postgrestWriteError
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

private const val SCORECARD_HOLES_CONFLICT = "scorecard_id,hole_number"

@Serializable
data class PendingScore(
    val scorecardId: String,
    val holeNumber: Int,
    val par: Int,
    val strokes: Int,
    val scoreToPar: Int,
    val status: String = statusWireValue(ScorecardStatus.IN_PROGRESS),
    val timestamp: Long = System.currentTimeMillis()
) {
    fun toInsertRow(): Map<String, Any> = mapOf(
        "scorecard_id" to scorecardId,
        "hole_number" to holeNumber,
        "par" to par,
        "strokes" to strokes,
        "score_to_par" to scoreToPar
    )
}

object OfflineScoreQueue {
    private const val QUEUE_FILE = "pending_scores.json"
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    private val _pendingCount = MutableStateFlow(0)
    val pendingCount: StateFlow<Int> = _pendingCount

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing

    private val queue = mutableListOf<PendingScore>()
    private val queueLock = Any()
    private val mutex = Mutex()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val syncGuard = AtomicBoolean(false)
    private val initialized = AtomicBoolean(false)

    @Volatile
    private var appContext: Context? = null

    fun initialize(context: Context, monitor: NetworkMonitor? = null) {
        val app = context.applicationContext
        appContext = app
        if (monitor != null) {
            monitor.addOnConnectionRestoredListener { requestSync() }
        }
        if (initialized.compareAndSet(false, true)) {
            scope.launch {
                loadQueue(app)
                syncAll(app)
            }
            return
        }
        if (monitor?.isOnline?.value != false) {
            requestSync()
        }
    }

    fun requestSync() {
        val app = appContext ?: return
        scope.launch { syncAll(app) }
    }

    suspend fun enqueue(context: Context, scores: List<PendingScore>) {
        if (scores.isEmpty()) return
        val snapshot = mutex.withLock {
            synchronized(queueLock) {
                scores.forEach { score ->
                    queue.removeAll { it.scorecardId == score.scorecardId && it.holeNumber == score.holeNumber }
                    queue.add(score)
                }
                queue.toList()
            }
        }
        writeQueueFile(context, snapshot)
    }

    suspend fun add(context: Context, score: PendingScore) = enqueue(context, listOf(score))

    fun pendingFor(scorecardId: String, holeNumber: Int): PendingScore? = synchronized(queueLock) {
        queue.firstOrNull { it.scorecardId == scorecardId && it.holeNumber == holeNumber }
    }

    fun hasPending(scorecardId: String): Boolean = synchronized(queueLock) {
        queue.any { it.scorecardId == scorecardId }
    }

    fun clearAll() {
        synchronized(queueLock) { queue.clear() }
        _pendingCount.value = 0
    }

    suspend fun syncAll(context: Context) {
        if (!syncGuard.compareAndSet(false, true)) return
        _isSyncing.value = true
        try {
            val pending = mutex.withLock { synchronized(queueLock) { queue.toList() } }
            if (pending.isEmpty()) return
            for ((scorecardId, entries) in pending.groupBy { it.scorecardId }) {
                val synced = syncScorecard(scorecardId, entries)
                if (!synced) {
                    Log.w("OfflineScoreQueue", "Sync paused for scorecard $scorecardId")
                    break
                }
                mutex.withLock {
                    synchronized(queueLock) { queue.removeAll { it.scorecardId == scorecardId } }
                }
            }
            val snapshot = mutex.withLock { synchronized(queueLock) { queue.toList() } }
            writeQueueFile(context, snapshot)
        } finally {
            _isSyncing.value = false
            syncGuard.set(false)
        }
    }

    private suspend fun syncScorecard(scorecardId: String, entries: List<PendingScore>): Boolean {
        return try {
            val upserted = SupabaseConfig.client.from("scorecard_holes")
                .upsert(entries.map { it.toInsertRow() }, onConflict = SCORECARD_HOLES_CONFLICT)
            val error = postgrestWriteError(upserted.data)
            if (error != null) {
                Log.e("OfflineScoreQueue", "Sync failed for scorecard $scorecardId: $error")
                return false
            }

            val holes = SupabaseConfig.client.from("scorecard_holes").select {
                filter { eq("scorecard_id", scorecardId) }
            }.decodeList<ScorecardHole>()

            val totals = totalsFromHoles(holes)
            val status = entries.maxByOrNull { it.timestamp }?.status
                ?: statusWireValue(ScorecardStatus.IN_PROGRESS)
            val updated = SupabaseConfig.client.from("scorecards").update(
                mapOf(
                    "total_strokes" to totals.totalStrokes,
                    "total_score_to_par" to totals.totalToPar,
                    "status" to status
                )
            ) { filter { eq("id", scorecardId) } }
            val updateError = postgrestWriteError(updated.data)
            if (updateError != null) {
                Log.e("OfflineScoreQueue", "Totals update failed for $scorecardId: $updateError")
                return false
            }
            true
        } catch (e: Exception) {
            Log.e("OfflineScoreQueue", "Sync failed for scorecard $scorecardId", e)
            false
        }
    }

    private suspend fun loadQueue(context: Context) {
        val loaded = withContext(Dispatchers.IO) {
            try {
                val file = queueFile(context)
                if (!file.exists()) {
                    emptyList()
                } else {
                    json.decodeFromString<List<PendingScore>>(file.readText())
                        .filter { it.scorecardId.isNotBlank() }
                }
            } catch (e: Exception) {
                Log.e("OfflineScoreQueue", "Load failed", e)
                emptyList()
            }
        }
        mutex.withLock {
            synchronized(queueLock) {
                val merged = (loaded + queue).distinctBy { it.scorecardId to it.holeNumber }
                queue.clear()
                queue.addAll(merged)
            }
        }
        _pendingCount.value = synchronized(queueLock) { queue.size }
    }

    private suspend fun writeQueueFile(context: Context, snapshot: List<PendingScore>) {
        withContext(Dispatchers.IO) {
            try {
                queueFile(context).writeText(json.encodeToString(snapshot))
            } catch (e: Exception) {
                Log.e("OfflineScoreQueue", "Save failed", e)
            }
        }
        _pendingCount.value = snapshot.size
    }

    private fun queueFile(context: Context) = File(context.filesDir, QUEUE_FILE)
}
