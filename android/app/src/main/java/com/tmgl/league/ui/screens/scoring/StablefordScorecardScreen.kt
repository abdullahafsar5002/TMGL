package com.tmgl.league.ui.screens.scoring

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
import com.tmgl.league.data.model.StablefordPoints
import com.tmgl.league.data.repository.ScoringFormatsRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StablefordScorecardScreen(
    playerName: String,
    holes: List<StablefordHoleScore>,
    onBack: () -> Unit
) {
    val repository = remember { ScoringFormatsRepository() }
    val totalPoints = holes.sumOf { repository.calculateStableford(it.score, it.par) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Stableford Scorecard") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
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
                .padding(16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = playerName,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TmglGold
                    )
                    Text(
                        text = "Total Points: $totalPoints",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "Points Reference",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = TmglGold
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Text("Albatross: 5", fontSize = 10.sp)
                        Text("Eagle: 4", fontSize = 10.sp)
                        Text("Birdie: 3", fontSize = 10.sp)
                        Text("Par: 2", fontSize = 10.sp)
                        Text("Bogey: 1", fontSize = 10.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                itemsIndexed(holes) { index, hole ->
                    val points = repository.calculateStableford(hole.score, hole.par)
                    val diff = hole.score - hole.par

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = when {
                                points >= 4 -> TmglEmerald.copy(alpha = 0.2f)
                                points == 3 -> TmglEmerald.copy(alpha = 0.1f)
                                points == 1 -> MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
                                else -> MaterialTheme.colorScheme.surface
                            }
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Hole ${hole.hole}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Par ${hole.par}",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                            )
                            Text(
                                text = "${hole.score}",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = when {
                                    diff < 0 -> TmglEmerald
                                    diff > 0 -> MaterialTheme.colorScheme.error
                                    else -> MaterialTheme.colorScheme.onSurface
                                }
                            )
                            Text(
                                text = "+$points pts",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = TmglGold
                            )
                        }
                    }
                }
            }
        }
    }
}

data class StablefordHoleScore(
    val hole: Int,
    val par: Int,
    val score: Int
)
