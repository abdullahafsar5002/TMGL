package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.competition.TournamentRegistrationState
import com.tmgl.league.data.competition.resolveTournamentRegistrationState
import com.tmgl.league.data.model.*
import com.tmgl.league.data.scoring.CompletionCheck
import com.tmgl.league.data.scoring.ExpectedHole
import com.tmgl.league.data.scoring.ScorecardTotals
import com.tmgl.league.data.scoring.DEFAULT_HOLE_COUNT
import com.tmgl.league.data.scoring.completionFromHoles
import com.tmgl.league.data.scoring.expectedHoles
import com.tmgl.league.data.scoring.normalizeHoleCount
import com.tmgl.league.data.scoring.statusRequiresCompleteScorecard
import com.tmgl.league.data.scoring.statusWireValue
import com.tmgl.league.data.scoring.totalsFromHoles
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

private const val SCORECARD_HOLES_CONFLICT = "scorecard_id,hole_number"
private const val REGISTRATION_COLUMNS = "id,tournament_id,player_id"
private const val REGISTRATION_REQUIRED = "A tournament is required"

class CompetitionRepository(
    private val clientProvider: () -> SupabaseClient = { SupabaseConfig.client }
) {
    private val db: SupabaseClient by lazy(clientProvider)

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

    suspend fun resolvePlayerId(profileId: String): DataResult<String> {
        if (profileId.isBlank()) return DataResult.Error("No signed-in player")
        return try {
            findPlayerByProfile(profileId)?.let { return DataResult.Success(it) }

            val name = try {
                db.from("profiles").select(Columns.raw("full_name")) {
                    filter { eq("id", profileId) }
                }.decodeList<ProfileNameRow>().firstOrNull()?.fullName
            } catch (_: Exception) { null }

            val created = db.from("players").insert(
                mapOf(
                    "profile_id" to profileId,
                    "full_name" to (name?.takeIf { it.isNotBlank() } ?: "TMGL Player")
                )
            ) { select() }

            val error = postgrestWriteError(created.data)
            val createdRow = if (error == null) created.decodeList<PlayerIdRow>().firstOrNull() else null
            val resolved = createdRow?.id ?: findPlayerByProfile(profileId)

            when {
                resolved != null -> DataResult.Success(resolved)
                error != null -> DataResult.Error(error)
                else -> DataResult.Error("No player record is linked to this account")
            }
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to resolve the player record")
        }
    }

    suspend fun getTournamentRegistrationState(
        tournamentId: String
    ): DataResult<TournamentRegistrationState> {
        if (tournamentId.isBlank()) return DataResult.Error(REGISTRATION_REQUIRED)
        val registrations = when (val result = loadTournamentRegistrations(tournamentId)) {
            is DataResult.Success -> result.data
            is DataResult.Error -> return DataResult.Error(result.message)
        }
        val profileId = currentSessionProfileId()
        val playerId = when (val resolved = resolveSessionPlayerId()) {
            is DataResult.Success -> resolved.data
            is DataResult.Error -> null
        }
        return DataResult.Success(
            resolveTournamentRegistrationState(
                registrations = registrations,
                playerId = playerId,
                isAuthenticated = profileId != null
            )
        )
    }

    suspend fun registerForTournament(tournamentId: String): DataResult<TournamentRegistrationState> {
        if (tournamentId.isBlank()) return DataResult.Error(REGISTRATION_REQUIRED)
        val playerId = when (val resolved = resolveSessionPlayerId()) {
            is DataResult.Success -> resolved.data
            is DataResult.Error -> return DataResult.Error(resolved.message)
        }
        return try {
            if (findTournamentRegistration(tournamentId, playerId) == null) {
                val created = db.from("tournament_registrations").insert(
                    mapOf(
                        "tournament_id" to tournamentId,
                        "player_id" to playerId
                    )
                ) { select() }
                val error = postgrestWriteError(created.data)
                if (error != null) return DataResult.Error(error)
            }
            refreshedRegistrationState(tournamentId, playerId)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to join this tournament")
        }
    }

    suspend fun leaveTournament(tournamentId: String): DataResult<TournamentRegistrationState> {
        if (tournamentId.isBlank()) return DataResult.Error(REGISTRATION_REQUIRED)
        val playerId = when (val resolved = resolveSessionPlayerId()) {
            is DataResult.Success -> resolved.data
            is DataResult.Error -> return DataResult.Error(resolved.message)
        }
        return try {
            if (findTournamentRegistration(tournamentId, playerId) != null) {
                val deleted = db.from("tournament_registrations").delete {
                    filter {
                        eq("tournament_id", tournamentId)
                        eq("player_id", playerId)
                    }
                }
                val error = postgrestWriteError(deleted.data)
                if (error != null) return DataResult.Error(error)
            }
            refreshedRegistrationState(tournamentId, playerId)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to leave this tournament")
        }
    }

    suspend fun getOrCreateScorecard(
        roundId: String,
        playerId: String,
        matchId: String? = null
    ): DataResult<Scorecard> {
        if (roundId.isBlank()) return DataResult.Error("A round is required to enter scores")
        if (playerId.isBlank()) return DataResult.Error("A player is required to enter scores")
        return try {
            val existing = findScorecard(roundId, playerId)
            if (existing != null) {
                return DataResult.Success(linkMatch(existing, matchId))
            }

            val payload = mutableMapOf<String, Any>(
                "round_id" to roundId,
                "player_id" to playerId
            )
            if (!matchId.isNullOrBlank()) payload["match_id"] = matchId

            val created = db.from("scorecards").insert(payload) { select() }
            val error = postgrestWriteError(created.data)
            val createdRow = if (error == null) created.decodeList<Scorecard>().firstOrNull() else null
            val resolved = createdRow ?: findScorecard(roundId, playerId)

            when {
                resolved != null -> DataResult.Success(resolved)
                error != null -> DataResult.Error(error)
                else -> DataResult.Error("Failed to create a scorecard for this round")
            }
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load or create scorecard")
        }
    }

    suspend fun getExpectedHoles(roundId: String): DataResult<List<ExpectedHole>> {
        if (roundId.isBlank()) {
            return DataResult.Success(expectedHoles(DEFAULT_HOLE_COUNT))
        }
        val tournament = when (val result = getTournamentOfRound(roundId)) {
            is DataResult.Success -> result.data
            is DataResult.Error -> return DataResult.Success(expectedHoles(DEFAULT_HOLE_COUNT))
        }
        val courseId = tournament.courseId
        if (courseId.isNullOrBlank()) {
            return DataResult.Success(expectedHoles(DEFAULT_HOLE_COUNT))
        }
        return try {
            val holeCount = db.from("courses").select(Columns.raw("holes_count")) {
                filter { eq("id", courseId) }
            }.decodeList<CourseHoleCountRow>().firstOrNull()?.holesCount

            val parByHole = try {
                db.from("course_holes").select(Columns.raw("hole_number,par")) {
                    filter { eq("course_id", courseId) }
                }.decodeList<CourseHoleParRow>()
                    .associate { it.holeNumber to it.par }
            } catch (_: Exception) { emptyMap() }

            DataResult.Success(expectedHoles(normalizeHoleCount(holeCount), parByHole))
        } catch (e: Exception) {
            DataResult.Success(expectedHoles(DEFAULT_HOLE_COUNT))
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

    suspend fun saveScorecardHoles(
        scorecardId: String,
        holes: List<ScorecardHole>
    ): DataResult<List<ScorecardHole>> {
        if (scorecardId.isBlank()) return DataResult.Error("A scorecard is required to save scores")
        if (holes.isEmpty()) return DataResult.Success(emptyList())
        if (holes.any { it.scorecardId != scorecardId }) {
            return DataResult.Error("Scores do not belong to this scorecard")
        }
        return try {
            val result = db.from("scorecard_holes")
                .upsert(holes.map { it.toInsertRow() }, onConflict = SCORECARD_HOLES_CONFLICT)
            val error = postgrestWriteError(result.data)
            if (error != null) {
                DataResult.Error(error)
            } else {
                when (val persisted = getScorecardHoles(scorecardId)) {
                    is DataResult.Success -> DataResult.Success(persisted.data)
                    is DataResult.Error -> persisted
                }
            }
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to save scores")
        }
    }

    suspend fun getScorecardCompletion(
        scorecardId: String,
        expected: List<ExpectedHole>
    ): DataResult<CompletionCheck> {
        return when (val holes = getScorecardHoles(scorecardId)) {
            is DataResult.Success -> DataResult.Success(completionFromHoles(expected, holes.data))
            is DataResult.Error -> DataResult.Error(holes.message)
        }
    }

    suspend fun updateScorecardStatus(
        scorecardId: String,
        status: ScorecardStatus
    ): DataResult<ScorecardTotals> {
        if (scorecardId.isBlank()) return DataResult.Error("A scorecard is required")
        return try {
            val scorecard = when (val result = getScorecard(scorecardId)) {
                is DataResult.Success -> result.data
                is DataResult.Error -> return DataResult.Error(result.message)
            }
            val expected = when (val result = getExpectedHoles(scorecard.roundId)) {
                is DataResult.Success -> result.data
                is DataResult.Error -> return DataResult.Error(result.message)
            }
            val holes = when (val result = getScorecardHoles(scorecardId)) {
                is DataResult.Success -> result.data
                is DataResult.Error -> return DataResult.Error(result.message)
            }

            val completion = completionFromHoles(expected, holes)
            if (statusRequiresCompleteScorecard(status) && !completion.isComplete) {
                return DataResult.Error(completion.missingHolesMessage())
            }

            val totals = totalsFromHoles(holes)
            val update = db.from("scorecards").update(
                mapOf(
                    "total_strokes" to totals.totalStrokes,
                    "total_score_to_par" to totals.totalToPar,
                    "status" to statusWireValue(status)
                )
            ) { filter { eq("id", scorecardId) } }
            val error = postgrestWriteError(update.data)
            if (error != null) DataResult.Error(error) else DataResult.Success(totals)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to update scorecard")
        }
    }

    suspend fun getTournamentOfRound(roundId: String): DataResult<Tournament> {
        return try {
            val round = db.from("rounds").select(Columns.raw("id,tournament_id")) {
                filter { eq("id", roundId) }
            }.decodeList<RoundRefRow>().firstOrNull() ?: return DataResult.Error("Round not found")
            getTournament(round.tournamentId)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load the tournament for this round")
        }
    }

    private suspend fun findPlayerByProfile(profileId: String): String? = try {
        db.from("players").select(Columns.raw("id")) {
            filter { eq("profile_id", profileId) }
        }.decodeList<PlayerIdRow>().firstOrNull()?.id
    } catch (_: Exception) { null }

    private fun currentSessionProfileId(): String? = db.auth.currentUserOrNull()?.id

    private suspend fun resolveSessionPlayerId(): DataResult<String> {
        val profileId = currentSessionProfileId()
            ?: return DataResult.Error("Sign in to manage your tournament registration")
        return resolvePlayerId(profileId)
    }

    private suspend fun refreshedRegistrationState(
        tournamentId: String,
        playerId: String
    ): DataResult<TournamentRegistrationState> {
        val registrations = when (val result = loadTournamentRegistrations(tournamentId)) {
            is DataResult.Success -> result.data
            is DataResult.Error -> return DataResult.Error(result.message)
        }
        return DataResult.Success(
            resolveTournamentRegistrationState(
                registrations = registrations,
                playerId = playerId,
                isAuthenticated = true
            )
        )
    }

    private suspend fun loadTournamentRegistrations(
        tournamentId: String
    ): DataResult<List<TournamentRegistration>> = try {
        val data = db.from("tournament_registrations").select(Columns.raw(REGISTRATION_COLUMNS)) {
            filter { eq("tournament_id", tournamentId) }
        }.decodeList<TournamentRegistration>()
        DataResult.Success(data)
    } catch (e: Exception) {
        DataResult.Error(e.message ?: "Failed to load tournament registrations")
    }

    private suspend fun findTournamentRegistration(
        tournamentId: String,
        playerId: String
    ): TournamentRegistration? = try {
        db.from("tournament_registrations").select(Columns.raw(REGISTRATION_COLUMNS)) {
            filter {
                eq("tournament_id", tournamentId)
                eq("player_id", playerId)
            }
        }.decodeList<TournamentRegistration>().firstOrNull()
    } catch (_: Exception) { null }

    private suspend fun findScorecard(roundId: String, playerId: String): Scorecard? = try {
        db.from("scorecards").select {
            filter {
                eq("round_id", roundId)
                eq("player_id", playerId)
            }
        }.decodeList<Scorecard>().firstOrNull()
    } catch (_: Exception) { null }

    private suspend fun linkMatch(scorecard: Scorecard, matchId: String?): Scorecard {
        if (matchId.isNullOrBlank() || scorecard.matchId == matchId) return scorecard
        return try {
            val update = db.from("scorecards").update(mapOf("match_id" to matchId)) {
                filter { eq("id", scorecard.id) }
            }
            if (postgrestWriteError(update.data) == null) scorecard.copy(matchId = matchId) else scorecard
        } catch (_: Exception) { scorecard }
    }

    private fun ScorecardHole.toInsertRow(): Map<String, Any> = mapOf(
        "scorecard_id" to scorecardId,
        "hole_number" to holeNumber,
        "par" to par,
        "strokes" to strokes,
        "score_to_par" to scoreToPar
    )
}

@Serializable
private data class PlayerIdRow(val id: String = "")

@Serializable
private data class ProfileNameRow(
    @SerialName("full_name") val fullName: String = ""
)

@Serializable
private data class RoundRefRow(
    val id: String = "",
    @SerialName("tournament_id") val tournamentId: String = ""
)

@Serializable
private data class CourseHoleCountRow(
    @SerialName("holes_count") val holesCount: Int? = null
)

@Serializable
private data class CourseHoleParRow(
    @SerialName("hole_number") val holeNumber: Int = 0,
    val par: Int = 4
)
