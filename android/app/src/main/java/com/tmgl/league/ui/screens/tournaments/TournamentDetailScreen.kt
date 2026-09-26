package com.tmgl.league.ui.screens.tournaments

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import com.tmgl.league.data.competition.TournamentRegistrationState
import com.tmgl.league.data.competition.canChangeTournamentRegistration
import com.tmgl.league.data.competition.canEnterTournamentScores
import com.tmgl.league.data.model.Tournament
import com.tmgl.league.data.model.MatchStatus
import com.tmgl.league.data.model.Round
import com.tmgl.league.data.model.Scorecard
import com.tmgl.league.data.model.ScorecardHole
import com.tmgl.league.data.model.TournamentStatus
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.postgrestWriteError
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.format.displayLabel
import com.tmgl.league.ui.format.statusDescription
import com.tmgl.league.ui.screens.export.ScorecardExportRow
import com.tmgl.league.ui.screens.export.ScoreExportManager
import com.tmgl.league.ui.viewmodel.CompetitionViewModel
import com.tmgl.league.notification.NotificationHelper
import com.tmgl.league.data.SupabaseConfig
import androidx.hilt.navigation.compose.hiltViewModel
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val TOURNAMENT_DETAIL_TAG = "TournamentDetail"

data class ScorecardWithHoles(
    val playerId: String,
    val playerName: String?,
    val holes: List<HoleScore>,
    val totalToPar: Int
)

data class HoleScore(
    val holeNumber: Int,
    val par: Int,
    val strokes: Int,
    val scoreToPar: Int
)

