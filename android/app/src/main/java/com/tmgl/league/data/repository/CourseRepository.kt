package com.tmgl.league.data.repository

import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.model.CourseDetail
import com.tmgl.league.data.model.CourseHole
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

@Singleton
class CourseRepository @Inject constructor() {

    private val db = SupabaseConfig.client

    suspend fun getCourses(): DataResult<List<Course>> {
        return try {
            val courses = db.from("courses").select {
                order("name", Order.ASCENDING)
            }.decodeList<Course>()
            DataResult.Success(courses)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load courses")
        }
    }

    suspend fun getCourse(id: String): DataResult<Course?> {
        if (id.isBlank()) return DataResult.Success(null)
        return try {
            val course = db.from("courses").select {
                filter { eq("id", id) }
            }.decodeList<Course>().firstOrNull()
            DataResult.Success(course)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load course")
        }
    }

    suspend fun searchCourses(query: String): DataResult<List<Course>> {
        val trimmed = query.trim()
        if (trimmed.isEmpty()) return getCourses()
        return try {
            val pattern = "%$trimmed%"
            val courses = db.from("courses").select {
                filter {
                    or {
                        ilike("name", pattern)
                        ilike("location", pattern)
                    }
                }
                order("name", Order.ASCENDING)
                limit(50)
            }.decodeList<Course>()
            DataResult.Success(courses)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to search courses")
        }
    }

    suspend fun getCourseDetail(courseId: String): DataResult<CourseDetail> {
        val courseResult = getCourse(courseId)
        if (courseResult is DataResult.Error) return DataResult.Error(courseResult.message)
        val course = (courseResult as DataResult.Success).data
            ?: return DataResult.Error("Course not found")
        return when (val holes = getCourseHoles(courseId)) {
            is DataResult.Error -> DataResult.Error(holes.message)
            is DataResult.Success -> DataResult.Success(CourseDetail(course, holes.data))
        }
    }

    suspend fun getCourseHoles(courseId: String): DataResult<List<CourseHole>> {
        if (courseId.isBlank()) return DataResult.Success(emptyList())
        return try {
            val holes = db.from("course_holes").select {
                filter { eq("course_id", courseId) }
                order("hole_number", Order.ASCENDING)
            }.decodeList<CourseHole>()
            DataResult.Success(holes)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to load course holes")
        }
    }

    suspend fun saveCourse(course: Course, holes: List<CourseHole>): DataResult<Course> {
        return try {
            val payload = mutableMapOf<String, Any?>(
                "name" to course.name.trim(),
                "holes_count" to if (course.holesCount == 9) 9 else 18
            )
            course.location?.let { payload["location"] = it }
            course.description?.let { payload["description"] = it }
            course.courseRating?.let { payload["course_rating"] = it }
            course.slopeRating?.let { payload["slope_rating"] = it }
            course.latitude?.let { payload["latitude"] = it }
            course.longitude?.let { payload["longitude"] = it }
            course.elevation?.let { payload["elevation"] = it }

            val saved = if (course.id.isBlank()) {
                db.from("courses").insert(payload) { select() }.decodeList<Course>().firstOrNull()
            } else {
                db.from("courses").update(payload) {
                    filter { eq("id", course.id) }
                    select()
                }.decodeList<Course>().firstOrNull()
            } ?: return DataResult.Error("Failed to save course")

            val validHoles = holes.filter { it.holeNumber in 1..18 }
            if (validHoles.isNotEmpty()) {
                db.from("course_holes").upsert(
                    validHoles.map { hole ->
                        mapOf(
                            "course_id" to saved.id,
                            "hole_number" to hole.holeNumber,
                            "par" to hole.par,
                            "handicap_index" to hole.handicapIndex,
                            "yardage" to hole.yardage
                        )
                    },
                    onConflict = "course_id,hole_number"
                )
            }
            DataResult.Success(saved)
        } catch (e: Exception) {
            DataResult.Error(e.message ?: "Failed to save course")
        }
    }

    fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val earthRadiusMeters = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
            cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * asin(sqrt(a))
        return earthRadiusMeters * c * YARDS_PER_METER
    }

    private companion object {
        const val YARDS_PER_METER = 1.09361
    }
}
