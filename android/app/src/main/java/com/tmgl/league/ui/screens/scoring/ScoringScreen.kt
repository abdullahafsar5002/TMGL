package com.tmgl.league.ui.screens.scoring

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.model.ScoringTarget
import com.tmgl.league.data.scoring.ExpectedHole
import com.tmgl.league.data.scoring.MAX_STROKES
import com.tmgl.league.ui.components.ErrorState
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglButton
import com.tmgl.league.ui.components.TmglCard
import com.tmgl.league.ui.viewmodel.ScoringViewModel
import com.tmgl.league.util.HapticFeedbackHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScoringScreen(
    target: ScoringTarget?,
    onBack: () -> Unit,
    viewModel: ScoringViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current
    val hapticPerformer = HapticFeedbackHelper.rememberHapticPerformer()
    val requestKey = target?.let { "${it.roundId}|${it.playerId}|${it.matchId}|${it.scorecardId}" } ?: "none"

    LaunchedEffect(requestKey) {
        viewModel.load(target ?: ScoringTarget.None)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Score Entry") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    if (uiState.enteredCount > 0) {
                        IconButton(onClick = {
                            shareScorecard(context, uiState.strokes, uiState.expectedHoles)
                        }) {
                            Icon(Icons.Default.Share, "Share")
                        }
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues).fillMaxSize()) {
            when {
                uiState.isLoading -> LoadingIndicator(modifier = Modifier.fillMaxWidth().padding(32.dp))
                uiState.scorecardId == null -> ErrorState(
                    message = uiState.errorMessage ?: "Score entry is unavailable.",
                    modifier = Modifier.fillMaxWidth()
                )
                else -> {
                    val totals = scorecardTotals(uiState.strokes, uiState.expectedHoles)
                    val rawInputs = remember(uiState.scorecardId) {
                        mutableStateMapOf<Int, String>().also { inputs ->
                            uiState.expectedHoles.forEach { hole ->
                                inputs[hole.holeNumber] = uiState.strokes[hole.holeNumber]?.toString().orEmpty()
                            }
                        }
                    }
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                        contentPadding = PaddingValues(vertical = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        item {
                            TmglCard {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(
                                        text = "Enter your scores for each hole",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        text = "${uiState.enteredCount} of ${uiState.expectedHoles.size} holes entered",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    if (uiState.isPendingSync) {
                                        Text(
                                            text = "Some scores are stored on this device and will sync later",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.error
                                        )
                                    }
                                }
                            }
                        }

                        items(uiState.expectedHoles, key = { it.holeNumber }) { hole ->
                            val text = rawInputs[hole.holeNumber].orEmpty()
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.width(60.dp)) {
                                        Text(
                                            text = "Hole ${hole.holeNumber}",
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "Par ${hole.par}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    Spacer(modifier = Modifier.weight(1f))
                                    OutlinedTextField(
                                        value = text,
                                        onValueChange = { raw ->
                                            val digits = raw.filter { it.isDigit() }.take(2)
                                            val parsed = digits.toIntOrNull()
                                            rawInputs[hole.holeNumber] = digits
                                            hapticPerformer(HapticFeedbackHelper.HapticType.CLOCK_TICK)
                                            viewModel.setStrokes(
                                                hole.holeNumber,
                                                if (parsed != null && parsed in 1..MAX_STROKES) parsed else null
                                            )
                                        },
                                        modifier = Modifier.width(80.dp),
                                        keyboardOptions = KeyboardOptions(
                                            keyboardType = KeyboardType.Number,
                                            imeAction = ImeAction.Done
                                        ),
                                        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                                        singleLine = true,
                                        isError = text.isNotEmpty() && text.toIntOrNull() !in 1..MAX_STROKES,
                                        shape = MaterialTheme.shapes.small
                                    )
                                }
                            }
                        }

                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            TmglCard {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text("Total Strokes", style = MaterialTheme.typography.bodyMedium)
                                    Text(
                                        text = "${totals.first}",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                if (totals.first > 0) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp, vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text("To Par", style = MaterialTheme.typography.bodyMedium)
                                        Text(
                                            text = if (totals.second >= 0) "+${totals.second}" else "${totals.second}",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = if (totals.second <= 0) {
                                                MaterialTheme.colorScheme.primary
                                            } else {
                                                MaterialTheme.colorScheme.error
                                            }
                                        )
                                    }
                                }
                            }
                        }

                        if (uiState.errorMessage != null) {
                            item {
                                hapticPerformer(HapticFeedbackHelper.HapticType.ERROR)
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.errorContainer
                                    )
                                ) {
                                    Text(
                                        text = uiState.errorMessage ?: "",
                                        modifier = Modifier.padding(16.dp),
                                        color = MaterialTheme.colorScheme.onErrorContainer
                                    )
                                }
                            }
                        }

                        if (uiState.message != null) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.primaryContainer
                                    )
                                ) {
                                    Text(
                                        text = uiState.message ?: "",
                                        modifier = Modifier.padding(16.dp),
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                            }
                        }

                        item {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                TmglButton(
                                    text = if (uiState.isSaving) "Saving..." else "Save Progress",
                                    onClick = { viewModel.saveDraft() },
                                    enabled = uiState.hasUnsavedChanges && !uiState.isSaving
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                TmglButton(
                                    text = "Submit Scorecard",
                                    onClick = { viewModel.submit() },
                                    enabled = uiState.canSubmit
                                )
                                if (uiState.enteredCount > 0 && !uiState.completion.isComplete) {
                                    Text(
                                        text = uiState.completion.missingHolesMessage(),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(top = 8.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun scorecardTotals(strokes: Map<Int, Int?>, expected: List<ExpectedHole>): Pair<Int, Int> {
    var totalStrokes = 0
    var totalToPar = 0
    expected.forEach { hole ->
        val value = strokes[hole.holeNumber] ?: return@forEach
        if (value in 1..MAX_STROKES) {
            totalStrokes += value
            totalToPar += value - hole.par
        }
    }
    return totalStrokes to totalToPar
}

private fun shareScorecard(context: Context, strokes: Map<Int, Int?>, expected: List<ExpectedHole>) {
    val (totalStrokes, totalToPar) = scorecardTotals(strokes, expected)
    if (totalStrokes == 0) return
    val scoreText = if (totalToPar == 0) "E" else if (totalToPar > 0) "+$totalToPar" else "$totalToPar"
    val shareText = buildString {
        appendLine("TMGL Scorecard")
        expected.forEach { hole ->
            val value = strokes[hole.holeNumber]
            if (value != null && value in 1..MAX_STROKES) {
                appendLine("Hole ${hole.holeNumber}: $value (par ${hole.par})")
            }
        }
        appendLine("Total: $totalStrokes ($scoreText)")
        appendLine("Played on TMGL app")
    }
    val sendIntent = Intent().apply {
        action = Intent.ACTION_SEND
        putExtra(Intent.EXTRA_TEXT, shareText)
        type = "text/plain"
    }
    context.startActivity(Intent.createChooser(sendIntent, "Share Scorecard"))
}
