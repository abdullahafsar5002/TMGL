package com.tmgl.league.ui.screens.practice

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.CourseHole
import com.tmgl.league.data.model.PracticeRound
import com.tmgl.league.data.model.PracticeRoundStatus
import com.tmgl.league.data.model.PracticeScore
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.PracticeRepository
import com.tmgl.league.data.repository.postgrestWriteError
import com.tmgl.league.ui.components.ErrorState
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglTopBar
import com.tmgl.league.ui.format.displayLabel
import com.tmgl.league.ui.screens.export.ScorecardExportRow
import com.tmgl.league.ui.screens.export.ScoreExportManager
import com.tmgl.league.ui.theme.TmglGreen
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val PRACTICE_SCORES_CONFLICT = "practice_round_id,hole_number"
private const val PRACTICE_DETAIL_TAG = "PracticeDetail"

@EntryPoint
@InstallIn(SingletonComponent::class)
internal interface PracticeDetailDependencies {
    fun practiceRepository(): PracticeRepository
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PracticeDetailScreen(
    practiceRoundId: String,
    onBack: () -> Unit
) {
    var round by remember { mutableStateOf<PracticeRound?>(null) }
    var scores by remember { mutableStateOf<List<PracticeScore>>(emptyList()) }
    var courseHoles by remember { mutableStateOf<List<CourseHole>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isExporting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadTrigger by remember { mutableIntStateOf(0) }
    var showScoreDialog by remember { mutableStateOf(false) }
    var showCompleteDialog by remember { mutableStateOf(false) }
    var completeError by remember { mutableStateOf<String?>(null) }
    var pendingDelete by remember { mutableStateOf<PracticeScore?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var totalsSyncPending by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val repository = remember(context) {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            PracticeDetailDependencies::class.java
        ).practiceRepository()
    }

    LaunchedEffect(reloadTrigger) {
        isLoading = true; error = null
        when (val result = repository.getPracticeRound(practiceRoundId)) {
            is DataResult.Success -> {
                round = result.data
                val roundData = result.data
                when (val scoresResult = repository.getPracticeScores(practiceRoundId)) {
                    is DataResult.Success -> {
                        scores = scoresResult.data
                        if (roundData.courseId.isNotEmpty()) {
                            when (val holesResult = repository.getCourseHoles(roundData.courseId)) {
                                is DataResult.Success -> courseHoles = holesResult.data
                                is DataResult.Error -> {}
                            }
                        }
                        isLoading = false
                        val shouldSyncTotals = totalsSyncPending
                        totalsSyncPending = false
                        if (shouldSyncTotals) {
                            pushRoundTotals(practiceRoundId, scoresResult.data)
                        }
                    }
                    is DataResult.Error -> { error = scoresResult.message; isLoading = false }
                }
            }
            is DataResult.Error -> { error = result.message; isLoading = false }
        }
    }

    val orderedScores = remember(scores) { scores.sortedBy { it.holeNumber } }
    val exportPlayerName = remember(round, orderedScores) {
        round?.playerId?.takeIf { it.isNotBlank() } ?: "Player"
    }
    val nextHoleNumber = remember(orderedScores) {
        (orderedScores.maxOfOrNull { it.holeNumber } ?: 0) + 1
    }
    val grossTotal = remember(orderedScores) { orderedScores.sumOf { it.score } }
    val parTotal = remember(orderedScores) { orderedScores.sumOf { it.par } }
    val toParTotal = grossTotal - parTotal

    fun getParForHole(holeNumber: Int): Int {
        return courseHoles.find { it.holeNumber == holeNumber }?.par ?: 4
    }

    pendingDelete?.let { target ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Delete hole ${target.holeNumber}?") },
            text = {
                Text(
                    "This permanently removes the score for hole ${target.holeNumber} " +
                        "(${target.score} strokes, par ${target.par}) from this round."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    pendingDelete = null
                    scope.launch {
                        try {
                            val deleted = SupabaseConfig.client.from("practice_scores")
                                .delete { filter { eq("id", target.id) } }
                            val writeError = postgrestWriteError(deleted.data)
                            if (writeError != null) {
                                actionError = "Couldn't delete hole ${target.holeNumber}: $writeError"
                            } else {
                                totalsSyncPending = true
                                reloadTrigger++
                            }
                        } catch (e: Exception) {
                            Log.e(PRACTICE_DETAIL_TAG, "Practice score delete failed", e)
                            actionError = "Couldn't delete hole ${target.holeNumber}. Please try again."
                        }
                    }
                }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) { Text("Cancel") }
            }
        )
    }

    if (showScoreDialog && round != null) {
        PracticeScoreDialog(
            roundId = practiceRoundId,
            holeNumber = nextHoleNumber,
            defaultPar = getParForHole(nextHoleNumber),
            courseHoles = courseHoles,
            maxHoles = round?.roundType ?: 18,
            onDismiss = { showScoreDialog = false },
            onSaved = {
                totalsSyncPending = true
                reloadTrigger++
            }
        )
    }

