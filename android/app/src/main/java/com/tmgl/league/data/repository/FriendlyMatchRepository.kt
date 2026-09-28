package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.FriendlyMatch
import com.tmgl.league.data.model.FriendlyMatchFormat
import com.tmgl.league.data.model.FriendlyMatchPlayer
import com.tmgl.league.data.model.FriendlyMatchStatus
import com.tmgl.league.data.model.FriendlyMatchScore
import com.tmgl.league.data.model.InvitationStatus
import com.tmgl.league.data.model.dbValue
import com.tmgl.league.data.model.displayName
import com.tmgl.league.data.model.friendlyMatchFormatFrom
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import javax.inject.Inject
import javax.inject.Singleton

data class FriendlyMatchParticipants(
    val match: FriendlyMatch,
    val players: List<FriendlyMatchPlayer>
)

@Singleton
class FriendlyMatchRepository @Inject constructor() {

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

            val allIds = (created.map { it.id } + invited.map { it.matchId }).distinct()
            if (allIds.isEmpty()) return DataResult.Success(emptyList())

            val matches = db.from("friendly_matches").select {
                filter { isIn("id", allIds) }
                order("created_at", Order.DESCENDING)
            }.decodeList<FriendlyMatch>()
            DataResult.Success(matches)
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

    suspend fun getFriendlyMatchParticipants(matchId: String): DataResult<FriendlyMatchParticipants> {
        return try {
            val match = getFriendlyMatch(matchId)
            if (match is DataResult.Error) return DataResult.Error(match.message)
            val players = getFriendlyMatchPlayers(matchId)
            if (players is DataResult.Error) return DataResult.Error(players.message)
            DataResult.Success(
                FriendlyMatchParticipants(
                    match = (match as DataResult.Success).data,
                    players = (players as DataResult.Success).data
                )
            )
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load match details")
        }
    }

    suspend fun getFriendlyMatchPlayers(matchId: String): DataResult<List<FriendlyMatchPlayer>> {
        return try {
            val rows = db.from("friendly_match_players").select {
                filter { eq("match_id", matchId) }
                order("created_at", Order.ASCENDING)
            }.decodeList<FriendlyMatchPlayer>()

            val playerIds = rows.map { it.playerId }.distinct()
            val lookup = playerDirectory(playerIds)
            DataResult.Success(
                rows.map { row ->
                    val player = lookup[row.playerId]
                    row.copy(fullName = player?.name, handicapIndex = player?.handicapIndex)
                }
            )
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load match players")
        }
    }

    suspend fun createFriendlyMatch(
        creatorPlayerId: String,
        courseId: String,
        title: String,
        description: String?,
        matchFormat: FriendlyMatchFormat,
        roundType: Int,
        scheduledAt: String?,
        opponentPlayerId: String?
    ): DataResult<FriendlyMatch> {
        if (creatorPlayerId.isBlank() || courseId.isBlank() || title.isBlank()) {
            return DataResult.Error("Title, course and player are required")
        }
        if (roundType != 9 && roundType != 18) {
            return DataResult.Error("Round type must be 9 or 18 holes")
        }
        return try {
            val payload = mutableMapOf<String, Any?>(
                "creator_id" to creatorPlayerId,
                "course_id" to courseId,
                "title" to title.trim(),
                "match_format" to matchFormat.dbValue(),
                "round_type" to roundType,
                "status" to FriendlyMatchStatus.ACTIVE.dbValue()
            )
            if (!description.isNullOrBlank()) payload["description"] = description.trim()
            if (!scheduledAt.isNullOrBlank()) payload["scheduled_at"] = scheduledAt

            val match = db.from("friendly_matches").insert(payload) { select() }
                .decodeList<FriendlyMatch>()
                .firstOrNull() ?: return DataResult.Error("Failed to create match")

            val participantIds = buildList {
                add(creatorPlayerId)
                if (!opponentPlayerId.isNullOrBlank() && opponentPlayerId != creatorPlayerId) add(opponentPlayerId)
            }
            if (participantIds.isNotEmpty()) {
                db.from("friendly_match_players").upsert(
                    participantIds.map {
                        mapOf(
                            "match_id" to match.id,
                            "player_id" to it,
                            "invitation_status" to InvitationStatus.PENDING.name.lowercase()
                        )
                    },
                    onConflict = "match_id,player_id"
                )
            }
            DataResult.Success(match)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to create match")
        }
    }