@Composable
fun TournamentDetailScreen(
    tournamentId: String,
    onBack: () -> Unit,
    onScoreRound: (String) -> Unit = {},
    isSuperAdmin: Boolean = false,
    onViewLeaderboard: (String) -> Unit = {},
    onViewSeasonStandings: () -> Unit = {},
    onViewFlights: (String) -> Unit = {},
    onViewSideGames: (String) -> Unit = {},
    onVerifyScores: (String) -> Unit = {},
    onViewPairings: (String, String) -> Unit = { _, _ -> }
) {
    var tournament by remember { mutableStateOf<Tournament?>(null) }
    var rounds by remember { mutableStateOf<List<Round>>(emptyList()) }
    var scorecardsWithHoles by remember { mutableStateOf<List<ScorecardWithHoles>>(emptyList()) }
    var registrationState by remember { mutableStateOf(TournamentRegistrationState()) }
    var registrationError by remember { mutableStateOf<String?>(null) }
    var isChangingRegistration by remember { mutableStateOf(false) }
    var showJoinDialog by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var isExporting by remember { mutableStateOf(false) }
    var exportMessage by remember { mutableStateOf<String?>(null) }
    val viewModel: CompetitionViewModel = hiltViewModel()
    val repository = viewModel.repository
    val scope = rememberCoroutineScope()
    val canEnterScores = canEnterTournamentScores(registrationState, isSuperAdmin)

    LaunchedEffect(tournamentId) {
        if (tournamentId.isNotEmpty()) {
            isLoading = true
            error = null
            when (val result = repository.getTournament(tournamentId)) {
                is DataResult.Success -> {
                    tournament = result.data
                    when (val registration = repository.getTournamentRegistrationState(tournamentId)) {
                        is DataResult.Success -> registrationState = registration.data
                        is DataResult.Error -> registrationError = registration.message
                    }
                    when (val roundsResult = repository.getRoundsByTournament(tournamentId)) {
                        is DataResult.Success -> {
                            rounds = roundsResult.data
                            val allScorecardsWithHoles = mutableListOf<ScorecardWithHoles>()
                            for (round in roundsResult.data) {
                                when (val scResult = repository.getLeaderboard(round.id)) {
                                    is DataResult.Success -> {
                                        for (entry in scResult.data) {
                                            val scId = entry.scorecardId ?: continue
                                            when (val holesResult = repository.getScorecardHoles(scId)) {
                                                is DataResult.Success -> {
                                                    val holes = holesResult.data.map { h ->
                                                        HoleScore(
                                                            holeNumber = h.holeNumber,
                                                            par = h.par,
                                                            strokes = h.strokes,
                                                            scoreToPar = h.scoreToPar
                                                        )
                                                    }
                                                    if (holes.isNotEmpty()) {
                                                        allScorecardsWithHoles.add(
                                                            ScorecardWithHoles(
                                                                playerId = entry.playerId,
                                                                playerName = entry.playerName,
                                                                holes = holes.sortedBy { it.holeNumber },
                                                                totalToPar = entry.totalScoreToPar
                                                            )
                                                        )
                                                    }
                                                }
                                                is DataResult.Error -> {}
                                            }
                                        }
                                    }
                                    is DataResult.Error -> {}
                                }
                            }
                            scorecardsWithHoles = allScorecardsWithHoles
                        }
                        is DataResult.Error -> { /* rounds optional */ }
                    }
                }
                is DataResult.Error -> error = result.message
            }
            isLoading = false
        } else {
            isLoading = false
            error = "No tournament ID provided"
        }
    }

    Scaffold(topBar = { TmglTopBar(title = "Tournament", onBack = onBack) }) { paddingValues ->
        val context = LocalContext.current
        suspend fun updateTournamentStatus(status: TournamentStatus) {
            try {
                val updated = SupabaseConfig.client.from("tournaments")
                    .update(mapOf("status" to status.name.lowercase())) { filter { eq("id", tournamentId) } }
                val failure = postgrestWriteError(updated.data)
                if (failure != null) {
                    error = failure
                } else {
                    tournament = tournament?.copy(status = status)
                }
            } catch (e: Exception) {
                error = e.message ?: "Failed to update the tournament"
            }
        }
        when {
            isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            error != null -> ErrorState(message = error ?: "", modifier = Modifier.padding(paddingValues))
            tournament == null -> EmptyState(
                icon = Icons.Default.EmojiEvents,
                title = "Not Found",
                message = "Tournament not found.",
                modifier = Modifier.padding(paddingValues)
            )
            else -> {
                val t = tournament ?: return@Scaffold
                LazyColumn(
                    modifier = Modifier.padding(paddingValues),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text(text = t.name, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    }
                    item {
                        TmglCard {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                InfoRow("Status", t.status.displayLabel)
                                if (t.startDate != null) InfoRow("Start Date", t.startDate)
                                if (t.endDate != null) InfoRow("End Date", t.endDate)
                            }
                        }
                    }
                    item {
                        val steps = listOf("Draft" to "draft", "Registration" to "open", "Live" to "live", "Completed" to "completed")
                        val currentStepIndex = steps.indexOfFirst { it.second == t.status.name.lowercase() }

                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Tournament Status", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Spacer(modifier = Modifier.height(12.dp))

                                if (currentStepIndex < 0) {
                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text(
                                            t.status.displayLabel,
                                            style = MaterialTheme.typography.titleSmall,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        Text(
                                            t.status.statusDescription,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                } else {
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        steps.forEachIndexed { index, (label, _) ->
                                            val isActive = index <= currentStepIndex
                                            val isCurrent = index == currentStepIndex
                                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                                                Surface(
                                                    modifier = Modifier.size(32.dp),
                                                    shape = CircleShape,
                                                    color = if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
                                                ) {
                                                    Box(contentAlignment = Alignment.Center) {
                                                        if (isCurrent) {
                                                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = contentColorFor(MaterialTheme.colorScheme.primary), strokeWidth = 2.dp)
                                                        } else if (isActive) {
                                                            Icon(Icons.Default.Check, contentDescription = null, tint = contentColorFor(MaterialTheme.colorScheme.primary), modifier = Modifier.size(16.dp))
                                                        } else {
                                                            Text("${index + 1}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                        }
                                                    }
                                                }
                                                Text(label, style = MaterialTheme.typography.labelSmall, color = if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "${registrationState.playerCount} players registered",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            if (canChangeTournamentRegistration(registrationState)) {
                                Button(
                                    enabled = !isChangingRegistration,
                                    onClick = {
                                        scope.launch {
                                            isChangingRegistration = true
                                            registrationError = null
                                            val result = if (registrationState.isRegistered) {
                                                repository.leaveTournament(tournamentId)
                                            } else {
                                                repository.registerForTournament(tournamentId)
                                            }
                                            when (result) {
                                                is DataResult.Success -> registrationState = result.data
                                                is DataResult.Error -> registrationError = result.message
                                            }
                                            isChangingRegistration = false
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (registrationState.isRegistered) {
                                            MaterialTheme.colorScheme.error
                                        } else {
                                            MaterialTheme.colorScheme.primary
                                        }
                                    )
                                ) {
                                    Text(
                                        if (registrationState.isRegistered) "Leave Tournament" else "Join Tournament",
                                        color = Color.White
                                    )
                                }
                            }
                        }
                    }
                    if (registrationError != null) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                            ) {
                                Text(
                                    text = registrationError ?: "",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    modifier = Modifier.padding(16.dp)
                                )
                            }
                        }
                    }
                    if (isSuperAdmin) {
                        item {
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Manage Tournament", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    when (t.status) {
                                        TournamentStatus.DRAFT -> {
                                            Button(onClick = {
                                                scope.launch { updateTournamentStatus(TournamentStatus.OPEN) }
                                            }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                                                Text("Open Registration")
                                            }
                                        }
                                        TournamentStatus.OPEN -> {
                                            if (rounds.isNotEmpty()) {
                                                Button(onClick = {
                                                    scope.launch { updateTournamentStatus(TournamentStatus.LIVE) }
                                                }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)) {
                                                    Text("Start Tournament")
                                                }
                                            } else {
                                                Text("Create at least one round to start", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            }
                                        }
                                        TournamentStatus.LIVE -> {
                                            Button(onClick = {
                                                scope.launch { updateTournamentStatus(TournamentStatus.COMPLETED) }
                                            }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary)) {
                                                Text("Complete Tournament")
                                            }
                                        }
                                        else -> {}
                                    }
                                }
                            }
                        }
                    }
                    if (rounds.isNotEmpty()) {
                        item {
                            Text(text = "Rounds (${rounds.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        }
                        items(rounds, key = { it.roundNumber }) { round ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(text = "Round ${round.roundNumber}: ${round.name}", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                                    if (round.date != null) {
                                        Text(text = round.date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Text(text = "Status: ${round.status.displayLabel}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    if (canEnterScores) {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            if (isSuperAdmin && round.status == MatchStatus.SCHEDULED) {
                                                Button(onClick = {
                                                    NotificationHelper.notifyRoundStart(
                                                        context,
                                                        t.name,
                                                        "Round ${round.roundNumber}: ${round.name}",
                                                        tournamentId
                                                    )
                                                }) {
                                                    Text("Start Round")
                                                }
                                            }
                                            Button(onClick = { onScoreRound(round.id) }) {
                                                Text("Enter Scores")
                                            }
                                            if (isSuperAdmin) {
                                                Button(onClick = { onViewPairings(tournamentId, round.id) }) {
                                                    Text("Pairings")
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        item {
                            Button(
                                onClick = {
                                    val rows = scorecardsWithHoles.flatMap { scorecard ->
                                        val name = scorecard.playerName?.takeIf { it.isNotBlank() } ?: "Player"
                                        scorecard.holes.map { hole ->
                                            ScorecardExportRow(
                                                playerName = name,
                                                holeNumber = hole.holeNumber,
                                                par = hole.par,
                                                strokes = hole.strokes
                                            )
                                        }
                                    }
                                    if (rows.isEmpty()) {
                                        exportMessage = "There are no hole scores to export yet."
                                        return@Button
                                    }
                                    isExporting = true
                                    exportMessage = null
                                    scope.launch {
                                        try {
                                            val uri = withContext(Dispatchers.IO) {
                                                ScoreExportManager.exportScorecardCsv(context, t.name, rows)
                                            }
                                            if (uri == null) {
                                                exportMessage = "Couldn't create the scores file. Please try again."
                                            } else {
                                                ScoreExportManager.shareFile(context, uri)
                                            }
                                        } catch (e: Exception) {
                                            Log.e(TOURNAMENT_DETAIL_TAG, "Tournament score export failed", e)
                                            exportMessage = "Couldn't export the tournament scores. Please try again."
                                        } finally {
                                            isExporting = false
                                        }
                                    }
                                },
                                enabled = !isExporting,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(if (isExporting) "Exporting..." else "Export Tournament Scores")
                            }
                        }
                    }

                    exportMessage?.let { message ->
                        item(key = "export_message") {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.errorContainer
                                )
                            ) {
                                Text(
                                    text = message,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    modifier = Modifier.padding(16.dp)
                                )
                            }
                        }
                    }

                    item {
                        Button(
                            onClick = { onViewLeaderboard(tournamentId) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Text("Tournament Leaderboard")
                        }
                    }

                    item {
                        Button(
                            onClick = { onViewSeasonStandings() },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Text("Season Standings")
                        }
                    }

                    item {
                        Button(
                            onClick = { onViewFlights(tournamentId) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Text("Flights")
                        }
                    }

                    item {
                        Button(
                            onClick = { onViewSideGames(tournamentId) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Text("Side Games")
                        }
                    }

                    if (isSuperAdmin && rounds.isNotEmpty()) {
                        item {
                            Button(
                                onClick = { onVerifyScores(rounds.first().id) },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Text("Verify Scores")
                            }
                        }
                    }

                    if (scorecardsWithHoles.isNotEmpty()) {
                        item {
                            Text(
                                "Score Heatmap",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }

                        items(scorecardsWithHoles) { scorecard ->
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        scorecard.playerName ?: "Player",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))

                                    LazyRow(
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        items(scorecard.holes) { hole ->
                                            val bgColor = when {
                                                hole.scoreToPar < 0 -> Color(0xFF4CAF50).copy(alpha = 0.8f)
                                                hole.scoreToPar == 0 -> MaterialTheme.colorScheme.primary.copy(alpha = 0.3f)
                                                hole.scoreToPar == 1 -> Color(0xFFFFC107).copy(alpha = 0.6f)
                                                hole.scoreToPar == 2 -> Color(0xFFFF9800).copy(alpha = 0.7f)
                                                else -> Color(0xFFF44336).copy(alpha = 0.7f)
                                            }

                                            Surface(
                                                modifier = Modifier.size(40.dp),
                                                shape = RoundedCornerShape(8.dp),
                                                color = bgColor
                                            ) {
                                                Column(
                                                    modifier = Modifier.fillMaxSize(),
                                                    horizontalAlignment = Alignment.CenterHorizontally,
                                                    verticalArrangement = Arrangement.Center
                                                ) {
                                                    Text(
                                                        "${hole.holeNumber}",
                                                        style = MaterialTheme.typography.labelSmall,
                                                        color = Color.White.copy(alpha = 0.8f)
                                                    )
                                                    Text(
                                                        "${hole.strokes}",
                                                        style = MaterialTheme.typography.bodyMedium,
                                                        fontWeight = FontWeight.Bold,
                                                        color = Color.White
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        LegendChip(Color(0xFF4CAF50), "Birdie-")
                                        LegendChip(MaterialTheme.colorScheme.primary.copy(alpha = 0.3f), "Par")
                                        LegendChip(Color(0xFFFFC107), "Bogey")
                                        LegendChip(Color(0xFFFF9800), "+2")
                                        LegendChip(Color(0xFFF44336), "+3+")
                                    }
                                }
                            }
                        }
                    }

                    if (scorecardsWithHoles.size >= 2) {
                        item {
                            Text(
                                "Tie-Break Resolution",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }
                        item {
                            val sorted = scorecardsWithHoles.sortedBy { it.totalToPar }
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    for (i in 0 until minOf(3, sorted.size - 1)) {
                                        val a = sorted[i]
                                        val b = sorted[i + 1]
                                        if (a.totalToPar == b.totalToPar) {
                                            val aScores = a.holes.map { it.strokes }
                                            val bScores = b.holes.map { it.strokes }
                                            val result = resolveTieBack(aScores, bScores)
                                            val label = when (result) {
                                                -1 -> "${a.playerName} wins (countback)"
                                                1 -> "${b.playerName} wins (countback)"
                                                else -> "True tie"
                                            }
                                            Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
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
}

@Composable
private fun LegendChip(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Surface(modifier = Modifier.size(12.dp), shape = RoundedCornerShape(3.dp), color = color) {}
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private fun resolveTieBack(scoreA: List<Int>, scoreB: List<Int>): Int {
    val holes = minOf(scoreA.size, scoreB.size)
    for (i in (holes - 1) downTo 0) {
        if (scoreA[i] < scoreB[i]) return -1
        if (scoreA[i] > scoreB[i]) return 1
    }
    return 0
}


