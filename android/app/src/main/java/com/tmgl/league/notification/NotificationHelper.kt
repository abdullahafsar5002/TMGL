package com.tmgl.league.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.tmgl.league.MainActivity

object NotificationHelper {
    const val CHANNEL_TOURNAMENTS = "tournaments"
    const val CHANNEL_SCORES = "scores"
    const val CHANNEL_MATCHES = "matches"

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val tournamentChannel = NotificationChannel(
                CHANNEL_TOURNAMENTS,
                "Tournaments",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "Tournament updates and round start notifications" }

            val scoresChannel = NotificationChannel(
                CHANNEL_SCORES,
                "Scores",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "Score updates and results" }

            val matchesChannel = NotificationChannel(
                CHANNEL_MATCHES,
                "Matches",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Match scheduling and opponent notifications" }

            manager.createNotificationChannels(listOf(tournamentChannel, scoresChannel, matchesChannel))
        }
    }

    fun showNotification(context: Context, channelId: String, title: String, message: String, deepLink: String? = null) {
        createChannels(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            deepLink?.let { data = android.net.Uri.parse(it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(System.currentTimeMillis().toInt(), notification)
    }

    fun notifyRoundStart(context: Context, tournamentName: String, roundName: String) {
        showNotification(
            context,
            CHANNEL_TOURNAMENTS,
            "Round Started",
            "$tournamentName - $roundName is now live!",
            "tmgl://tournaments"
        )
    }

    fun notifyScorePosted(context: Context, playerName: String, matchTitle: String) {
        showNotification(
            context,
            CHANNEL_SCORES,
            "Score Posted",
            "$playerName posted a score for $matchTitle",
            "tmgl://leaderboard"
        )
    }

    fun notifyMatchScheduled(context: Context, opponentName: String, matchDate: String) {
        showNotification(
            context,
            CHANNEL_MATCHES,
            "New Match",
            "You're matched against $opponentName on $matchDate",
            "tmgl://matches"
        )
    }
}
