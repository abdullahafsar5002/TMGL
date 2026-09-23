package com.tmgl.league.ui.navigation

import android.net.Uri

object DeepLinkHandler {
    private var onDeepLink: ((String) -> Unit)? = null

    fun setDeepLinkHandler(handler: (String) -> Unit) {
        onDeepLink = handler
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
                if (id.isNotEmpty()) "tournaments/$id" else "tournaments"
            }
            "tournament_leaderboard" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) "tournament_leaderboard/$id" else null
            }
            "leaderboard" -> "leaderboard"
            "matches" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) "matches/$id" else "matches"
            }
            "scoring" -> {
                val matchId = uri.getQueryParameter("match_id")
                if (matchId != null) "scoring?match_id=$matchId" else "scoring"
            }
            "players" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) "players/$id" else "players"
            }
            "teams" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) "teams/$id" else "teams"
            }
            "profile" -> "profile"
            "settings" -> "settings"
            "practice" -> {
                val sub = path.trimStart('/')
                if (sub == "create") "practice/create" else "practice"
            }
            "friendly_matches" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) "friendly_matches/$id" else "friendly_matches"
            }
            "notifications" -> "notifications"
            "announcements" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) "announcements/$id" else "announcements"
            }
            "course_search" -> "course_search"
            "course_gps" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) "course_gps/$id" else null
            }
            "live_leaderboard" -> {
                val id = path.trimStart('/')
                if (id.isNotEmpty()) "live_leaderboard/$id" else null
            }
            else -> null
        }
    }

    private fun parseTmglDeepLink(path: String, uri: Uri): String? {
        val segments = path.trimStart('/').split('/')

        return when {
            segments.isEmpty() -> null
            segments[0] == "tournament" && segments.size >= 2 -> "tournaments/${segments[1]}"
            segments[0] == "leaderboard" -> "leaderboard"
            segments[0] == "match" && segments.size >= 2 -> "matches/${segments[1]}"
            else -> null
        }
    }
}
