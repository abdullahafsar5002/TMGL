package com.tmgl.league.notification

import android.app.NotificationChannel
import android.app.NotificationChannelGroup
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import com.tmgl.league.MainActivity
import com.tmgl.league.R

object NotificationHelper {
    const val CHANNEL_TOURNAMENTS = "tournaments"
    const val CHANNEL_SCORES = "scores"
    const val CHANNEL_MATCHES = "matches"
    const val CHANNEL_ANNOUNCEMENTS = "announcements"
    const val CHANNEL_LIVE = "live_scoring"

    const val GROUP_TOURNAMENTS = "group_tournaments"
    const val GROUP_SCORES = "group_scores"
    const val GROUP_MATCHES = "group_matches"
    const val GROUP_ANNOUNCEMENTS = "group_announcements"

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // Create groups
            val tournamentGroup = NotificationChannelGroup(GROUP_TOURNAMENTS, "Tournaments")
            val scoresGroup = NotificationChannelGroup(GROUP_SCORES, "Scores")
            val matchesGroup = NotificationChannelGroup(GROUP_MATCHES, "Matches")
            val announcementsGroup = NotificationChannelGroup(GROUP_ANNOUNCEMENTS, "Announcements")

            manager.createNotificationChannelGroups(listOf(
                tournamentGroup, scoresGroup, matchesGroup, announcementsGroup
            ))

            val defaultSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build()

            // Tournament channel
            val tournamentChannel = NotificationChannel(
                CHANNEL_TOURNAMENTS,
                "Tournaments",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Tournament updates and round start notifications"
                group = GROUP_TOURNAMENTS
                setShowBadge(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 200)
                setSound(defaultSound, audioAttributes)
            }

            // Scores channel
            val scoresChannel = NotificationChannel(
                CHANNEL_SCORES,
                "Scores",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Score updates and results"
                group = GROUP_SCORES
                setShowBadge(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 100)
                setSound(defaultSound, audioAttributes)
            }

            // Matches channel
            val matchesChannel = NotificationChannel(
                CHANNEL_MATCHES,
                "Matches",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Match scheduling and opponent notifications"
                group = GROUP_MATCHES
                setShowBadge(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 100, 300)
                setSound(defaultSound, audioAttributes)
            }

            // Announcements channel
            val announcementsChannel = NotificationChannel(
                CHANNEL_ANNOUNCEMENTS,
                "Announcements",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "League announcements and news"
                group = GROUP_ANNOUNCEMENTS
                setShowBadge(true)
            }

            // Live scoring channel (silent, for real-time updates)
            val liveChannel = NotificationChannel(
                CHANNEL_LIVE,
                "Live Scoring",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Real-time scoring updates"
                group = GROUP_SCORES
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }

            manager.createNotificationChannels(listOf(
                tournamentChannel, scoresChannel, matchesChannel, announcementsChannel, liveChannel
            ))
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
        notificationId: Int = System.currentTimeMillis().toInt()
    ) {
        createChannels(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            deepLink?.let { data = android.net.Uri.parse(it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.logo)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)

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

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(notificationId, builder.build())
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

    fun notifyScorePosted(context: Context, playerName: String, matchTitle: String, tournamentId: String) {
        showNotification(
            context,
            CHANNEL_SCORES,
            "Score Posted",
            "$playerName posted a score for $matchTitle",
            "tmgl://tournament_leaderboard/$tournamentId",
            GROUP_SCORES
        )
    }

    fun notifyMatchScheduled(context: Context, opponentName: String, matchDate: String, matchId: String) {
        showNotification(
            context,
            CHANNEL_MATCHES,
            "New Match",
            "You're matched against $opponentName on $matchDate",
            "tmgl://matches/$matchId",
            GROUP_MATCHES
        )
    }

    fun notifyMatchReminder(context: Context, opponentName: String, matchTime: String, matchId: String) {
        showNotification(
            context,
            CHANNEL_MATCHES,
            "Match Reminder",
            "Your match against $opponentName starts at $matchTime",
            "tmgl://matches/$matchId",
            GROUP_MATCHES
        )
    }

    fun notifyTournamentReminder(context: Context, tournamentName: String, daysLeft: Int, tournamentId: String) {
        showNotification(
            context,
            CHANNEL_TOURNAMENTS,
            "Tournament Ending Soon",
            "$tournamentName ends in $daysLeft day(s)",
            "tmgl://tournaments/$tournamentId",
            GROUP_TOURNAMENTS
        )
    }

    fun notifyAnnouncement(context: Context, title: String, message: String, announcementId: String) {
        showNotification(
            context,
            CHANNEL_ANNOUNCEMENTS,
            title,
            message,
            "tmgl://announcements/$announcementId",
            GROUP_ANNOUNCEMENTS
        )
    }

    fun notifyHandicapUpdated(context: Context, newHandicap: String) {
        showNotification(
            context,
            CHANNEL_SCORES,
            "Handicap Updated",
            "Your new handicap index is $newHandicap",
            "tmgl://profile",
            GROUP_SCORES
        )
    }

    fun notifyLiveUpdate(context: Context, tournamentName: String, playerName: String, score: String) {
        showNotification(
            context,
            CHANNEL_LIVE,
            tournamentName,
            "$playerName: $score",
            "tmgl://live_leaderboard",
            GROUP_SCORES
        )
    }

    fun cancelAllNotifications(context: Context) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancelAll()
    }

    fun cancelNotification(context: Context, notificationId: Int) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.cancel(notificationId)
    }
}
