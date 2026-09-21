package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.ui.theme.TmglGreen
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

@Serializable
data class ScorecardVerification(
    val id: String = "",
    val player_name: String = "",
    val hole_number: Int = 0,
    val par: Int = 4,
    val strokes: Int = 0,
    val score_to_par: Int = 0,
    val verified: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScoreVerificationScreen(
    roundId: String,
    onBack: () -> Unit
) {
    var scores by remember { mutableStateOf<List<ScorecardVerification>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(roundId) {
        try {
            scores = SupabaseConfig.client.from("scorecard_holes")
                .select() { filter { eq("scorecard_id", roundId) } }
                .decodeList<ScorecardVerification>()
        } catch (_: Exception) {}
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Verify Scores") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TmglGreen, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = TmglGreen) }
        } else {
            val unverified = scores.filter { !it.verified }
            val verified = scores.filter { it.verified }

            LazyColumn(modifier = Modifier.padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (unverified.isNotEmpty()) {
                    item { Text("Pending Verification (${unverified.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error) }
                    items(unverified) { score ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Row(modifier = Modifier.padding(12.dp).fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("${score.player_name} - Hole ${score.hole_number}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                    Text("Score: ${score.strokes} (Par ${score.par}, ${if (score.score_to_par >= 0) "+${score.score_to_par}" else "${score.score_to_par}"})", style = MaterialTheme.typography.bodySmall)
                                }
                                IconButton(onClick = {
                                    scope.launch {
                                        try {
                                            SupabaseConfig.client.from("scorecard_holes")
                                                .update(mapOf("verified" to true)) { filter { eq("id", score.id) } }
                                            scores = scores.map { if (it.id == score.id) it.copy(verified = true) else it }
                                        } catch (_: Exception) {}
                                    }
                                }) {
                                    Icon(Icons.Default.Check, "Verify", tint = TmglGreen)
                                }
                            }
                        }
                    }
                }
                if (verified.isNotEmpty()) {
                    item { Text("Verified (${verified.size})", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = TmglGreen) }
                    items(verified) { score ->
                        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = TmglGreen.copy(alpha = 0.1f))) {
                            Row(modifier = Modifier.padding(12.dp).fillMaxWidth()) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("${score.player_name} - Hole ${score.hole_number}", style = MaterialTheme.typography.bodyMedium)
                                    Text("Score: ${score.strokes}", style = MaterialTheme.typography.bodySmall)
                                }
                                Icon(Icons.Default.Check, "Verified", tint = TmglGreen)
                            }
                        }
                    }
                }
                if (scores.isEmpty()) {
                    item { Text("No scores to verify", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
}
