package com.tmgl.league.ui.navigation

import android.net.Uri
import com.tmgl.league.data.model.ScoringTarget

object DeepLinkHandler {
    private var onDeepLink: ((String) -> Unit)? = null

    fun setDeepLinkHandler(handler: (String) -> Unit) {
        onDeepLink = handler
    }

    fun clearDeepLinkHandler() {
        onDeepLink = null
    }

    fun handleDeepLink(uri: Uri) {
        val route = parseDeepLink(uri)
        if (route != null) {
            onDeepLink?.invoke(route)
        }
    }

    private fun parseDeepLink(uri: Uri): String? {
        val host = uri.host ?: return null
        val path = uri.path ?: ""

        return when (host) {
            "tmgl.app" -> parseTmglDeepLink(path, uri)
            else -> parseTmglScheme(uri)
        }
    }

    private fun parseTmglScheme(uri: Uri): String? {
        val scheme = uri.scheme ?: return null
        if (scheme != "tmgl") return null

        val host = uri.host ?: return null
        val path = uri.path ?: ""

        return when (host) {
            "tournaments" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) Screen.TournamentDetail.createRoute(id) else Screen.Tournaments.route
            }
            "tournament_leaderboard" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) Screen.TournamentLeaderboard.createRoute(id) else null
            }
            "leaderboard" -> Screen.Leaderboard.route
            "matches" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) Screen.MatchDetail.createRoute(id) else Screen.Matches.route
            }
            "scoring" -> {
                val target = ScoringTarget(
                    roundId = uri.getQueryParameter("round_id").orEmpty(),
                    playerId = uri.getQueryParameter("player_id").orEmpty(),
                    matchId = uri.getQueryParameter("match_id"),
                    scorecardId = uri.getQueryParameter("scorecard_id")
                )
                if (target.isResolvable) Screen.Scoring.createRoute(target) else Screen.Tournaments.route
            }
            "players" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) Screen.PlayerDetail.createRoute(id) else Screen.Players.route
            }
            "teams" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) Screen.TeamDetail.createRoute(id) else Screen.Teams.route
            }
            "profile" -> Screen.Profile.route
            "settings" -> Screen.Settings.route
            "practice" -> {
                val sub = path.trimStart('/')
                if (sub == "create") Screen.PracticeCreate.route else Screen.Practice.route
            }
            "friendly_matches" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) Screen.FriendlyMatchDetail.createRoute(id) else Screen.FriendlyMatches.route
            }
            "notifications" -> Screen.Notifications.route
            "announcements" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) Screen.AnnouncementDetail.createRoute(id) else Screen.Announcements.route
            }
            "course_search" -> Screen.CourseSearch.route
            "course_gps" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) Screen.CourseGps.createRoute(id) else Screen.CourseSearch.route
            }
            "live_leaderboard" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) Screen.LiveLeaderboard.createRoute(id) else Screen.Leaderboard.route
            }
            else -> null
        }
    }

    private fun parseTmglDeepLink(path: String, uri: Uri): String? {
        val segments = path.trimStart('/').split('/')

        return when {
            segments.isEmpty() -> null
            segments[0] == "tournament" && segments.size >= 2 -> Screen.TournamentDetail.createRoute(segments[1])
            segments[0] == "leaderboard" -> Screen.Leaderboard.route
            segments[0] == "match" && segments.size >= 2 -> Screen.MatchDetail.createRoute(segments[1])
            else -> null
        }
    }
}
