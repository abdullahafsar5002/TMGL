package com.tmgl.league.data.repository

import android.util.Log
import com.tmgl.league.data.SupabaseConfig
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

data class HandicapResult(
    val currentHandicap: Double,
    val recentRounds: List<HandicapRound>,
    val trend: String
)

data class HandicapRound(
    val date: String,
    val grossScore: Int,
    val differential: Double,
    val courseRating: Double,
    val slopeRating: Double
)

@Singleton
class HandicapRepository @Inject constructor() {

    suspend fun calculateHandicap(playerId: String): HandicapResult? {
        return try {
            val db = SupabaseConfig.client
            val rounds = db.from("practice_rounds")
                .select() {
                    filter { eq("player_id", playerId) }
                    filter { eq("status", "completed") }
                    order("created_at", Order.DESCENDING)
                    limit(20)
                }
                .decodeList<PracticeRoundData>()

            if (rounds.isEmpty()) return null

            val roundsWithDiff = rounds.mapNotNull { round ->
                val scores = db.from("practice_scores")
                    .select() {
                        filter { eq("practice_round_id", round.id) }
                    }
                    .decodeList<ScoreData>()

                if (scores.isEmpty()) return@mapNotNull null

                val totalGross = scores.sumOf { it.score }

                val courseData = db.from("practice_rounds")
                    .select(Columns.raw("course_id")) {
                        filter { eq("id", round.id) }
                    }
                    .decodeList<CourseRef>()

                val courseId = courseData.firstOrNull()?.course_id

                val courseRating = if (courseId != null) {
                    val courses = db.from("courses")
                        .select(Columns.raw("course_rating, slope_rating")) {
                            filter { eq("id", courseId) }
                        }
                        .decodeList<CourseRatingData>()
                    courses.firstOrNull()?.course_rating ?: 72.0
                } else 72.0

                val slopeRating = if (courseId != null) {
                    val courses = db.from("courses")
                        .select(Columns.raw("course_rating, slope_rating")) {
                            filter { eq("id", courseId) }
                        }
                        .decodeList<CourseRatingData>()
                    courses.firstOrNull()?.slope_rating ?: 113.0
                } else 113.0

                val differential = (113.0 / slopeRating) * (totalGross - courseRating)
                HandicapRound(
                    date = round.created_at,
                    grossScore = totalGross,
                    differential = differential,
                    courseRating = courseRating,
                    slopeRating = slopeRating
                )
            }

            if (roundsWithDiff.isEmpty()) return null

            val sorted = roundsWithDiff.sortedBy { it.differential }
            val count = minOf(8, sorted.size)
            val bestEight = sorted.take(count)
            val handicap = bestEight.map { it.differential }.average() * 0.96

            val trend = if (roundsWithDiff.size >= 2) {
                val recent = roundsWithDiff.first().differential
                val prev = roundsWithDiff[1].differential
                when {
                    recent < prev - 1 -> "improving"
                    recent > prev + 1 -> "declining"
                    else -> "stable"
                }
            } else "insufficient_data"

            HandicapResult(
                currentHandicap = (handicap * 10).toLong() / 10.0,
                recentRounds = roundsWithDiff.take(10),
                trend = trend
            )
        } catch (e: Exception) {
            Log.e("HandicapRepo", "Error calculating handicap", e)
            null
        }
    }

    @Serializable
    private data class PracticeRoundData(
        val id: String = "",
        val created_at: String = ""
    )

    @Serializable
    private data class ScoreData(
        val score: Int = 0,
        val par: Int = 4
    )

    @Serializable
    private data class CourseRef(
        val course_id: String = ""
    )

    @Serializable
    private data class CourseRatingData(
        val course_rating: Double = 72.0,
        val slope_rating: Double = 113.0
    )
}
