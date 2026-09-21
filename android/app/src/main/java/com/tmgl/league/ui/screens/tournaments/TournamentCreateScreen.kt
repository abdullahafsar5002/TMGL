package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.model.Tournament
import com.tmgl.league.data.model.TournamentStatus
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.TournamentCreateRepository
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglTopBar
import com.tmgl.league.ui.theme.TmglGreen
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TournamentCreateScreen(
    onCreated: () -> Unit,
    onBack: () -> Unit
) {
    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var name by remember { mutableStateOf("") }
    var selectedCourseId by remember { mutableStateOf<String?>(null) }
    var startDate by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val repository = remember { TournamentCreateRepository() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        when (val result = repository.getCourses()) {
            is DataResult.Success -> { courses = result.data; isLoading = false }
            is DataResult.Error -> { error = result.message; isLoading = false }
        }
    }

    Scaffold(
        topBar = { TmglTopBar(title = "Create Tournament", onBack = onBack) }
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

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Tournament Name") },
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Course", style = MaterialTheme.typography.titleMedium)
                var courseExpanded by remember { mutableStateOf(false) }
                val selectedCourse = courses.find { it.id == selectedCourseId }
                ExposedDropdownMenuBox(expanded = courseExpanded, onExpandedChange = { courseExpanded = !courseExpanded }) {
                    OutlinedTextField(
                        value = selectedCourse?.name ?: "",
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Select Course") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = courseExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor()
                    )
                    ExposedDropdownMenu(expanded = courseExpanded, onDismissRequest = { courseExpanded = false }) {
                        courses.forEach { course ->
                            DropdownMenuItem(
                                text = { Text(course.name) },
                                onClick = { selectedCourseId = course.id; courseExpanded = false }
                            )
                        }
                    }
                }

                var showDatePicker by remember { mutableStateOf(false) }
                var selectedDate by remember { mutableLongStateOf(System.currentTimeMillis()) }

                OutlinedTextField(
                    value = startDate,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Start Date") },
                    trailingIcon = {
                        IconButton(onClick = { showDatePicker = true }) {
                            Icon(Icons.Default.DateRange, contentDescription = "Pick date")
                        }
                    },
                    modifier = Modifier.fillMaxWidth().clickable { showDatePicker = true }
                )

                if (showDatePicker) {
                    val datePickerState = rememberDatePickerState(initialSelectedDateMillis = selectedDate)
                    DatePickerDialog(
                        onDismissRequest = { showDatePicker = false },
                        confirmButton = {
                            TextButton(onClick = {
                                datePickerState.selectedDateMillis?.let { millis ->
                                    selectedDate = millis
                                    val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                                    startDate = sdf.format(java.util.Date(millis))
                                }
                                showDatePicker = false
                            }) { Text("OK") }
                        },
                        dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text("Cancel") } }
                    ) {
                        DatePicker(state = datePickerState)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            isSaving = true
                            scope.launch {
                                val tournament = Tournament(
                                    name = name.trim(),
                                    courseId = selectedCourseId,
                                    startDate = startDate.ifBlank { null },
                                    status = TournamentStatus.DRAFT
                                )
                                when (val result = repository.createTournament(tournament)) {
                                    is DataResult.Success -> { isSaving = false; onCreated() }
                                    is DataResult.Error -> { error = result.message; isSaving = false }
                                }
                            }
                        }
                    },
                    enabled = name.isNotBlank() && !isSaving,
                    colors = ButtonDefaults.buttonColors(containerColor = TmglGreen),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(if (isSaving) "Creating..." else "Create Tournament")
                }
            }
        }
    }
}
