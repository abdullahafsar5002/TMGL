package com.tmgl.league.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import androidx.navigation.NavGraph.Companion.findStartDestination
import com.tmgl.league.data.offline.OfflineCache
import com.tmgl.league.data.offline.NetworkMonitor
import com.tmgl.league.data.offline.OfflineScoreQueue
import com.tmgl.league.data.error.GlobalErrorHandler
import com.tmgl.league.data.model.ScoringTarget
import com.tmgl.league.data.model.LiveLeaderboardEntry
import com.tmgl.league.ui.components.ErrorSnackbarHost
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.model.CourseHole
import com.tmgl.league.ui.screens.courses.CourseGpsScreen
import com.tmgl.league.ui.screens.courses.CourseSearchScreen
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.Serializable
import com.tmgl.league.ui.screens.announcements.AnnouncementDetailScreen
import com.tmgl.league.ui.screens.announcements.AnnouncementsScreen
import com.tmgl.league.ui.screens.friendly.FriendlyMatchCreateScreen
import com.tmgl.league.ui.screens.friendly.FriendlyMatchDetailScreen
import com.tmgl.league.ui.screens.friendly.FriendlyMatchesScreen
import com.tmgl.league.ui.screens.home.HomeScreen
import com.tmgl.league.ui.screens.leaderboard.LeaderboardScreen
import com.tmgl.league.ui.screens.matches.MatchDetailScreen
import com.tmgl.league.ui.screens.matches.MatchesScreen
import com.tmgl.league.ui.screens.notifications.NotificationsScreen
import com.tmgl.league.ui.screens.players.PlayerDetailScreen
import com.tmgl.league.ui.screens.stats.PlayerStatsScreen
import com.tmgl.league.ui.screens.players.PlayersScreen
import com.tmgl.league.ui.screens.practice.PracticeCreateScreen
import com.tmgl.league.ui.screens.practice.PracticeDetailScreen
import com.tmgl.league.ui.screens.practice.PracticeHubScreen
import com.tmgl.league.ui.screens.profile.ProfileEditScreen
import com.tmgl.league.ui.screens.profile.ProfileScreen
import com.tmgl.league.ui.screens.scoring.ScoringScreen
import com.tmgl.league.ui.screens.search.SearchScreen
import com.tmgl.league.ui.screens.settings.SettingsScreen
import com.tmgl.league.ui.screens.teams.TeamDetailScreen
import com.tmgl.league.ui.screens.teams.TeamsScreen
import com.tmgl.league.ui.screens.tournaments.TournamentCreateScreen
import com.tmgl.league.ui.screens.tournaments.TournamentDetailScreen
import com.tmgl.league.ui.screens.tournaments.TournamentLeaderboardScreen
import com.tmgl.league.ui.screens.tournaments.TournamentsScreen
import com.tmgl.league.ui.screens.tournaments.SeasonStandingsScreen
import com.tmgl.league.ui.screens.tournaments.PairingsScreen
import com.tmgl.league.ui.screens.tournaments.FlightsScreen
import com.tmgl.league.ui.screens.tournaments.SideGamesScreen
import com.tmgl.league.ui.screens.tournaments.ScoreVerificationScreen
import com.tmgl.league.ui.theme.TmglGreen
import com.tmgl.league.ui.theme.TmglGreenDark

private val mainTabs = setOf(
    Screen.Home.route,
    Screen.Tournaments.route,
    Screen.Practice.route,
    Screen.Leaderboard.route,
    Screen.Profile.route
)

