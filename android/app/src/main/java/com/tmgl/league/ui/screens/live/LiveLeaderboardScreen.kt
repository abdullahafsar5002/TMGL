package com.tmgl.league.ui.screens.live

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tmgl.league.ui.theme.*
import com.tmgl.league.data.repository.LiveLeaderboardEntry

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LiveLeaderboardScreen(
    tournamentName: String,
    entries: List<LiveLeaderboardEntry>,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Live Leaderboard") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    Icon(
                        Icons.Filled.FiberManualRecord,
                        contentDescription = "Live",
                        tint = MaterialTheme.colorScheme.error
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = TmglGold
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(
                    text = tournamentName,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TmglGold,
                    modifier = Modifier.padding(16.dp)
                )
            }

            if (entries.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No live scores yet",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    itemsIndexed(entries) { index, entry ->
                        LiveLeaderboardEntryCard(
                            position = index + 1,
                            entry = entry
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LiveLeaderboardEntryCard(position: Int, entry: LiveLeaderboardEntry) {
    val backgroundColor = when (position) {
        1 -> TmglGold.copy(alpha = 0.1f)
        2 -> MaterialTheme.colorScheme.surface.copy(alpha = 0.8f)
        3 -> MaterialTheme.colorScheme.surface.copy(alpha = 0.6f)
        else -> MaterialTheme.colorScheme.surface
    }

    val positionColor = when (position) {
        1 -> TmglGold
        2 -> MaterialTheme.colorScheme.onSurface
        3 -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "#$position",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = positionColor,
                modifier = Modifier.width(40.dp)
            )

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = entry.playerName,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "Hole ${entry.holesCompleted}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${entry.totalScore}",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = TmglGold
                )
                Text(
                    text = entry.status,
                    fontSize = 12.sp,
                    color = when {
                        entry.status.contains("E") -> TmglEmerald
                        entry.status.contains("-") -> TmglEmerald
                        entry.status.contains("+") -> MaterialTheme.colorScheme.error
                        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    }
                )
            }
        }
    }
}
