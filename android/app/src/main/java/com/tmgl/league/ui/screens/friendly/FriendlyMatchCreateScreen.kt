package com.tmgl.league.ui.screens.friendly

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import com.tmgl.league.data.model.FriendlyMatchFormat
import com.tmgl.league.data.model.displayName
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglButton
import com.tmgl.league.ui.components.TmglTextField
import com.tmgl.league.ui.components.TmglTopBar
import com.tmgl.league.ui.viewmodel.FriendlyMatchViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendlyMatchCreateScreen(
    navController: NavHostController,
    viewModel: FriendlyMatchViewModel = hiltViewModel()
) {
    val createState by viewModel.createState.collectAsState()
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var opponentEmail by remember { mutableStateOf("") }
    var courseId by remember { mutableStateOf<String?>(null) }
    var format by remember { mutableStateOf(FriendlyMatchFormat.STROKE_PLAY) }
    var roundType by remember { mutableIntStateOf(18) }
    var scheduledDate by remember { mutableStateOf("") }
    var courseExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadCourses() }

    LaunchedEffect(createState.createdMatch) {
        val created = createState.createdMatch
        if (created != null) {
            viewModel.clearCreateState()
            navController.popBackStack()
        }
    }

    Scaffold(
        topBar = {
            TmglTopBar(
                title = "Create Friendly Match",
                onBack = { navController.popBackStack() }
            )
        }
    ) { padding ->
        if (createState.isLoading) {
            LoadingIndicator(modifier = Modifier.padding(padding))
            return@Scaffold
        }
        Column(
            modifier = Modifier
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            TmglTextField(
                value = title,
                onValueChange = { title = it },
                label = "Match Title"
            )

            TmglTextField(
                value = description,
                onValueChange = { description = it },
                label = "Notes (optional)"
            )

            ExposedDropdownMenuBox(
                expanded = courseExpanded,
                onExpandedChange = { courseExpanded = it }
            ) {
                val selectedCourse = createState.courses.firstOrNull { it.id == courseId }
                OutlinedTextField(
                    value = selectedCourse?.let { "${it.name} - ${it.displayLocation}" } ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Golf Course") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = courseExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable),
                    shape = MaterialTheme.shapes.medium
                )
                ExposedDropdownMenu(
                    expanded = courseExpanded,
                    onDismissRequest = { courseExpanded = false }
                ) {
                    if (createState.courses.isEmpty()) {
                        DropdownMenuItem(
                            text = { Text("No courses available") },
                            onClick = { courseExpanded = false }
                        )
                    }
                    createState.courses.forEach { course ->
                        DropdownMenuItem(
                            text = { Text("${course.name} - ${course.displayLocation}") },
                            onClick = {
                                courseId = course.id
                                courseExpanded = false
                            }
                        )
                    }
                }
            }

            TmglTextField(
                value = opponentEmail,
                onValueChange = { opponentEmail = it },
                label = "Opponent Email (optional)"
            )

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(9, 18).forEach { holes ->
                    FilterChip(
                        selected = roundType == holes,
                        onClick = { roundType = holes },
                        label = { Text("$holes Holes") }
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                FriendlyMatchFormat.entries.forEach { option ->
                    FilterChip(
                        selected = format == option,
                        onClick = { format = option },
                        label = { Text(option.displayName()) }
                    )
                }
            }

            TmglTextField(
                value = scheduledDate,
                onValueChange = { scheduledDate = it },
                label = "Scheduled (YYYY-MM-DD, optional)"
            )

            createState.error?.let { error ->
                Text(text = error, color = MaterialTheme.colorScheme.error)
            }

            TmglButton(
                text = if (createState.isSubmitting) "Creating..." else "Create Match",
                onClick = {
                    viewModel.createMatch(
                        courseId = courseId.orEmpty(),
                        title = title,
                        description = description,
                        matchFormat = format.name,
                        roundType = roundType,
                        scheduledAt = scheduledDate.takeIf { it.isNotBlank() },
                        opponentEmail = opponentEmail.takeIf { it.isNotBlank() }
                    )
                },
                enabled = title.isNotBlank() && courseId != null && !createState.isSubmitting,
                loading = createState.isSubmitting
            )
        }
    }
}
