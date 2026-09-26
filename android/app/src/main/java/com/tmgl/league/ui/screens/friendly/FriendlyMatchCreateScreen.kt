package com.tmgl.league.ui.screens.friendly

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.FriendlyMatchRepository
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglTopBar
import com.tmgl.league.ui.theme.TmglGreen
import kotlinx.coroutines.launch

private val MATCH_FORMATS = listOf(
    "stroke_play" to "Stroke Play",
    "stableford" to "Stableford",
    "match_play" to "Match Play",
    "best_ball" to "Best Ball",
    "scramble" to "Scramble"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendlyMatchCreateScreen(navController: NavHostController) {
    val repository = remember { FriendlyMatchRepository() }
    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var title by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var selectedCourseId by remember { mutableStateOf<String?>(null) }
    var matchFormat by remember { mutableStateOf(MATCH_FORMATS.first().first) }
    var roundType by remember { mutableStateOf(18) }
    var scheduledDate by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        when (val result = repository.getCourses()) {
            is DataResult.Success -> {
                courses = result.data
                selectedCourseId = result.data.firstOrNull()?.id
            }
            is DataResult.Error -> errorMessage = result.message
        }
        isLoading = false
    }

    Scaffold(
        topBar = {
            TmglTopBar(
                title = "Create Friendly Match",
                onBack = { navController.popBackStack() }
            )
        }
    ) { padding ->
        if (isLoading) {
            LoadingIndicator(modifier = Modifier.padding(padding))
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Match Title") },
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Course", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                CoursePicker(
                    courses = courses,
                    selectedCourseId = selectedCourseId,
                    onSelect = { selectedCourseId = it }
                )

                Text("Holes", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(9, 18).forEach { holes ->
                        FilterChip(
                            selected = roundType == holes,
                            onClick = { roundType = holes },
                            modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                            label = { Text("$holes holes") }
                        )
                    }
                }

                Text("Format", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    MATCH_FORMATS.forEach { (value, label) ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = matchFormat == value,
                                onClick = { matchFormat = value }
                            )
                            Text(label, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }

                OutlinedTextField(
                    value = scheduledDate,
                    onValueChange = { scheduledDate = it },
                    label = { Text("Date (YYYY-MM-DD, optional)") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("Notes (optional)") },
                    modifier = Modifier.fillMaxWidth()
                )

                errorMessage?.let {
                    Text(text = it, color = MaterialTheme.colorScheme.error)
                }

                Button(
                    onClick = {
                        errorMessage = null
                        val courseId = selectedCourseId
                        if (title.isBlank()) {
                            errorMessage = "Enter a match title"
                            return@Button
                        }
                        if (courseId.isNullOrBlank()) {
                            errorMessage = "Select a course for this match"
                            return@Button
                        }
                        isSaving = true
                        scope.launch {
                            try {
                                when (
                                    val result = repository.createFriendlyMatch(
                                        title = title,
                                        courseId = courseId,
                                        roundType = roundType,
                                        matchFormat = matchFormat,
                                        scheduledAt = scheduledDate.trim().ifBlank { null },
                                        description = notes.trim().ifBlank { null }
                                    )
                                ) {
                                    is DataResult.Success -> navController.popBackStack()
                                    is DataResult.Error -> errorMessage = result.message
                                }
                            } finally {
                                isSaving = false
                            }
                        }
                    },
                    enabled = !isSaving && title.isNotBlank() && !selectedCourseId.isNullOrBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = TmglGreen),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isSaving) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Create Match")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CoursePicker(
    courses: List<Course>,
    selectedCourseId: String?,
    onSelect: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = courses.firstOrNull { it.id == selectedCourseId }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
        OutlinedTextField(
            value = selected?.name ?: "",
            onValueChange = {},
            readOnly = true,
            label = { Text("Select Course") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor()
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            if (courses.isEmpty()) {
                DropdownMenuItem(
                    text = { Text("No courses available") },
                    onClick = { expanded = false }
                )
            }
            courses.forEach { course ->
                DropdownMenuItem(
                    text = { Text(course.name) },
                    onClick = { onSelect(course.id); expanded = false }
                )
            }
        }
    }
}
