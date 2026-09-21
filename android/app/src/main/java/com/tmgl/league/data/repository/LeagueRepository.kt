package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.*
import io.github.jan.supabase.postgrest.from

sealed class DataResult<T> {
    data class Success<T>(val data: T) : DataResult<T>()
    data class Error<T>(val message: String) : DataResult<T>()
}

class LeagueRepository {
    private val db = SupabaseConfig.client

    suspend fun getSeasons(): DataResult<List<Season>> {
        return try {
            val data = db.from("seasons").select().decodeList<Season>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load seasons")
        }
    }

    suspend fun getSeason(id: String): DataResult<Season> {
        return try {
            val data = db.from("seasons").select {
                filter { eq("id", id) }
            }.decodeList<Season>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Season not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load season")
        }
    }

    suspend fun getPlayers(): DataResult<List<Player>> {
        return try {
            val data = db.from("players").select().decodeList<Player>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load players")
        }
    }

    suspend fun getPlayer(id: String): DataResult<Player> {
        return try {
            val data = db.from("players").select {
                filter { eq("id", id) }
            }.decodeList<Player>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Player not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load player")
        }
    }

    suspend fun getTeams(): DataResult<List<Team>> {
        return try {
            val data = db.from("teams").select().decodeList<Team>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load teams")
        }
    }

    suspend fun getTeam(id: String): DataResult<Team> {
        return try {
            val data = db.from("teams").select {
                filter { eq("id", id) }
            }.decodeList<Team>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Team not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load team")
        }
    }

    suspend fun getTeamMembers(teamId: String): DataResult<List<TeamMember>> {
        return try {
            val data = db.from("team_members").select {
                filter { eq("team_id", teamId) }
            }.decodeList<TeamMember>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load team members")
        }
    }

    suspend fun getDivisions(): DataResult<List<Division>> {
        return try {
            val data = db.from("divisions").select().decodeList<Division>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load divisions")
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
}
