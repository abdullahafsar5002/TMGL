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
                            val ids = membersResult.data.map { it.playerId }.distinct()
                            if (ids.isNotEmpty()) {
                                try {
                                    val profiles = SupabaseConfig.client.from("profiles").select {
                                        filter { isIn("id", ids) }
                                    }.decodeList<Map<String, Any?>>()
                                    memberNames = profiles.associate {
                                        (it["id"] as? String ?: "") to (it["full_name"] as? String ?: "")
                                    }
                                } catch (_: Exception) {}
                            }
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


