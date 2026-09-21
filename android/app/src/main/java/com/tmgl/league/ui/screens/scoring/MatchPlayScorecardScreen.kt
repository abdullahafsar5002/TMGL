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
import com.tmgl.league.data.repository.ScoringFormatsRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MatchPlayScorecardScreen(
    player1Name: String,
    player2Name: String,
    player1Scores: List<Int>,
    player2Scores: List<Int>,
    pars: List<Int>,
    onBack: () -> Unit
) {
    val repository = remember { ScoringFormatsRepository() }
    val result = repository.calculateMatchPlay(player1Scores, player2Scores)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Match Play") },
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
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = result.status,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = TmglGold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = player1Name,
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                            )
                            Text(
                                text = "${result.player1Wins}",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = TmglGold
                            )
                        }
                        Text(
                            text = "vs",
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.5f),
                            modifier = Modifier.align(Alignment.CenterVertically)
                        )
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = player2Name,
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                            )
                            Text(
                                text = "${result.player2Wins}",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = TmglGold
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${result.holesRemaining} holes remaining",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                itemsIndexed(player1Scores) { index, score1 ->
                    if (index < player2Scores.size && index < pars.size) {
                        val score2 = player2Scores[index]
                        val par = pars[index]
                        val holeResult = when {
                            score1 < score2 -> "P1 wins"
                            score2 < score1 -> "P2 wins"
                            else -> "halved"
                        }

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = when {
                                    score1 < score2 -> TmglEmerald.copy(alpha = 0.2f)
                                    score2 < score1 -> MaterialTheme.colorScheme.error.copy(alpha = 0.1f)
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
                                    text = "Hole ${index + 1}",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "$score1",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (score1 < score2) TmglEmerald else MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = holeResult,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                                Text(
                                    text = "$score2",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (score2 < score1) TmglEmerald else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
