package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.tmgl.league.data.leaderboard.LeaderboardStandings
import com.tmgl.league.data.model.FormatStandingEntry
import com.tmgl.league.data.model.ScoreCalculations
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.theme.*
import com.tmgl.league.ui.viewmodel.CompetitionViewModel
import androidx.hilt.navigation.compose.hiltViewModel
import io.github.jan.supabase.postgrest.from
import kotlinx.serialization.Serializable

private fun toParLabel(value: Int): String = ScoreCalculations.toParLabel(value)

data class TournamentLeaderboardEntry(
    val position: Int,
    val playerId: String,
    val playerName: String,
    val handicapIndex: Double?,
    val totalStrokes: Int,
    val netStrokes: Int,
    val totalToPar: Int,
    val netToPar: Int,
    val holesCompleted: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TournamentLeaderboardScreen(
    tournamentId: String,
    onBack: () -> Unit
) {
    var entries by remember { mutableStateOf<List<TournamentLeaderboardEntry>>(emptyList()) }
    var formatSections by remember { mutableStateOf<List<Pair<String, List<FormatStandingEntry>>>>(emptyList()) }
    var tournamentName by remember { mutableStateOf("Tournament") }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val viewModel: CompetitionViewModel = hiltViewModel()
    val repository = viewModel.repository

    LaunchedEffect(tournamentId) {
        isLoading = true
        errorMessage = null
        when (val tResult = repository.getTournament(tournamentId)) {
            is DataResult.Success -> tournamentName = tResult.data.name
            is DataResult.Error -> {}
        }
        when (val roundsResult = repository.getRoundsByTournament(tournamentId)) {
            is DataResult.Success -> {
                val infoById = mutableMapOf<String, LeaderboardStandings.PlayerInfo>()
                val totalsById = mutableMapOf<String, LeaderboardStandings.GrossTotal>()
                var roundFailure: String? = null
                val unitSections = mutableListOf<Pair<String, List<FormatStandingEntry>>>()

                for (round in roundsResult.data) {
                    val format = round.scoringFormat ?: "stroke_play"
                    if (com.tmgl.league.data.leaderboard.FormatStandings.isUnitFormat(format)) {
                        when (val formatResult = repository.getFormatLeaderboard(round.id)) {
                            is DataResult.Success -> {
                                if (formatResult.data.isNotEmpty()) {
                                    unitSections.add(round.name to formatResult.data)
                                }
                            }
                            is DataResult.Error -> roundFailure = formatResult.message
                        }
                        continue
                    }
                    when (val scResult = repository.getLeaderboard(round.id)) {
                        is DataResult.Success -> {
                            for (entry in scResult.data) {
                                infoById[entry.playerId] = LeaderboardStandings.PlayerInfo(
                                    playerId = entry.playerId,
                                    fullName = entry.playerName,
                                    handicapIndex = entry.handicapIndex
                                )
                                val previous = totalsById[entry.playerId]
                                totalsById[entry.playerId] = LeaderboardStandings.GrossTotal(
                                    playerId = entry.playerId,
                                    grossStrokes = (previous?.grossStrokes ?: 0) + entry.totalStrokes,
                                    holesCompleted = (previous?.holesCompleted ?: 0) + entry.holesCompleted,
                                    toPar = (previous?.toPar ?: 0) + entry.totalScoreToPar,
                                    scorecardId = entry.scorecardId,
                                    scorecardStatus = entry.scorecardStatus
                                )
                            }
                        }
                        is DataResult.Error -> roundFailure = scResult.message
                    }
                }

                formatSections = unitSections
                entries = if (unitSections.isNotEmpty()) emptyList() else LeaderboardStandings
                    .build(infoById.values.toList(), totalsById.values.toList())
                    .map { standing ->
                        TournamentLeaderboardEntry(
                            position = standing.position,
                            playerId = standing.playerId,
                            playerName = standing.playerName,
                            handicapIndex = standing.handicapIndex,
                            totalStrokes = standing.grossStrokes,
                            netStrokes = standing.netStrokes,
                            totalToPar = standing.toPar,
                            netToPar = standing.netToPar,
                            holesCompleted = standing.holesCompleted
                        )
                    }
                if (entries.isEmpty() && formatSections.isEmpty()) {
                    errorMessage = roundFailure ?: "No scored rounds yet"
                }
            }
            is DataResult.Error -> errorMessage = roundsResult.message
        }
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
        } else if (entries.isEmpty() && formatSections.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = errorMessage ?: "No scores yet",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                formatSections.forEach { (roundName, rows) ->
                    item(key = "header-$roundName") {
                        Column(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                            Text(
                                roundName,
                                style = androidx.compose.material3.MaterialTheme.typography.titleMedium,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                            )
                            val format = rows.firstOrNull()?.scoringFormat ?: "stroke_play"
                            Text(
                                when (format) {
                                    "match_play" -> "Match play. Ranking is on holes won, then holes lost. Each pairing plays the neighbouring pairing."
                                    "nassau" -> "Nassau. Ranking is on strokes relative to par across front nine, back nine and total."
                                    "best_ball" -> "Best ball. Each pairing is a team and only the lower score on each hole counts."
                                    "scramble" -> "Scramble. Players are in groups of four and only the lowest score on each hole counts."
                                    else -> ""
                                },
                                style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    items(rows, key = { it.unitId }) { row ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
                            ) {
                                Text(
                                    "#${row.position}",
                                    style = androidx.compose.material3.MaterialTheme.typography.titleMedium,
                                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
                                    modifier = Modifier.width(44.dp)
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        row.label,
                                        style = androidx.compose.material3.MaterialTheme.typography.bodyLarge,
                                        fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold
                                    )
                                    Text(
                                        "${row.memberCount} player${if (row.memberCount == 1) "" else "s"} - thru ${row.holesPlayed}" +
                                            if (row.holesWon + row.holesLost > 0) " - ${row.holesWon}W ${row.holesLost}L" else "",
                                        style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Column(horizontalAlignment = androidx.compose.ui.Alignment.End) {
                                    Text(
                                        row.displayValue,
                                        style = androidx.compose.material3.MaterialTheme.typography.titleMedium,
                                        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                                    )
                                    row.netToPar?.let {
                                        Text(
                                            "net $it",
                                            style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

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
                                Text(
                                    text = "${entry.holesCompleted} holes played",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                entry.handicapIndex?.let { handicap ->
                                    Text(
                                        text = "HC ${String.format("%.1f", handicap)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("${entry.netStrokes}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Text(
                                    text = toParLabel(entry.netToPar),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = when {
                                        entry.netToPar < 0 -> MaterialTheme.colorScheme.tertiary
                                        entry.netToPar == 0 -> TmglGreen
                                        else -> MaterialTheme.colorScheme.error
                                    }
                                )
                                Text(
                                    text = "gross ${entry.totalStrokes} (${toParLabel(entry.totalToPar)})",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
