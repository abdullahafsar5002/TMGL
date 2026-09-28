package com.tmgl.league.ui.screens.scoring

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.model.ScoreCalculations
import com.tmgl.league.ui.theme.*
import com.tmgl.league.ui.viewmodel.FastScoringViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FastScoringScreen(
    roundId: String?,
    matchId: String?,
    onBack: () -> Unit,
    fastScoringViewModel: FastScoringViewModel = hiltViewModel()
) {
    val uiState by fastScoringViewModel.uiState.collectAsState()

    LaunchedEffect(roundId, matchId) {
        fastScoringViewModel.startScoring(roundId, matchId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (uiState.isComplete) "Round Complete" else "Hole ${uiState.currentHole}") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = {
                    if (uiState.isQueuedOffline) {
                        IconButton(onClick = { fastScoringViewModel.syncPendingScores() }) {
                            Icon(Icons.Default.Refresh, "Retry sync")
                        }
                    }
                    if (uiState.isComplete) {
                        IconButton(onClick = { fastScoringViewModel.shareScore() }) {
                            Icon(Icons.Default.Share, "Share")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { padding ->
        when {
            uiState.isLoading -> Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.secondary)
            }

            uiState.isComplete -> Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = MaterialTheme.colorScheme.secondary
                )
                Spacer(Modifier.height(16.dp))
                Text("Round Complete", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Text(
                    "${uiState.totalStrokes} strokes (${ScoreCalculations.toParLabel(uiState.totalToPar)})",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                uiState.errorMsg?.let { message ->
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                }
                Spacer(Modifier.height(24.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (uiState.isQueuedOffline) {
                        OutlinedButton(onClick = { fastScoringViewModel.syncPendingScores() }) {
                            Text("Retry Sync")
                        }
                    }
                    Button(onClick = { fastScoringViewModel.shareScore() }) { Text("Share Scorecard") }
                }
            }

            else -> Column(
                modifier = Modifier.padding(padding).padding(16.dp).fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items((1..uiState.totalHoles).toList()) { hole ->
                        val entry = uiState.entries.find { it.holeNumber == hole }
                        val isCurrent = hole == uiState.currentHole
                        val isCompleted = entry?.score != null
                        Surface(
                            onClick = { fastScoringViewModel.selectHole(hole) },
                            modifier = Modifier.size(36.dp),
                            shape = CircleShape,
                            color = when {
                                isCurrent -> MaterialTheme.colorScheme.primary
                                isCompleted -> MaterialTheme.colorScheme.secondaryContainer
                                else -> MaterialTheme.colorScheme.surfaceVariant
                            }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "$hole",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = when {
                                        isCurrent -> MaterialTheme.colorScheme.onPrimary
                                        isCompleted -> MaterialTheme.colorScheme.onSecondaryContainer
                                        else -> MaterialTheme.colorScheme.onSurface
                                    },
                                    fontWeight = if (isCurrent || isCompleted) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))

                val par = uiState.entries.find { it.holeNumber == uiState.currentHole }?.par ?: 4
                Text(
                    text = "Par $par",
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(Modifier.height(16.dp))

                Text("Score", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    (par - 2..par + 3).forEach { score ->
                        val label = ScoreCalculations.holeLabel(score, par)
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.weight(1f)
                        ) {
                            Button(
                                onClick = { fastScoringViewModel.selectScore(score) },
                                modifier = Modifier.size(56.dp),
                                shape = CircleShape,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (uiState.selectedScore == score) {
                                        MaterialTheme.colorScheme.primary
                                    } else {
                                        MaterialTheme.colorScheme.surfaceVariant
                                    },
                                    contentColor = if (uiState.selectedScore == score) {
                                        MaterialTheme.colorScheme.onPrimary
                                    } else {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    }
                                ),
                                contentPadding = PaddingValues(0.dp)
                            ) {
                                Text(
                                    text = "$score",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text(
                                text = label,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 1
                            )
                        }
                    }
                }

                Spacer(Modifier.weight(1f))

                uiState.errorMsg?.let {
                    Text(
                        text = it,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (uiState.currentHole > 1) {
                        OutlinedButton(
                            onClick = { fastScoringViewModel.previousHole() },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Prev")
                        }
                    }

                    Button(
                        onClick = { fastScoringViewModel.saveAndNext() },
                        modifier = Modifier.weight(1f),
                        enabled = uiState.selectedScore != null && !uiState.isSaving
                    ) {
                        if (uiState.isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else if (uiState.currentHole < uiState.totalHoles) {
                            Text("Save & Next")
                        } else {
                            Text("Finish Round")
                        }
                    }
                }
            }
        }
    }
}
