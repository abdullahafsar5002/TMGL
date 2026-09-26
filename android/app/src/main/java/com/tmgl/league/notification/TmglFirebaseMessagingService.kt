package com.tmgl.league.notification

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
import com.tmgl.league.data.offline.NotificationSettings
import com.tmgl.league.data.offline.OfflineCache
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class TmglFirebaseMessagingService : FirebaseMessagingService() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.w(
            TAG,
            "FCM token refreshed but was not registered. The player_devices table does not exist in the " +
                "database schema and there is no unique column set to resolve players.id for an onConflict " +
                "upsert, so a push registration write would always fail silently. Register this token " +
                "server side instead."
        )
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val title = message.notification?.title
            ?: message.data["title"]
            ?: getString(R.string.app_name)
        val body = message.notification?.body ?: message.data["body"].orEmpty()
        val screen = message.data["screen"]
        val screenId = message.data["screen_id"]

        serviceScope.launch {
            val settings = try {
                OfflineCache.readNotificationSettings(applicationContext)
            } catch (_: Exception) {
                OfflineCache.notificationSettings()
            }
            showNotification(title, body, screen, screenId, settings)
        }
    }

    private fun showNotification(
        title: String,
        body: String,
        screen: String?,
        screenId: String?,
        settings: NotificationSettings
    ) {
        if (!settings.notificationsEnabled) return

        NotificationHelper.createChannels(this)
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !notificationManager.areNotificationsEnabled()) return

        val notificationId = NotificationHelper.nextNotificationId()

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            screen?.takeIf { it.isNotBlank() }?.let { putExtra(NotificationHelper.EXTRA_NAVIGATE_TO, it) }
            screenId?.takeIf { it.isNotBlank() }?.let { putExtra(NotificationHelper.EXTRA_SCREEN_ID, it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = if (settings.soundEnabled && settings.vibrationEnabled) {
            NotificationHelper.CHANNEL_DEFAULT
        } else {
            NotificationHelper.CHANNEL_DEFAULT_SILENT
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setSilent(!settings.soundEnabled || !settings.vibrationEnabled)
            .build()

        notificationManager.notify(notificationId, notification)
    }

    companion object {
        private const val TAG = "TmglFcmService"
    }
}
