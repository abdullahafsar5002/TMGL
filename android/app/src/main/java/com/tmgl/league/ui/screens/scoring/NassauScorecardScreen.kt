package com.tmgl.league.ui.screens.scoring

import androidx.compose.foundation.layout.*
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
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.ui.theme.*
import com.tmgl.league.data.model.NassauResult
import com.tmgl.league.data.repository.ScoringFormatsRepository
import com.tmgl.league.ui.viewmodel.ScoringFormatsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NassauScorecardScreen(
    player1Name: String,
    player2Name: String,
    result: NassauResult,
    repository: ScoringFormatsRepository = hiltViewModel<ScoringFormatsViewModel>().repository,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Nassau Match") },
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
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Text(
                        text = player1Name,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TmglGold
                    )
                    Text(
                        text = "vs",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f),
                        modifier = Modifier.align(Alignment.CenterVertically)
                    )
                    Text(
                        text = player2Name,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TmglGold
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            NassauSegmentCard(
                label = "Front 9",
                margin = result.front9,
                status = repository.nassauStatus(result.front9)
            )

            Spacer(modifier = Modifier.height(8.dp))

            NassauSegmentCard(
                label = "Back 9",
                margin = result.back9,
                status = repository.nassauStatus(result.back9)
            )

            Spacer(modifier = Modifier.height(8.dp))

            NassauSegmentCard(
                label = "Total",
                margin = result.total,
                status = repository.nassauStatus(result.total),
                highlighted = true
            )
        }
    }
}

@Composable
private fun NassauSegmentCard(
    label: String,
    margin: Int,
    status: String,
    highlighted: Boolean = false
) {
    val isPlayer1 = margin < 0
    val isPlayer2 = margin > 0
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (highlighted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = label,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = TmglGold
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = status,
                    fontSize = 14.sp,
                    color = when {
                        isPlayer1 -> TmglEmerald
                        isPlayer2 -> MaterialTheme.colorScheme.error
                        else -> MaterialTheme.colorScheme.onSurface
                    }
                )
                Text(
                    text = when {
                        margin < 0 -> "P1 +${-margin}"
                        margin > 0 -> "P2 +$margin"
                        else -> "Tied"
                    },
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
