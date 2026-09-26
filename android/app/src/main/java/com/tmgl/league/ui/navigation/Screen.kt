package com.tmgl.league.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector
import com.tmgl.league.data.model.ScoringTarget

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Register : Screen("register")
    data object ForgotPassword : Screen("forgot_password")
    data object Home : Screen("home")
    data object Tournaments : Screen("tournaments")
    data object TournamentDetail : Screen("tournaments/{id}") {
        fun createRoute(id: String) = "tournaments/${encodeRouteSegment(id)}"
    }
    data object Matches : Screen("matches")
    data object MatchDetail : Screen("matches/{id}") {
        fun createRoute(id: String) = "matches/${encodeRouteSegment(id)}"
    }
    data object Scoring : Screen("scoring?round_id={roundId}&player_id={playerId}&match_id={matchId}&scorecard_id={scorecardId}") {
        private const val PATH = "scoring"

        fun createRoute(target: ScoringTarget): String {
            val params = buildList {
                if (target.roundId.isNotBlank()) add("round_id" to encodeRouteSegment(target.roundId))
                if (target.playerId.isNotBlank()) add("player_id" to encodeRouteSegment(target.playerId))
                if (!target.matchId.isNullOrBlank()) add("match_id" to encodeRouteSegment(target.matchId))
                if (!target.scorecardId.isNullOrBlank()) add("scorecard_id" to encodeRouteSegment(target.scorecardId))
            }
            if (params.isEmpty()) return PATH
            return "$PATH?" + params.joinToString("&") { "${it.first}=${it.second}" }
        }

        fun parseTarget(
            roundId: String?,
            playerId: String?,
            matchId: String?,
            scorecardId: String?
        ): ScoringTarget? {
            val target = ScoringTarget(
                roundId = decodeRouteSegment(roundId.orEmpty()).trim(),
                playerId = decodeRouteSegment(playerId.orEmpty()).trim(),
                matchId = decodeRouteSegment(matchId.orEmpty()).trim().takeIf { it.isNotEmpty() },
                scorecardId = decodeRouteSegment(scorecardId.orEmpty()).trim().takeIf { it.isNotEmpty() }
            )
            return if (target.isResolvable) target else null
        }
    }
    data object Leaderboard : Screen("leaderboard")
    data object Players : Screen("players")
    data object PlayerDetail : Screen("players/{id}") {
        fun createRoute(id: String) = "players/${encodeRouteSegment(id)}"
    }
    data object Teams : Screen("teams")
    data object TeamDetail : Screen("teams/{id}") {
        fun createRoute(id: String) = "teams/${encodeRouteSegment(id)}"
    }
    data object Profile : Screen("profile")
    data object ProfileEdit : Screen("profile_edit")
    data object Settings : Screen("settings")
    data object FriendlyMatches : Screen("friendly_matches")
    data object FriendlyMatchDetail : Screen("friendly_matches/{id}") {
        fun createRoute(id: String) = "friendly_matches/${encodeRouteSegment(id)}"
    }
    data object FriendlyMatchScore : Screen("friendly_matches/{id}/score") {
        fun createRoute(id: String) = "friendly_matches/${encodeRouteSegment(id)}/score"
    }
    data object Search : Screen("search")
    data object Notifications : Screen("notifications")
    data object Announcements : Screen("announcements")
    data object AnnouncementDetail : Screen("announcements/{id}") {
        fun createRoute(id: String) = "announcements/${encodeRouteSegment(id)}"
    }
    data object Practice : Screen("practice")
    data object PracticeCreate : Screen("practice/create")
    data object PracticeDetail : Screen("practice/{id}") {
        fun createRoute(id: String) = "practice/${encodeRouteSegment(id)}"
    }
    data object PlayerStats : Screen("player_stats/{id}") {
        fun createRoute(id: String) = "player_stats/${encodeRouteSegment(id)}"
    }
    data object TournamentCreate : Screen("tournaments/create")
    data object TournamentLeaderboard : Screen("tournament_leaderboard/{id}") {
        fun createRoute(id: String) = "tournament_leaderboard/${encodeRouteSegment(id)}"
    }
    data object FriendlyMatchCreate : Screen("friendly_match_create")
    data object SeasonStandings : Screen("season_standings")
    data object Flights : Screen("flights/{tournamentId}") {
        fun createRoute(tournamentId: String) = "flights/${encodeRouteSegment(tournamentId)}"
    }
    data object SideGames : Screen("side_games/{tournamentId}") {
        fun createRoute(tournamentId: String) = "side_games/${encodeRouteSegment(tournamentId)}"
    }
    data object ScoreVerification : Screen("score_verification/{roundId}") {
        fun createRoute(roundId: String) = "score_verification/${encodeRouteSegment(roundId)}"
    }
    data object Pairings : Screen("pairings/{tournamentId}/{roundId}") {
        fun createRoute(tournamentId: String, roundId: String) =
            "pairings/${encodeRouteSegment(tournamentId)}/${encodeRouteSegment(roundId)}"
    }
    data object CourseSearch : Screen("course_search")
    data object CourseGps : Screen("course_gps/{courseId}") {
        fun createRoute(courseId: String) = "course_gps/${encodeRouteSegment(courseId)}"
    }
    data object LiveLeaderboard : Screen("live_leaderboard/{tournamentId}") {
        fun createRoute(tournamentId: String) = "live_leaderboard/${encodeRouteSegment(tournamentId)}"
    }
}

private const val UNRESERVED = "-_.~"

internal fun encodeRouteSegment(value: String): String {
    if (value.isEmpty()) return value
    return buildString(value.length) {
        for (byte in value.toByteArray(Charsets.UTF_8)) {
            val code = byte.toInt() and 0xFF
            val char = code.toChar()
            val unreserved = code in 0x41..0x5A ||
                code in 0x61..0x7A ||
                code in 0x30..0x39 ||
                char in UNRESERVED
            if (unreserved) {
                append(char)
            } else {
                append('%')
                append(HEX[(code shr 4) and 0x0F])
                append(HEX[code and 0x0F])
            }
        }
    }
}

private const val HEX = "0123456789ABCDEF"

internal fun decodeRouteSegment(value: String): String {
    if (!value.contains('%')) return value
    val bytes = ArrayList<Byte>(value.length)
    var index = 0
    while (index < value.length) {
        val char = value[index]
        if (char == '%' && index + 2 < value.length) {
            val high = HEX.indexOf(value[index + 1].uppercaseChar())
            val low = HEX.indexOf(value[index + 2].uppercaseChar())
            if (high >= 0 && low >= 0) {
                bytes.add(((high shl 4) or low).toByte())
                index += 3
                continue
            }
        }
        char.toString().toByteArray(Charsets.UTF_8).forEach { bytes.add(it) }
        index++
    }
    return String(bytes.toByteArray(), Charsets.UTF_8)
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
