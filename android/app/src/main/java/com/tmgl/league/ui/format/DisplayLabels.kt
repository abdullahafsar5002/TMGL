package com.tmgl.league.ui.format

import com.tmgl.league.data.model.FriendlyMatchStatus
import com.tmgl.league.data.model.InvitationStatus
import com.tmgl.league.data.model.MatchStatus
import com.tmgl.league.data.model.PracticeRoundStatus
import com.tmgl.league.data.model.ScorecardStatus
import com.tmgl.league.data.model.SeasonStatus
import com.tmgl.league.data.model.TournamentStatus
import com.tmgl.league.data.model.UserRole
import java.util.Locale

val TournamentStatus.displayLabel: String
    get() = when (this) {
        TournamentStatus.DRAFT -> "Draft"
        TournamentStatus.OPEN -> "Registration open"
        TournamentStatus.CLOSED -> "Registration closed"
        TournamentStatus.LIVE -> "Live"
        TournamentStatus.COMPLETED -> "Completed"
        TournamentStatus.CANCELLED -> "Cancelled"
    }

val TournamentStatus.statusDescription: String
    get() = when (this) {
        TournamentStatus.DRAFT -> "This tournament is still a draft and is not open to players yet."
        TournamentStatus.OPEN -> "Registration is open. Players can join until the tournament goes live."
        TournamentStatus.CLOSED -> "Registration is closed. No new players can join this tournament."
        TournamentStatus.LIVE -> "This tournament is in progress. Scores are being recorded live."
        TournamentStatus.COMPLETED -> "This tournament has finished and the final results are in."
        TournamentStatus.CANCELLED -> "This tournament was cancelled and is no longer running."
    }

val MatchStatus.displayLabel: String
    get() = when (this) {
        MatchStatus.SCHEDULED -> "Scheduled"
        MatchStatus.LIVE -> "In progress"
        MatchStatus.COMPLETED -> "Completed"
        MatchStatus.CANCELLED -> "Cancelled"
    }

val ScorecardStatus.displayLabel: String
    get() = when (this) {
        ScorecardStatus.DRAFT -> "Draft"
        ScorecardStatus.IN_PROGRESS -> "In progress"
        ScorecardStatus.SUBMITTED -> "Submitted"
        ScorecardStatus.VERIFIED -> "Verified"
        ScorecardStatus.REJECTED -> "Rejected"
        ScorecardStatus.AMENDED -> "Amended"
    }

val PracticeRoundStatus.displayLabel: String
    get() = when (this) {
        PracticeRoundStatus.DRAFT -> "Not started"
        PracticeRoundStatus.IN_PROGRESS -> "In progress"
        PracticeRoundStatus.COMPLETED -> "Completed"
        PracticeRoundStatus.CANCELLED -> "Cancelled"
    }

val FriendlyMatchStatus.displayLabel: String
    get() = when (this) {
        FriendlyMatchStatus.PENDING -> "Pending"
        FriendlyMatchStatus.ACTIVE -> "Active"
        FriendlyMatchStatus.COMPLETED -> "Completed"
        FriendlyMatchStatus.CANCELLED -> "Cancelled"
    }

val InvitationStatus.displayLabel: String
    get() = when (this) {
        InvitationStatus.PENDING -> "Pending"
        InvitationStatus.ACCEPTED -> "Accepted"
        InvitationStatus.REJECTED -> "Declined"
        InvitationStatus.CANCELLED -> "Cancelled"
    }

val SeasonStatus.displayLabel: String
    get() = when (this) {
        SeasonStatus.DRAFT -> "Draft"
        SeasonStatus.ACTIVE -> "Active"
        SeasonStatus.COMPLETED -> "Completed"
        SeasonStatus.ARCHIVED -> "Archived"
    }

val UserRole.displayLabel: String
    get() = when (this) {
        UserRole.SUPER_ADMIN -> "Super admin"
        UserRole.LEAGUE_MANAGER -> "League manager"
        UserRole.PLAYER -> "Player"
        UserRole.PUBLIC -> "Public"
    }

fun formatOneDecimal(value: Double, locale: Locale = Locale.getDefault()): String =
    String.format(locale, "%.1f", value)

fun formatZeroDecimal(value: Double, locale: Locale = Locale.getDefault()): String =
    String.format(locale, "%.0f", value)

fun formatPaddedClock(hour: Int, minute: Int, locale: Locale = Locale.getDefault()): String =
    String.format(locale, "%02d:%02d", hour, minute)
