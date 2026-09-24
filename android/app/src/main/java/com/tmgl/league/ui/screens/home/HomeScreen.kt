package com.tmgl.league.ui.screens.home

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.R
import com.tmgl.league.ui.theme.*
import com.tmgl.league.ui.viewmodel.HomeViewModel

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
    recentScores: List<Pair<String, String>> = emptyList(),
    homeViewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by homeViewModel.uiState.collectAsState()
    var isRefreshing by remember { mutableStateOf(false) }
    val pullRefreshState = rememberPullToRefreshState()

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
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { homeViewModel.refresh() },
            state = pullRefreshState
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                // ── Offline Banner ──
                if (!isOnline) {
                    item {
                        Surface(color = MaterialTheme.colorScheme.errorContainer, modifier = Modifier.fillMaxWidth()) {
                            Text("You're offline. Showing cached data.", modifier = Modifier.padding(8.dp), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer)
                        }
                    }
                }

                // ── Loading Skeleton ──
                if (uiState.isLoading) {
                    item {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            SkeletonCard(height = 160.dp)
                            SkeletonCard(height = 80.dp)
                            SkeletonCard(height = 60.dp)
                            SkeletonCard(height = 60.dp)
                        }
                    }
                }

                if (!uiState.isLoading) {
                    // ── Hero Card with Gradient ──
                    item {
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
                                    Text(uiState.userName, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        StatPill(label = "Handicap", value = uiState.handicap)
                                        StatPill(label = "Rounds", value = uiState.totalRounds)
                                    }
                                }
                            }
                        }
                    }

                    // ── Quick Access Grid (2x3) ──
                    item {
                        Text("Quick Access", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
                    }

                    val quickLinks = listOf(
                        Triple(Icons.Default.EmojiEvents, "Tournaments", onNavigateToTournaments),
                        Triple(Icons.Default.Leaderboard, "Leaderboard", onNavigateToLeaderboard),
                        Triple(Icons.Default.GolfCourse, "Practice", onNavigateToPractice),
                        Triple(Icons.Default.People, "Players", onNavigateToPlayers),
                        Triple(Icons.Default.Groups, "Teams", onNavigateToTeams),
                        Triple(Icons.Default.Notifications, "Activity", onNavigateToMatches),
                        Triple(Icons.Default.EmojiEvents, "Standings", onNavigateToSeasonStandings)
                    )

                    item {
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
                    }

                    // ── Recent Rounds ──
                    if (uiState.recentScores.isNotEmpty()) {
                        item {
                            Text(
                                "Recent Rounds",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }
                        items(uiState.recentScores) { (holeName, score) ->
                            Card(
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
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

                    // ── Error State ──
                    if (uiState.error != null) {
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Text(uiState.error ?: "", color = MaterialTheme.colorScheme.onErrorContainer)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    TextButton(onClick = { homeViewModel.loadHomeData() }) {
                                        Text("Retry")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SkeletonCard(height: androidx.compose.ui.unit.Dp) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(height)
            .shimmer(
                shimmer = rememberShimmer(
                    shimmerColors = listOf(
                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f),
                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                    )
                )
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {}
}

@Composable
private fun rememberShimmer(shimmerColors: List<androidx.compose.ui.graphics.Color>): Shimmer {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateAnim = transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer"
    )
    return Shimmer(
        colors = shimmerColors,
        translateAnim = translateAnim.value
    )
}

data class Shimmer(
    val colors: List<androidx.compose.ui.graphics.Color>,
    val translateAnim: Float
)

fun Modifier.shimmer(shimmer: Shimmer): Modifier {
    return this.background(
        brush = Brush.linearGradient(
            *shimmer.colors.mapIndexed { index, color ->
                (index.toFloat() / (shimmer.colors.size - 1).coerceAtLeast(1)) to color
            }.toTypedArray(),
            start = androidx.compose.ui.geometry.Offset(shimmer.translateAnim - 200f, 0f),
            end = androidx.compose.ui.geometry.Offset(shimmer.translateAnim, 0f)
        )
    )
}

@Composable
private fun StatPill(label: String, value: String) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.15f),
        modifier = Modifier.semantics(mergeDescendants = true) { contentDescription = "$label: $value" }
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
        modifier = modifier.clickable(onClick = onClick).semantics(mergeDescendants = true) { contentDescription = label },
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
