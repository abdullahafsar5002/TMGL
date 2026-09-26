package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Player
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.components.medalSurfaceForPosition
import com.tmgl.league.ui.theme.*
import com.tmgl.league.ui.viewmodel.CompetitionViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import io.github.jan.supabase.postgrest.from
import kotlinx.serialization.Serializable

data class SeasonStanding(
    val position: Int,
    val playerName: String,
    val totalPoints: Int,
    val tournamentsPlayed: Int,
    val bestFinish: Int
)

private fun pointsForPosition(index: Int): Int = when (index) {
    0 -> 10
    1 -> 7
    2 -> 5
    3 -> 3
    4 -> 1
    else -> 0
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeasonStandingsScreen(onBack: () -> Unit) {
    var standings by remember { mutableStateOf<List<SeasonStanding>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val viewModel: CompetitionViewModel = hiltViewModel()
    val repository = viewModel.repository

    LaunchedEffect(Unit) {
        try {
            val tournaments = when (val r = repository.getTournaments()) {
                is DataResult.Success -> r.data
                is DataResult.Error -> emptyList()
            }
            val players = SupabaseConfig.client.from("players").select().decodeList<Player>()

            val pointsMap = mutableMapOf<String, MutableList<Int>>()
            val playerNames = mutableMapOf<String, String>()
            val tournamentsByPlayer = mutableMapOf<String, MutableSet<String>>()
            val bestFinishByPlayer = mutableMapOf<String, Int>()

            for (player in players) {
                pointsMap[player.id] = mutableListOf()
                playerNames[player.id] = player.fullName
            }

            for (tournament in tournaments) {
                when (val roundsResult = repository.getRoundsByTournament(tournament.id)) {
                    is DataResult.Success -> {
                        for (round in roundsResult.data) {
                            when (val lbResult = repository.getLeaderboard(round.id)) {
                                is DataResult.Success -> {
                                    for ((index, entry) in lbResult.data.withIndex()) {
                                        pointsMap.getOrPut(entry.playerId) { mutableListOf() }
                                            .add(pointsForPosition(index))
                                        playerNames[entry.playerId] = entry.playerName
                                        tournamentsByPlayer.getOrPut(entry.playerId) { mutableSetOf() }
                                            .add(tournament.id)
                                        val finish = index + 1
                                        bestFinishByPlayer[entry.playerId] =
                                            minOf(bestFinishByPlayer[entry.playerId] ?: finish, finish)
                                    }
                                }
                                is DataResult.Error -> {}
                            }
                        }
                    }
                    is DataResult.Error -> {}
                }
            }

            standings = pointsMap.entries
                .map { (id, points) ->
                    val tournamentsPlayed = tournamentsByPlayer[id]?.size ?: 0
                    SeasonStanding(
                        position = 0,
                        playerName = playerNames[id] ?: "Player",
                        totalPoints = points.sum(),
                        tournamentsPlayed = tournamentsPlayed,
                        bestFinish = if (tournamentsPlayed == 0) 0 else bestFinishByPlayer[id] ?: 0
                    )
                }
                .sortedWith(compareByDescending<SeasonStanding> { it.totalPoints }.thenBy { it.bestFinish })
                .mapIndexed { index, s -> s.copy(position = index + 1) }
        } catch (_: Exception) {}
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Season Standings") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TmglGreen, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = TmglGreen) }
        } else if (standings.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { Text("No season data yet", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        } else {
            LazyColumn(modifier = Modifier.padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(standings) { _, standing ->
                    val medal = medalSurfaceForPosition(standing.position)
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = medal.container)) {
                        Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("#${standing.position}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = medal.content, modifier = Modifier.width(40.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(standing.playerName, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold, color = medal.content)
                                Text(
                                    text = if (standing.tournamentsPlayed == 0) "No tournaments played"
                                    else "${standing.tournamentsPlayed} tournaments, best finish ${standing.bestFinish}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("${standing.totalPoints} pts", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }
        }
    }
}
