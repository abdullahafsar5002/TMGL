package com.tmgl.league.ui.screens.stats

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.repository.HandicapRepository
import com.tmgl.league.data.repository.HandicapResult
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import javax.inject.Inject

data class PlayerStats(
    val totalRounds: Int = 0,
    val avgScore: Double = 0.0,
    val bestRound: Int = 0,
    val worstRound: Int = 0,
    val avgFairwaysHit: Double = 0.0,
    val avgGir: Double = 0.0,
    val avgPutts: Double = 0.0,
    val handicap: Double? = null
)

@HiltViewModel
class PlayerStatsViewModel @Inject constructor() : ViewModel() {
    private val _stats = MutableStateFlow<PlayerStats?>(null)
    val stats: StateFlow<PlayerStats?> = _stats

    private val _handicap = MutableStateFlow<HandicapResult?>(null)
    val handicap: StateFlow<HandicapResult?> = _handicap

    private val _loading = MutableStateFlow(true)
    val loading: StateFlow<Boolean> = _loading

    private val handicapRepo = HandicapRepository()

    fun loadStats(playerId: String) {
        viewModelScope.launch {
            _loading.value = true
            try {
                val rounds = SupabaseConfig.client.from("practice_rounds")
                    .select() {
                        filter { eq("player_id", playerId) }
                        filter { eq("status", "completed") }
                    }
                    .decodeList<PracticeRoundBrief>()

                val roundIds = rounds.map { it.id }
                val allScores = mutableListOf<ScoreBrief>()
                for (id in roundIds.take(20)) {
                    try {
                        val scores = SupabaseConfig.client.from("practice_scores")
                            .select() { filter { eq("practice_round_id", id) } }
                            .decodeList<ScoreBrief>()
                        allScores.addAll(scores)
                    } catch (_: Exception) {}
                }

                if (rounds.isNotEmpty() && allScores.isNotEmpty()) {
                    val grossScores = rounds.mapNotNull { it.gross_score }
                    val fairways = allScores.filter { it.fairway_hit == true }.size
                    val girs = allScores.filter { it.green_in_regulation == true }.size
                    val putts = allScores.mapNotNull { it.putts }

                    _stats.value = PlayerStats(
                        totalRounds = rounds.size,
                        avgScore = if (grossScores.isNotEmpty()) grossScores.average() else 0.0,
                        bestRound = grossScores.minOrNull() ?: 0,
                        worstRound = grossScores.maxOrNull() ?: 0,
                        avgFairwaysHit = if (allScores.isNotEmpty()) fairways.toDouble() / allScores.size * 100 else 0.0,
                        avgGir = if (allScores.isNotEmpty()) girs.toDouble() / allScores.size * 100 else 0.0,
                        avgPutts = if (putts.isNotEmpty()) putts.average() else 0.0
                    )
                }

                _handicap.value = handicapRepo.calculateHandicap(playerId)
            } catch (e: Exception) {
                // stats remain null
            }
            _loading.value = false
        }
    }

