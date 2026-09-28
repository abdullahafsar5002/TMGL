package com.tmgl.league.data.repository

import com.google.firebase.messaging.FirebaseMessaging
import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.auth.SessionSync
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.datetime.Clock
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class PlayerDevice(
    val id: String? = null,
    @SerialName("profile_id") val profileId: String? = null,
    @SerialName("fcm_token") val fcmToken: String? = null,
    val platform: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Singleton
class DeviceRepository @Inject constructor(
    private val storage: EncryptedAuthStorage
) {

    suspend fun registerToken(token: String): Boolean {
        val profileId = resolveProfileId() ?: return false
        return try {
            val existing = SupabaseConfig.client.from("player_devices")
                .select(Columns.raw("id, profile_id, fcm_token, platform, updated_at")) {
                    filter { eq("profile_id", profileId) }
                    filter { eq("platform", PLATFORM) }
                }
                .decodeList<PlayerDevice>()
                .firstOrNull()
            val timestamp = Clock.System.now().toString()
            if (existing?.id != null) {
                SupabaseConfig.client.from("player_devices")
                    .update(
                        mapOf(
                            "fcm_token" to token,
                            "platform" to PLATFORM,
                            "updated_at" to timestamp
                        )
                    ) { filter { eq("id", existing.id) } }
            } else {
                SupabaseConfig.client.from("player_devices")
                    .insert(
                        mapOf(
                            "profile_id" to profileId,
                            "fcm_token" to token,
                            "platform" to PLATFORM,
                            "updated_at" to timestamp
                        )
                    )
            }
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun registerCurrentToken(): Boolean {
        val token = fetchToken() ?: return false
        return registerToken(token)
    }

    suspend fun unregisterCurrentToken(): Boolean {
        val profileId = SessionSync.authUserId() ?: return false
        if (SupabaseConfig.client.auth.currentSessionOrNull() == null) return false
        return try {
            SupabaseConfig.client.from("player_devices")
                .delete {
                    filter { eq("profile_id", profileId) }
                    filter { eq("platform", PLATFORM) }
                }
            true
        } catch (_: Exception) {
            false
        }
    }

    private suspend fun resolveProfileId(): String? {
        SessionSync.authUserId()?.let { return it }
        val restored = SessionSync.restore(storage)
        return if (restored) SessionSync.authUserId() else null
    }

    private suspend fun fetchToken(): String? = suspendCancellableCoroutine { continuation ->
        try {
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token ->
                    if (continuation.isActive) continuation.resume(token)
                }
                .addOnFailureListener { error ->
                    if (continuation.isActive) continuation.resumeWithException(error)
                }
        } catch (error: Exception) {
            if (continuation.isActive) continuation.resumeWithException(error)
        }
    }

    private companion object {
        const val PLATFORM = "android"
    }
}
