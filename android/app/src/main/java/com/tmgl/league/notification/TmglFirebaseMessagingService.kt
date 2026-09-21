package com.tmgl.league.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.tmgl.league.MainActivity
import com.tmgl.league.R
import com.tmgl.league.data.SupabaseConfig
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.runBlocking
import kotlinx.datetime.Clock

class TmglFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        try {
            runBlocking {
                SupabaseConfig.client.from("player_devices").upsert(
                    mapOf(
                        "player_id" to SupabaseConfig.client.auth.currentUserOrNull()?.id,
                        "fcm_token" to token,
                        "platform" to "android",
                        "updated_at" to Clock.System.now().toString()
                    )
                )
            }
        } catch (_: Exception) { }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        
        val title = message.notification?.title ?: message.data["title"] ?: "TMGL"
        val body = message.notification?.body ?: message.data["body"] ?: ""
        val screen = message.data["screen"]
        val screenId = message.data["screen_id"]

        showNotification(title, body, screen, screenId)
    }

    private fun showNotification(title: String, body: String, screen: String?, screenId: String?) {
        val channelId = "tmgl_notifications"
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "TMGL Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Tournament and match notifications"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            screen?.let { putExtra("navigate_to", it) }
            screenId?.let { putExtra("screen_id", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
