package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Announcement
import com.tmgl.league.data.model.Notification
import io.github.jan.supabase.postgrest.from

class SocialRepository {
    private val db = SupabaseConfig.client

    suspend fun getNotifications(profileId: String): DataResult<List<Notification>> {
        return try {
            val data = db.from("notifications").select {
                filter { eq("recipient_id", profileId) }
                order("created_at", io.github.jan.supabase.postgrest.query.Order.DESCENDING)
            }.decodeList<Notification>()
            DataResult.Success(data.take(50))
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load notifications")
        }
    }

    suspend fun getUnreadCount(profileId: String): DataResult<Int> {
        return try {
            val all = db.from("notifications").select {
                filter {
                    eq("recipient_id", profileId)
                    eq("is_read", false)
                }
            }.decodeList<Notification>()
            DataResult.Success(all.size)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to count unread")
        }
    }

    suspend fun markAsRead(id: String): DataResult<Unit> {
        return try {
            db.from("notifications").update(
                mapOf("is_read" to true)
            ) { filter { eq("id", id) } }
            DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to mark as read")
        }
    }

    suspend fun markAllAsRead(profileId: String): DataResult<Unit> {
        return try {
            db.from("notifications").update(
                mapOf("is_read" to true)
            ) {
                filter {
                    eq("recipient_id", profileId)
                    eq("is_read", false)
                }
            }
            DataResult.Success(Unit)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to mark all as read")
        }
    }

    suspend fun getPublishedAnnouncements(): DataResult<List<Announcement>> {
        return try {
            val data = db.from("announcements").select {
                filter { eq("is_published", true) }
                order("created_at", io.github.jan.supabase.postgrest.query.Order.DESCENDING)
            }.decodeList<Announcement>()
            DataResult.Success(data)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load announcements")
        }
    }

    suspend fun getAnnouncement(id: String): DataResult<Announcement> {
        return try {
            val data = db.from("announcements").select {
                filter { eq("id", id) }
            }.decodeList<Announcement>().firstOrNull()
            if (data != null) DataResult.Success(data) else DataResult.Error("Announcement not found")
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load announcement")
        }
    }
}
