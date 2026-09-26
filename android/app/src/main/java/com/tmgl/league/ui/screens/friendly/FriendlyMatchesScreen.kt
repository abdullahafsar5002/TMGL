package com.tmgl.league.ui.screens.friendly

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Sports
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.model.FriendlyMatch
import com.tmgl.league.data.model.FriendlyMatchStatus
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.viewmodel.FriendlyMatchViewModel
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.collectAsState
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendlyMatchesScreen(
    onMatchClick: (String) -> Unit,
    onCreateMatch: () -> Unit,
    onBack: () -> Unit,
    viewModel: FriendlyMatchViewModel = hiltViewModel()
) {
    val matches by viewModel.matches.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    var reloadTrigger by remember { mutableIntStateOf(0) }
    var isRefreshing by remember { mutableStateOf(false) }
    val pullRefreshState = rememberPullToRefreshState()

    LaunchedEffect(reloadTrigger) {
        viewModel.loadMatches()
        isRefreshing = false
    }

    Scaffold(
        topBar = {
            TmglTopBar(
                title = "Friendly Matches",
                onBack = onBack,
                actions = {
                    IconButton(onClick = onCreateMatch) {
                        Icon(Icons.Default.Add, contentDescription = "Create Match")
                    }
                }
            )
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { isRefreshing = true; reloadTrigger++ },
            state = pullRefreshState
        ) {
            when {
                isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
                error != null -> ErrorState(message = error ?: "", onRetry = { reloadTrigger++ }, modifier = Modifier.padding(paddingValues))
                matches.isEmpty() -> EmptyState(
                    icon = Icons.Default.Sports,
                    title = "No Friendly Matches",
                    message = "Create a match or wait for invitations.",
                    modifier = Modifier.padding(paddingValues)
                )
                else -> LazyColumn(
                    modifier = Modifier.padding(paddingValues),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(matches, key = { it.id }) { match ->
                        FriendlyMatchCard(match = match, onClick = { onMatchClick(match.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun FriendlyMatchCard(match: FriendlyMatch, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = match.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                Surface(
                    color = when (match.status) {
                        FriendlyMatchStatus.ACTIVE -> MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                        FriendlyMatchStatus.COMPLETED -> MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                        FriendlyMatchStatus.CANCELLED -> MaterialTheme.colorScheme.outline.copy(alpha = 0.1f)
                        else -> MaterialTheme.colorScheme.secondary.copy(alpha = 0.1f)
                    },
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = match.status.name.replace("_", " "),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = match.matchFormat.replace("_", " ").replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (match.scheduledAt != null) {
                Text(
                    text = "Scheduled: ${match.scheduledAt?.take(10)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
