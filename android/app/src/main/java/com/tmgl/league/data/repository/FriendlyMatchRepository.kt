package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.model.FriendlyMatch
import com.tmgl.league.data.model.FriendlyMatchPlayer
import com.tmgl.league.data.model.FriendlyMatchScore
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.Serializable

private const val PLAYER_ID_COLUMNS = "id"
private val VALID_MATCH_FORMATS =
    setOf("stroke_play", "stableford", "match_play", "best_ball", "scramble")
private const val FRIENDLY_MATCH_SCORES_CONFLICT = "match_player_id,hole_number"
private const val NEW_MATCH_STATUS = "pending"

class FriendlyMatchRepository {
    private val db = SupabaseConfig.client

    suspend fun resolveCurrentPlayerId(): DataResult<String> {
        val profileId = db.auth.currentUserOrNull()?.id
            ?: return DataResult.Error("Sign in to manage friendly matches")
        return try {
            val id = db.from("players").select(Columns.raw(PLAYER_ID_COLUMNS)) {
                filter { eq("profile_id", profileId) }
            }.decodeList<FriendlyPlayerIdRow>().firstOrNull()?.id
            if (id.isNullOrBlank()) {
                DataResult.Error("No player record is linked to this account")
            } else {
                DataResult.Success(id)
            }
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to resolve the player record")
        }
    }

    suspend fun getCourses(): DataResult<List<Course>> {
        return try {
            val data = db.from("courses").select().decodeList<Course>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load courses")
        }
    }

    suspend fun getFriendlyMatchesByPlayer(playerId: String): DataResult<List<FriendlyMatch>> {
        if (playerId.isBlank()) return DataResult.Error("A player is required to load matches")
        return try {
            val created = db.from("friendly_matches").select {
                filter { eq("creator_id", playerId) }
                order("created_at", Order.DESCENDING)
            }.decodeList<FriendlyMatch>()

            val invited = db.from("friendly_match_players").select {
                filter { eq("player_id", playerId) }
            }.decodeList<FriendlyMatchPlayer>()

            val invitedMatchIds = invited.map { it.matchId }
            val allMatchIds = (created.map { it.id } + invitedMatchIds).distinct()

            if (allMatchIds.isEmpty()) return DataResult.Success(emptyList())

            val matches = mutableListOf<FriendlyMatch>()
            for (matchId in allMatchIds) {
                val match = try {
                    db.from("friendly_matches").select {
                        filter { eq("id", matchId) }
                    }.decodeList<FriendlyMatch>().firstOrNull()
                } catch (_: Exception) { null }
                if (match != null) matches.add(match)
            }
            DataResult.Success(matches.sortedByDescending { it.createdAt })
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load friendly matches")
        }
    }

    suspend fun getFriendlyMatch(id: String): DataResult<FriendlyMatch> {
        return try {
            val data = db.from("friendly_matches").select {
                filter { eq("id", id) }
            }.decodeList<FriendlyMatch>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Match not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load match")
        }
    }

    suspend fun createFriendlyMatch(
        title: String,
        courseId: String,
        roundType: Int,
        matchFormat: String,
        scheduledAt: String?,
        description: String?
    ): DataResult<FriendlyMatch> {
        val cleanTitle = title.trim()
        if (cleanTitle.isEmpty()) return DataResult.Error("A match title is required")
        if (courseId.isBlank()) return DataResult.Error("A course is required")
        if (roundType != 9 && roundType != 18) {
            return DataResult.Error("A friendly match is played over 9 or 18 holes")
        }
        if (!VALID_MATCH_FORMATS.contains(matchFormat)) {
            return DataResult.Error("That match format is not supported")
        }

        val creatorId = when (val resolved = resolveCurrentPlayerId()) {
            is DataResult.Success -> resolved.data
            is DataResult.Error -> return DataResult.Error(resolved.message)
        }

        val payload = mutableMapOf<String, Any?>(
            "creator_id" to creatorId,
            "title" to cleanTitle,
            "course_id" to courseId,
            "round_type" to roundType,
            "match_format" to matchFormat,
            "status" to NEW_MATCH_STATUS
        )
        scheduledAt?.trim()?.takeIf { it.isNotEmpty() }?.let { payload["scheduled_at"] = it }
        description?.trim()?.takeIf { it.isNotEmpty() }?.let { payload["description"] = it }

        return try {
            val created = db.from("friendly_matches").insert(payload) { select() }
            val error = postgrestWriteError(created.data)
            if (error != null) return DataResult.Error(error)
            val match = created.decodeList<FriendlyMatch>().firstOrNull()
                ?: return DataResult.Error("The match was saved but the server returned no record")
            DataResult.Success(match)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to create the friendly match")
        }
    }

    suspend fun getFriendlyMatchPlayers(matchId: String): DataResult<List<FriendlyMatchPlayer>> {
        return try {
            val data = db.from("friendly_match_players").select {
                filter { eq("match_id", matchId) }
            }.decodeList<FriendlyMatchPlayer>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load match players")
        }
    }

    suspend fun getFriendlyMatchScores(matchPlayerId: String): DataResult<List<FriendlyMatchScore>> {
        return try {
            val data = db.from("friendly_match_scores").select {
                filter { eq("match_player_id", matchPlayerId) }
            }.decodeList<FriendlyMatchScore>()
            DataResult.Success(data.sortedBy { it.holeNumber })
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load scores")
        }
    }

    suspend fun upsertFriendlyMatchScores(scores: List<FriendlyMatchScore>): DataResult<Unit> {
        return try {
            if (scores.isNotEmpty()) {
                val result = db.from("friendly_match_scores")
                    .upsert(scores, onConflict = FRIENDLY_MATCH_SCORES_CONFLICT)
                val error = postgrestWriteError(result.data)
                if (error != null) return DataResult.Error(error)
            }
            DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to save scores")
        }
    }
}

@Serializable
private data class FriendlyPlayerIdRow(val id: String = "")
