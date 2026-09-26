package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.model.Season
import com.tmgl.league.data.model.Tournament
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order

private const val TOURNAMENT_ROUND_STATUS = "scheduled"
private const val TOURNAMENT_DRAFT_STATUS = "draft"
private const val FIRST_ROUND_NAME = "Round 1"

class TournamentCreateRepository {
    private val db = SupabaseConfig.client

    suspend fun getCourses(): DataResult<List<Course>> {
        return try {
            val data = db.from("courses").select().decodeList<Course>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load courses")
        }
    }

    suspend fun getSeasons(): DataResult<List<Season>> {
        return try {
            val data = db.from("seasons").select {
                order("start_date", Order.DESCENDING, false)
            }.decodeList<Season>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load seasons")
        }
    }

    suspend fun createTournament(tournament: Tournament): DataResult<Tournament> {
        val name = tournament.name.trim()
        if (name.isEmpty()) return DataResult.Error("A tournament name is required")
        val seasonId = tournament.seasonId.trim()
        if (seasonId.isEmpty()) return DataResult.Error("Select the season for this tournament")

        return try {
            val payload = mutableMapOf<String, Any?>(
                "name" to name,
                "season_id" to seasonId,
                "status" to TOURNAMENT_DRAFT_STATUS
            )
            tournament.courseId?.takeIf { it.isNotBlank() }?.let { payload["course_id"] = it }
            tournament.description?.takeIf { it.isNotBlank() }?.let { payload["description"] = it }
            tournament.eventDate?.takeIf { it.isNotBlank() }?.let { payload["event_date"] = it }
            tournament.startDate?.takeIf { it.isNotBlank() }?.let { payload["start_date"] = it }
            tournament.endDate?.takeIf { it.isNotBlank() }?.let { payload["end_date"] = it }
            tournament.maxParticipants?.let { payload["max_participants"] = it }

            val created = db.from("tournaments").insert(payload) { select() }
            val insertError = postgrestWriteError(created.data)
            if (insertError != null) return DataResult.Error(insertError)

            val inserted = created.decodeList<Tournament>().firstOrNull()
                ?: return DataResult.Error("The tournament was saved but the server returned no record")
            val tournamentId = inserted.id
            if (tournamentId.isBlank()) {
                return DataResult.Error("The tournament was saved but no id was returned")
            }

            when (val round = createFirstRound(tournamentId, firstRoundDate(tournament))) {
                is DataResult.Success -> DataResult.Success(inserted)
                is DataResult.Error -> DataResult.Error(
                    "The tournament was created but $FIRST_ROUND_NAME could not be created: ${round.message}"
                )
            }
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to create tournament")
        }
    }

    private suspend fun createFirstRound(
        tournamentId: String,
        date: String?
    ): DataResult<Unit> {
        val payload = mutableMapOf<String, Any?>(
            "tournament_id" to tournamentId,
            "name" to FIRST_ROUND_NAME,
            "round_number" to 1,
            "status" to TOURNAMENT_ROUND_STATUS
        )
        if (date != null) payload["date"] = date

        return try {
            val created = db.from("rounds").insert(payload) { select() }
            val error = postgrestWriteError(created.data)
            if (error != null) DataResult.Error(error) else DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to create the first round")
        }
    }

    private fun firstRoundDate(tournament: Tournament): String? =
        tournament.eventDate?.takeIf { it.isNotBlank() }
            ?: tournament.startDate?.takeIf { it.isNotBlank() }
}
