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
            val created = db.from("practice_rounds").insert(round) { select() }
            val error = postgrestWriteError(created.data)
            if (error != null) {
                DataResult.Error(error)
            } else {
                val created2 = created.decodeList<PracticeRound>().firstOrNull()
                if (created2 != null) {
                    DataResult.Success(created2)
                } else {
                    DataResult.Error("The practice round was saved but the server returned no record")
                }
            }
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to create practice round")
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
