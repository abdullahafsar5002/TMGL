package com.tmgl.league.ui.screens.practice

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.GolfCourse
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.model.PracticeRound
import com.tmgl.league.data.model.PracticeRoundStatus
import com.tmgl.league.ui.components.ErrorState
import com.tmgl.league.ui.components.EmptyState
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglTopBar
import com.tmgl.league.ui.theme.TmglGreen
import com.tmgl.league.ui.viewmodel.PracticeViewModel
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.collectAsState
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PracticeHubScreen(
    onNewPractice: () -> Unit,
    onPracticeClick: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: PracticeViewModel = hiltViewModel()
) {
    val rounds by viewModel.rounds.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    var reloadTrigger by remember { mutableIntStateOf(0) }
    var isRefreshing by remember { mutableStateOf(false) }
    val pullRefreshState = rememberPullToRefreshState()

    LaunchedEffect(reloadTrigger) {
        viewModel.loadRounds()
        isRefreshing = false
    }

    Scaffold(
        topBar = { TmglTopBar(title = "Practice Hub", onBack = onBack) },
        floatingActionButton = {
            FloatingActionButton(onClick = onNewPractice, containerColor = TmglGreen) {
                Icon(Icons.Default.Add, contentDescription = "New Practice Round")
            }
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { isRefreshing = true; reloadTrigger++ },
            state = pullRefreshState
        ) {
            when {
                isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
                error != null -> ErrorState(
                    message = error ?: "",
                    onRetry = { reloadTrigger++ },
                    modifier = Modifier.padding(paddingValues)
                )
                rounds.isEmpty() -> EmptyState(
                    icon = Icons.Default.GolfCourse,
                    title = "No Practice Rounds",
                    message = "Start your first practice round to track your game improvement.",
                    modifier = Modifier.padding(paddingValues)
                )
                else -> {
                    val completed = rounds.filter { it.status == PracticeRoundStatus.COMPLETED }
                    val inProgress = rounds.filter { it.status == PracticeRoundStatus.IN_PROGRESS || it.status == PracticeRoundStatus.DRAFT }
                    LazyColumn(
                        modifier = Modifier.padding(paddingValues),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (inProgress.isNotEmpty()) {
                            item { Text("In Progress", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold) }
                            items(inProgress, key = { it.id }) { round ->
                                PracticeRoundCard(round = round, onClick = { onPracticeClick(round.id) })
                            }
                        }
                        if (completed.isNotEmpty()) {
                            item { Text("Completed", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp)) }
                            items(completed, key = { it.id }) { round ->
                                PracticeRoundCard(round = round, onClick = { onPracticeClick(round.id) })
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PracticeRoundCard(round: PracticeRound, onClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${round.roundType}-Hole Round",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                Surface(
                    color = when (round.status) {
                        PracticeRoundStatus.COMPLETED -> MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                        PracticeRoundStatus.IN_PROGRESS -> MaterialTheme.colorScheme.tertiary.copy(alpha = 0.1f)
                        else -> MaterialTheme.colorScheme.secondary.copy(alpha = 0.1f)
                    },
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = round.status.name.replace("_", " "),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }
            if (round.grossScore != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Score: ${round.grossScore} (${if ((round.totalToPar ?: 0) >= 0) "+" else ""}${round.totalToPar ?: 0})",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (round.startedAt != null) {
                Text(
                    text = "Started: ${round.startedAt?.take(10)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
