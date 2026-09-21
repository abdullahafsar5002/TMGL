package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.model.Tournament
import com.tmgl.league.data.model.TournamentStatus
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.theme.TmglGreen
import com.tmgl.league.ui.viewmodel.TournamentViewModel
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.mutableIntStateOf
import com.tmgl.league.data.SupabaseConfig
import io.github.jan.supabase.postgrest.from

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TournamentsScreen(
    onTournamentClick: (String) -> Unit,
    onCreateTournament: () -> Unit = {},
    onBack: () -> Unit,
    tournamentViewModel: TournamentViewModel = hiltViewModel()
) {
    val tournaments by tournamentViewModel.tournaments.collectAsState()
    val isLoading by tournamentViewModel.isLoading.collectAsState()
    val error by tournamentViewModel.error.collectAsState()
    var isRefreshing by remember { mutableStateOf(false) }
    val pullRefreshState = rememberPullToRefreshState()

    LaunchedEffect(Unit) {
        tournamentViewModel.loadTournaments()
    }

    Scaffold(
        topBar = { TmglTopBar(title = "Tournaments", onBack = onBack) },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreateTournament, containerColor = TmglGreen) {
                Icon(Icons.Default.Add, contentDescription = "Create Tournament")
            }
        }
    ) { paddingValues ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { isRefreshing = true; tournamentViewModel.loadTournaments() },
            state = pullRefreshState
        ) {
            when {
                isLoading && !isRefreshing -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
                error != null -> ErrorState(
                    message = error ?: "",
                    onRetry = { tournamentViewModel.loadTournaments() },
                    modifier = Modifier.padding(paddingValues)
                )
                tournaments.isEmpty() -> EmptyState(
                    icon = Icons.Default.EmojiEvents,
                    title = "No Tournaments",
                    message = "Tournaments will appear here once created.",
                    modifier = Modifier.padding(paddingValues)
                )
                else -> {
                    isRefreshing = false
                    LazyColumn(
                        modifier = Modifier.padding(paddingValues),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(tournaments, key = { it.id }) { tournament ->
                            TournamentCard(tournament = tournament, onClick = { onTournamentClick(tournament.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TournamentCard(tournament: Tournament, onClick: () -> Unit) {
    var playerCount by remember { mutableIntStateOf(0) }
    LaunchedEffect(tournament.id) {
        try {
            val regs = com.tmgl.league.data.SupabaseConfig.client.from("tournament_registrations")
                .select() {
                    filter { eq("tournament_id", tournament.id) }
                }
                .decodeList<com.tmgl.league.data.model.TournamentRegistration>()
            playerCount = regs.size
        } catch (_: Exception) {}
    }
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = tournament.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )
                StatusBadge(tournament.status.name)
            }
            if (tournament.startDate != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Starts: ${tournament.startDate}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (playerCount > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "$playerCount players registered",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun StatusBadge(status: String) {
    val bgColor = when (status) {
        "OPEN" -> MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
        "LIVE" -> MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
        "COMPLETED" -> MaterialTheme.colorScheme.tertiary.copy(alpha = 0.1f)
        "DRAFT" -> MaterialTheme.colorScheme.surfaceVariant
        "CANCELLED" -> MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
        else -> MaterialTheme.colorScheme.surfaceVariant
    }
    val textColor = when (status) {
        "LIVE" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Surface(
        color = bgColor,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = status.replace("_", " "),
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = textColor
        )
    }
}
