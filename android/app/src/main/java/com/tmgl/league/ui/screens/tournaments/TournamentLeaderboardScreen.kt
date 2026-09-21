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
import com.tmgl.league.data.repository.CompetitionRepository
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.theme.*
import io.github.jan.supabase.postgrest.from
import kotlinx.serialization.Serializable

data class TournamentLeaderboardEntry(
    val position: Int,
    val playerName: String,
    val totalStrokes: Int,
    val totalToPar: Int,
    val holesCompleted: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TournamentLeaderboardScreen(
    tournamentId: String,
    onBack: () -> Unit
) {
    var entries by remember { mutableStateOf<List<TournamentLeaderboardEntry>>(emptyList()) }
    var tournamentName by remember { mutableStateOf("Tournament") }
    var isLoading by remember { mutableStateOf(true) }
    val repository = remember { CompetitionRepository() }

    LaunchedEffect(tournamentId) {
        try {
            when (val tResult = repository.getTournament(tournamentId)) {
                is DataResult.Success -> tournamentName = tResult.data.name
                is DataResult.Error -> {}
            }
            when (val roundsResult = repository.getRoundsByTournament(tournamentId)) {
                is DataResult.Success -> {
                    val allEntries = mutableMapOf<String, Int>()
                    val nameMap = mutableMapOf<String, String>()
                    val holeCount = mutableMapOf<String, Int>()

                    for (round in roundsResult.data) {
                        when (val scResult = repository.getLeaderboard(round.id)) {
                            is DataResult.Success -> {
                                for (entry in scResult.data) {
                                    val current = allEntries[entry.playerId] ?: 0
                                    allEntries[entry.playerId] = current + entry.totalStrokes
                                    nameMap[entry.playerId] = entry.playerName
                                    holeCount[entry.playerId] = (holeCount[entry.playerId] ?: 0) + 9
                                }
                            }
                            is DataResult.Error -> {}
                        }
                    }

                    entries = allEntries.entries
                        .sortedBy { it.value }
                        .mapIndexed { index, (playerId, strokes) ->
                            TournamentLeaderboardEntry(
                                position = index + 1,
                                playerName = nameMap[playerId] ?: "Player",
                                totalStrokes = strokes,
                                totalToPar = strokes - (18 * roundsResult.data.size),
                                holesCompleted = holeCount[playerId] ?: 0
                            )
                        }
                }
                is DataResult.Error -> {}
            }
        } catch (_: Exception) {}
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("$tournamentName Leaderboard") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TmglGreen, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TmglGreen)
            }
        } else if (entries.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No scores yet", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                itemsIndexed(entries) { index, entry ->
                    val bgColor = when (entry.position) {
                        1 -> MedalGold.copy(alpha = 0.15f)
                        2 -> MedalSilver.copy(alpha = 0.15f)
                        3 -> MedalBronze.copy(alpha = 0.15f)
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    }
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = bgColor)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "#${entry.position}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = when (entry.position) {
                                    1 -> MedalGold
                                    2 -> MedalSilver
                                    3 -> MedalBronze
                                    else -> MaterialTheme.colorScheme.onSurface
                                },
                                modifier = Modifier.width(40.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(entry.playerName, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
                                Text("${entry.holesCompleted} holes played", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("${entry.totalStrokes}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text(
                                    text = if (entry.totalToPar >= 0) "+${entry.totalToPar}" else "${entry.totalToPar}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = when {
                                        entry.totalToPar < 0 -> MaterialTheme.colorScheme.tertiary
                                        entry.totalToPar == 0 -> TmglGreen
                                        else -> MaterialTheme.colorScheme.error
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
