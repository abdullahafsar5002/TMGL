package com.tmgl.league.data.repository

import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.ValueEventListener
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.model.CourseHole
import com.tmgl.league.data.model.TeeBox
import com.tmgl.league.data.model.ScoringFormat
import com.tmgl.league.data.model.StablefordPoints
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CourseRepository @Inject constructor() {

    private val database = FirebaseDatabase.getInstance()
    private val coursesRef = database.getReference("courses")

    private val builtInCourses = listOf(
        Course(
            id = "tmgl_custom_1",
            name = "Custom Course",
            location = "Set your location",
            city = "Any City",
            state = "Any State",
            country = "USA",
            latitude = 0.0,
            longitude = 0.0,
            numHoles = 18,
            par = 72,
            rating = 72.0,
            slope = 113,
            holes = generateDefaultHoles(18)
        ),
        Course(
            id = "tmgl_custom_9",
            name = "Custom 9-Hole Course",
            location = "Set your location",
            city = "Any City",
            state = "Any State",
            country = "USA",
            latitude = 0.0,
            longitude = 0.0,
            numHoles = 9,
            par = 36,
            rating = 36.0,
            slope = 113,
            holes = generateDefaultHoles(9)
        )
    )

    fun getCourseById(courseId: String): Flow<Course?> = callbackFlow {
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val course = snapshot.getValue(Course::class.java)
                if (course != null) {
                    trySend(course)
                } else {
                    val builtIn = builtInCourses.find { it.id == courseId }
                    trySend(builtIn)
                }
            }

            override fun onCancelled(error: DatabaseError) {
                trySend(null)
            }
        }
        coursesRef.child(courseId).addValueEventListener(listener)
        awaitClose { coursesRef.child(courseId).removeEventListener(listener) }
    }

    fun getAllCourses(): Flow<List<Course>> = callbackFlow {
        val courses = mutableListOf<Course>()
        courses.addAll(builtInCourses)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                for (courseSnapshot in snapshot.children) {
                    courseSnapshot.getValue(Course::class.java)?.let { course ->
                        if (courses.none { it.id == course.id }) {
                            courses.add(course)
                        }
                    }
                }
                trySend(courses.toList())
            }

            override fun onCancelled(error: DatabaseError) {
                trySend(courses.toList())
            }
        }
        coursesRef.addValueEventListener(listener)
        awaitClose { coursesRef.removeEventListener(listener) }
    }

    fun searchCourses(query: String): Flow<List<Course>> = callbackFlow {
        val courses = mutableListOf<Course>()
        courses.addAll(builtInCourses.filter {
            it.name.contains(query, ignoreCase = true)
        })

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val results = mutableListOf<Course>()
                results.addAll(courses)

                for (courseSnapshot in snapshot.children) {
                    courseSnapshot.getValue(Course::class.java)?.let { course ->
                        if (course.name.contains(query, ignoreCase = true) ||
                            course.city.contains(query, ignoreCase = true) ||
                            course.state.contains(query, ignoreCase = true)) {
                            if (results.none { it.id == course.id }) {
                                results.add(course)
                            }
                        }
                    }
                }
                trySend(results)
            }

            override fun onCancelled(error: DatabaseError) {
                trySend(courses)
            }
        }
        coursesRef.addValueEventListener(listener)
        awaitClose { coursesRef.removeEventListener(listener) }
    }

    suspend fun saveCourse(course: Course) {
        coursesRef.child(course.id).setValue(course)
    }

    fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val earthRadius = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return earthRadius * c * 1.09361
    }

    private fun generateDefaultHoles(numHoles: Int): List<CourseHole> {
        val pars = listOf(
            listOf(4, 4, 3, 5, 4, 4, 3, 5, 4),
            listOf(4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4)
        )
        val holePars = if (numHoles <= 9) pars[0].take(numHoles) else pars[1]
        val handicaps = (1..numHoles).toList()
        val yardages = listOf(380, 350, 180, 520, 410, 370, 195, 500, 400,
            420, 360, 175, 530, 400, 380, 200, 510, 410).take(numHoles)

        return holePars.mapIndexed { index, par ->
            CourseHole(
                holeNumber = index + 1,
                par = par,
                yardage = yardages.getOrElse(index) { 400 },
                handicapIndex = handicaps.getOrElse(index) { index + 1 },
                teeBoxes = listOf(
                    TeeBox(name = "Regular", color = "White", yardage = yardages.getOrElse(index) { 400 }, rating = 72.0, slope = 113),
                    TeeBox(name = "Forward", color = "Gold", yardage = (yardages.getOrElse(index) { 400 } * 0.88).toInt(), rating = 69.0, slope = 110),
                    TeeBox(name = "Back", color = "Blue", yardage = (yardages.getOrElse(index) { 400 } * 1.12).toInt(), rating = 74.0, slope = 120)
                ),
                description = ""
            )
        }
    }
}