    if (showCompleteDialog && round != null) {
        AlertDialog(
            onDismissRequest = { showCompleteDialog = false },
            title = { Text("Complete Round?") },
            text = {
                Column {
                    Text("Gross: $grossTotal  |  To Par: ${if (toParTotal >= 0) "+$toParTotal" else "$toParTotal"}")
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("${orderedScores.size} of ${round?.roundType} holes entered")
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Mark this round as completed?", style = MaterialTheme.typography.bodyMedium)
                    completeError?.let {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    showCompleteDialog = false
                    completeError = null
                    scope.launch {
                        try {
                            val updatePayload = mapOf<String, Any>(
                                "status" to "completed",
                                "gross_score" to grossTotal,
                                "total_to_par" to toParTotal
                            )
                            val updated = SupabaseConfig.client.from("practice_rounds")
                                .update(updatePayload) {
                                    filter { eq("id", practiceRoundId) }
                                }
                            val writeError = postgrestWriteError(updated.data)
                            if (writeError != null) {
                                completeError = "Couldn't complete the round: $writeError"
                            } else {
                                reloadTrigger++
                            }
                        } catch (e: Exception) {
                            Log.e(PRACTICE_DETAIL_TAG, "Complete round failed", e)
                            completeError = "Couldn't complete the round. Please try again."
                        }
                    }
                }) { Text("Complete") }
            },
            dismissButton = {
                TextButton(onClick = { showCompleteDialog = false }) { Text("Cancel") }
            }
        )
    }

