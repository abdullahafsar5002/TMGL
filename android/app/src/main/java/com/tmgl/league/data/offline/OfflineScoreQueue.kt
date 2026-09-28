package com.tmgl.league.data.offline

import android.content.Context
import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.auth.SessionSync
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import java.io.File

data class OfflineSyncSummary(
    val synced: Int = 0,
    val failed: Int = 0,
    val pending: Int = 0
)

object OfflineScoreQueue {

    private const val QUEUE_FILE = "pending_scores.json"
    private val pending = PendingScoreQueue()
    private val syncMutex = Mutex()

    private val _pendingCount = MutableStateFlow(0)
    val pendingCount: StateFlow<Int> = _pendingCount

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing

    private val _lastError = MutableStateFlow<String?>(null)
    val lastError: StateFlow<String?> = _lastError

    suspend fun load(context: Context) {
        withContext(Dispatchers.IO) {
            val file = File(context.filesDir, QUEUE_FILE)
            if (!file.exists()) {
                _pendingCount.value = 0
                return@withContext
            }
            val loaded = try {
                pending.deserialize(file.readText())
            } catch (_: Exception) {
                false
            }
            if (!loaded) pending.clear()
            _pendingCount.value = pending.size()
        }
    }

    suspend fun add(context: Context, score: PendingScore) {
        pending.enqueue(score)
        persist(context)
    }

    suspend fun addAll(context: Context, scores: List<PendingScore>) {
        scores.forEach { pending.enqueue(it) }
        persist(context)
    }

    suspend fun remove(context: Context, scorecardId: String, holeNumber: Int) {
        pending.remove(scorecardId, holeNumber)
        persist(context)
    }

    fun snapshot(): List<PendingScore> = pending.snapshot()

    fun clear() {
        pending.clear()
        _pendingCount.value = 0
        _lastError.value = null
    }

    suspend fun syncAll(
        context: Context,
        storage: EncryptedAuthStorage,
        onScorecardSynced: suspend (String) -> Unit = {}
    ): OfflineSyncSummary {
        if (pending.isEmpty()) return OfflineSyncSummary()
        if (!syncMutex.tryLock()) return OfflineSyncSummary(pending = pending.size())
        _isSyncing.value = true
        _lastError.value = null
        var synced = 0
        var failed = 0
        val touchedScorecards = linkedSetOf<String>()
        try {
            for (score in pending.snapshot()) {
                if (pushScore(score)) {
                    pending.remove(score.scorecardId, score.holeNumber)
                    touchedScorecards.add(score.scorecardId)
                    synced++
                } else {
                    pending.markAttempt(score.scorecardId, score.holeNumber)
                    failed++
                    break
                }
            }
            persist(context)
            _pendingCount.value = pending.size()
            for (scorecardId in touchedScorecards) {
                runCatching { onScorecardSynced(scorecardId) }
            }
        } catch (e: Exception) {
            _lastError.value = e.message ?: "Sync failed"
            pending.markAllAttempted()
            persist(context)
        } finally {
            _isSyncing.value = false
            syncMutex.unlock()
        }
        return OfflineSyncSummary(synced = synced, failed = failed, pending = pending.size())
    }

    private suspend fun pushScore(score: PendingScore): Boolean {
        val userId = SessionSync.authUserId()
        if (userId.isNullOrBlank()) return false
        return try {
            val response = SupabaseConfig.client.from("scorecard_holes")
                .upsert(score.payload(), onConflict = "scorecard_id,hole_number") { select() }
            val body = response.data
            body.isNotBlank() && body.contains(score.scorecardId) && body.contains("\"strokes\"")
        } catch (_: Exception) {
            false
        }
    }

    private suspend fun persist(context: Context) {
        withContext(Dispatchers.IO) {
            try {
                File(context.filesDir, QUEUE_FILE).writeText(pending.serialize())
            } catch (_: Exception) {
            }
            _pendingCount.value = pending.size()
        }
    }
}
