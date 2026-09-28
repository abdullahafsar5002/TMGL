package com.tmgl.league.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.tmgl.league.MainActivity
import com.tmgl.league.R
import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.auth.SessionSync
import com.tmgl.league.data.repository.DeviceRepository
import io.github.jan.supabase.gotrue.auth
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class TmglFirebaseMessagingService : FirebaseMessagingService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        serviceScope.launch {
            registerToken(token)
        }
    }

    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val title = message.notification?.title ?: message.data["title"] ?: "TMGL"
        val body = message.notification?.body ?: message.data["body"] ?: ""
        val screen = message.data["screen"]
        val screenId = message.data["screen_id"]

        showNotification(title, body, screen, screenId)
    }

    private suspend fun registerToken(token: String) {
        try {
            val storage = EncryptedAuthStorage(applicationContext)
            if (SupabaseConfig.client.auth.currentSessionOrNull() == null) {
                SessionSync.importStoredSession(storage)
            }
            if (SessionSync.authUserId().isNullOrBlank()) {
                Log.w("TmglFcm", "No authenticated profile; skipping device registration")
                return
            }
            DeviceRepository(storage).registerToken(token)
        } catch (e: Exception) {
            Log.e("TmglFcm", "Device registration failed", e)
        }
    }

    private fun showNotification(title: String, body: String, screen: String?, screenId: String?) {
        val channelId = CHANNEL_ID
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

    private companion object {
        const val CHANNEL_ID = "tmgl_notifications"
    }
}
