package com.tmgl.league.ui.screens.leaderboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.model.LeaderboardEntry
import com.tmgl.league.data.model.Tournament
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.viewmodel.LeaderboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaderboardScreen(
    onBack: () -> Unit,
    leaderboardViewModel: LeaderboardViewModel = hiltViewModel()
) {
    val entries by leaderboardViewModel.entries.collectAsState()
    val tournaments by leaderboardViewModel.tournaments.collectAsState()
    val isLoading by leaderboardViewModel.isLoading.collectAsState()
    val isLoadingMore by leaderboardViewModel.isLoadingMore.collectAsState()
    val error by leaderboardViewModel.error.collectAsState()
    val selectedTournamentId by leaderboardViewModel.selectedTournamentId.collectAsState()
    val selectedTournamentName = remember(tournaments, selectedTournamentId) {
        tournaments.firstOrNull { it.id == selectedTournamentId }?.name
    }
    val pullRefreshState = rememberPullToRefreshState()
    val listState = rememberLazyListState()

    // Pagination - load more when near bottom
    LaunchedEffect(listState) {
        snapshotFlow {
            val lastVisibleItem = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            val totalItems = listState.layoutInfo.totalItemsCount
            lastVisibleItem >= totalItems - 3
        }.collect { shouldLoadMore ->
            if (shouldLoadMore && leaderboardViewModel.hasMore && !isLoadingMore) {
                leaderboardViewModel.loadMore()
            }
        }
    }

    Scaffold(topBar = { TmglTopBar(title = "Leaderboard", onBack = onBack) }) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = isLoading,
            onRefresh = {
                selectedTournamentId?.let {
                    leaderboardViewModel.loadLeaderboardForTournament(it)
                }
            },
            state = pullRefreshState
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                TournamentSelector(
                    tournaments = tournaments,
                    selectedTournamentName = selectedTournamentName,
                    onSelect = { tournament -> leaderboardViewModel.selectTournament(tournament.id) }
                )

                when {
                    isLoading && entries.isEmpty() -> LoadingIndicator(modifier = Modifier.weight(1f))
                    error != null -> ErrorState(message = error ?: "", onRetry = {
                        selectedTournamentId?.let {
                            leaderboardViewModel.loadLeaderboardForTournament(it)
                        }
                    }, modifier = Modifier.weight(1f))
                    entries.isEmpty() -> EmptyState(
                        icon = Icons.Default.Leaderboard,
                        title = "No Leaderboard Data",
                        message = "No scorecards have been submitted yet.",
                        modifier = Modifier.weight(1f)
                    )
                    else -> {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.weight(1f),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (entries.size >= 3) {
                                item {
                                    Text("Podium", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 12.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceEvenly,
                                        verticalAlignment = Alignment.Bottom
                                    ) {
                                        PodiumItem(entries[1], 2, height = 100.dp)
                                        PodiumItem(entries[0], 1, height = 130.dp)
                                        PodiumItem(entries[2], 3, height = 80.dp)
                                    }
                                    Spacer(modifier = Modifier.height(16.dp))
                                    HorizontalDivider()
                                    Spacer(modifier = Modifier.height(8.dp))
                                }
                            }
                            val listEntries = if (entries.size >= 3) entries.drop(3) else entries
                            itemsIndexed(
                                listEntries,
                                key = { _, entry -> entry.playerId.ifBlank { entry.playerName } }
                            ) { index, entry ->
                                LeaderboardRow(position = entry.position, entry = entry)
                            }

                            if (isLoadingMore) {
                                item {
                                    Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TournamentSelector(
    tournaments: List<Tournament>,
    selectedTournamentName: String?,
    onSelect: (Tournament) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    if (tournaments.isEmpty()) {
        Text(
            text = "No tournaments are available to rank yet.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )
        return
    }
    Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
        OutlinedButton(onClick = { expanded = true }) {
            Text(selectedTournamentName ?: "Select Tournament")
            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            tournaments.forEach { tournament ->
                DropdownMenuItem(
                    text = { Text(tournament.name) },
                    onClick = {
                        expanded = false
                        onSelect(tournament)
                    }
                )
            }
        }
    }
}

@Composable
private fun LeaderboardRow(position: Int, entry: LeaderboardEntry) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "#$position",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(40.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = entry.playerName,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium
                )
                if (entry.teamName != null) {
                    Text(
                        text = entry.teamName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${entry.totalStrokes}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = if (entry.totalScoreToPar <= 0) "${entry.totalScoreToPar}" else "+${entry.totalScoreToPar}",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (entry.totalScoreToPar <= 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                )
            }
        }
    }
}

@Composable
private fun PodiumItem(entry: LeaderboardEntry, position: Int, height: androidx.compose.ui.unit.Dp) {
    val accent = medalAccentForPosition(position)
    val block = accent ?: MaterialTheme.colorScheme.surfaceVariant

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(medalEmojiForPosition(position), style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(4.dp))
        Text(entry.playerName, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, maxLines = 1)
        Text("${entry.totalStrokes}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Surface(
            modifier = Modifier.width(80.dp).height(height),
            shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
            color = block
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(
                    text = "#$position",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = contentColorFor(block)
                )
            }
        }
    }
}

private fun medalEmojiForPosition(position: Int): String = when (position) {
    1 -> "\uD83E\uDD47"
    2 -> "\uD83E\uDD48"
    3 -> "\uD83E\uDD49"
    else -> ""
}
