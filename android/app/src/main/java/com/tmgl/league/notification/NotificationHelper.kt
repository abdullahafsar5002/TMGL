package com.tmgl.league.notification

import android.app.NotificationChannel
import android.app.NotificationChannelGroup
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import androidx.core.net.toUri
import com.tmgl.league.MainActivity
import com.tmgl.league.R
import com.tmgl.league.data.offline.NotificationSettings
import com.tmgl.league.data.offline.OfflineCache
import java.util.concurrent.atomic.AtomicInteger

object NotificationHelper {
    const val CHANNEL_TOURNAMENTS = "tournaments"
    const val CHANNEL_SCORES = "scores"
    const val CHANNEL_MATCHES = "matches"
    const val CHANNEL_ANNOUNCEMENTS = "announcements"
    const val CHANNEL_LIVE = "live_scoring"
    const val CHANNEL_DEFAULT = "tmgl_notifications"
    const val CHANNEL_DEFAULT_SILENT = "tmgl_notifications_silent"

    const val GROUP_TOURNAMENTS = "group_tournaments"
    const val GROUP_SCORES = "group_scores"
    const val GROUP_MATCHES = "group_matches"
    const val GROUP_ANNOUNCEMENTS = "group_announcements"

    const val EXTRA_NAVIGATE_TO = "navigate_to"
    const val EXTRA_SCREEN_ID = "screen_id"

    private const val SILENT_SUFFIX = "_silent"

    private val requestCodeCounter = AtomicInteger(0)

    private data class ChannelSpec(
        val id: String,
        val name: String,
        val group: String,
        val importance: Int,
        val description: String,
        val vibrate: Boolean = true,
        val vibrationPattern: LongArray? = null,
        val badge: Boolean = true
    )

    private val channelSpecs = listOf(
        ChannelSpec(
            id = CHANNEL_TOURNAMENTS,
            name = "Tournaments",
            group = GROUP_TOURNAMENTS,
            importance = NotificationManager.IMPORTANCE_DEFAULT,
            description = "Tournament updates and round start notifications",
            vibrationPattern = longArrayOf(0, 200)
        ),
        ChannelSpec(
            id = CHANNEL_SCORES,
            name = "Scores",
            group = GROUP_SCORES,
            importance = NotificationManager.IMPORTANCE_DEFAULT,
            description = "Score updates and results",
            vibrationPattern = longArrayOf(0, 100)
        ),
        ChannelSpec(
            id = CHANNEL_MATCHES,
            name = "Matches",
            group = GROUP_MATCHES,
            importance = NotificationManager.IMPORTANCE_HIGH,
            description = "Match scheduling and opponent notifications",
            vibrationPattern = longArrayOf(0, 300, 100, 300)
        ),
        ChannelSpec(
            id = CHANNEL_ANNOUNCEMENTS,
            name = "Announcements",
            group = GROUP_ANNOUNCEMENTS,
            importance = NotificationManager.IMPORTANCE_LOW,
            description = "League announcements and news",
            vibrate = false
        ),
        ChannelSpec(
            id = CHANNEL_LIVE,
            name = "Live Scoring",
            group = GROUP_SCORES,
            importance = NotificationManager.IMPORTANCE_LOW,
            description = "Real-time scoring updates",
            vibrate = false,
            badge = false
        ),
        ChannelSpec(
            id = CHANNEL_DEFAULT,
            name = "TMGL Notifications",
            group = GROUP_SCORES,
            importance = NotificationManager.IMPORTANCE_DEFAULT,
            description = "Tournament and match notifications",
            vibrationPattern = longArrayOf(0, 150)
        )
    )

    fun nextNotificationId(): Int {
        val next = requestCodeCounter.updateAndGet { current -> if (current == Int.MAX_VALUE) 1 else current + 1 }
        return if (next == 0) 1 else next
    }

