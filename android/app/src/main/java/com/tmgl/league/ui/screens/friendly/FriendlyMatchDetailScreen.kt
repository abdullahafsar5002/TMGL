package com.tmgl.league.ui.screens.friendly

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.FriendlyMatch
import com.tmgl.league.data.model.FriendlyMatchPlayer
import com.tmgl.league.data.model.FriendlyMatchStatus
import com.tmgl.league.data.model.InvitationStatus
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.FriendlyMatchRepository
import com.tmgl.league.ui.components.*
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendlyMatchDetailScreen(
    matchId: String,
    onBack: () -> Unit,
    onStartScoring: (String) -> Unit
) {
    var match by remember { mutableStateOf<FriendlyMatch?>(null) }
    var players by remember { mutableStateOf<List<FriendlyMatchPlayer>>(emptyList()) }
    var playerNames by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val repository = remember { FriendlyMatchRepository() }

    LaunchedEffect(matchId) {
        isLoading = true
        error = null
        if (matchId.isBlank()) {
            error = "No match ID provided"
            isLoading = false
            return@LaunchedEffect
        }
        when (val result = repository.getFriendlyMatch(matchId)) {
            is DataResult.Success -> {
                match = result.data
                when (val playersResult = repository.getFriendlyMatchPlayers(matchId)) {
                    is DataResult.Success -> {
                        players = playersResult.data
                        playerNames = loadPlayerNames(playersResult.data.map { it.playerId })
                    }
                    is DataResult.Error -> error = playersResult.message
                }
            }
            is DataResult.Error -> error = result.message
        }
        isLoading = false
    }

    Scaffold(topBar = { TmglTopBar(title = match?.title ?: "Match Detail", onBack = onBack) }) { paddingValues ->
        when {
            isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            error != null -> ErrorState(message = error ?: "", modifier = Modifier.padding(paddingValues))
            match != null -> {
                val m = match ?: return@Scaffold
                Column(
                    modifier = Modifier
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    TmglCard {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                text = m.title,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold
                            )
                            InfoRow("Format", m.matchFormat.replace("_", " ").replaceFirstChar { it.uppercase() })
                            InfoRow("Holes", "${m.roundType}")
                            InfoRow("Status", m.status.name.replace("_", " "))
                            if (m.scheduledAt != null) InfoRow("Scheduled", m.scheduledAt?.take(10) ?: "-")
                            if (m.description != null) InfoRow("Notes", m.description ?: "-")
                        }
                    }

                    TmglCard {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = "Players (${players.size})",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            if (players.isEmpty()) {
                                Text(
                                    text = "No players invited yet.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            } else {
                                players.forEach { player ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = playerNames[player.playerId]
                                                ?: player.playerId.take(8),
                                            style = MaterialTheme.typography.bodyMedium,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Surface(
                                            color = when (player.invitationStatus) {
                                                InvitationStatus.ACCEPTED ->
                                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                                                InvitationStatus.REJECTED ->
                                                    MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                                                InvitationStatus.CANCELLED ->
                                                    MaterialTheme.colorScheme.outline.copy(alpha = 0.1f)
                                                InvitationStatus.PENDING ->
                                                    MaterialTheme.colorScheme.outline.copy(alpha = 0.1f)
                                            },
                                            shape = MaterialTheme.shapes.small
                                        ) {
                                            Text(
                                                text = player.invitationStatus.name,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                                style = MaterialTheme.typography.labelSmall
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (m.status == FriendlyMatchStatus.ACTIVE) {
                        TmglButton(
                            text = "Enter Scores",
                            onClick = { onStartScoring(matchId) }
                        )
                    }
                }
            }
        }
    }
}

private const val PLAYER_NAME_COLUMNS = "id,full_name"

@Serializable
private data class PlayerNameRow(
    val id: String = "",
    @SerialName("full_name") val fullName: String = ""
)

private suspend fun loadPlayerNames(playerIds: List<String>): Map<String, String> {
    val ids = playerIds.filter { it.isNotBlank() }.distinct()
    if (ids.isEmpty()) return emptyMap()
    return try {
        SupabaseConfig.client.from("players")
            .select(Columns.raw(PLAYER_NAME_COLUMNS)) { filter { isIn("id", ids) } }
            .decodeList<PlayerNameRow>()
            .associate { it.id to it.fullName }
    } catch (_: Exception) { emptyMap() }
}
