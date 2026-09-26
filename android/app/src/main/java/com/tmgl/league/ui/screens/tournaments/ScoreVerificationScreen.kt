package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.repository.postgrestWriteError
import com.tmgl.league.ui.components.ErrorState
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglTopBar
import com.tmgl.league.ui.theme.TmglGreen
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

private const val ROUND_SCORECARD_COLUMNS = "id,player_id,status"
private const val PLAYER_NAME_COLUMNS = "id,full_name"
private const val SCORECARD_HOLE_COLUMNS = "id,scorecard_id,hole_number,par,strokes,score_to_par,verified"

@Serializable
private data class RoundScorecardRow(
    val id: String = "",
    @SerialName("player_id") val playerId: String = "",
    val status: String = ""
)

@Serializable
private data class ScorecardHoleRow(
    val id: String = "",
    @SerialName("scorecard_id") val scorecardId: String = "",
    @SerialName("hole_number") val holeNumber: Int = 0,
    val par: Int = 4,
    val strokes: Int = 0,
    @SerialName("score_to_par") val scoreToPar: Int = 0,
    val verified: Boolean = false
)

@Serializable
private data class PlayerNameRow(
    val id: String = "",
    @SerialName("full_name") val fullName: String = ""
)

private data class VerifiableHole(
    val hole: ScorecardHoleRow,
    val playerName: String,
    val scorecardStatus: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScoreVerificationScreen(
    roundId: String,
    onBack: () -> Unit
) {
    var scores by remember { mutableStateOf<List<VerifiableHole>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var verifyingId by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(roundId) {
        isLoading = true
        error = null
        if (roundId.isBlank()) {
            error = "No round ID provided"
            isLoading = false
            return@LaunchedEffect
        }
        when (val result = loadRoundHoles(roundId)) {
            is Result.Success -> scores = result.data
            is Result.Failure -> error = result.message
        }
        isLoading = false
    }

    Scaffold(
        topBar = { TmglTopBar(title = "Verify Scores", onBack = onBack) }
    ) { padding ->
        when {
            isLoading -> LoadingIndicator(modifier = Modifier.padding(padding))
            error != null -> ErrorState(message = error ?: "", modifier = Modifier.padding(padding))
            else -> {
                val unverified = scores.filter { !it.hole.verified }
                val verified = scores.filter { it.hole.verified }

                LazyColumn(
                    modifier = Modifier.padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (unverified.isNotEmpty()) {
                        item {
                            Text(
                                "Pending Verification (${unverified.size})",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        items(unverified, key = { it.hole.id }) { score ->
                            HoleCard(
                                score = score,
                                isVerifying = verifyingId == score.hole.id,
                                onVerify = {
                                    verifyingId = score.hole.id
                                    scope.launch {
                                        try {
                                            when (val result = verifyHole(score.hole.id)) {
                                                is Result.Success -> scores = scores.map {
                                                    if (it.hole.id == score.hole.id) {
                                                        it.copy(hole = it.hole.copy(verified = true))
                                                    } else {
                                                        it
                                                    }
                                                }
                                                is Result.Failure -> error = result.message
                                            }
                                        } finally {
                                            verifyingId = null
                                        }
                                    }
                                }
                            )
                        }
                    }
                    if (verified.isNotEmpty()) {
                        item {
                            Text(
                                "Verified (${verified.size})",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = TmglGreen
                            )
                        }
                        items(verified, key = { it.hole.id }) { score ->
                            HoleCard(score = score, isVerifying = false, onVerify = {})
                        }
                    }
                    if (scores.isEmpty()) {
                        item {
                            Text(
                                "No scores have been entered for this round yet.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HoleCard(
    score: VerifiableHole,
    isVerifying: Boolean,
    onVerify: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = if (score.hole.verified) {
            CardDefaults.cardColors(containerColor = TmglGreen.copy(alpha = 0.1f))
        } else {
            CardDefaults.cardColors()
        }
    ) {
        Row(
            modifier = Modifier.padding(12.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "${score.playerName} - Hole ${score.hole.holeNumber}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    "Score: ${score.hole.strokes} (Par ${score.hole.par}, ${formatToPar(score.hole.scoreToPar)})",
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    "Card: ${score.scorecardStatus.replace("_", " ")}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (score.hole.verified) {
                Icon(Icons.Default.Check, "Verified", tint = TmglGreen)
            } else if (isVerifying) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = TmglGreen, strokeWidth = 2.dp)
            } else {
                IconButton(onClick = onVerify) {
                    Icon(Icons.Default.Check, "Verify", tint = TmglGreen)
                }
            }
        }
    }
}

private fun formatToPar(scoreToPar: Int): String =
    if (scoreToPar >= 0) "+$scoreToPar" else "$scoreToPar"

private sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Failure(val message: String) : Result<Nothing>()
}

private suspend fun loadRoundHoles(roundId: String): Result<List<VerifiableHole>> {
    return try {
        val scorecards = SupabaseConfig.client.from("scorecards")
            .select(Columns.raw(ROUND_SCORECARD_COLUMNS)) { filter { eq("round_id", roundId) } }
            .decodeList<RoundScorecardRow>()

        if (scorecards.isEmpty()) return Result.Success(emptyList())

        val cardIds = scorecards.map { it.id }
        val holes = SupabaseConfig.client.from("scorecard_holes")
            .select(Columns.raw(SCORECARD_HOLE_COLUMNS)) { filter { isIn("scorecard_id", cardIds) } }
            .decodeList<ScorecardHoleRow>()
            .sortedBy { it.holeNumber }

        val playerIds = scorecards.map { it.playerId }.filter { it.isNotBlank() }.distinct()
        val names = if (playerIds.isEmpty()) {
            emptyMap()
        } else {
            try {
                SupabaseConfig.client.from("players")
                    .select(Columns.raw(PLAYER_NAME_COLUMNS)) { filter { isIn("id", playerIds) } }
                    .decodeList<PlayerNameRow>()
                    .associate { it.id to it.fullName }
            } catch (_: Exception) { emptyMap() }
        }
        val cardById = scorecards.associateBy { it.id }

        Result.Success(
            holes.map { hole ->
                val card = cardById[hole.scorecardId]
                VerifiableHole(
                    hole = hole,
                    playerName = names[card?.playerId]?.takeIf { it.isNotBlank() } ?: "Player",
                    scorecardStatus = card?.status ?: "unknown"
                )
            }
        )
    } catch (e: Exception) {
        Result.Failure(e.message ?: "Failed to load the scores for this round")
    }
}

private suspend fun verifyHole(holeId: String): Result<Unit> {
    return try {
        val updated = SupabaseConfig.client.from("scorecard_holes")
            .update(mapOf("verified" to true)) { filter { eq("id", holeId) } }
        val error = postgrestWriteError(updated.data)
        if (error != null) Result.Failure(error) else Result.Success(Unit)
    } catch (e: Exception) {
        Result.Failure(e.message ?: "Failed to verify this hole")
    }
}
