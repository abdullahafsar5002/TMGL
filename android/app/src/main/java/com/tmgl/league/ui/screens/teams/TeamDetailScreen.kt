package com.tmgl.league.ui.screens.teams

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Team
import com.tmgl.league.data.model.TeamMember
import com.tmgl.league.data.repository.LeagueRepository
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.components.*
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

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

@Composable
fun TeamDetailScreen(teamId: String, onBack: () -> Unit) {
    var team by remember { mutableStateOf<Team?>(null) }
    var members by remember { mutableStateOf<List<TeamMember>>(emptyList()) }
    var memberNames by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val repository = remember { LeagueRepository() }

    LaunchedEffect(teamId) {
        if (teamId.isNotEmpty()) {
            isLoading = true
            error = null
            when (val result = repository.getTeam(teamId)) {
                is DataResult.Success -> {
                    team = result.data
                    when (val membersResult = repository.getTeamMembers(teamId)) {
                        is DataResult.Success -> {
                            members = membersResult.data
                            memberNames = loadPlayerNames(membersResult.data.map { it.playerId })
                        }
                        is DataResult.Error -> { /* members optional */ }
                    }
                }
                is DataResult.Error -> error = result.message
            }
            isLoading = false
        } else {
            isLoading = false
            error = "No team ID provided"
        }
    }

    Scaffold(topBar = { TmglTopBar(title = "Team Detail", onBack = onBack) }) { paddingValues ->
        when {
            isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            error != null -> ErrorState(message = error ?: "", modifier = Modifier.padding(paddingValues))
            team == null -> EmptyState(
                icon = Icons.Default.Shield,
                title = "Not Found",
                message = "Team not found.",
                modifier = Modifier.padding(paddingValues)
            )
            else -> {
                val t = team ?: return@Scaffold
                Column(
                    modifier = Modifier
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(text = t.name, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    TmglCard {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            InfoRow("Season", t.seasonId)
                            InfoRow("Division", t.divisionId ?: "Unassigned")
                            InfoRow("Members", "${members.size}")
                        }
                    }
                    if (members.isNotEmpty()) {
                        Text(text = "Roster (${members.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        members.forEach { member ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(text = "Player: ${memberNames[member.playerId] ?: member.playerId.take(8)}", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
                                    Text(text = "Joined: ${member.joinedAt.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}


