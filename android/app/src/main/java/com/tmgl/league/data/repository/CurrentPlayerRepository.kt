package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.auth.SessionSync
import com.tmgl.league.data.model.Player
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.todayIn
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CurrentPlayerRepository @Inject constructor() {

    @Volatile
    private var cachedPlayerId: String? = null

    fun cachedPlayerId(): String? = cachedPlayerId

    fun clearCache() {
        cachedPlayerId = null
    }

    suspend fun getCurrentPlayerId(): String? = getCurrentPlayer()?.id

    suspend fun getCurrentPlayer(): Player? {
        cachedPlayerId?.let { return Player(id = it) }
        val authUserId = SessionSync.authUserId() ?: return null
        val existing = findByAuthUserId(authUserId)
        if (existing != null) {
            cachedPlayerId = existing.id
            return existing
        }
        val provisioned = provision(authUserId)
        cachedPlayerId = provisioned?.id
        return provisioned ?: findByAuthUserId(authUserId)
    }

    private suspend fun findByAuthUserId(authUserId: String): Player? {
        return try {
            SupabaseConfig.client.from("players")
                .select(Columns.raw(PLAYER_COLUMNS)) {
                    filter { eq("auth_user_id", authUserId) }
                }
                .decodeList<Player>()
                .firstOrNull()
        } catch (_: Exception) {
            null
        }
    }

    private suspend fun provision(authUserId: String): Player? {
        val profile = try {
            SupabaseConfig.client.from("profiles")
                .select(Columns.raw("id, full_name, email")) {
                    filter { eq("id", authUserId) }
                }
                .decodeList<ProfileLookup>()
                .firstOrNull()
        } catch (_: Exception) {
            null
        }
        return try {
            SupabaseConfig.client.from("players")
                .insert(
                    mapOf(
                        "auth_user_id" to authUserId,
                        "full_name" to (profile?.fullName?.takeIf { it.isNotBlank() } ?: "TMGL Player"),
                        "status" to "active",
                        "join_date" to Clock.System.todayIn(TimeZone.UTC).toString()
                    )
                ) { select() }
                .decodeList<Player>()
                .firstOrNull()
        } catch (_: Exception) {
            null
        }
    }

    private companion object {
        const val PLAYER_COLUMNS =
            "id, auth_user_id, full_name, phone, handicap_index, status, player_code, join_date, created_at, updated_at"
    }
}

@kotlinx.serialization.Serializable
internal data class ProfileLookup(
    val id: String = "",
    @kotlinx.serialization.SerialName("full_name") val fullName: String? = null,
    val email: String? = null
)
