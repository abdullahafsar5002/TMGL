package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.*
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.serialization.Serializable

sealed class DataResult<T> {
    data class Success<T>(val data: T) : DataResult<T>()
    data class Error<T>(val message: String) : DataResult<T>()
}

class LeagueRepository {
    private val db = SupabaseConfig.client

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

    suspend fun getPlayerByProfileId(profileId: String): DataResult<Player> {
        if (profileId.isBlank()) return DataResult.Error("No signed-in player")
        return try {
            val data = db.from("players").select {
                filter { eq("profile_id", profileId) }
            }.decodeList<Player>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Player not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load player")
        }
    }

    suspend fun updatePlayerContact(
        profileId: String,
        phone: String?,
        handicapIndex: Double?
    ): DataResult<Unit> {
        if (profileId.isBlank()) return DataResult.Error("No signed-in player")
        return try {
            val playerId = db.from("players").select(Columns.raw("id")) {
                filter { eq("profile_id", profileId) }
            }.decodeList<PlayerProfileIdRow>().firstOrNull()?.id
                ?: return DataResult.Error("No player record is linked to this account")

            val updated = db.from("players").update({
                if (phone.isNullOrBlank()) setToNull("phone") else set("phone", phone)
                if (handicapIndex == null) setToNull("handicap_index") else set("handicap_index", handicapIndex)
            }) {
                filter { eq("id", playerId) }
            }
            val error = postgrestWriteError(updated.data)
            if (error != null) DataResult.Error(error) else DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to save your player details")
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
}

@Serializable
private data class PlayerProfileIdRow(val id: String = "")
