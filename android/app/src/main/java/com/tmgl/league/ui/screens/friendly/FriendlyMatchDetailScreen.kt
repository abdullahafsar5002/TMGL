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
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.model.FriendlyMatch
import com.tmgl.league.data.model.FriendlyMatchPlayer
import com.tmgl.league.data.model.FriendlyMatchStatus
import com.tmgl.league.data.model.InvitationStatus
import com.tmgl.league.data.model.displayName
import com.tmgl.league.data.model.friendlyMatchFormatFrom
import com.tmgl.league.data.model.isScoringEnabled
import com.tmgl.league.data.repository.CourseRepository
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.FriendlyMatchRepository
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.viewmodel.FriendlyMatchDetailViewModel
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendlyMatchDetailScreen(
    matchId: String,
    onBack: () -> Unit,
    onStartScoring: (String) -> Unit,
    viewModel: FriendlyMatchDetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(matchId) { viewModel.load(matchId) }

    Scaffold(
        topBar = { TmglTopBar(title = state.match?.title ?: "Match Detail", onBack = onBack) }
    ) { paddingValues ->
        when {
            state.isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            state.error != null -> ErrorState(
                message = state.error.orEmpty(),
                onRetry = { viewModel.load(matchId) },
                modifier = Modifier.padding(paddingValues)
            )
            state.match != null -> {
                val match = state.match ?: return@Scaffold
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
                                text = match.title,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold
                            )
                            InfoRow("Format", friendlyMatchFormatFrom(match.matchFormat).displayName())
                            InfoRow("Holes", "${match.roundType}")
                            InfoRow("Status", match.status.displayName())
                            state.courseName?.let { InfoRow("Course", it) }
                            match.scheduledAt?.let { InfoRow("Scheduled", it.take(10)) }
                            match.description?.let { InfoRow("Notes", it) }
                        }
                    }

                    TmglCard {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(
                                text = "Players (${state.players.size})",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            if (state.players.isEmpty()) {
                                Text(
                                    text = "No players invited yet.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            } else {
                                state.players.forEach { player ->
                                    PlayerRow(player)
                                }
                            }
                        }
                    }

                    if (match.status.isScoringEnabled()) {
                        TmglButton(
                            text = "Enter Scores",
                            onClick = {
                                if (match.status == FriendlyMatchStatus.ACTIVE) {
                                    viewModel.startScoring(onStartScoring)
                                } else {
                                    onStartScoring(matchId)
                                }
                            },
                            loading = state.isUpdatingStatus
                        )
                    }

                    if (match.status == FriendlyMatchStatus.ACTIVE && state.isCreator) {
                        TmglOutlinedButton(
                            text = "Reject Match",
                            onClick = { viewModel.rejectMatch() },
                            enabled = !state.isUpdatingStatus
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PlayerRow(player: FriendlyMatchPlayer) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = player.fullName ?: "Player",
                style = MaterialTheme.typography.bodyMedium
            )
            val handicap = player.handicapIndex
            Text(
                text = if (handicap != null) {
                    "Handicap ${formatHandicap(handicap)}"
                } else {
                    "Handicap not set"
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Surface(
            color = when (player.invitationStatus) {
                InvitationStatus.ACCEPTED -> MaterialTheme.colorScheme.secondaryContainer
                InvitationStatus.REJECTED -> MaterialTheme.colorScheme.errorContainer
                InvitationStatus.PENDING -> MaterialTheme.colorScheme.surfaceVariant
            },
            shape = MaterialTheme.shapes.small
        ) {
            Text(
                text = when (player.invitationStatus) {
                    InvitationStatus.PENDING -> "Invited"
                    InvitationStatus.ACCEPTED -> "Accepted"
                    InvitationStatus.REJECTED -> "Rejected"
                },
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                style = MaterialTheme.typography.labelSmall,
                color = when (player.invitationStatus) {
                    InvitationStatus.ACCEPTED -> MaterialTheme.colorScheme.onSecondaryContainer
                    InvitationStatus.REJECTED -> MaterialTheme.colorScheme.onErrorContainer
                    InvitationStatus.PENDING -> MaterialTheme.colorScheme.onSurfaceVariant
                }
            )
        }
    }
}

internal fun formatHandicap(value: Double): String =
    ((value * 10).roundToInt() / 10.0).toString()
