package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.*
import io.github.jan.supabase.postgrest.from

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

    suspend fun createTournament(tournament: Tournament): DataResult<Tournament> {
        return try {
            val payload = mutableMapOf<String, Any?>(
                "name" to tournament.name,
                "status" to "draft"
            )
            tournament.courseId?.let { payload["course_id"] = it }
            val data = db.from("tournaments").insert(payload) { select() }.decodeList<Tournament>().first()
            try {
                val roundPayload = mapOf<String, Any?>(
                    "tournament_id" to data.id,
                    "name" to "Round 1",
                    "round_number" to 1,
                    "status" to "draft"
                )
                db.from("rounds").insert(roundPayload)
            } catch (_: Exception) {}
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to create tournament")
        }
    }
}
