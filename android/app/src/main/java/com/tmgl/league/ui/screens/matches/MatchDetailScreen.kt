package com.tmgl.league.ui.screens.matches

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Sports
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.model.Match
import com.tmgl.league.data.repository.CompetitionRepository
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.components.*

@Composable
fun MatchDetailScreen(
    matchId: String,
    onBack: () -> Unit,
    onEnterScores: (String) -> Unit
) {
    var match by remember { mutableStateOf<Match?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val repository = remember { CompetitionRepository() }

    LaunchedEffect(matchId) {
        when (val result = repository.getMatch(matchId)) {
            is DataResult.Success -> { match = result.data; isLoading = false }
            is DataResult.Error -> { error = result.message; isLoading = false }
        }
    }

    Scaffold(
        topBar = { TmglTopBar(title = "Match Detail", onBack = onBack) }
    ) { paddingValues ->
        when {
            isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            error != null -> ErrorState(message = error ?: "", modifier = Modifier.padding(paddingValues))
            match == null -> EmptyState(
                icon = Icons.Default.Sports,
                title = "Match Not Found",
                message = "This match could not be loaded.",
                modifier = Modifier.padding(paddingValues)
            )
            else -> {
                val m = match ?: return@Scaffold
                Column(
                    modifier = Modifier
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "Match #${m.matchNumber}",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )

                    TmglCard {
                        InfoRow("Type", m.matchType)
                        InfoRow("Status", m.status.name)
                        if (m.winnerPlayerId != null) {
                            InfoRow("Winner", m.winnerPlayerId)
                        }
                    }

                    if (m.status == com.tmgl.league.data.model.MatchStatus.SCHEDULED ||
                        m.status == com.tmgl.league.data.model.MatchStatus.LIVE
                    ) {
                        TmglButton(
                            text = "Enter Scores",
                            onClick = { onEnterScores(m.id) }
                        )
                    }
                }
            }
        }
    }
}


