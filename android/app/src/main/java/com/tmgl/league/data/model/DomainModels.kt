package com.tmgl.league.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.EncodeDefault

@Serializable
enum class UserRole {
    @SerialName("super_admin") SUPER_ADMIN,
    @SerialName("league_manager") LEAGUE_MANAGER,
    @SerialName("player") PLAYER,
    @SerialName("public") PUBLIC
}

@Serializable
enum class SeasonStatus {
    @SerialName("draft") DRAFT,
    @SerialName("active") ACTIVE,
    @SerialName("completed") COMPLETED,
    @SerialName("archived") ARCHIVED
}

@Serializable
enum class TournamentStatus {
    @SerialName("draft") DRAFT,
    @SerialName("open") OPEN,
    @SerialName("closed") CLOSED,
    @SerialName("live") LIVE,
    @SerialName("completed") COMPLETED,
    @SerialName("cancelled") CANCELLED
}

@Serializable
enum class MatchStatus {
    @SerialName("draft") DRAFT,
    @SerialName("scheduled") SCHEDULED,
    @SerialName("live") LIVE,
    @SerialName("completed") COMPLETED,
    @SerialName("cancelled") CANCELLED
}

@Serializable
enum class ScorecardStatus {
    @SerialName("draft") DRAFT,
    @SerialName("in_progress") IN_PROGRESS,
    @SerialName("submitted") SUBMITTED,
    @SerialName("verified") VERIFIED,
    @SerialName("rejected") REJECTED,
    @SerialName("amended") AMENDED
}

@Serializable
enum class MatchType {
    @SerialName("singles") SINGLES,
    @SerialName("foursome") FOURSOME,
    @SerialName("fourball") FOURBALL,
    @SerialName("team") TEAM
}

