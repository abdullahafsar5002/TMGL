package com.tmgl.league.ui.screens.scoring

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.ui.theme.*
import com.tmgl.league.ui.viewmodel.FastScoringViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FastScoringScreen(
    matchId: String?,
    onBack: () -> Unit,
    fastScoringViewModel: FastScoringViewModel = hiltViewModel()
) {
    val uiState by fastScoringViewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Hole ${uiState.currentHole}") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = {
                    if (uiState.isComplete) {
                        IconButton(onClick = { fastScoringViewModel.shareScore() }) {
                            Icon(Icons.Default.Share, "Share", tint = Color.White)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TmglGreen, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        if (uiState.isComplete) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(64.dp), tint = TmglGreen)
                    Spacer(Modifier.height(16.dp))
                    Text("Round Complete!", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text("${uiState.entries.count { it.strokes != null }} holes scored", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(24.dp))
                    TmglButton(text = "Share Scorecard", onClick = { fastScoringViewModel.shareScore() })
                }
            }
        } else {
            Column(
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
                        val isCompleted = entry?.strokes != null
                        Surface(
                            onClick = { /* Navigate to hole */ },
                            modifier = Modifier.size(36.dp),
                            shape = CircleShape,
                            color = when {
                                isCurrent -> TmglGreen
                                isCompleted -> TmglGreen.copy(alpha = 0.3f)
                                else -> MaterialTheme.colorScheme.surfaceVariant
                            }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    "$hole",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (isCurrent) Color.White else MaterialTheme.colorScheme.onSurface,
                                    fontWeight = if (isCurrent || isCompleted) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))

                val par = uiState.courseHoles.find { it.holeNumber == uiState.currentHole }?.par ?: 4
                Text("Par $par", style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                Spacer(Modifier.height(16.dp))

                Text("Score", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val scoreRange = (par - 2)..(par + 3)
                    scoreRange.forEach { score ->
                        val label = when {
                            score == par - 2 -> "Eagle"
                            score == par - 1 -> "Birdie"
                            score == par -> "Par"
                            score == par + 1 -> "Bogey"
                            score == par + 2 -> "DBL"
                            else -> "+${score - par}"
                        }
                        val color = when {
                            score < par -> TmglGreen
                            score == par -> TmglGreen.copy(alpha = 0.5f)
                            score == par + 1 -> Color(0xFFFFC107)
                            else -> MaterialTheme.colorScheme.error
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                            Button(
                                onClick = { fastScoringViewModel.selectScore(score) },
                                modifier = Modifier.size(56.dp),
                                shape = CircleShape,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (uiState.selectedScore == score) color else MaterialTheme.colorScheme.surfaceVariant
                                ),
                                contentPadding = PaddingValues(0.dp)
                            ) {
                                Text(
                                    "$score",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = if (uiState.selectedScore == score) Color.White else MaterialTheme.colorScheme.onSurface
                                )
                            }
                            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                Text("Putts", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    (0..6).forEach { putt ->
                        FilterChip(
                            selected = uiState.selectedPutts == putt,
                            onClick = { fastScoringViewModel.selectPutts(putt) },
                            label = { Text("$putt") }
                        )
                    }
                }

                Spacer(Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    FilterChip(selected = uiState.fairwayHit == true, onClick = { fastScoringViewModel.toggleFairway() }, label = { Text("FW") })
                    FilterChip(selected = uiState.gir == true, onClick = { fastScoringViewModel.toggleGir() }, label = { Text("GIR") })
                }

                Spacer(Modifier.weight(1f))

                uiState.errorMsg?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 8.dp))
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (uiState.currentHole > 1) {
                        OutlinedButton(onClick = { fastScoringViewModel.previousHole() }, modifier = Modifier.weight(1f)) {
                            Text("Prev")
                        }
                    }

                    Button(
                        onClick = { fastScoringViewModel.saveAndNext(matchId) },
                        modifier = Modifier.weight(1f),
                        enabled = uiState.selectedScore != null && !uiState.isSaving,
                        colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                    ) {
                        if (uiState.isSaving) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
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
