package com.tmgl.league.ui.screens.home

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.R
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.ui.theme.*
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onNavigateToTournaments: () -> Unit,
    onNavigateToMatches: () -> Unit,
    onNavigateToLeaderboard: () -> Unit,
    onNavigateToPlayers: () -> Unit,
    onNavigateToTeams: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToPractice: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    onNavigateToSearch: () -> Unit = {},
    onNavigateToSeasonStandings: () -> Unit = {},
    isOnline: Boolean = true,
    userName: String = "Player",
    handicap: String = "--",
    totalRounds: String = "0",
    recentScores: List<Pair<String, String>> = emptyList()
) {
    var liveHandicap by remember { mutableStateOf(handicap) }
    var liveTotalRounds by remember { mutableStateOf(totalRounds) }

    LaunchedEffect(Unit) {
        try {
            val userId = SupabaseConfig.client.auth.currentUserOrNull()?.id ?: return@LaunchedEffect
            val profile = SupabaseConfig.client.from("profiles")
                .select { filter { eq("id", userId) } }
                .decodeList<Map<String, Any>>()
                .firstOrNull()
            liveHandicap = profile?.get("handicap_index")?.toString() ?: "--"
            val rounds = SupabaseConfig.client.from("practice_rounds")
                .select { filter { eq("user_id", userId) } }
                .decodeList<Map<String, Any>>()
            liveTotalRounds = rounds.size.toString()
        } catch (_: Exception) {
            liveHandicap = "--"
            liveTotalRounds = "0"
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(
                            painter = painterResource(id = R.drawable.logo),
                            contentDescription = "Logo",
                            modifier = Modifier.size(36.dp).clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("TORUK MAKTO", fontWeight = FontWeight.Bold)
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToSearch) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = "Search",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
        ) {
            // ── Offline Banner ──
            if (!isOnline) {
                Surface(color = MaterialTheme.colorScheme.errorContainer, modifier = Modifier.fillMaxWidth()) {
                    Text("You're offline. Showing cached data.", modifier = Modifier.padding(8.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer)
                }
            }

            // ── Hero Card with Gradient ──
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = RoundedCornerShape(20.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.linearGradient(listOf(TmglGreen, TmglEmerald)))
                        .padding(24.dp)
                ) {
                    Column {
                        Text("Welcome back,", style = MaterialTheme.typography.bodyMedium, color = TmglGoldLight)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(userName, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            StatPill(label = "Handicap", value = liveHandicap)
                            StatPill(label = "Rounds", value = liveTotalRounds)
                        }
                    }
                }
            }

            // ── Quick Access Grid (2x3) ──
            Text("Quick Access", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))

            val quickLinks = listOf(
                Triple(Icons.Default.EmojiEvents, "Tournaments", onNavigateToTournaments),
                Triple(Icons.Default.Leaderboard, "Leaderboard", onNavigateToLeaderboard),
                Triple(Icons.Default.GolfCourse, "Practice", onNavigateToPractice),
                Triple(Icons.Default.People, "Players", onNavigateToPlayers),
                Triple(Icons.Default.Groups, "Teams", onNavigateToTeams),
                Triple(Icons.Default.Notifications, "Activity", onNavigateToMatches),
                Triple(Icons.Default.EmojiEvents, "Standings", onNavigateToSeasonStandings)
            )

            Column(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                for (row in quickLinks.chunked(3)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                        for ((icon, label, action) in row) {
                            QuickAccessCard(icon = icon, label = label, onClick = action, modifier = Modifier.weight(1f))
                        }
                        repeat(3 - row.size) { Spacer(modifier = Modifier.weight(1f)) }
                    }
                }
            }

            // ── Recent Rounds ──
            if (recentScores.isNotEmpty()) {
                Text(
                    "Recent Rounds",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    for ((holeName, score) in recentScores) {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    holeName,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    score,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = TmglGreen
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun StatPill(label: String, value: String) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.15f)
    ) {
        Row(modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f))
            Spacer(modifier = Modifier.width(6.dp))
            Text(value, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
        }
    }
}

@Composable
private fun QuickAccessCard(icon: ImageVector, label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                shape = CircleShape,
                color = TmglGold.copy(alpha = 0.1f),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = label, tint = TmglGold, modifier = Modifier.size(24.dp))
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(label, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
        }
    }
}
