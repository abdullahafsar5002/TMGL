package com.tmgl.league.ui.screens.players

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.People
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.model.Player
import com.tmgl.league.data.repository.LeagueRepository
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.theme.TmglGreen

@Composable
fun PlayerDetailScreen(playerId: String, onBack: () -> Unit, onViewStats: (String) -> Unit = {}) {
    var player by remember { mutableStateOf<Player?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val repository = remember { LeagueRepository() }

    LaunchedEffect(playerId) {
        if (playerId.isNotEmpty()) {
            isLoading = true
            error = null
            when (val result = repository.getPlayer(playerId)) {
                is DataResult.Success -> player = result.data
                is DataResult.Error -> error = result.message
            }
            isLoading = false
        } else {
            isLoading = false
            error = "No player ID provided"
        }
    }

    Scaffold(topBar = { TmglTopBar(title = "Player Detail", onBack = onBack) }) { paddingValues ->
        when {
            isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            error != null -> ErrorState(message = error ?: "", modifier = Modifier.padding(paddingValues))
            player == null -> EmptyState(
                icon = Icons.Default.People,
                title = "Not Found",
                message = "Player not found.",
                modifier = Modifier.padding(paddingValues)
            )
            else -> {
                val p = player ?: return@Scaffold
                Column(
                    modifier = Modifier
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(text = p.fullName, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    TmglCard {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            InfoRow("Status", p.status)
                            InfoRow("Handicap", p.handicapIndex?.toString() ?: "—")
                            InfoRow("Phone", p.phone ?: "—")
                            InfoRow("Player Code", p.playerCode ?: "—")
                            if (p.joinDate != null) InfoRow("Joined", p.joinDate)
                            InfoRow("Created", p.createdAt.take(10))
                        }
                    }

                    Button(
                        onClick = { onViewStats(playerId) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                    ) {
                        Text("View Stats", color = Color.White)
                    }
                }
            }
        }
    }
}