    suspend fun updateStatus(matchId: String, status: FriendlyMatchStatus): DataResult<FriendlyMatch> {
        return try {
            val payload = mutableMapOf<String, Any?>("status" to status.dbValue())
            if (status == FriendlyMatchStatus.IN_PROGRESS) payload["started_at"] = nowIso()
            if (status == FriendlyMatchStatus.COMPLETED) payload["completed_at"] = nowIso()
            val updated = db.from("friendly_matches").update(payload) {
                filter { eq("id", matchId) }
                select()
            }.decodeList<FriendlyMatch>().firstOrNull()
            if (updated != null) {
                DataResult.Success(updated)
            } else {
                DataResult.Error("Match not found")
            }
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to update match")
        }
    }

    suspend fun updateInvitation(
        matchPlayerId: String,
        status: InvitationStatus
    ): DataResult<FriendlyMatchPlayer> {
        return try {
            val payload = mutableMapOf<String, Any?>("invitation_status" to status.name.lowercase())
            if (status == InvitationStatus.ACCEPTED) payload["joined_at"] = nowIso()
            val updated = db.from("friendly_match_players").update(payload) {
                filter { eq("id", matchPlayerId) }
                select()
            }.decodeList<FriendlyMatchPlayer>().firstOrNull()
            if (updated != null) {
                DataResult.Success(updated)
            } else {
                DataResult.Error("Invitation not found")
            }
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to update invitation")
        }
    }

    suspend fun getFriendlyMatchScores(matchPlayerId: String): DataResult<List<FriendlyMatchScore>> {
        return try {
            val data = db.from("friendly_match_scores").select {
                filter { eq("match_player_id", matchPlayerId) }
                order("hole_number", Order.ASCENDING)
            }.decodeList<FriendlyMatchScore>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load scores")
        }
    }

    suspend fun upsertFriendlyMatchScores(scores: List<FriendlyMatchScore>): DataResult<Int> {
        if (scores.isEmpty()) return DataResult.Success(0)
        val valid = scores.filter { it.matchPlayerId.isNotBlank() && it.holeNumber > 0 && it.score in 1..20 }
        if (valid.isEmpty()) return DataResult.Error("No valid scores to save")
        return try {
            db.from("friendly_match_scores").upsert(
                valid.map { score ->
                    buildMap<String, Any?> {
                        put("match_player_id", score.matchPlayerId)
                        put("hole_number", score.holeNumber)
                        put("par", score.par)
                        put("score", score.score)
                        score.stablefordPoints?.let { put("stableford_points", it) }
                    }
                },
                onConflict = "match_player_id,hole_number"
            ) { select() }
            DataResult.Success(valid.size)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to save scores")
        }
    }

    suspend fun resolvePlayerIdByEmail(email: String): DataResult<String?> {
        if (email.isBlank()) return DataResult.Success(null)
        return try {
            val profile = db.from("profiles")
                .select(Columns.raw("id"))
                { filter { eq("email", email.trim()) } }
                .decodeList<IdRow>()
                .firstOrNull()
            if (profile == null) {
                DataResult.Success(null)
            } else {
                val player = db.from("players")
                    .select(Columns.raw("id"))
                    { filter { eq("auth_user_id", profile.id) } }
                    .decodeList<IdRow>()
                    .firstOrNull()
                DataResult.Success(player?.id)
            }
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to find player")
        }
    }

    suspend fun getFriendlyMatchFormatLabel(value: String): String =
        friendlyMatchFormatFrom(value).displayName()

    private suspend fun playerDirectory(playerIds: List<String>): Map<String, PlayerLookup> {
        if (playerIds.isEmpty()) return emptyMap()
        return try {
            db.from("players")
                .select(Columns.raw("id, full_name, handicap_index")) {
                    filter { isIn("id", playerIds) }
                }
                .decodeList<PlayerLookup>()
                .associate { it.id to it }
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun nowIso(): String = kotlinx.datetime.Clock.System.now().toString()
}

@kotlinx.serialization.Serializable
private data class IdRow(
    val id: String = ""
)

@kotlinx.serialization.Serializable
private data class PlayerLookup(
    val id: String = "",
    @kotlinx.serialization.SerialName("full_name") val name: String? = null,
    @kotlinx.serialization.SerialName("handicap_index") val handicapIndex: Double? = null
)