    Scaffold(
        topBar = { TmglTopBar(title = "Practice Round", onBack = onBack) }
    ) { paddingValues ->
        when {
            isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            error != null -> ErrorState(
                message = error ?: "",
                onRetry = { reloadTrigger++ },
                modifier = Modifier.padding(paddingValues)
            )
            round != null -> {
                val r = round ?: return@Scaffold
                val isCompleted = r.status == PracticeRoundStatus.COMPLETED

                LazyColumn(
                    modifier = Modifier.padding(paddingValues),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "${r.roundType}-Hole Practice Round",
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Status: ${r.status.displayLabel}", style = MaterialTheme.typography.bodyMedium)
                                Text("Gross Score: $grossTotal", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                Text(
                                    text = "To Par: ${if (toParTotal >= 0) "+$toParTotal" else "$toParTotal"}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = when {
                                        toParTotal < 0 -> MaterialTheme.colorScheme.tertiary
                                        toParTotal == 0 -> MaterialTheme.colorScheme.primary
                                        else -> MaterialTheme.colorScheme.error
                                    }
                                )
                                if (r.startedAt != null) {
                                    Text("Started: ${r.startedAt?.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                if (r.completedAt != null) {
                                    Text("Completed: ${r.completedAt?.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }

                    actionError?.let { message ->
                        item(key = "action_error") {
                            Text(
                                text = message,
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }

                    if (orderedScores.isNotEmpty()) {
                        item(key = "scores_header") {
                            Text("Hole Scores (${orderedScores.size}/${r.roundType})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                        }
                        items(
                            items = orderedScores,
                            key = { score -> score.id.ifBlank { "hole-${score.holeNumber}" } }
                        ) { score ->
                            val holeToPar = score.score - score.par
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Hole ${score.holeNumber}", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                                    Text("Par ${score.par}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                                    Text("Score ${score.score}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                    Text(
                                        text = if (holeToPar >= 0) "+$holeToPar" else "$holeToPar",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = when {
                                            holeToPar < 0 -> MaterialTheme.colorScheme.tertiary
                                            holeToPar == 0 -> MaterialTheme.colorScheme.primary
                                            else -> MaterialTheme.colorScheme.error
                                        },
                                        modifier = Modifier.weight(0.5f)
                                    )
                                    IconButton(
                                        onClick = { pendingDelete = score },
                                        modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete hole ${score.holeNumber}", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(20.dp))
                                    }
                                }
                            }
                        }
                    } else {
                        item(key = "scores_empty") {
                            Text(
                                text = "No scores yet. Tap below to start entering scores.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }
                    }

                    if (orderedScores.size < r.roundType && !isCompleted) {
                        item(key = "add_score") {
                            Button(
                                onClick = { showScoreDialog = true },
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                            ) {
                                Text("Add Score for Hole $nextHoleNumber")
                            }
                        }
                    }

                    if (orderedScores.isNotEmpty() && !isCompleted) {
                        item(key = "complete_round") {
                            Button(
                                onClick = { showCompleteDialog = true },
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Complete Round (${orderedScores.size}/${r.roundType} holes)")
                            }
                        }
                    }

                    if (orderedScores.isNotEmpty()) {
                        item(key = "export") {
                            Button(
                                onClick = {
                                    isExporting = true
                                    actionError = null
                                    val rows = orderedScores.map {
                                        ScorecardExportRow(
                                            playerName = exportPlayerName,
                                            holeNumber = it.holeNumber,
                                            par = it.par,
                                            strokes = it.score
                                        )
                                    }
                                    scope.launch {
                                        try {
                                            val uri = withContext(Dispatchers.IO) {
                                                ScoreExportManager.exportScorecardCsv(
                                                    context,
                                                    "Practice Round",
                                                    rows
                                                )
                                            }
                                            if (uri == null) {
                                                actionError = "Couldn't create the scorecard file. Please try again."
                                            } else {
                                                ScoreExportManager.shareFile(context, uri)
                                            }
                                        } catch (e: Exception) {
                                            Log.e(PRACTICE_DETAIL_TAG, "Scorecard export failed", e)
                                            actionError = "Couldn't export the scorecard. Please try again."
                                        } finally {
                                            isExporting = false
                                        }
                                    }
                                },
                                enabled = !isExporting,
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(if (isExporting) "Exporting..." else "Export Scorecard")
                            }
                        }
                    }
                }
            }
        }
    }
}

private suspend fun pushRoundTotals(roundId: String, entries: List<PracticeScore>) {
    if (entries.isEmpty()) return
    val gross = entries.sumOf { it.score }
    val toPar = entries.sumOf { it.score - it.par }
    try {
        val updated = SupabaseConfig.client.from("practice_rounds")
            .update(mapOf<String, Any>(
                "gross_score" to gross,
                "total_to_par" to toPar
            )) {
                filter { eq("id", roundId) }
            }
        val writeError = postgrestWriteError(updated.data)
        if (writeError != null) {
            Log.w(PRACTICE_DETAIL_TAG, "Round totals update rejected for $roundId: $writeError")
        }
    } catch (e: Exception) {
        Log.e(PRACTICE_DETAIL_TAG, "Round totals update failed for $roundId", e)
    }
}

@Composable
private fun PracticeScoreDialog(
    roundId: String,
    holeNumber: Int,
    defaultPar: Int = 4,
    courseHoles: List<CourseHole> = emptyList(),
    maxHoles: Int,
    onDismiss: () -> Unit,
    onSaved: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var score by remember { mutableStateOf("") }
    var par by remember { mutableStateOf(defaultPar.toString()) }
    var isSaving by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    val courseHole = courseHoles.find { it.holeNumber == holeNumber }

    AlertDialog(
        onDismissRequest = { if (!isSaving) onDismiss() },
        title = { Text("Hole $holeNumber Score") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    courseHole?.yardage?.let { yardage ->
                        Text("Yardage: ${yardage}y", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    courseHole?.handicapIndex?.let { si ->
                        Text("Stroke Index: $si", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                OutlinedTextField(
                    value = score,
                    onValueChange = { score = it.filter { c -> c.isDigit() }.take(2) },
                    label = { Text("Score (strokes)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = par,
                    onValueChange = { par = it.filter { c -> c.isDigit() }.take(1) },
                    label = { Text("Par") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                errorMsg?.let {
                    Text(text = it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val scoreVal = score.toIntOrNull()
                    val parVal = par.toIntOrNull()
                    if (scoreVal == null || scoreVal < 1) {
                        errorMsg = "Enter a valid score (1 or more)"
                        return@TextButton
                    }
                    if (parVal == null || parVal < 3 || parVal > 6) {
                        errorMsg = "Par must be between 3 and 6"
                        return@TextButton
                    }
                    if (holeNumber > maxHoles) {
                        errorMsg = "This round only has $maxHoles holes"
                        return@TextButton
                    }
                    isSaving = true; errorMsg = null
                    scope.launch {
                        try {
                            val payload = listOf(
                                mapOf(
                                    "practice_round_id" to roundId,
                                    "hole_number" to holeNumber,
                                    "par" to parVal,
                                    "score" to scoreVal
                                )
                            )
                            val upserted = SupabaseConfig.client.from("practice_scores")
                                .upsert(payload, onConflict = PRACTICE_SCORES_CONFLICT)
                            val writeError = postgrestWriteError(upserted.data)
                            if (writeError != null) {
                                errorMsg = writeError
                                return@launch
                            }
                            onSaved()
                            onDismiss()
                        } catch (e: Exception) {
                            Log.e(PRACTICE_DETAIL_TAG, "Practice score upsert failed", e)
                            errorMsg = "Couldn't save the score. Please try again."
                        } finally {
                            isSaving = false
                        }
                    }
                },
                enabled = score.isNotBlank() && !isSaving
            ) { Text(if (isSaving) "Saving..." else "Save") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSaving) { Text("Cancel") }
        }
    )
}
