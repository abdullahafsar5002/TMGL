package com.tmgl.league.ui.screens.matches

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Sports
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.model.Match
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.viewmodel.MatchViewModel
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MatchesScreen(
    onMatchClick: (String) -> Unit,
    onBack: () -> Unit,
    matchViewModel: MatchViewModel = hiltViewModel()
) {
    val matches by matchViewModel.matches.collectAsState()
    val isLoading by matchViewModel.isLoading.collectAsState()
    val error by matchViewModel.error.collectAsState()
    var isRefreshing by remember { mutableStateOf(false) }
    val pullRefreshState = rememberPullToRefreshState()

    LaunchedEffect(Unit) {
        matchViewModel.loadMatches()
    }

    Scaffold(topBar = { TmglTopBar(title = "Matches", onBack = onBack) }) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { isRefreshing = true; matchViewModel.loadMatches() },
            state = pullRefreshState
        ) {
            when {
                isLoading && !isRefreshing -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
                error != null -> ErrorState(message = error ?: "", onRetry = { matchViewModel.loadMatches() }, modifier = Modifier.padding(paddingValues))
                matches.isEmpty() -> EmptyState(
                    icon = Icons.Default.Sports,
                    title = "No Matches",
                    message = "Matches will appear here once scheduled.",
                    modifier = Modifier.padding(paddingValues)
                )
                else -> {
                    isRefreshing = false
                    LazyColumn(
                        modifier = Modifier.padding(paddingValues),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(matches, key = { it.id }) { match ->
                            MatchCard(match = match, onClick = { onMatchClick(match.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MatchCard(match: Match, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Match #${match.matchNumber}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                Surface(
                    color = when (match.status) {
                        com.tmgl.league.data.model.MatchStatus.LIVE -> MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                        com.tmgl.league.data.model.MatchStatus.COMPLETED -> MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                        else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.1f)
                    },
                    shape = MaterialTheme.shapes.small
                ) {
                    Text(
                        text = match.status.name,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall
                    )
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = match.matchType,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
