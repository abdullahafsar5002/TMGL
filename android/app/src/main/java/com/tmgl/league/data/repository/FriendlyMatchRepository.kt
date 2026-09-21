package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.*
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order

class FriendlyMatchRepository {
    private val db = SupabaseConfig.client

    suspend fun getFriendlyMatchesByPlayer(playerId: String): DataResult<List<FriendlyMatch>> {
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
                val match = db.from("friendly_matches").select {
                    filter { eq("id", matchId) }
                }.decodeList<FriendlyMatch>().firstOrNull()
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
                db.from("friendly_match_scores").upsert(scores)
            }
            DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to save scores")
        }
    }
}
