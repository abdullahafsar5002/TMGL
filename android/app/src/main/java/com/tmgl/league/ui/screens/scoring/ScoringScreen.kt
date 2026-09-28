package com.tmgl.league.ui.screens.scoring

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.model.ScoreCalculations
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglButton
import com.tmgl.league.ui.components.TmglCard
import com.tmgl.league.ui.components.TmglTopBar
import com.tmgl.league.ui.viewmodel.ScoringViewModel

@Composable
fun ScoringScreen(
    roundId: String?,
    matchId: String?,
    onBack: () -> Unit,
    scoringViewModel: ScoringViewModel = hiltViewModel()
) {
    val uiState by scoringViewModel.uiState.collectAsState()

    LaunchedEffect(roundId, matchId) {
        scoringViewModel.load(roundId, matchId)
    }

    Scaffold(
        topBar = {
            TmglTopBar(
                title = "Score Entry",
                onBack = onBack,
                actions = {
                    if (uiState.isQueuedOffline) {
                        IconButton(onClick = { scoringViewModel.syncPending() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Retry sync")
                        }
                    }
                }
            )
        }
    ) { paddingValues ->
        if (uiState.isLoading) {
            LoadingIndicator(modifier = Modifier.padding(paddingValues))
            return@Scaffold
        }

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
                            text = "Enter your score for each hole",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (uiState.roundId != null) {
                            Text(
                                text = "Round: ${uiState.roundId}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            items(uiState.holes, key = { it.holeNumber }) { hole ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.width(72.dp)) {
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
                            value = hole.scoreText,
                            onValueChange = { scoringViewModel.setScore(hole.holeNumber, it) },
                            modifier = Modifier.width(88.dp),
                            keyboardOptions = KeyboardOptions(
                                keyboardType = KeyboardType.Number,
                                imeAction = ImeAction.Done
                            ),
                            singleLine = true,
                            shape = MaterialTheme.shapes.small
                        )
                    }
                }
            }

            item {
                TmglCard {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Total Strokes", style = MaterialTheme.typography.bodyMedium)
                            Text(
                                text = "${uiState.totalStrokes}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        if (uiState.totalStrokes > 0) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("To Par", style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    text = ScoreCalculations.toParLabel(uiState.totalToPar),
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = if (uiState.totalToPar <= 0) {
                                        MaterialTheme.colorScheme.primary
                                    } else {
                                        MaterialTheme.colorScheme.error
                                    }
                                )
                            }
                        }
                    }
                }
            }

            uiState.message?.let { message ->
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.secondaryContainer
                        )
                    ) {
                        Text(
                            text = message,
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                    }
                }
            }

            uiState.error?.let { error ->
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer
                        )
                    ) {
                        Text(
                            text = error,
                            modifier = Modifier.padding(16.dp),
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
            }

            item {
                TmglButton(
                    text = if (uiState.isSubmitting) "Submitting..." else "Submit Scorecard",
                    onClick = { scoringViewModel.submit() },
                    enabled = !uiState.isSubmitting && uiState.holes.any { it.score != null },
                    loading = uiState.isSubmitting
                )
            }
        }
    }
}
