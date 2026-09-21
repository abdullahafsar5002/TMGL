package com.tmgl.league.ui.screens.leaderboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Leaderboard
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.model.LeaderboardEntry
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.theme.MedalBronze
import com.tmgl.league.ui.theme.MedalGold
import com.tmgl.league.ui.theme.MedalSilver
import com.tmgl.league.ui.viewmodel.LeaderboardViewModel
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaderboardScreen(
    onBack: () -> Unit,
    leaderboardViewModel: LeaderboardViewModel = hiltViewModel()
) {
    val entries by leaderboardViewModel.entries.collectAsState()
    val tournaments by leaderboardViewModel.tournaments.collectAsState()
    val isLoading by leaderboardViewModel.isLoading.collectAsState()
    val error by leaderboardViewModel.error.collectAsState()
    var selectedTournamentId by remember { mutableStateOf<String?>(null) }
    var selectedTournamentName by remember { mutableStateOf<String?>(null) }
    var showTournamentMenu by remember { mutableStateOf(false) }
    var isRefreshing by remember { mutableStateOf(false) }
    val pullRefreshState = rememberPullToRefreshState()

    LaunchedEffect(tournaments) {
        if (tournaments.isNotEmpty() && selectedTournamentId == null) {
            selectedTournamentId = tournaments.first().id
            selectedTournamentName = tournaments.first().name
        }
    }

    Scaffold(topBar = { TmglTopBar(title = "Leaderboard", onBack = onBack) }) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = {
                isRefreshing = true
                selectedTournamentId?.let {
                    leaderboardViewModel.loadLeaderboardForTournament(it)
                }
            },
            state = pullRefreshState
        ) {
            when {
                isLoading && !isRefreshing -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
                error != null -> ErrorState(message = error ?: "", onRetry = {
                    selectedTournamentId?.let {
                        leaderboardViewModel.loadLeaderboardForTournament(it)
                    }
                }, modifier = Modifier.padding(paddingValues))
                entries.isEmpty() -> EmptyState(
                    icon = Icons.Default.Leaderboard,
                    title = "No Leaderboard Data",
                    message = "No scorecards have been submitted yet.",
                    modifier = Modifier.padding(paddingValues)
                )
                else -> {
                    isRefreshing = false
                    LazyColumn(
                        modifier = Modifier.padding(paddingValues),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (selectedTournamentName != null) {
                            item {
                                Box {
                                    OutlinedButton(onClick = { showTournamentMenu = true }) {
                                        Text(selectedTournamentName ?: "Select Tournament")
                                        Icon(Icons.Default.ArrowDropDown, contentDescription = "Select tournament")
                                    }
                                    DropdownMenu(expanded = showTournamentMenu, onDismissRequest = { showTournamentMenu = false }) {
                                        tournaments.forEach { t ->
                                            DropdownMenuItem(
                                                text = { Text(t.name) },
                                                onClick = {
                                                    selectedTournamentId = t.id
                                                    selectedTournamentName = t.name
                                                    showTournamentMenu = false
                                                    leaderboardViewModel.loadLeaderboardForTournament(t.id)
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
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
                        itemsIndexed(listEntries, key = { _, entry -> entry.playerName }) { index, entry ->
                            LeaderboardRow(position = entry.position, entry = entry)
                        }
                    }
                }
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
    val (color, medal) = when (position) {
        1 -> MedalGold to "\uD83E\uDD47"
        2 -> MedalSilver to "\uD83E\uDD48"
        3 -> MedalBronze to "\uD83E\uDD49"
        else -> MaterialTheme.colorScheme.surfaceVariant to ""
    }

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(medal, style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(4.dp))
        Text(entry.playerName, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Bold, maxLines = 1)
        Text("${entry.totalStrokes}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Surface(
            modifier = Modifier.width(80.dp).height(height),
            shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
            color = color
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text("#$position", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}