    @Serializable
    private data class PracticeRoundBrief(val id: String = "", val gross_score: Int? = null)
    @Serializable
    private data class ScoreBrief(
        val fairway_hit: Boolean? = null,
        val green_in_regulation: Boolean? = null,
        val putts: Int? = null
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlayerStatsScreen(
    playerId: String,
    playerName: String = "Player",
    onBack: () -> Unit,
    viewModel: PlayerStatsViewModel = hiltViewModel()
) {
    LaunchedEffect(playerId) { viewModel.loadStats(playerId) }

    val stats by viewModel.stats.collectAsState()
    val hc by viewModel.handicap.collectAsState()
    val loading by viewModel.loading.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("$playerName's Stats") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TmglGreen, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        }
    ) { padding ->
        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TmglGreen)
            }
        } else if (stats == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No stats available yet", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            val s = stats!!
            LazyColumn(
                modifier = Modifier.padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Handicap card
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        color = TmglGreen.copy(alpha = 0.1f),
                        tonalElevation = 2.dp
                    ) {
                        Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Handicap Index", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                text = hc?.currentHandicap?.toString() ?: "--",
                                style = MaterialTheme.typography.displayMedium,
                                fontWeight = FontWeight.Bold,
                                color = TmglGreen
                            )
                            hc?.trend?.let { trend ->
                                val (label, color) = when (trend) {
                                    "improving" -> "↓ Improving" to Color(0xFF4CAF50)
                                    "declining" -> "↑ Declining" to Color(0xFFF44336)
                                    "stable" -> "→ Stable" to MaterialTheme.colorScheme.onSurfaceVariant
                                    else -> "" to MaterialTheme.colorScheme.onSurfaceVariant
                                }
                                Text(label, style = MaterialTheme.typography.bodySmall, color = color)
                            }
                        }
                    }
                }

                // Score overview
                item {
                    Text("Score Overview", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }

                item {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatBox("Rounds", s.totalRounds.toString(), Modifier.weight(1f))
                        StatBox("Avg Score", "%.1f".format(s.avgScore), Modifier.weight(1f))
                        StatBox("Best", s.bestRound.toString(), Modifier.weight(1f))
                    }
                }

                item {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatBox("Worst", s.worstRound.toString(), Modifier.weight(1f))
                        StatBox("Avg Putts", "%.1f".format(s.avgPutts), Modifier.weight(1f))
                    }
                }

                // Performance breakdown
                item {
                    Text("Performance", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                }

                item {
                    PerformanceBar("Fairways Hit", s.avgFairwaysHit, TmglGreen)
                }

                item {
                    PerformanceBar("Greens in Regulation", s.avgGir, TmglGoldBright)
                }

                // Score Trend Chart
                item {
                    Text("Score Trend", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                }

                item {
                    val trendRounds = hc?.recentRounds?.reversed() ?: emptyList()
                    if (trendRounds.size >= 2) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Last ${trendRounds.size} rounds", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(modifier = Modifier.height(8.dp))

                                val scores = trendRounds.map { it.grossScore }
                                val minScore = scores.minOrNull() ?: 0
                                val maxScore = scores.maxOrNull() ?: 100
                                val range = (maxScore - minScore).coerceAtLeast(1)

                                Canvas(
                                    modifier = Modifier.fillMaxWidth().height(120.dp)
                                ) {
                                    val w = size.width
                                    val h = size.height
                                    val stepX = w / (scores.size - 1).coerceAtLeast(1)

                                    for (i in 0..4) {
                                        val y = h * i / 4
                                        drawLine(
                                            color = Color.LightGray.copy(alpha = 0.3f),
                                            start = Offset(0f, y),
                                            end = Offset(w, y),
                                            strokeWidth = 1f
                                        )
                                    }

                                    val path = Path()
                                    scores.forEachIndexed { index, score ->
                                        val x = index * stepX
                                        val y = h - ((score - minScore).toFloat() / range * h)
                                        if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
                                    }
                                    drawPath(path, color = TmglGreen, style = Stroke(width = 3f))

                                    scores.forEachIndexed { index, score ->
                                        val x = index * stepX
                                        val y = h - ((score - minScore).toFloat() / range * h)
                                        drawCircle(color = TmglGreen, radius = 5f, center = Offset(x, y))
                                        drawCircle(color = Color.White, radius = 3f, center = Offset(x, y))
                                    }
                                }

                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Oldest", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("${trendRounds.size} rounds", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("Latest", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    } else {
                        Text("Need at least 2 rounds for trend", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                // Recent differentials
                hc?.recentRounds?.take(5)?.let { rounds ->
                    if (rounds.isNotEmpty()) {
                        item {
                            Text("Recent Differentials", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
                        }
                        items(rounds) { round ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(round.date.take(10), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("Score: ${round.grossScore}", style = MaterialTheme.typography.bodyMedium)
                                Text("Diff: %.1f".format(round.differential), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = TmglGreen)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatBox(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(modifier = modifier, shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = TmglGreen)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun PerformanceBar(label: String, percentage: Double, barColor: Color) {
    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodyMedium)
            Text("%.0f%%".format(percentage), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { (percentage / 100).toFloat().coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)),
            color = barColor,
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
    }
}
