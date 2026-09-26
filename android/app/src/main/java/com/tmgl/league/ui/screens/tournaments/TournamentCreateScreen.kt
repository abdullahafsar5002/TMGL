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
import com.tmgl.league.data.model.Season
import com.tmgl.league.data.model.SeasonStatus
import com.tmgl.league.data.model.Tournament
import com.tmgl.league.data.model.TournamentStatus
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.TournamentCreateRepository
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglTopBar
import com.tmgl.league.ui.theme.TmglGreen
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private const val DATE_FORMAT = "yyyy-MM-dd"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TournamentCreateScreen(
    onCreated: () -> Unit,
    onBack: () -> Unit
) {
    var courses by remember { mutableStateOf<List<Course>>(emptyList()) }
    var seasons by remember { mutableStateOf<List<Season>>(emptyList()) }
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedCourseId by remember { mutableStateOf<String?>(null) }
    var selectedSeasonId by remember { mutableStateOf<String?>(null) }
    var startDate by remember { mutableStateOf("") }
    var endDate by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val repository = remember { TournamentCreateRepository() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val coursesResult = repository.getCourses()
        val seasonsResult = repository.getSeasons()
        when (coursesResult) {
            is DataResult.Success -> courses = coursesResult.data
            is DataResult.Error -> error = coursesResult.message
        }
        when (seasonsResult) {
            is DataResult.Success -> {
                seasons = seasonsResult.data
                if (selectedSeasonId == null) {
                    val active = seasonsResult.data.firstOrNull { it.status == SeasonStatus.ACTIVE }
                        ?: seasonsResult.data.firstOrNull()
                    selectedSeasonId = active?.id
                }
            }
            is DataResult.Error -> if (error == null) error = seasonsResult.message
        }
        isLoading = false
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

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description") },
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Season", style = MaterialTheme.typography.titleMedium)
                SeasonDropdown(
                    seasons = seasons,
                    selectedSeasonId = selectedSeasonId,
                    onSelect = { selectedSeasonId = it }
                )

                Text("Course", style = MaterialTheme.typography.titleMedium)
                CourseDropdown(
                    courses = courses,
                    selectedCourseId = selectedCourseId,
                    onSelect = { selectedCourseId = it }
                )

                TournamentDateField(
                    label = "Start Date",
                    value = startDate,
                    onValueChange = { startDate = it }
                )

                TournamentDateField(
                    label = "End Date",
                    value = endDate,
                    onValueChange = { endDate = it }
                )

                Spacer(modifier = Modifier.height(16.dp))

                val canSave = name.isNotBlank() && !selectedSeasonId.isNullOrBlank() && !isSaving
                Button(
                    onClick = {
                        if (name.isBlank()) {
                            error = "Enter a tournament name"
                            return@Button
                        }
                        if (selectedSeasonId.isNullOrBlank()) {
                            error = "Select the season this tournament belongs to"
                            return@Button
                        }
                        isSaving = true
                        error = null
                        scope.launch {
                            try {
                                val tournament = Tournament(
                                    name = name.trim(),
                                    seasonId = selectedSeasonId.orEmpty(),
                                    courseId = selectedCourseId,
                                    description = description.trim().ifBlank { null },
                                    eventDate = startDate.ifBlank { null },
                                    startDate = startDate.ifBlank { null },
                                    endDate = endDate.ifBlank { null },
                                    status = TournamentStatus.DRAFT
                                )
                                when (val result = repository.createTournament(tournament)) {
                                    is DataResult.Success -> onCreated()
                                    is DataResult.Error -> error = result.message
                                }
                            } finally {
                                isSaving = false
                            }
                        }
                    },
                    enabled = canSave,
                    colors = ButtonDefaults.buttonColors(containerColor = TmglGreen),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(if (isSaving) "Creating..." else "Create Tournament")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SeasonDropdown(
    seasons: List<Season>,
    selectedSeasonId: String?,
    onSelect: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = seasons.firstOrNull { it.id == selectedSeasonId }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
        OutlinedTextField(
            value = selected?.name ?: "",
            onValueChange = {},
            readOnly = true,
            isError = seasons.isNotEmpty() && selected == null,
            label = { Text("Select Season") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth().menuAnchor()
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            if (seasons.isEmpty()) {
                DropdownMenuItem(
                    text = { Text("No seasons available") },
                    onClick = { expanded = false }
                )
            }
            seasons.forEach { season ->
                DropdownMenuItem(
                    text = { Text(season.name) },
                    onClick = { onSelect(season.id); expanded = false }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CourseDropdown(
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TournamentDateField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit
) {
    var showDatePicker by remember { mutableStateOf(false) }
    var selectedDate by remember { mutableLongStateOf(System.currentTimeMillis()) }

    OutlinedTextField(
        value = value,
        onValueChange = {},
        readOnly = true,
        label = { Text(label) },
        trailingIcon = {
            IconButton(onClick = { showDatePicker = true }) {
                Icon(Icons.Default.DateRange, contentDescription = "Pick $label")
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
                        onValueChange(SimpleDateFormat(DATE_FORMAT, Locale.US).format(Date(millis)))
                    }
                    showDatePicker = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text("Cancel") } }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}
