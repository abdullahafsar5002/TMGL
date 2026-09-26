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
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.components.medalSurfaceForPosition
import com.tmgl.league.ui.theme.*
import com.tmgl.league.ui.viewmodel.CompetitionViewModel
import androidx.hilt.navigation.compose.hiltViewModel
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
    val viewModel: CompetitionViewModel = hiltViewModel()
    val repository = viewModel.repository

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
                    val toParTotal = mutableMapOf<String, Int>()

                    for (round in roundsResult.data) {
                        val expected = when (val expectedResult = repository.getExpectedHoles(round.id)) {
                            is DataResult.Success -> expectedResult.data
                            is DataResult.Error -> emptyList()
                        }
                        when (val scResult = repository.getLeaderboard(round.id)) {
                            is DataResult.Success -> {
                                for (entry in scResult.data) {
                                    if (entry.playerId.isBlank()) continue
                                    allEntries[entry.playerId] = (allEntries[entry.playerId] ?: 0) + entry.totalStrokes
                                    nameMap[entry.playerId] = entry.playerName
                                    val holes = entry.totalRows.takeIf { it > 0 } ?: expected.size
                                    holeCount[entry.playerId] = (holeCount[entry.playerId] ?: 0) + holes
                                    toParTotal[entry.playerId] = (toParTotal[entry.playerId] ?: 0) + entry.totalScoreToPar
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
                                totalToPar = toParTotal[playerId] ?: 0,
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
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TmglGreen)
            }
        } else if (entries.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No scores yet", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                itemsIndexed(entries) { index, entry ->
                    val medal = medalSurfaceForPosition(entry.position)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = medal.container)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "#${entry.position}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = medal.content,
                                modifier = Modifier.width(40.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(entry.playerName, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold, color = medal.content)
                                Text("${entry.holesCompleted} holes played", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("${entry.totalStrokes}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = medal.content)
                                Text(
                                    text = if (entry.totalToPar >= 0) "+${entry.totalToPar}" else "${entry.totalToPar}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = when {
                                        entry.totalToPar < 0 -> MaterialTheme.colorScheme.tertiary
                                        entry.totalToPar == 0 -> MaterialTheme.colorScheme.primary
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