    suspend fun refreshPreferences(context: Context): NotificationSettings = try {
        OfflineCache.readNotificationSettings(context)
    } catch (_: Exception) {
        OfflineCache.notificationSettings()
    }

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        manager.createNotificationChannelGroups(listOf(
            NotificationChannelGroup(GROUP_TOURNAMENTS, "Tournaments"),
            NotificationChannelGroup(GROUP_SCORES, "Scores"),
            NotificationChannelGroup(GROUP_MATCHES, "Matches"),
            NotificationChannelGroup(GROUP_ANNOUNCEMENTS, "Announcements")
        ))

        val defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val audioAttributes = AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build()

        val channels = buildList {
            channelSpecs.forEach { spec ->
                add(buildChannel(spec, "", defaultSound, audioAttributes, withSound = true))
                add(buildChannel(spec, SILENT_SUFFIX, defaultSound, audioAttributes, withSound = false))
            }
        }
        manager.createNotificationChannels(channels)
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun buildChannel(
        spec: ChannelSpec,
        idSuffix: String,
        defaultSound: Uri?,
        audioAttributes: AudioAttributes?,
        withSound: Boolean
    ): NotificationChannel = NotificationChannel(spec.id + idSuffix, spec.name, spec.importance).apply {
        this.description = spec.description
        this.group = spec.group
        this.setShowBadge(spec.badge)
        if (spec.vibrate) {
            this.enableVibration(true)
            spec.vibrationPattern?.let { this.vibrationPattern = it }
        } else {
            this.enableVibration(false)
            this.vibrationPattern = null
        }
        if (withSound && defaultSound != null && audioAttributes != null) {
            this.setSound(defaultSound, audioAttributes)
        } else {
            this.setSound(null, null)
        }
    }

    fun showNotification(
        context: Context,
        channelId: String,
        title: String,
        message: String,
        deepLink: String? = null,
        groupKey: String? = null,
        isGroupSummary: Boolean = false,
        notificationId: Int = nextNotificationId()
    ) {
        val settings = OfflineCache.notificationSettings()
        if (!settings.notificationsEnabled) return

        createChannels(context)

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !manager.areNotificationsEnabled()) return

        val pendingIntent = buildPendingIntent(context, deepLink, notificationId)
        val withSound = settings.soundEnabled
        val withVibration = settings.vibrationEnabled

        val builder = NotificationCompat.Builder(context, effectiveChannel(channelId, withSound, withVibration))
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setSilent(!withSound || !withVibration)
        } else {
            var defaults = 0
            if (withSound) defaults = defaults or NotificationCompat.DEFAULT_SOUND
            if (withVibration) defaults = defaults or NotificationCompat.DEFAULT_VIBRATE
            builder.setDefaults(defaults)
            if (!withSound) {
                @Suppress("DEPRECATION")
                builder.setSound(null)
            }
            if (!withVibration) {
                @Suppress("DEPRECATION")
                builder.setVibrate(null)
            }
        }

        if (groupKey != null) {
            builder.setGroup(groupKey)
        }

        if (isGroupSummary) {
            builder.setGroupSummary(true)
            builder.setStyle(
                NotificationCompat.InboxStyle()
                    .setBigContentTitle(title)
            )
        }

        manager.notify(notificationId, builder.build())
    }

    private fun effectiveChannel(channelId: String, withSound: Boolean, withVibration: Boolean): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && (!withSound || !withVibration)) {
            return channelId + SILENT_SUFFIX
        }
        return channelId
    }

    private fun buildPendingIntent(context: Context, deepLink: String?, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            deepLink?.takeIf { it.isNotBlank() }?.let { data = it.toUri() }
        }
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    fun notifyRoundStart(context: Context, tournamentName: String, roundName: String, tournamentId: String) {
        showNotification(
            context,
            CHANNEL_TOURNAMENTS,
            "Round Started",
            "$tournamentName - $roundName is now live!",
            "tmgl://tournaments/$tournamentId",
            GROUP_TOURNAMENTS
        )
    }
}
