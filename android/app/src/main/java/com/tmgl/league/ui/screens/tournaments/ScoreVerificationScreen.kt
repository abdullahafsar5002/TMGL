package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.SupabaseConfig
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
private data class RoundScorecardRow(
    val id: String = "",
    @SerialName("player_id") val playerId: String = "",
    val status: String = "",
    @SerialName("total_strokes") val totalStrokes: Int? = null,
    @SerialName("total_score_to_par") val totalScoreToPar: Int? = null
)

@Serializable
private data class PlayerNameRow(
    val id: String = "",
    @SerialName("full_name") val fullName: String = ""
)

@Serializable
private data class HoleRow(
    val id: String = "",
    @SerialName("scorecard_id") val scorecardId: String = "",
    @SerialName("hole_number") val holeNumber: Int = 0,
    val par: Int? = null,
    val strokes: Int? = null,
    @SerialName("score_to_par") val scoreToPar: Int? = null,
    val verified: Boolean? = null
)

data class PendingScorecard(
    val id: String,
    val playerName: String,
    val status: String,
    val totalStrokes: Int?,
    val totalToPar: Int?,
    val holesEntered: Int,
    val holesVerified: Int
) {
    val isVerified: Boolean get() = status == "verified" || status == "amended"
    val isPending: Boolean get() = status == "submitted"
    val needsAttention: Boolean get() = status == "rejected"
}

private fun toParLabel(value: Int?): String = when {
    value == null -> "—"
    value == 0 -> "E"
    value > 0 -> "+$value"
    else -> value.toString()
}

private suspend fun loadRoundScorecards(roundId: String): List<PendingScorecard> {
    val cards = SupabaseConfig.client.from("scorecards")
        .select(Columns.raw("id, player_id, status, total_strokes, total_score_to_par")) {
            filter { eq("round_id", roundId) }
            order("created_at", Order.ASCENDING)
        }
        .decodeList<RoundScorecardRow>()

    if (cards.isEmpty()) return emptyList()

    val playerIds = cards.map { it.playerId }.distinct()
    val names = SupabaseConfig.client.from("players")
        .select(Columns.raw("id, full_name")) { filter { isIn("id", playerIds) } }
        .decodeList<PlayerNameRow>()
        .associate { it.id to it.fullName }

    val holes = SupabaseConfig.client.from("scorecard_holes")
        .select(Columns.raw("id, scorecard_id, hole_number, par, strokes, score_to_par, verified")) {
            filter { isIn("scorecard_id", cards.map { row -> row.id }) }
            order("hole_number", Order.ASCENDING)
        }
        .decodeList<HoleRow>()

    val holesByCard = holes.groupBy { it.scorecardId }

    return cards.map { card ->
        val cardHoles = holesByCard[card.id].orEmpty()
        PendingScorecard(
            id = card.id,
            playerName = names[card.playerId] ?: "Player",
            status = card.status,
            totalStrokes = card.totalStrokes,
            totalToPar = card.totalScoreToPar,
            holesEntered = cardHoles.count { it.strokes != null },
            holesVerified = cardHoles.count { it.verified == true }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScoreVerificationScreen(
    roundId: String,
    onBack: () -> Unit
) {
    var cards by remember { mutableStateOf<List<PendingScorecard>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var verifyingId by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHost = remember { SnackbarHostState() }

    val refresh: suspend () -> Unit = {
        try {
            cards = loadRoundScorecards(roundId)
            errorMessage = null
        } catch (error: Exception) {
            errorMessage = error.message ?: "Unable to load scorecards"
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(roundId) { refresh() }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHost) },
        topBar = {
            TopAppBar(
                title = { Text("Verify Scorecards") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = {
                    IconButton(onClick = { scope.launch { isLoading = true; refresh() } }) {
                        Icon(Icons.Default.Refresh, "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        when {
            isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }

            errorMessage != null -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(errorMessage ?: "", color = MaterialTheme.colorScheme.error)
            }

            cards.isEmpty() -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No scorecards for this round yet", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            else -> {
                val pending = cards.filter { !it.isVerified }
                val verified = cards.filter { it.isVerified }

                LazyColumn(
                    modifier = Modifier.padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (pending.isNotEmpty()) {
                        item {
                            Text(
                                "Awaiting verification (${pending.size})",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        items(pending) { card ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Row(
                                    modifier = Modifier.padding(12.dp).fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            "${card.playerName} (${card.status.replace('_', ' ')})",
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Text(
                                            "Holes entered: ${card.holesEntered} • Total: ${card.totalStrokes ?: "—"} (${toParLabel(card.totalToPar)})",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                    Button(
                                        onClick = {
                                            verifyingId = card.id
                                            scope.launch {
                                                val ok = runCatching {
                                                    SupabaseConfig.client.from("scorecards")
                                                        .update(mapOf("status" to "verified")) { filter { eq("id", card.id) } }
                                                    SupabaseConfig.client.from("scorecard_holes")
                                                        .update(mapOf("verified" to true)) { filter { eq("scorecard_id", card.id) } }
                                                }.isSuccess
                                                verifyingId = null
                                                if (ok) {
                                                    cards = loadRoundScorecards(roundId)
                                                    snackbarHost.showSnackbar("${card.playerName}'s scorecard verified")
                                                } else {
                                                    snackbarHost.showSnackbar("Could not verify this scorecard")
                                                }
                                            }
                                        },
                                        enabled = verifyingId == null && card.holesEntered > 0
                                    ) {
                                        Icon(Icons.Default.Check, null)
                                        Text("  Verify")
                                    }
                                }
                            }
                        }
                    }

                    if (verified.isNotEmpty()) {
                        item {
                            Text(
                                "Verified (${verified.size})",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        items(verified) { card ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)
                                )
                            ) {
                                Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            card.playerName,
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            "Total: ${card.totalStrokes ?: "—"} (${toParLabel(card.totalToPar)})",
                                            style = MaterialTheme.typography.bodySmall
                                        )
                                    }
                                    IconButton(
                                        onClick = {
                                            verifyingId = card.id
                                            scope.launch {
                                                val ok = runCatching {
                                                    SupabaseConfig.client.from("scorecards")
                                                        .update(mapOf("status" to "submitted")) { filter { eq("id", card.id) } }
                                                }.isSuccess
                                                verifyingId = null
                                                if (ok) cards = loadRoundScorecards(roundId)
                                            }
                                        },
                                        enabled = verifyingId == null
                                    ) {
                                        Icon(
                                            Icons.Default.Refresh,
                                            "Reopen verification",
                                            tint = MaterialTheme.colorScheme.primary
                                        )
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
