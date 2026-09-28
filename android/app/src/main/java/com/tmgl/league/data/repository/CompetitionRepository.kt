package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.leaderboard.LeaderboardStandings
import com.tmgl.league.data.model.CourseHole
import com.tmgl.league.data.model.HoleScoreInput
import com.tmgl.league.data.model.LeaderboardEntry
import com.tmgl.league.data.model.Match
import com.tmgl.league.data.model.Player
import com.tmgl.league.data.model.Round
import com.tmgl.league.data.model.ScoreCalculations
import com.tmgl.league.data.model.Scorecard
import com.tmgl.league.data.model.ScorecardHole
import com.tmgl.league.data.model.ScorecardHoleWrite
import com.tmgl.league.data.model.ScorecardStatus
import com.tmgl.league.data.model.Tournament
import com.tmgl.league.data.model.scorecardHoleRowToModel
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CompetitionRepository @Inject constructor() {

    private val db: io.github.jan.supabase.SupabaseClient by lazy { SupabaseConfig.client }

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
                order("round_number", Order.ASCENDING)
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

    suspend fun getRoundIdForMatch(matchId: String): DataResult<String?> {
        return try {
            val data = db.from("matches")
                .select(Columns.raw("round_id")) {
                    filter { eq("id", matchId) }
                }
                .decodeList<RoundIdRow>()
                .firstOrNull()
            DataResult.Success(data?.round_id)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load match")
        }
    }

    suspend fun getCourseIdForRound(roundId: String): DataResult<String?> {
        return try {
            val round = db.from("rounds")
                .select(Columns.raw("id, tournament_id")) {
                    filter { eq("id", roundId) }
                }
                .decodeList<RoundIdRow>()
                .firstOrNull() ?: return DataResult.Success(null)
            if (round.tournament_id.isNullOrBlank()) return DataResult.Success(null)
            val tournament = db.from("tournaments")
                .select(Columns.raw("id, course_id")) {
                    filter { eq("id", round.tournament_id) }
                }
                .decodeList<CourseIdRow>()
                .firstOrNull()
            DataResult.Success(tournament?.course_id)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to resolve round course")
        }
    }

    suspend fun getScorecardsByRound(roundId: String): DataResult<List<Scorecard>> {
        return try {
            val data = db.from("scorecards").select {
                filter { eq("round_id", roundId) }
            }.decodeList<Scorecard>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load scorecards")
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

    suspend fun getScorecardByRoundPlayer(roundId: String, playerId: String): DataResult<Scorecard?> {
        return try {
            val data = db.from("scorecards").select {
                filter {
                    eq("round_id", roundId)
                    eq("player_id", playerId)
                }
            }.decodeList<Scorecard>().firstOrNull()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load scorecard")
        }
    }

    suspend fun getOrCreateScorecard(
        roundId: String,
        playerId: String,
        courseId: String? = null,
        matchId: String? = null
    ): DataResult<Scorecard> {
        val existing = getScorecardByRoundPlayer(roundId, playerId)
        if (existing is DataResult.Error) return DataResult.Error(existing.message)
        val found = (existing as DataResult.Success).data
        if (found != null) return DataResult.Success(found)
        return try {
            val payload = mutableMapOf<String, Any?>(
                "round_id" to roundId,
                "player_id" to playerId
            )
            if (!courseId.isNullOrBlank()) payload["course_id"] = courseId
            if (!matchId.isNullOrBlank()) payload["match_id"] = matchId
            val created = db.from("scorecards").insert(payload) { select() }
                .decodeList<Scorecard>()
                .firstOrNull()
            if (created != null) {
                DataResult.Success(created)
            } else {
                val raced = getScorecardByRoundPlayer(roundId, playerId)
                if (raced is DataResult.Success && raced.data != null) {
                    DataResult.Success(raced.data)
                } else {
                    DataResult.Error("Failed to create scorecard")
                }
            }
        } catch (e: Exception) {
            val raced = getScorecardByRoundPlayer(roundId, playerId)
            if (raced is DataResult.Success && raced.data != null) {
                DataResult.Success(raced.data)
            } else {
                DataResult.Error(e.message ?: "Failed to create scorecard")
            }
        }
    }

    suspend fun getScorecardHoles(scorecardId: String): DataResult<List<ScorecardHole>> {
        return try {
            val rows = db.from("scorecard_holes").select {
                filter { eq("scorecard_id", scorecardId) }
                order("hole_number", Order.ASCENDING)
            }.decodeList<com.tmgl.league.data.model.ScorecardHoleRow>()
            DataResult.Success(rows.map { scorecardHoleRowToModel(it) })
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load scorecard holes")
        }
    }

    suspend fun upsertScorecardHoles(holes: List<ScorecardHoleWrite>): DataResult<Int> {
        if (holes.isEmpty()) return DataResult.Success(0)
        val valid = holes.filter { it.holeNumber > 0 && it.score in 1..20 }
        if (valid.isEmpty()) return DataResult.Error("No valid scores to save")
        return try {
            val response = db.from("scorecard_holes")
                .upsert(valid.map { it.payload() }, onConflict = "scorecard_id,hole_number") { select() }
            val body = response.data
            if (body.isNotBlank() && !body.contains("scorecard_id")) {
                DataResult.Error("Scorecard rejected the update")
            } else {
                DataResult.Success(valid.size)
            }
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to save scores")
        }
    }

    suspend fun updateScorecard(
        scorecardId: String,
        totalStrokes: Int,
        totalScoreToPar: Int,
        status: ScorecardStatus
    ): DataResult<Unit> {
        return try {
            db.from("scorecards").update(
                mapOf(
                    "total_strokes" to totalStrokes,
                    "total_score_to_par" to totalScoreToPar,
                    "status" to status.name.lowercase()
                )
            ) { filter { eq("id", scorecardId) } }
            DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to update scorecard")
        }
    }

    suspend fun updateScorecardStatus(scorecardId: String, status: ScorecardStatus): DataResult<Unit> {
        return try {
            db.from("scorecards").update(mapOf("status" to status.name.lowercase())) {
                filter { eq("id", scorecardId) }
            }
            DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to update scorecard")
        }
    }

    suspend fun recalculateScorecardTotals(scorecardId: String, status: ScorecardStatus? = null): DataResult<Unit> {
        val scorecard = getScorecard(scorecardId)
        if (scorecard is DataResult.Error) return DataResult.Error(scorecard.message)
        val card = (scorecard as DataResult.Success).data
        val holes = getScorecardHoles(scorecardId)
        if (holes is DataResult.Error) return DataResult.Error(holes.message)
        val pars = resolvePars(card.courseId)
        val inputs = (holes as DataResult.Success).data
            .filter { it.score > 0 }
            .map { hole ->
                HoleScoreInput(
                    holeNumber = hole.holeNumber,
                    par = pars[hole.holeNumber] ?: DEFAULT_PAR,
                    score = hole.score
                )
            }
        val totals = ScoreCalculations.totals(inputs)
        return updateScorecard(
            scorecardId = scorecardId,
            totalStrokes = totals.totalStrokes,
            totalScoreToPar = totals.totalToPar,
            status = status ?: card.status
        )
    }

    suspend fun getCoursePars(courseId: String?): Map<Int, Int> {
        if (courseId.isNullOrBlank()) return emptyMap()
        return try {
            db.from("course_holes").select {
                filter { eq("course_id", courseId) }
            }.decodeList<CourseHole>().associate { it.holeNumber to it.par }
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private suspend fun resolvePars(courseId: String?): Map<Int, Int> = getCoursePars(courseId)

    suspend fun getLeaderboard(roundId: String): DataResult<List<LeaderboardEntry>> {
        return try {
            val scorecards = db.from("scorecards")
                .select(Columns.raw("id, player_id, total_strokes, total_score_to_par, status")) {
                    filter { eq("round_id", roundId) }
                }
                .decodeList<LeaderboardScorecardRow>()

            if (scorecards.isEmpty()) return DataResult.Success(emptyList())

            val pars = getCoursePars(resolveCourseIdForRound(roundId))
            val holesByCard = fetchHolesByScorecard(scorecards.mapNotNull { it.id })
            val totals = scorecards.mapNotNull { scorecard ->
                val cardId = scorecard.id
                if (cardId.isBlank()) return@mapNotNull null
                val playerId = scorecard.player_id
                if (playerId.isBlank()) return@mapNotNull null
                val scored = (holesByCard[cardId] ?: emptyList())
                    .filter { it.score != null && ScoreCalculations.isValidScore(it.score ?: 0) }
                if (scored.isEmpty()) return@mapNotNull null
                val gross = scored.sumOf { it.score ?: 0 }
                val toPar = scored.sumOf { hole ->
                    val par = hole.par ?: pars[hole.hole_number] ?: DEFAULT_PAR
                    (hole.score ?: 0) - par
                }
                LeaderboardStandings.GrossTotal(
                    playerId = playerId,
                    grossStrokes = gross,
                    holesCompleted = scored.size,
                    toPar = toPar,
                    scorecardId = cardId,
                    scorecardStatus = scorecard.status?.takeIf { it.isNotBlank() }?.lowercase()
                )
            }

            val playerIds = totals.map { it.playerId }.distinct()
            val players = loadPlayerInfo(playerIds)
            val standings = LeaderboardStandings.build(players, totals)

            val entries = standings.map { standing ->
                LeaderboardEntry(
                    playerId = standing.playerId,
                    playerName = standing.playerName,
                    totalStrokes = standing.grossStrokes,
                    totalScoreToPar = standing.toPar,
                    position = standing.position,
                    scorecardStatus = standing.scorecardStatus,
                    scorecardId = standing.scorecardId,
                    handicapIndex = standing.handicapIndex,
                    netStrokes = standing.netStrokes,
                    netToPar = standing.netToPar,
                    holesCompleted = standing.holesCompleted
                )
            }
            DataResult.Success(entries)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load leaderboard")
        }
    }

    private suspend fun resolveCourseIdForRound(roundId: String): String? =
        when (val result = getCourseIdForRound(roundId)) {
            is DataResult.Success -> result.data
            is DataResult.Error -> null
        }

    private suspend fun fetchHolesByScorecard(scorecardIds: List<String>): Map<String, List<LeaderboardHoleRow>> {
        val ids = scorecardIds.filter { it.isNotBlank() }.distinct()
        if (ids.isEmpty()) return emptyMap()
        val rows = try {
            db.from("scorecard_holes")
                .select(Columns.raw("scorecard_id, hole_number, score, par")) {
                    filter { isIn("scorecard_id", ids) }
                }
                .decodeList<LeaderboardHoleRow>()
        } catch (_: Exception) {
            emptyList()
        }
        return rows.groupBy { it.scorecard_id }
    }

    private suspend fun loadPlayerInfo(playerIds: List<String>): List<LeaderboardStandings.PlayerInfo> {
        if (playerIds.isEmpty()) return emptyList()
        return try {
            db.from("players")
                .select(Columns.raw("id, full_name, handicap_index")) {
                    filter { isIn("id", playerIds) }
                }
                .decodeList<LeaderboardPlayerRow>()
                .map {
                    LeaderboardStandings.PlayerInfo(
                        playerId = it.id,
                        fullName = it.full_name,
                        handicapIndex = it.handicap_index
                    )
                }
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun playerNames(playerIds: List<String>): Map<String, String> {
        if (playerIds.isEmpty()) return emptyMap()
        return try {
            db.from("players")
                .select(Columns.raw("id, full_name")) {
                    filter { isIn("id", playerIds) }
                }
                .decodeList<Player>()
                .associate { it.id to it.fullName }
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private companion object {
        const val DEFAULT_PAR = 4
    }
}

@kotlinx.serialization.Serializable
private data class RoundIdRow(
    val id: String = "",
    @kotlinx.serialization.SerialName("round_id") val round_id: String? = null,
    @kotlinx.serialization.SerialName("tournament_id") val tournament_id: String? = null
)

@kotlinx.serialization.Serializable
private data class CourseIdRow(
    val id: String = "",
    @kotlinx.serialization.SerialName("course_id") val course_id: String? = null
)

@kotlinx.serialization.Serializable
private data class LeaderboardScorecardRow(
    val id: String = "",
    @kotlinx.serialization.SerialName("player_id") val player_id: String = "",
    @kotlinx.serialization.SerialName("total_strokes") val total_strokes: Int? = null,
    @kotlinx.serialization.SerialName("total_score_to_par") val total_score_to_par: Int? = null,
    val status: String? = null
)

@kotlinx.serialization.Serializable
private data class LeaderboardHoleRow(
    @kotlinx.serialization.SerialName("scorecard_id") val scorecard_id: String = "",
    @kotlinx.serialization.SerialName("hole_number") val hole_number: Int = 0,
    val score: Int? = null,
    val par: Int? = null
)

@kotlinx.serialization.Serializable
private data class LeaderboardPlayerRow(
    val id: String = "",
    @kotlinx.serialization.SerialName("full_name") val full_name: String = "",
    @kotlinx.serialization.SerialName("handicap_index") val handicap_index: Double? = null
)
