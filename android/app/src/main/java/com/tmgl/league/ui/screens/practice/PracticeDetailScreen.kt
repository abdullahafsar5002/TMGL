package com.tmgl.league.ui.screens.practice

import androidx.compose.foundation.clickable
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import android.content.Context
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.CourseHole
import com.tmgl.league.data.model.PracticeRound
import com.tmgl.league.data.model.PracticeScore
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.PracticeRepository
import com.tmgl.league.ui.components.ErrorState
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglTopBar
import com.tmgl.league.ui.screens.export.ScoreExportManager
import com.tmgl.league.ui.theme.TmglGreen
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

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
    var error by remember { mutableStateOf<String?>(null) }
    var reloadTrigger by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val repository = remember { PracticeRepository() }

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
                    }
                    is DataResult.Error -> { error = scoresResult.message; isLoading = false }
                }
            }
            is DataResult.Error -> { error = result.message; isLoading = false }
        }
    }

    fun getParForHole(holeNumber: Int): Int {
        return courseHoles.find { it.holeNumber == holeNumber }?.par ?: 4
    }

    fun calculateTotals(): Pair<Int, Int> {
        val gross = scores.sumOf { it.score }
        val par = scores.sumOf { it.par }
        return gross to (gross - par)
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
                var showScoreDialog by remember { mutableStateOf(false) }
                var showCompleteDialog by remember { mutableStateOf(false) }

                if (showScoreDialog) {
                    PracticeScoreDialog(
                        roundId = practiceRoundId,
                        holeNumber = scores.size + 1,
                        defaultPar = getParForHole(scores.size + 1),
                        courseHoles = courseHoles,
                        maxHoles = r.roundType,
                        onDismiss = { showScoreDialog = false },
                        onSaved = {
                            scope.launch {
                                val (gross, toPar) = calculateTotals()
                                try {
                                    SupabaseConfig.client.from("practice_rounds")
                                        .update(mapOf<String, Any>(
                                            "gross_score" to gross,
                                            "total_to_par" to toPar
                                        )) {
                                            filter { eq("id", practiceRoundId) }
                                        }
                                } catch (_: Exception) {}
                                reloadTrigger++
                            }
                        }
                    )
                }

                if (showCompleteDialog) {
                    val (gross, toPar) = calculateTotals()
                    var completeError by remember { mutableStateOf<String?>(null) }
                    AlertDialog(
                        onDismissRequest = { showCompleteDialog = false },
                        title = { Text("Complete Round?") },
                        text = {
                            Column {
                                Text("Gross: $gross  |  To Par: ${if (toPar >= 0) "+$toPar" else "$toPar"}")
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("${scores.size} of ${r.roundType} holes entered")
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
                                scope.launch {
                                    try {
                                        val updatePayload = mapOf<String, Any>(
                                            "status" to "completed",
                                            "gross_score" to gross,
                                            "total_to_par" to toPar
                                        )
                                        SupabaseConfig.client.from("practice_rounds")
                                            .update(updatePayload) {
                                                filter { eq("id", practiceRoundId) }
                                            }
                                        reloadTrigger++
                                    } catch (e: Exception) {
                                        completeError = e.message ?: "Failed to complete"
                                    }
                                }
                            }) { Text("Complete") }
                        },
                        dismissButton = {
                            TextButton(onClick = { showCompleteDialog = false }) { Text("Cancel") }
                        }
                    )
                }

                LazyColumn(
                    modifier = Modifier.padding(paddingValues),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        val (gross, toPar) = calculateTotals()
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "${r.roundType}-Hole Practice Round",
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Status: ${r.status.name.replace("_", " ")}", style = MaterialTheme.typography.bodyMedium)
                                Text("Gross Score: $gross", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                Text(
                                    text = "To Par: ${if (toPar >= 0) "+$toPar" else "$toPar"}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = when {
                                        toPar < 0 -> MaterialTheme.colorScheme.tertiary
                                        toPar == 0 -> MaterialTheme.colorScheme.primary
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

                    if (scores.isNotEmpty()) {
                        item {
                            Text("Hole Scores (${scores.size}/${r.roundType})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                        }
                        items(scores.sortedBy { it.holeNumber }, key = { it.holeNumber }) { score ->
                            val toPar = score.score - score.par
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Hole ${score.holeNumber}", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                                    Text("Par ${score.par}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                                    Text("Score ${score.score}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                    Text(
                                        text = if (toPar >= 0) "+$toPar" else "$toPar",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = when {
                                            toPar < 0 -> MaterialTheme.colorScheme.tertiary
                                            toPar == 0 -> MaterialTheme.colorScheme.primary
                                            else -> MaterialTheme.colorScheme.error
                                        },
                                        modifier = Modifier.weight(0.5f)
                                    )
                                    IconButton(
                                        onClick = {
                                            scope.launch {
                                                try {
                                                    SupabaseConfig.client.from("practice_scores")
                                                        .delete { filter { eq("id", score.id) } }
                                                    reloadTrigger++
                                                } catch (_: Exception) {}
                                            }
                                        },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Delete score", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }
                        }
                    } else {
                        item {
                            Text(
                                text = "No scores yet. Tap below to start entering scores.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }
                    }

                    if (scores.size < r.roundType && r.status != com.tmgl.league.data.model.PracticeRoundStatus.COMPLETED) {
                        item {
                            Button(
                                onClick = { showScoreDialog = true },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                            ) {
                                Text("Add Score for Hole ${scores.size + 1}")
                            }
                        }
                    }

                    if (scores.isNotEmpty() && r.status != com.tmgl.league.data.model.PracticeRoundStatus.COMPLETED) {
                        item {
                            Button(
                                onClick = { showCompleteDialog = true },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(20.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Complete Round (${scores.size}/${r.roundType} holes)")
                            }
                        }
                    }

                    if (scores.isNotEmpty()) {
                        item {
                            val context = androidx.compose.ui.platform.LocalContext.current
                            Button(
                                onClick = {
                                    val holes = scores.map { Triple(it.holeNumber, it.par, it.score) }
                                    val uri = ScoreExportManager.exportScorecardCsv(
                                        context,
                                        "Player",
                                        holes,
                                        "Practice Round"
                                    )
                                    uri?.let { ScoreExportManager.shareFile(context, it) }
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Export Scorecard")
                            }
                        }
                    }
                }
            }
        }
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
        onDismissRequest = onDismiss,
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
                    onValueChange = { score = it.filter { c -> c.isDigit() } },
                    label = { Text("Score (strokes)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = par,
                    onValueChange = { par = it.filter { c -> c.isDigit() } },
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
                    isSaving = true; errorMsg = null
                    scope.launch {
                        try {
                            val practiceScore = PracticeScore(
                                practiceRoundId = roundId,
                                holeNumber = holeNumber,
                                par = parVal,
                                score = scoreVal
                            )
                            SupabaseConfig.client.from("practice_scores").insert(practiceScore)
                            onSaved()
                            onDismiss()
                        } catch (e: Exception) {
                            errorMsg = e.message ?: "Failed to save"
                        }
                        isSaving = false
                    }
                },
                enabled = score.isNotBlank() && !isSaving
            ) { Text("Save") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