@Serializable
data class Profile(
    val id: String = "",
    @SerialName("full_name") val fullName: String = "",
    val phone: String? = null,
    @SerialName("handicap_index") val handicapIndex: Double? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val role: UserRole = UserRole.PUBLIC,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class Season(
    val id: String = "",
    val name: String = "",
    @SerialName("start_date") val startDate: String? = null,
    @SerialName("end_date") val endDate: String? = null,
    val status: SeasonStatus = SeasonStatus.DRAFT,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class Division(
    val id: String = "",
    val name: String = "",
    @SerialName("season_id") val seasonId: String = "",
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class Player(
    val id: String = "",
    @SerialName("full_name") val fullName: String = "",
    val phone: String? = null,
    @SerialName("handicap_index") val handicapIndex: Double? = null,
    val status: String = "active",
    @SerialName("player_code") val playerCode: String? = null,
    @SerialName("join_date") val joinDate: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class Team(
    val id: String = "",
    val name: String = "",
    @SerialName("season_id") val seasonId: String = "",
    @SerialName("division_id") val divisionId: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class TeamMember(
    val id: String = "",
    @SerialName("team_id") val teamId: String = "",
    @SerialName("player_id") val playerId: String = "",
    @SerialName("joined_at") val joinedAt: String = ""
)

@Serializable
data class Course(
    val id: String = "",
    val name: String = "",
    val location: String? = null,
    @SerialName("holes_count") val holesCount: Int = 18,
    @SerialName("course_rating") val courseRating: Double? = null,
    @SerialName("slope_rating") val slopeRating: Double? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = "",
    val city: String = "",
    val state: String = "",
    val country: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val numHoles: Int = 18,
    val par: Int = 72,
    val rating: Double = 0.0,
    val slope: Int = 0,
    val website: String = "",
    val phone: String = "",
    val holes: List<CourseHole> = emptyList()
)

@Serializable
data class CourseHole(
    val id: String = "",
    @SerialName("course_id") val courseId: String = "",
    @SerialName("hole_number") val holeNumber: Int = 0,
    val par: Int = 4,
    @SerialName("handicap_index") val handicapIndex: Int? = null,
    val yardage: Int? = null,
    @SerialName("created_at") val createdAt: String = "",
    val teeBoxes: List<TeeBox> = emptyList(),
    val description: String = ""
)

@Serializable
data class Tournament(
    val id: String = "",
    val name: String = "",
    @SerialName("course_id") val courseId: String? = null,
    val status: TournamentStatus = TournamentStatus.DRAFT,
    @SerialName("start_date") val startDate: String? = null,
    @SerialName("end_date") val endDate: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class Round(
    val id: String = "",
    @SerialName("tournament_id") val tournamentId: String = "",
    val name: String = "",
    @SerialName("round_number") val roundNumber: Int = 1,
    val date: String? = null,
    val status: String = "draft",
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class Match(
    val id: String = "",
    @SerialName("round_id") val roundId: String = "",
    @SerialName("match_type") val matchType: String = "singles",
    @SerialName("player_a_id") val playerAId: String? = null,
    @SerialName("player_b_id") val playerBId: String? = null,
    @SerialName("team_a_id") val teamAId: String? = null,
    @SerialName("team_b_id") val teamBId: String? = null,
    val status: MatchStatus = MatchStatus.DRAFT,
    @SerialName("winner_player_id") val winnerPlayerId: String? = null,
    @SerialName("winner_team_id") val winnerTeamId: String? = null,
    @SerialName("match_number") val matchNumber: Int = 0,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class Scorecard(
    val id: String = "",
    @SerialName("round_id") val roundId: String = "",
    @SerialName("player_id") val playerId: String = "",
    @SerialName("match_id") val matchId: String? = null,
    @SerialName("course_id") val courseId: String? = null,
    val status: ScorecardStatus = ScorecardStatus.DRAFT,
    @SerialName("total_strokes") val totalStrokes: Int? = null,
    @SerialName("total_score_to_par") val totalScoreToPar: Int? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class ScorecardHole(
    val id: String = "",
    @SerialName("scorecard_id") val scorecardId: String = "",
    @SerialName("hole_number") val holeNumber: Int = 0,
    @EncodeDefault val par: Int = 4,
    val strokes: Int = 0,
    @SerialName("score_to_par") val scoreToPar: Int = 0,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class LeaderboardEntry(
    @SerialName("player_id") val playerId: String = "",
    @SerialName("player_name") val playerName: String = "",
    @SerialName("team_name") val teamName: String? = null,
    @SerialName("total_strokes") val totalStrokes: Int = 0,
    @SerialName("total_score_to_par") val totalScoreToPar: Int = 0,
    val position: Int = 0,
    @SerialName("scorecard_status") val scorecardStatus: String? = null,
    @SerialName("scorecard_id") val scorecardId: String? = null
)

@Serializable
enum class FriendlyMatchStatus {
    @SerialName("pending") PENDING,
    @SerialName("accepted") ACCEPTED,
    @SerialName("in_progress") IN_PROGRESS,
    @SerialName("completed") COMPLETED,
    @SerialName("cancelled") CANCELLED
}

@Serializable
enum class InvitationStatus {
    @SerialName("pending") PENDING,
    @SerialName("accepted") ACCEPTED,
    @SerialName("declined") DECLINED
}

@Serializable
data class FriendlyMatch(
    val id: String = "",
    @SerialName("creator_id") val creatorId: String = "",
    @SerialName("course_id") val courseId: String = "",
    val title: String = "",
    val description: String? = null,
    @SerialName("match_format") val matchFormat: String = "stroke_play",
    @SerialName("round_type") val roundType: Int = 18,
    val status: FriendlyMatchStatus = FriendlyMatchStatus.PENDING,
    @SerialName("scheduled_at") val scheduledAt: String? = null,
    @SerialName("started_at") val startedAt: String? = null,
    @SerialName("completed_at") val completedAt: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class FriendlyMatchPlayer(
    val id: String = "",
    @SerialName("match_id") val matchId: String = "",
    @SerialName("player_id") val playerId: String = "",
    @SerialName("invitation_status") val invitationStatus: InvitationStatus = InvitationStatus.PENDING,
    val score: Int? = null,
    @SerialName("to_par") val toPar: Int? = null,
    val position: Int? = null,
    @SerialName("joined_at") val joinedAt: String? = null,
    @SerialName("created_at") val createdAt: String = ""
)

@Serializable
data class Notification(
    val id: String = "",
    @SerialName("recipient_id") val recipientId: String = "",
    val type: String = "system",
    val title: String = "",
    val message: String = "",
    @SerialName("related_entity") val relatedEntity: String? = null,
    @SerialName("related_id") val relatedId: String? = null,
    @SerialName("is_read") val isRead: Boolean = false,
    @SerialName("created_at") val createdAt: String = ""
)

@Serializable
data class Announcement(
    val id: String = "",
    @SerialName("author_id") val authorId: String = "",
    val title: String = "",
    val content: String = "",
    @SerialName("is_published") val isPublished: Boolean = false,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
enum class PracticeRoundStatus {
    @SerialName("draft") DRAFT,
    @SerialName("in_progress") IN_PROGRESS,
    @SerialName("completed") COMPLETED,
    @SerialName("cancelled") CANCELLED
}

@Serializable
data class PracticeRound(
    val id: String = "",
    @SerialName("player_id") val playerId: String = "",
    @SerialName("course_id") val courseId: String = "",
    @SerialName("round_type") val roundType: Int = 18,
    @SerialName("tee_box") val teeBox: String? = null,
    val status: PracticeRoundStatus = PracticeRoundStatus.DRAFT,
    @SerialName("gross_score") val grossScore: Int? = null,
    @SerialName("net_score") val netScore: Int? = null,
    @SerialName("total_to_par") val totalToPar: Int? = null,
    val notes: String? = null,
    @SerialName("started_at") val startedAt: String? = null,
    @SerialName("completed_at") val completedAt: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class TournamentRegistration(
    val id: String = "",
    @SerialName("tournament_id") val tournamentId: String = "",
    @SerialName("player_id") val playerId: String = "",
    @SerialName("registered_at") val registeredAt: String = "",
    val status: String = "registered"
)

@Serializable
data class PracticeScore(
    val id: String = "",
    @SerialName("practice_round_id") val practiceRoundId: String = "",
    @SerialName("hole_number") val holeNumber: Int = 0,
    @EncodeDefault val par: Int = 4,
    @SerialName("stroke_index") val strokeIndex: Int? = null,
    val score: Int = 0,
    val putts: Int? = null,
    @SerialName("fairway_hit") val fairwayHit: Boolean? = null,
    @SerialName("green_in_regulation") val greenInRegulation: Boolean? = null,
    @SerialName("penalty_strokes") val penaltyStrokes: Int? = null,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String = ""
)

@Serializable
data class Flight(
    val id: String = "",
    @SerialName("tournament_id") val tournamentId: String = "",
    val name: String = "",
    @SerialName("handicap_min") val handicapMin: Double? = null,
    @SerialName("handicap_max") val handicapMax: Double? = null,
    @SerialName("created_at") val createdAt: String = ""
)

@Serializable
data class SideGame(
    val id: String = "",
    @SerialName("tournament_id") val tournamentId: String = "",
    val name: String = "",
    val type: String = "skins",
    @SerialName("entry_fee") val entryFee: Double = 0.0,
    @SerialName("created_at") val createdAt: String = ""
)
