package com.tmgl.league.ui.screens.practice

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.model.PracticeRound
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.PracticeRepository
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglTopBar
import com.tmgl.league.ui.theme.TmglGreen
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PracticeCreateScreen(
    onCreated: (String) -> Unit,
    onBack: () -> Unit
) {
    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var selectedCourseId by remember { mutableStateOf<String?>(null) }
    var roundType by remember { mutableIntStateOf(18) }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val repository = remember { PracticeRepository() }
    val authRepository = remember { AuthRepository() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        when (val result = repository.getCourses()) {
            is DataResult.Success -> { courses = result.data; isLoading = false }
            is DataResult.Error -> { error = result.message; isLoading = false }
        }
    }

    Scaffold(
        topBar = { TmglTopBar(title = "New Practice Round", onBack = onBack) }
    ) { paddingValues ->
        if (isLoading) {
            LoadingIndicator(modifier = Modifier.padding(paddingValues))
        } else {
            Column(
                modifier = Modifier
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                error?.let {
                    Text(text = it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }

                Text("Round Type", style = MaterialTheme.typography.titleMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(9, 18).forEach { type ->
                        FilterChip(
                            selected = roundType == type,
                            onClick = { roundType = type },
                            label = { Text("$type Holes") }
                        )
                    }
                }

                Text("Course", style = MaterialTheme.typography.titleMedium)
                if (courses.isEmpty()) {
                    Text("No courses available", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    var expanded by remember { mutableStateOf(false) }
                    val selectedCourse = courses.find { it.id == selectedCourseId }
                    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
                        OutlinedTextField(
                            value = selectedCourse?.name ?: "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Select Course") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                            modifier = Modifier.fillMaxWidth().menuAnchor()
                        )
                        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            courses.forEach { course ->
                                DropdownMenuItem(
                                    text = { Text(course.name) },
                                    onClick = { selectedCourseId = course.id; expanded = false }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = {
                        if (selectedCourseId != null) {
                            isSaving = true
                            scope.launch {
                                val authState = authRepository.getCurrentUser()
                                if (authState is AuthState.Authenticated && authState.profile != null) {
                                    val playerResult = repository.getPlayerByProfileId(authState.profile.id)
                                    if (playerResult is DataResult.Success) {
                                        val round = PracticeRound(
                                            playerId = playerResult.data.id,
                                            courseId = selectedCourseId ?: "",
                                            roundType = roundType
                                        )
                                        when (val result = repository.createPracticeRound(round)) {
                                            is DataResult.Success -> { isSaving = false; onCreated(result.data.id) }
                                            is DataResult.Error -> { error = result.message; isSaving = false }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    enabled = selectedCourseId != null && !isSaving,
                    colors = ButtonDefaults.buttonColors(containerColor = TmglGreen),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(if (isSaving) "Creating..." else "Start Practice Round")
                }
            }
        }
    }
}
