package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.*
import io.github.jan.supabase.postgrest.from

class PracticeRepository {
    private val db = SupabaseConfig.client

    suspend fun getPracticeRoundsByPlayer(playerId: String): DataResult<List<PracticeRound>> {
        return try {
            val data = db.from("practice_rounds").select {
                filter { eq("player_id", playerId) }
            }.decodeList<PracticeRound>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load practice rounds")
        }
    }

    suspend fun getPracticeRound(id: String): DataResult<PracticeRound> {
        return try {
            val data = db.from("practice_rounds").select {
                filter { eq("id", id) }
            }.decodeList<PracticeRound>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Practice round not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load practice round")
        }
    }

    suspend fun createPracticeRound(round: PracticeRound): DataResult<PracticeRound> {
        return try {
            val data = db.from("practice_rounds").insert(round) { select() }.decodeList<PracticeRound>().first()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to create practice round")
        }
    }

    suspend fun deletePracticeRound(id: String): DataResult<Unit> {
        return try {
            db.from("practice_rounds").delete { filter { eq("id", id) } }
            DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to delete practice round")
        }
    }

    suspend fun getPracticeScores(roundId: String): DataResult<List<PracticeScore>> {
        return try {
            val data = db.from("practice_scores").select {
                filter { eq("practice_round_id", roundId) }
            }.decodeList<PracticeScore>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load practice scores")
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

    suspend fun getCourseHoles(courseId: String): DataResult<List<CourseHole>> {
        return try {
            val data = db.from("course_holes").select {
                filter { eq("course_id", courseId) }
            }.decodeList<CourseHole>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load course holes")
        }
    }

    suspend fun getPlayerByProfileId(profileId: String): DataResult<Player> {
        return try {
            val data = db.from("players").select {
                filter { eq("profile_id", profileId) }
            }.decodeList<Player>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Player profile not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load player profile")
        }
    }
}
