package com.tmgl.league.ui.screens.players

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.tmgl.league.ui.theme.*
import io.github.jan.supabase.postgrest.from
import kotlinx.serialization.Serializable

data class H2HResult(
    val playerName: String,
    val totalRounds: Int,
    val avgScore: Double,
    val bestRound: Int,
    val handicap: Double?
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HeadToHeadScreen(
    playerAId: String,
    playerBId: String,
    onBack: () -> Unit
) {
    var playerA by remember { mutableStateOf<Player?>(null) }
    var playerB by remember { mutableStateOf<Player?>(null) }
    var statsA by remember { mutableStateOf<H2HResult?>(null) }
    var statsB by remember { mutableStateOf<H2HResult?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(playerAId, playerBId) {
        try {
            val players = SupabaseConfig.client.from("players").select().decodeList<Player>()
            playerA = players.find { it.id == playerAId }
            playerB = players.find { it.id == playerBId }

            for ((id, setter) in listOf(playerAId to { r: H2HResult -> statsA = r }, playerBId to { r: H2HResult -> statsB = r })) {
                val rounds = SupabaseConfig.client.from("practice_rounds")
                    .select() { filter { eq("player_id", id); eq("status", "completed") } }
                    .decodeList<PracticeRoundBrief>()
                val player = players.find { it.id == id }
                if (rounds.isNotEmpty()) {
                    val scores = rounds.mapNotNull { it.gross_score }
                    val avg = if (scores.isNotEmpty()) scores.average() else 0.0
                    val best = scores.minOrNull() ?: 0
                    setter(H2HResult(player?.fullName ?: "Player", rounds.size, avg, best, player?.handicapIndex))
                } else {
                    setter(H2HResult(player?.fullName ?: "Player", 0, 0.0, 0, player?.handicapIndex))
                }
            }
        } catch (_: Exception) {}
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Head to Head") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TmglGreen, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = TmglGreen) }
        } else {
            val a = statsA
            val b = statsB
            if (a == null || b == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Insufficient data for comparison") }
            } else {
                LazyColumn(modifier = Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    item {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                                Text(a.playerName.split(" ").firstOrNull() ?: "A", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = TmglGreen)
                                Text("Player A", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text("VS", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.error)
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                                Text(b.playerName.split(" ").firstOrNull() ?: "B", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                Text("Player B", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                H2HRow("Total Rounds", "${a.totalRounds}", "${b.totalRounds}")
                                HorizontalDivider()
                                H2HRow("Avg Score", "%.1f".format(a.avgScore), "%.1f".format(b.avgScore))
                                HorizontalDivider()
                                H2HRow("Best Round", "${a.bestRound}", "${b.bestRound}")
                                HorizontalDivider()
                                H2HRow("Handicap", a.handicap?.toString() ?: "--", b.handicap?.toString() ?: "--")
                            }
                        }
                    }
                    item {
                        val aWins = when {
                            a.avgScore > 0 && b.avgScore > 0 -> a.avgScore < b.avgScore
                            else -> a.handicap != null && (b.handicap == null || a.handicap!! < b.handicap!!)
                        }
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = if (aWins) TmglGreen.copy(alpha = 0.1f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
                        ) {
                            Column(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Projected Winner", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(
                                    if (aWins) a.playerName else b.playerName,
                                    style = MaterialTheme.typography.headlineSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = if (aWins) TmglGreen else MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun H2HRow(label: String, valueA: String, valueB: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(valueA, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), color = TmglGreen)
        Text(label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        Text(valueB, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.End, color = MaterialTheme.colorScheme.primary)
    }
}

@Serializable
private data class PracticeRoundBrief(val id: String = "", val gross_score: Int? = null)
