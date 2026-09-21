package com.tmgl.league.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Login : Screen("login")
    data object Register : Screen("register")
    data object ForgotPassword : Screen("forgot_password")
    data object Home : Screen("home")
    data object Tournaments : Screen("tournaments")
    data object TournamentDetail : Screen("tournaments/{id}") {
        fun createRoute(id: String) = "tournaments/$id"
    }
    data object Matches : Screen("matches")
    data object MatchDetail : Screen("matches/{id}") {
        fun createRoute(id: String) = "matches/$id"
    }
    data object Scoring : Screen("scoring?match_id={matchId}") {
        fun createRoute(matchId: String? = null) = if (matchId != null) "scoring?match_id=$matchId" else "scoring"
    }
    data object FastScoring : Screen("fast_scoring?match_id={matchId}") {
        fun createRoute(matchId: String? = null) = if (matchId != null) "fast_scoring?match_id=$matchId" else "fast_scoring"
    }
    data object Leaderboard : Screen("leaderboard")
    data object Players : Screen("players")
    data object PlayerDetail : Screen("players/{id}") {
        fun createRoute(id: String) = "players/$id"
    }
    data object Teams : Screen("teams")
    data object TeamDetail : Screen("teams/{id}") {
        fun createRoute(id: String) = "teams/$id"
    }
    data object Profile : Screen("profile")
    data object ProfileEdit : Screen("profile_edit")
    data object Settings : Screen("settings")
    data object FriendlyMatches : Screen("friendly_matches")
    data object FriendlyMatchDetail : Screen("friendly_matches/{id}") {
        fun createRoute(id: String) = "friendly_matches/$id"
    }
    data object FriendlyMatchScore : Screen("friendly_matches/{id}/score") {
        fun createRoute(id: String) = "friendly_matches/$id/score"
    }
    data object Search : Screen("search")
    data object Notifications : Screen("notifications")
    data object Announcements : Screen("announcements")
    data object AnnouncementDetail : Screen("announcements/{id}") {
        fun createRoute(id: String) = "announcements/$id"
    }
    data object Practice : Screen("practice")
    data object PracticeCreate : Screen("practice/create")
    data object PracticeDetail : Screen("practice/{id}") {
        fun createRoute(id: String) = "practice/$id"
    }
    data object PlayerStats : Screen("player_stats/{id}") {
        fun createRoute(id: String) = "player_stats/$id"
    }
    data object TournamentCreate : Screen("tournaments/create")
    data object TournamentLeaderboard : Screen("tournament_leaderboard/{id}") {
        fun createRoute(id: String) = "tournament_leaderboard/$id"
    }
    data object FriendlyMatchCreate : Screen("friendly_match_create")
    data object HeadToHead : Screen("head_to_head/{playerA}/{playerB}") {
        fun createRoute(playerA: String, playerB: String) = "head_to_head/$playerA/$playerB"
    }
    data object SeasonStandings : Screen("season_standings")
    data object Flights : Screen("flights/{tournamentId}") {
        fun createRoute(tournamentId: String) = "flights/$tournamentId"
    }
    data object SideGames : Screen("side_games/{tournamentId}") {
        fun createRoute(tournamentId: String) = "side_games/$tournamentId"
    }
    data object ScoreVerification : Screen("score_verification/{roundId}") {
        fun createRoute(roundId: String) = "score_verification/$roundId"
    }
    data object Pairings : Screen("pairings/{tournamentId}/{roundId}") {
        fun createRoute(tournamentId: String, roundId: String) = "pairings/$tournamentId/$roundId"
    }
    data object CourseSearch : Screen("course_search")
    data object CourseGps : Screen("course_gps/{courseId}") {
        fun createRoute(courseId: String) = "course_gps/$courseId"
    }
    data object LiveLeaderboard : Screen("live_leaderboard/{tournamentId}") {
        fun createRoute(tournamentId: String) = "live_leaderboard/$tournamentId"
    }
    data object StablefordScorecard : Screen("stableford_scorecard/{playerName}") {
        fun createRoute(playerName: String) = "stableford_scorecard/$playerName"
    }
    data object MatchPlayScorecard : Screen("match_play_scorecard/{player1}/{player2}") {
        fun createRoute(player1: String, player2: String) = "match_play_scorecard/$player1/$player2"
    }
    data object NassauScorecard : Screen("nassau_scorecard/{player1}/{player2}") {
        fun createRoute(player1: String, player2: String) = "nassau_scorecard/$player1/$player2"
    }
}

data class BottomNavItem(
    val screen: Screen,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

val bottomNavItems = listOf(
    BottomNavItem(Screen.Home, "Home", Icons.Filled.Home, Icons.Outlined.Home),
    BottomNavItem(Screen.Tournaments, "Events", Icons.Filled.EmojiEvents, Icons.Outlined.EmojiEvents),
    BottomNavItem(Screen.Practice, "Practice", Icons.Filled.GolfCourse, Icons.Outlined.GolfCourse),
    BottomNavItem(Screen.Leaderboard, "Board", Icons.Filled.Leaderboard, Icons.Outlined.Leaderboard),
    BottomNavItem(Screen.Profile, "Profile", Icons.Filled.Person, Icons.Outlined.Person)
)
