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
import com.tmgl.league.data.repository.CompetitionRepository
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.theme.*
import io.github.jan.supabase.postgrest.from
import kotlinx.serialization.Serializable

data class SeasonStanding(
    val position: Int,
    val playerName: String,
    val totalPoints: Int,
    val tournamentsPlayed: Int,
    val bestFinish: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeasonStandingsScreen(onBack: () -> Unit) {
    var standings by remember { mutableStateOf<List<SeasonStanding>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val repository = remember { CompetitionRepository() }

    LaunchedEffect(Unit) {
        try {
            val tournaments = when (val r = repository.getTournaments()) {
                is DataResult.Success -> r.data
                is DataResult.Error -> emptyList()
            }
            val players = SupabaseConfig.client.from("players").select().decodeList<Player>()

            val pointsMap = mutableMapOf<String, MutableList<Int>>()
            val playerNames = mutableMapOf<String, String>()
            val tournamentsPlayed = mutableMapOf<String, Int>()

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
                                        val points = when (index) {
                                            0 -> 10
                                            1 -> 7
                                            2 -> 5
                                            3 -> 3
                                            4 -> 1
                                            else -> 0
                                        }
                                        pointsMap.getOrPut(entry.playerId) { mutableListOf() }.add(points)
                                        playerNames[entry.playerId] = entry.playerName
                                        tournamentsPlayed[entry.playerId] = (tournamentsPlayed[entry.playerId] ?: 0) + 1
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
                    val name = playerNames[id] ?: "Player"
                    val total = points.sum()
                    val best = 99
                    SeasonStanding(0, name, total, tournamentsPlayed[id] ?: 0, best)
                }
                .sortedByDescending { it.totalPoints }
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
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = TmglGreen) }
        } else if (standings.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("No season data yet", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        } else {
            LazyColumn(modifier = Modifier.padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(standings) { _, standing ->
                    val bgColor = when (standing.position) {
                        1 -> MedalGold.copy(alpha = 0.15f)
                        2 -> MedalSilver.copy(alpha = 0.15f)
                        3 -> MedalBronze.copy(alpha = 0.15f)
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    }
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = bgColor)) {
                        Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("#${standing.position}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = when(standing.position) { 1 -> MedalGold; 2 -> MedalSilver; 3 -> MedalBronze; else -> MaterialTheme.colorScheme.onSurface }, modifier = Modifier.width(40.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(standing.playerName, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
                                Text("${standing.tournamentsPlayed} tournaments", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("${standing.totalPoints} pts", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = TmglGreen)
                            }
                        }
                    }
                }
            }
        }
    }
}
