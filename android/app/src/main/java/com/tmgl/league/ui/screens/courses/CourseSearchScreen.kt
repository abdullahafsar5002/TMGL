package com.tmgl.league.ui.screens.courses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.PracticeRepository
import com.tmgl.league.ui.components.ErrorState
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglTopBar
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent

@EntryPoint
@InstallIn(SingletonComponent::class)
internal interface CourseSearchDependencies {
    fun practiceRepository(): PracticeRepository
}

@Composable
fun CourseSearchScreen(
    onCourseSelected: (Course) -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val repository = remember(context) {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            CourseSearchDependencies::class.java
        ).practiceRepository()
    }
    var searchQuery by rememberSaveable { mutableStateOf("") }
    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadTrigger by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadTrigger) {
        isLoading = true
        error = null
        when (val result = repository.getCourses()) {
            is DataResult.Success -> {
                courses = result.data.sortedBy { it.name.lowercase() }
                isLoading = false
            }
            is DataResult.Error -> {
                error = result.message
                isLoading = false
            }
        }
    }

    val matches = remember(courses, searchQuery) {
        val term = searchQuery.trim()
        if (term.isEmpty()) courses
        else courses.filter { course ->
            course.name.contains(term, ignoreCase = true) ||
                course.location?.contains(term, ignoreCase = true) == true
        }
    }

    Scaffold(topBar = { TmglTopBar(title = "Find Course", onBack = onBack) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = { Text("Search courses...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            when {
                isLoading -> LoadingIndicator(modifier = Modifier.weight(1f))
                error != null -> ErrorState(
                    message = error ?: "",
                    onRetry = { reloadTrigger++ },
                    modifier = Modifier.weight(1f)
                )
                matches.isEmpty() -> Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (courses.isEmpty()) "No courses have been added yet"
                        else "No courses match your search",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                else -> LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(matches, key = { it.id }) { course ->
                        CourseCard(
                            course = course,
                            onClick = { onCourseSelected(course) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CourseCard(course: Course, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = course.name,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            course.location?.takeIf { it.isNotBlank() }?.let { location ->
                Text(
                    text = location,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
            }
            Row {
                AssistChip(
                    onClick = onClick,
                    modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                    label = { Text("${course.par} Par", fontSize = 12.sp) }
                )
                Spacer(modifier = Modifier.width(8.dp))
                AssistChip(
                    onClick = onClick,
                    modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                    label = { Text("${course.numHoles} Holes", fontSize = 12.sp) }
                )
                Spacer(modifier = Modifier.width(8.dp))
                AssistChip(
                    onClick = onClick,
                    modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                    label = { Text("${course.rating} / ${course.slope}", fontSize = 12.sp) }
                )
            }
        }
    }
}
