package com.tmgl.league.ui.screens.scoring

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.CourseHole
import com.tmgl.league.ui.theme.*
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

data class HoleEntry(
    val holeNumber: Int,
    val par: Int,
    val strokes: Int? = null,
    val putts: Int? = null,
    val fairwayHit: Boolean? = null,
    val gir: Boolean? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FastScoringScreen(
    matchId: String?,
    onBack: () -> Unit
) {
    var currentHole by rememberSaveable { mutableIntStateOf(1) }
    var totalHoles by rememberSaveable { mutableIntStateOf(18) }
    var courseHoles by remember { mutableStateOf<List<CourseHole>>(emptyList()) }
    var entries by remember { mutableStateOf<List<HoleEntry>>(emptyList()) }
    var selectedScore by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectedPutts by rememberSaveable { mutableIntStateOf(0) }
    var fairwayHit by rememberSaveable { mutableStateOf<Boolean?>(null) }
    var gir by rememberSaveable { mutableStateOf<Boolean?>(null) }
    var isSaving by rememberSaveable { mutableStateOf(false) }
    var isComplete by rememberSaveable { mutableStateOf(false) }
    var errorMsg by rememberSaveable { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(matchId) {
    }

    val par = courseHoles.find { it.holeNumber == currentHole }?.par ?: 4
    val prevHoleEntry = entries.find { it.holeNumber == currentHole }
    val completedCount = entries.count { it.strokes != null }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Hole $currentHole") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TmglGreen, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        if (isComplete) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(64.dp), tint = TmglGreen)
                    Spacer(Modifier.height(16.dp))
                    Text("Round Complete!", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text("$completedCount holes scored", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        } else {
            Column(
                modifier = Modifier.padding(padding).padding(16.dp).fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items((1..totalHoles).toList()) { hole ->
                        val entry = entries.find { it.holeNumber == hole }
                        val isCurrent = hole == currentHole
                        val isCompleted = entry?.strokes != null
                        Surface(
                            onClick = { currentHole = hole },
                            modifier = Modifier.size(36.dp),
                            shape = CircleShape,
                            color = when {
                                isCurrent -> TmglGreen
                                isCompleted -> TmglGreen.copy(alpha = 0.3f)
                                else -> MaterialTheme.colorScheme.surfaceVariant
                            }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    "$hole",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (isCurrent) Color.White else MaterialTheme.colorScheme.onSurface,
                                    fontWeight = if (isCurrent || isCompleted) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))

                Text("Par $par", style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                Spacer(Modifier.height(16.dp))

                Text("Score", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val scoreRange = (par - 2)..(par + 3)
                    scoreRange.forEach { score ->
                        val label = when {
                            score == par - 2 -> "Eagle"
                            score == par - 1 -> "Birdie"
                            score == par -> "Par"
                            score == par + 1 -> "Bogey"
                            score == par + 2 -> "DBL"
                            else -> "+${score - par}"
                        }
                        val color = when {
                            score < par -> TmglGreen
                            score == par -> TmglGreen.copy(alpha = 0.5f)
                            score == par + 1 -> Color(0xFFFFC107)
                            else -> MaterialTheme.colorScheme.error
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                            Button(
                                onClick = { selectedScore = score },
                                modifier = Modifier.size(56.dp),
                                shape = CircleShape,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (selectedScore == score) color else MaterialTheme.colorScheme.surfaceVariant
                                ),
                                contentPadding = PaddingValues(0.dp)
                            ) {
                                Text(
                                    "$score",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = if (selectedScore == score) Color.White else MaterialTheme.colorScheme.onSurface
                                )
                            }
                            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                Text("Putts", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    (0..6).forEach { putt ->
                        FilterChip(
                            selected = selectedPutts == putt,
                            onClick = { selectedPutts = putt },
                            label = { Text("$putt") }
                        )
                    }
                }

                Spacer(Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    FilterChip(selected = fairwayHit == true, onClick = { fairwayHit = if (fairwayHit == true) null else true }, label = { Text("FW") })
                    FilterChip(selected = gir == true, onClick = { gir = if (gir == true) null else true }, label = { Text("GIR") })
                }

                Spacer(Modifier.weight(1f))

                errorMsg?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 8.dp))
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (currentHole > 1) {
                        OutlinedButton(onClick = {
                            currentHole--
                            prevHoleEntry?.let {
                                selectedScore = it.strokes
                                selectedPutts = it.putts ?: 0
                                fairwayHit = it.fairwayHit
                                gir = it.gir
                            }
                        }, modifier = Modifier.weight(1f)) {
                            Text("Prev")
                        }
                    }
                    
                    Button(
                        onClick = {
                            if (selectedScore == null) {
                                errorMsg = "Select a score"
                                return@Button
                            }
                            val newEntry = HoleEntry(
                                holeNumber = currentHole,
                                par = par,
                                strokes = selectedScore,
                                putts = selectedPutts,
                                fairwayHit = fairwayHit,
                                gir = gir
                            )
                            entries = entries.filter { it.holeNumber != currentHole } + newEntry
                            errorMsg = null
                            
                            if (currentHole < totalHoles) {
                                currentHole++
                                selectedScore = null
                                selectedPutts = 0
                                fairwayHit = null
                                gir = null
                            } else {
                                isSaving = true
                                scope.launch {
                                    try {
                                        for (entry in entries.filter { it.strokes != null }) {
                                            val scoreData = mapOf<String, Any>(
                                                "match_id" to (matchId ?: ""),
                                                "hole_number" to entry.holeNumber,
                                                "par" to entry.par,
                                                "strokes" to (entry.strokes ?: 0),
                                                "score_to_par" to ((entry.strokes ?: 0) - entry.par),
                                                "putts" to (entry.putts ?: 0),
                                                "fairway_hit" to (entry.fairwayHit ?: false),
                                                "green_in_regulation" to (entry.gir ?: false)
                                            )
                                            SupabaseConfig.client.from("scorecard_holes").insert(scoreData)
                                        }
                                        isComplete = true
                                    } catch (e: Exception) {
                                        errorMsg = e.message ?: "Save failed"
                                    }
                                    isSaving = false
                                }
                            }
                        },
                        modifier = Modifier.weight(1f),
                        enabled = selectedScore != null && !isSaving,
                        colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                        } else if (currentHole < totalHoles) {
                            Text("Save & Next")
                        } else {
                            Text("Finish Round")
                        }
                    }
                }
            }
        }
    }
}
