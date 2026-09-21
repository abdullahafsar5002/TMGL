package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.*
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order

class CompetitionRepository {
    private val db = SupabaseConfig.client

    suspend fun getTournaments(): DataResult<List<Tournament>> {
        return try {
            val data = db.from("tournaments").select {
                order("created_at", Order.DESCENDING)
            }.decodeList<Tournament>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load tournaments")
        }
    }

    suspend fun getTournament(id: String): DataResult<Tournament> {
        return try {
            val data = db.from("tournaments").select {
                filter { eq("id", id) }
            }.decodeList<Tournament>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Tournament not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load tournament")
        }
    }

    suspend fun getRoundsByTournament(tournamentId: String): DataResult<List<Round>> {
        return try {
            val data = db.from("rounds").select {
                filter { eq("tournament_id", tournamentId) }
            }.decodeList<Round>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load rounds")
        }
    }

    suspend fun getRound(id: String): DataResult<Round> {
        return try {
            val data = db.from("rounds").select {
                filter { eq("id", id) }
            }.decodeList<Round>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Round not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load round")
        }
    }

    suspend fun getMatches(): DataResult<List<Match>> {
        return try {
            val data = db.from("matches").select().decodeList<Match>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load matches")
        }
    }

    suspend fun getMatch(id: String): DataResult<Match> {
        return try {
            val data = db.from("matches").select {
                filter { eq("id", id) }
            }.decodeList<Match>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Match not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load match")
        }
    }

    suspend fun getMatchesByRound(roundId: String): DataResult<List<Match>> {
        return try {
            val data = db.from("matches").select {
                filter { eq("round_id", roundId) }
            }.decodeList<Match>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load matches")
        }
    }

    suspend fun getLeaderboard(roundId: String): DataResult<List<LeaderboardEntry>> {
        return try {
            val data = db.from("scorecards").select {
                filter { eq("round_id", roundId) }
            }.decodeList<Scorecard>()

            val profileIds = data.map { it.playerId }.distinct()
            val profiles = try {
                db.from("profiles").select {
                    filter { isIn("id", profileIds) }
                }.decodeList<Map<String, Any?>>()
            } catch (_: Exception) { emptyList() }
            val nameMap = profiles.associate { (it["id"] as? String ?: "") to (it["full_name"] as? String ?: "") }

            val entries = data.mapIndexed { index, sc ->
                LeaderboardEntry(
                    playerId = sc.playerId,
                    playerName = nameMap[sc.playerId] ?: sc.playerId,
                    totalStrokes = sc.totalStrokes ?: 0,
                    totalScoreToPar = sc.totalScoreToPar ?: 0,
                    position = index + 1,
                    scorecardStatus = sc.status.name,
                    scorecardId = sc.id
                )
            }.sortedBy { it.totalStrokes }
            DataResult.Success(entries)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load leaderboard")
        }
    }

    suspend fun getScorecard(id: String): DataResult<Scorecard> {
        return try {
            val data = db.from("scorecards").select {
                filter { eq("id", id) }
            }.decodeList<Scorecard>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Scorecard not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load scorecard")
        }
    }

    suspend fun getScorecardByMatch(matchId: String): DataResult<Scorecard> {
        return try {
            val data = db.from("scorecards").select {
                filter { eq("match_id", matchId) }
            }.decodeList<Scorecard>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Scorecard not found for this match")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load scorecard")
        }
    }

    suspend fun getOrCreateScorecard(roundId: String, playerId: String): DataResult<Scorecard> {
        return try {
            val existing = db.from("scorecards").select {
                filter {
                    eq("round_id", roundId)
                    eq("player_id", playerId)
                }
            }.decodeList<Scorecard>().firstOrNull()

            if (existing != null) {
                return DataResult.Success(existing)
            }

            val newSc = db.from("scorecards").insert(
                mapOf(
                    "round_id" to roundId,
                    "player_id" to playerId
                )
            ) { select() }.decodeList<Scorecard>().firstOrNull()

            if (newSc != null) DataResult.Success(newSc) else DataResult.Error("Failed to create scorecard")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load or create scorecard")
        }
    }

    suspend fun getScorecardHoles(scorecardId: String): DataResult<List<ScorecardHole>> {
        return try {
            val data = db.from("scorecard_holes").select {
                filter { eq("scorecard_id", scorecardId) }
            }.decodeList<ScorecardHole>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load scorecard holes")
        }
    }

    suspend fun upsertScorecardHoles(holes: List<ScorecardHole>): DataResult<Unit> {
        return try {
            if (holes.isNotEmpty()) {
                db.from("scorecard_holes").delete {
                    filter { eq("scorecard_id", holes.first().scorecardId) }
                }
                db.from("scorecard_holes").insert(holes)
            }
            DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to save scores")
        }
    }

    suspend fun updateScorecard(scorecardId: String, totalStrokes: Int, totalScoreToPar: Int, status: ScorecardStatus): DataResult<Unit> {
        return try {
            db.from("scorecards").update(
                mapOf(
                    "total_strokes" to totalStrokes,
                    "total_score_to_par" to totalScoreToPar,
                    "status" to status.name.lowercase()
                )
            ) {
                filter { eq("id", scorecardId) }
            }
            DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to update scorecard")
        }
    }

    suspend fun updateScorecardStatus(scorecardId: String, status: ScorecardStatus): DataResult<Unit> {
        return try {
            db.from("scorecards").update(
                mapOf("status" to status.name.lowercase())
            ) {
                filter { eq("id", scorecardId) }
            }
            DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to update scorecard")
        }
    }
}
