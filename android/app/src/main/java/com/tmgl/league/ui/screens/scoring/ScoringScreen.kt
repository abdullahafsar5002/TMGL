package com.tmgl.league.ui.screens.scoring

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
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
import com.tmgl.league.data.model.ScorecardHole
import com.tmgl.league.data.model.ScorecardStatus
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.viewmodel.CompetitionViewModel
import com.tmgl.league.util.HapticFeedbackHelper
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScoringScreen(matchId: String?, onBack: () -> Unit) {
    var holes by remember { mutableStateOf(List(18) { "" }) }
    var pars by remember { mutableStateOf(List(18) { 4 }) }
    var isSubmitting by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(matchId != null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var scorecardId by remember { mutableStateOf<String?>(null) }
    val viewModel: CompetitionViewModel = hiltViewModel()
    val repository = viewModel.repository
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current
    val hapticPerformer = HapticFeedbackHelper.rememberHapticPerformer()

    LaunchedEffect(matchId) {
        if (matchId == null) {
            isLoading = false
            return@LaunchedEffect
        }
        isLoading = true
        when (val result = repository.getScorecardByMatch(matchId)) {
            is DataResult.Success -> {
                val sc = result.data
                scorecardId = sc.id
                when (val holesResult = repository.getScorecardHoles(sc.id)) {
                    is DataResult.Success -> {
                        if (holesResult.data.isNotEmpty()) {
                            holes = List(18) { i ->
                                holesResult.data.find { it.holeNumber == i + 1 }?.strokes?.toString() ?: ""
                            }
                            pars = List(18) { i ->
                                holesResult.data.find { it.holeNumber == i + 1 }?.par ?: 4
                            }
                        }
                    }
                    is DataResult.Error -> { errorMessage = holesResult.message }
                }
            }
            is DataResult.Error -> { errorMessage = result.message }
        }
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Score Entry") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.Filled.ArrowBack, "Back") } },
                actions = {
                    IconButton(onClick = {
                        val totalStrokes = holes.sumOf { it.toIntOrNull() ?: 0 }
                        val totalToPar = holes.mapIndexed { i, s ->
                            val strokes = s.toIntOrNull() ?: 0
                            if (strokes > 0) strokes - pars[i] else 0
                        }.sum()
                        val scoreText = if (totalToPar == 0) "E" else if (totalToPar > 0) "+$totalToPar" else "$totalToPar"

                        val shareText = buildString {
                            appendLine("🏌️ TMGL Scorecard")
                            appendLine("Total: $totalStrokes ($scoreText)")
                            appendLine("Played on TMGL app")
                        }
                        val sendIntent = Intent().apply {
                            action = Intent.ACTION_SEND
                            putExtra(Intent.EXTRA_TEXT, shareText)
                            type = "text/plain"
                        }
                        context.startActivity(Intent.createChooser(sendIntent, "Share Scorecard"))
                    }) {
                        Icon(Icons.Default.Share, "Share")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
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
                        if (matchId != null) {
                            Text(
                                text = "Scorecard: $matchId",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            if (isLoading) {
                item {
                    LoadingIndicator(modifier = Modifier.fillMaxWidth().padding(32.dp))
                }
            }

            if (!isLoading) {
                itemsIndexed(holes, key = { index, _ -> index }) { index, score ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.width(60.dp)) {
                                Text(
                                    text = "Hole ${index + 1}",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Par ${pars[index]}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Spacer(modifier = Modifier.weight(1f))
                            OutlinedTextField(
                                value = score,
                                onValueChange = { newScore ->
                                    holes = holes.toMutableList().apply {
                                        this[index] = newScore.filter { it.isDigit() }
                                    }
                                    hapticPerformer(HapticFeedbackHelper.HapticType.CLOCK_TICK)
                                },
                                modifier = Modifier.width(80.dp),
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Number,
                                    imeAction = ImeAction.Done
                                ),
                                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                                singleLine = true,
                                shape = MaterialTheme.shapes.small
                            )
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    val totalStrokes = holes.sumOf { it.toIntOrNull() ?: 0 }
                    val totalToPar = holes.mapIndexed { i, s ->
                        val strokes = s.toIntOrNull() ?: 0
                        if (strokes > 0) strokes - pars[i] else 0
                    }.sum()
                    TmglCard {
                        Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Total Strokes", style = MaterialTheme.typography.bodyMedium)
                            Text("$totalStrokes", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        }
                        if (totalStrokes > 0) {
                            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("To Par", style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    text = if (totalToPar >= 0) "+$totalToPar" else "$totalToPar",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = if (totalToPar <= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }
                }

                if (successMessage != null) {
                    item {
                        hapticPerformer(HapticFeedbackHelper.HapticType.SUCCESS)
                        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                            Text(text = successMessage ?: "", modifier = Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onPrimaryContainer)
                        }
                    }
                }

                if (errorMessage != null) {
                    item {
                        hapticPerformer(HapticFeedbackHelper.HapticType.ERROR)
                        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                            Text(text = errorMessage ?: "", modifier = Modifier.padding(16.dp), color = MaterialTheme.colorScheme.onErrorContainer)
                        }
                    }
                }

                item {
                    TmglButton(
                        text = if (isSubmitting) "Submitting..." else "Submit Scorecard",
                        onClick = {
                            isSubmitting = true
                            errorMessage = null
                            successMessage = null

                            scope.launch {
                                if (scorecardId == null) {
                                    errorMessage = "No scorecard loaded"
                                    isSubmitting = false
                                    return@launch
                                }

                                val validHoles = holes.mapIndexedNotNull { i, s ->
                                    val strokes = s.toIntOrNull()
                                    if (strokes != null && strokes > 0) {
                                        ScorecardHole(
                                            scorecardId = scorecardId ?: "",
                                            holeNumber = i + 1,
                                            par = pars[i],
                                            strokes = strokes,
                                            scoreToPar = strokes - pars[i]
                                        )
                                    } else null
                                }

                                if (validHoles.isEmpty()) {
                                    errorMessage = "Enter at least one score"
                                    isSubmitting = false
                                    return@launch
                                }

                                val upsertResult = repository.upsertScorecardHoles(validHoles)
                                if (upsertResult is DataResult.Error) {
                                    errorMessage = upsertResult.message
                                    isSubmitting = false
                                    return@launch
                                }

                                val totalStrokes = validHoles.sumOf { it.strokes }
                                val totalToPar = validHoles.sumOf { it.scoreToPar }
                                val updateResult = repository.updateScorecard(
                                    scorecardId = scorecardId ?: "",
                                    totalStrokes = totalStrokes,
                                    totalScoreToPar = totalToPar,
                                    status = ScorecardStatus.SUBMITTED
                                )

                                if (updateResult is DataResult.Error) {
                                    errorMessage = updateResult.message
                                } else {
                                    successMessage = "Scorecard saved! (${validHoles.size} holes, $totalStrokes strokes)"
                                }
                                isSubmitting = false
                            }
                        },
                        enabled = holes.any { it.isNotEmpty() } && !isSubmitting
                    )
                }
            }
        }
    }
}