@Composable
fun MainScreen(
    authState: AuthState,
    onAuthStateChanged: (AuthState) -> Unit,
    networkMonitor: NetworkMonitor,
    errorHandler: GlobalErrorHandler,
    onSignOut: () -> Unit = { onAuthStateChanged(AuthState.Unauthenticated) },
    initialDeepLink: android.net.Uri? = null
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in mainTabs

    val currentUserId = (authState as? AuthState.Authenticated)?.userId.orEmpty()

    val isOnline by networkMonitor.isOnline.collectAsState()

    val context = androidx.compose.ui.platform.LocalContext.current
    val isDarkMode by OfflineCache.getDarkMode(context).collectAsState(initial = false)
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(initialDeepLink) {
        if (initialDeepLink != null) {
            DeepLinkHandler.handleDeepLink(initialDeepLink)
        }
    }

    LaunchedEffect(Unit) {
        DeepLinkHandler.setDeepLinkHandler { route ->
            navController.navigate(route)
        }
    }

    DisposableEffect(Unit) {
        onDispose { DeepLinkHandler.clearDeepLinkHandler() }
    }

    LaunchedEffect(Unit) {
        OfflineScoreQueue.initialize(context)
        withContext(Dispatchers.IO) {
            OfflineScoreQueue.syncAll(context)
        }
    }

    Scaffold(
        snackbarHost = { ErrorSnackbarHost(errorHandler = errorHandler) },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(
                    containerColor = TmglGreen
                ) {
                    bottomNavItems.forEach { item ->
                        val selected = currentRoute == item.screen.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                if (currentRoute != item.screen.route) {
                                    navController.navigate(item.screen.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = null
                                )
                            },
                            label = { Text(item.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = TmglGreenDark,
                                selectedTextColor = TmglGreenDark,
                                unselectedIconColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.82f),
                                unselectedTextColor = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.82f),
                                indicatorColor = MaterialTheme.colorScheme.surface
                            )
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(paddingValues),
            enterTransition = { slideInHorizontally(initialOffsetX = { it / 3 }) + fadeIn(animationSpec = tween(200)) },
            exitTransition = { slideOutHorizontally(targetOffsetX = { -it / 3 }) + fadeOut(animationSpec = tween(200)) },
            popEnterTransition = { slideInHorizontally(initialOffsetX = { -it / 3 }) + fadeIn(animationSpec = tween(200)) },
            popExitTransition = { slideOutHorizontally(targetOffsetX = { it / 3 }) + fadeOut(animationSpec = tween(200)) }
        ) {
            // ── Main tabs ──────────────────────────────────────────────

            composable(Screen.Home.route) {
                HomeScreen(
                    onNavigateToTournaments = { navController.navigate(Screen.Tournaments.route) },
                    onNavigateToMatches = { navController.navigate(Screen.Matches.route) },
                    onNavigateToLeaderboard = { navController.navigate(Screen.Leaderboard.route) },
                    onNavigateToPlayers = { navController.navigate(Screen.Players.route) },
                    onNavigateToTeams = { navController.navigate(Screen.Teams.route) },
                    onNavigateToPractice = { navController.navigate(Screen.Practice.route) },
                    onNavigateToSettings = { navController.navigate(Screen.Settings.route) },
                    onNavigateToSearch = { navController.navigate(Screen.Search.route) },
                    onNavigateToSeasonStandings = { navController.navigate(Screen.SeasonStandings.route) },
                    isOnline = isOnline
                )
            }

            composable(Screen.Tournaments.route) {
                TournamentsScreen(
                    onTournamentClick = { id ->
                        navController.navigate(Screen.TournamentDetail.createRoute(id))
                    },
                    onCreateTournament = { navController.navigate(Screen.TournamentCreate.route) },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Practice.route) {
                PracticeHubScreen(
                    onNewPractice = { navController.navigate(Screen.PracticeCreate.route) },
                    onPracticeClick = { id -> navController.navigate(Screen.PracticeDetail.createRoute(id)) },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Leaderboard.route) {
                LeaderboardScreen(
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Profile.route) {
                ProfileScreen(
                    onBack = { navController.popBackStack() },
                    onSignOut = onSignOut,
                    onEditProfile = { navController.navigate(Screen.ProfileEdit.route) }
                )
            }

            // ── Tournament detail / create ─────────────────────────────

            composable(
                Screen.TournamentDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { backStackEntry ->
                val state = authState as? AuthState.Authenticated
                val isSuperAdmin = state?.profile?.role == com.tmgl.league.data.model.UserRole.SUPER_ADMIN
                TournamentDetailScreen(
                    tournamentId = backStackEntry.arguments?.getString("id") ?: "",
                    onBack = { navController.popBackStack() },
                    onScoreRound = { roundId ->
                        navController.navigate(
                            Screen.Scoring.createRoute(
                                ScoringTarget(roundId = roundId, playerId = currentUserId)
                            )
                        )
                    },
                    isSuperAdmin = isSuperAdmin,
                    onViewLeaderboard = { id -> navController.navigate(Screen.TournamentLeaderboard.createRoute(id)) },
                    onViewSeasonStandings = { navController.navigate(Screen.SeasonStandings.route) },
                    onViewFlights = { id -> navController.navigate(Screen.Flights.createRoute(id)) },
                    onViewSideGames = { id -> navController.navigate(Screen.SideGames.createRoute(id)) },
                    onVerifyScores = { id -> navController.navigate(Screen.ScoreVerification.createRoute(id)) },
                    onViewPairings = { tournamentId, roundId -> navController.navigate(Screen.Pairings.createRoute(tournamentId, roundId)) }
                )
            }

            composable(Screen.TournamentCreate.route) {
                TournamentCreateScreen(
                    onCreated = {
                        navController.navigate(Screen.Tournaments.route) {
                            popUpTo(Screen.Tournaments.route) { inclusive = true }
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.TournamentLeaderboard.route,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { backStackEntry ->
                TournamentLeaderboardScreen(
                    tournamentId = backStackEntry.arguments?.getString("id") ?: "",
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.SeasonStandings.route) {
                SeasonStandingsScreen(
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.Pairings.route,
                arguments = listOf(
                    navArgument("tournamentId") { type = NavType.StringType },
                    navArgument("roundId") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                PairingsScreen(
                    tournamentId = backStackEntry.arguments?.getString("tournamentId") ?: "",
                    roundId = backStackEntry.arguments?.getString("roundId") ?: "",
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.Flights.route,
                arguments = listOf(navArgument("tournamentId") { type = NavType.StringType })
            ) { backStackEntry ->
                FlightsScreen(
                    tournamentId = backStackEntry.arguments?.getString("tournamentId") ?: "",
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.SideGames.route,
                arguments = listOf(navArgument("tournamentId") { type = NavType.StringType })
            ) { backStackEntry ->
                SideGamesScreen(
                    tournamentId = backStackEntry.arguments?.getString("tournamentId") ?: "",
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.ScoreVerification.route,
                arguments = listOf(navArgument("roundId") { type = NavType.StringType })
            ) { backStackEntry ->
                ScoreVerificationScreen(
                    roundId = backStackEntry.arguments?.getString("roundId") ?: "",
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Practice detail / create ───────────────────────────────

            composable(Screen.PracticeCreate.route) {
                PracticeCreateScreen(
                    onCreated = { id ->
                        navController.navigate(Screen.PracticeDetail.createRoute(id)) {
                            popUpTo(Screen.Practice.route)
                        }
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.PracticeDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { backStackEntry ->
                PracticeDetailScreen(
                    practiceRoundId = backStackEntry.arguments?.getString("id") ?: "",
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Matches / Match detail / Scoring ───────────────────────

            composable(Screen.Matches.route) {
                MatchesScreen(
                    onMatchClick = { id -> navController.navigate(Screen.MatchDetail.createRoute(id)) },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.MatchDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.StringType }),
                deepLinks = listOf(navDeepLink { uriPattern = "tmgl://matches/{id}" })
            ) { backStackEntry ->
                MatchDetailScreen(
                    matchId = backStackEntry.arguments?.getString("id") ?: "",
                    onBack = { navController.popBackStack() },
                    onEnterScores = { id ->
                        navController.navigate(
                            Screen.Scoring.createRoute(
                                ScoringTarget(playerId = currentUserId, matchId = id)
                            )
                        )
                    }
                )
            }

            composable(
                Screen.Scoring.route,
                arguments = listOf(
                    navArgument("roundId") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("playerId") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("matchId") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("scorecardId") { type = NavType.StringType; nullable = true; defaultValue = null }
                )
            ) { backStackEntry ->
                ScoringScreen(
                    target = Screen.Scoring.parseTarget(
                        roundId = backStackEntry.arguments?.getString("roundId"),
                        playerId = backStackEntry.arguments?.getString("playerId"),
                        matchId = backStackEntry.arguments?.getString("matchId"),
                        scorecardId = backStackEntry.arguments?.getString("scorecardId")
                    ),
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Players / Player detail ────────────────────────────────

            composable(Screen.Players.route) {
                PlayersScreen(
                    onPlayerClick = { id -> navController.navigate(Screen.PlayerDetail.createRoute(id)) },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.PlayerDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { backStackEntry ->
                PlayerDetailScreen(
                    playerId = backStackEntry.arguments?.getString("id") ?: "",
                    onBack = { navController.popBackStack() },
                    onViewStats = { id -> navController.navigate(Screen.PlayerStats.createRoute(id)) }
                )
            }

            composable(
                Screen.PlayerStats.route,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { backStackEntry ->
                PlayerStatsScreen(
                    playerId = backStackEntry.arguments?.getString("id") ?: "",
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Teams / Team detail ────────────────────────────────────

            composable(Screen.Teams.route) {
                TeamsScreen(
                    onTeamClick = { id -> navController.navigate(Screen.TeamDetail.createRoute(id)) },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.TeamDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { backStackEntry ->
                TeamDetailScreen(
                    teamId = backStackEntry.arguments?.getString("id") ?: "",
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Profile / Settings ─────────────────────────────────────

            composable(Screen.ProfileEdit.route) {
                ProfileEditScreen(
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    onBack = { navController.popBackStack() },
                    onSignOut = onSignOut,
                    isDarkMode = isDarkMode,
                    onDarkModeChanged = { enabled ->
                        coroutineScope.launch {
                            OfflineCache.saveDarkMode(context, enabled)
                        }
                    }
                )
            }

            // ── Friendly matches ───────────────────────────────────────

            composable(Screen.FriendlyMatches.route) {
                FriendlyMatchesScreen(
                    onMatchClick = { id -> navController.navigate(Screen.FriendlyMatchDetail.createRoute(id)) },
                    onCreateMatch = { navController.navigate(Screen.FriendlyMatchCreate.route) },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(Screen.FriendlyMatchCreate.route) {
                FriendlyMatchCreateScreen(navController = navController)
            }

            composable(
                Screen.FriendlyMatchDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { backStackEntry ->
                FriendlyMatchDetailScreen(
                    matchId = backStackEntry.arguments?.getString("id") ?: "",
                    onBack = { navController.popBackStack() },
                    onStartScoring = { id -> navController.navigate(Screen.FriendlyMatchScore.createRoute(id)) }
                )
            }

            composable(
                Screen.FriendlyMatchScore.route,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { backStackEntry ->
                ScoringScreen(
                    target = ScoringTarget(
                        playerId = currentUserId,
                        matchId = backStackEntry.arguments?.getString("id")
                    ),
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Search ────────────────────────────────────────────────

            composable(Screen.Search.route) {
                SearchScreen(
                    onBack = { navController.popBackStack() },
                    onPlayerClick = { id -> navController.navigate(Screen.PlayerDetail.createRoute(id)) },
                    onTournamentClick = { id -> navController.navigate(Screen.TournamentDetail.createRoute(id)) }
                )
            }

            // ── Notifications ──────────────────────────────────────────

            composable(Screen.Notifications.route) {
                NotificationsScreen(
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Announcements ──────────────────────────────────────────

            composable(Screen.Announcements.route) {
                AnnouncementsScreen(
                    onAnnouncementClick = { id ->
                        navController.navigate(Screen.AnnouncementDetail.createRoute(id))
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.AnnouncementDetail.route,
                arguments = listOf(navArgument("id") { type = NavType.StringType })
            ) { backStackEntry ->
                AnnouncementDetailScreen(
                    announcementId = backStackEntry.arguments?.getString("id") ?: "",
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Course GPS ────────────────────────────────────────────

            composable(Screen.CourseSearch.route) {
                CourseSearchScreen(
                    onCourseSelected = { course ->
                        navController.navigate(Screen.CourseGps.createRoute(course.id))
                    },
                    onBack = { navController.popBackStack() }
                )
            }

            composable(
                Screen.CourseGps.route,
                arguments = listOf(navArgument("courseId") { type = NavType.StringType })
            ) { backStackEntry ->
                val courseId = backStackEntry.arguments?.getString("courseId").orEmpty()
                var gpsCourse by remember(courseId) { mutableStateOf<Course?>(null) }
                var gpsHole by remember(courseId) { mutableIntStateOf(1) }
                var gpsLoading by remember(courseId) { mutableStateOf(true) }
                var gpsError by remember(courseId) { mutableStateOf<String?>(null) }

                LaunchedEffect(courseId) {
                    if (courseId.isBlank()) {
                        gpsLoading = false
                        gpsError = "No course was selected"
                        return@LaunchedEffect
                    }
                    gpsLoading = true
                    gpsError = null
                    try {
                        val client = SupabaseConfig.client
                        val course = client.from("courses")
                            .select() { filter { eq("id", courseId) } }
                            .decodeList<Course>()
                            .firstOrNull()
                        if (course == null) {
                            gpsError = "That course could not be found"
                        } else {
                            val holes = client.from("course_holes")
                                .select() { filter { eq("course_id", courseId) } }
                                .decodeList<CourseHole>()
                                .sortedBy { it.holeNumber }
                            gpsCourse = course.copy(holes = holes)
                            gpsHole = 1
                        }
                    } catch (e: Exception) {
                        gpsError = e.message?.takeIf { it.isNotBlank() }
                            ?: "This course could not be loaded"
                    }
                    gpsLoading = false
                }

                CourseGpsScreen(
                    course = gpsCourse,
                    isLoading = gpsLoading,
                    loadError = gpsError,
                    selectedHole = gpsHole,
                    onHoleChanged = { gpsHole = it },
                    onBack = { navController.popBackStack() }
                )
            }

            // ── Live Leaderboard ──────────────────────────────────────

            composable(
                Screen.LiveLeaderboard.route,
                arguments = listOf(navArgument("tournamentId") { type = NavType.StringType })
            ) { backStackEntry ->
                val tournamentId = backStackEntry.arguments?.getString("tournamentId") ?: ""
                var tournamentName by remember(tournamentId) { mutableStateOf("Tournament") }
                var entries by remember(tournamentId) { mutableStateOf(emptyList<LiveLeaderboardEntry>()) }

                LaunchedEffect(tournamentId) {
                    try {
                        val db = SupabaseConfig.client
                        val tournament = db.from("tournaments")
                            .select() {
                                filter { eq("id", tournamentId) }
                            }
                            .decodeList<TournamentData>()
                        if (tournament.isNotEmpty()) {
                            tournamentName = tournament.first().name
                        }

                        val rounds = db.from("rounds")
                            .select(Columns.raw("id")) {
                                filter { eq("tournament_id", tournamentId) }
                            }
                            .decodeList<RoundData>()
                        val roundIds = rounds.map { it.id }

                        val scorecards = if (roundIds.isNotEmpty()) {
                            db.from("scorecards")
                                .select(Columns.raw("id, player_id, total_strokes, total_score_to_par, status")) {
                                    filter { isIn("round_id", roundIds) }
                                    filter { eq("status", "verified") }
                                }
                                .decodeList<ScorecardData>()
                        } else emptyList()

                        val playerIds = scorecards.map { it.player_id }.distinct()
                        val players = if (playerIds.isNotEmpty()) {
                            db.from("players")
                                .select(Columns.raw("id, full_name")) {
                                    filter { isIn("id", playerIds) }
                                }
                                .decodeList<PlayerData>()
                        } else emptyList()

                        val playerMap = players.associate { it.id to it.full_name }

                        entries = scorecards
                            .filter { it.total_strokes != null }
                            .sortedBy { it.total_strokes }
                            .map { sc ->
                                LiveLeaderboardEntry(
                                    playerName = playerMap[sc.player_id] ?: "Unknown",
                                    totalScore = sc.total_strokes ?: 0,
                                    holesCompleted = 18,
                                    status = sc.total_score_to_par?.let { if (it == 0) "E" else if (it > 0) "+$it" else "$it" } ?: ""
                                )
                            }
                    } catch (e: Exception) {
                        // Silently handle - screen shows empty state
                    }
                }

                com.tmgl.league.ui.screens.live.LiveLeaderboardScreen(
                    tournamentName = tournamentName,
                    entries = entries,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}

@Serializable
private data class TournamentData(
    val id: String = "",
    val name: String = ""
)

@Serializable
private data class RoundData(
    val id: String = ""
)

@Serializable
private data class ScorecardData(
    val id: String = "",
    val player_id: String = "",
    val total_strokes: Int? = null,
    val total_score_to_par: Int? = null,
    val status: String = ""
)

@Serializable
private data class PlayerData(
    val id: String = "",
    val full_name: String = ""
)
