package com.tmgl.league.ui.screens.courses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.model.CourseDetail
import com.tmgl.league.ui.components.ErrorState
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.viewmodel.CourseGpsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseGpsScreen(
    courseId: String,
    selectedHole: Int = 1,
    onHoleChanged: (Int) -> Unit,
    onBack: () -> Unit,
    viewModel: CourseGpsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()

    LaunchedEffect(courseId) { viewModel.load(courseId) }

    Scaffold(
        topBar = {
            TmglCourseTopBar(
                title = state.detail?.course?.name ?: "Course GPS",
                onBack = onBack
            )
        }
    ) { padding ->
        when {
            state.isLoading -> LoadingIndicator(modifier = Modifier.padding(padding))
            state.error != null -> ErrorState(
                message = state.error.orEmpty(),
                onRetry = { viewModel.load(courseId) },
                modifier = Modifier.padding(padding)
            )
            else -> {
                val detail = state.detail
                if (detail != null) {
                    CourseGpsContent(
                        detail = detail,
                        selectedHole = selectedHole,
                        onHoleChanged = onHoleChanged,
                        modifier = Modifier.padding(padding)
                    )
                }
            }
        }
    }
}

@Composable
private fun CourseGpsContent(
    detail: CourseDetail,
    selectedHole: Int,
    onHoleChanged: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val holeCount = detail.holeCount
    val hole = detail.holeFor(selectedHole) ?: detail.holes.firstOrNull()
    val yardage = hole?.yardage ?: 0

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Hole $selectedHole of $holeCount",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = detail.course.displayLocation,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    OutlinedButton(
                        onClick = { if (selectedHole > 1) onHoleChanged(selectedHole - 1) },
                        enabled = selectedHole > 1
                    ) {
                        Text("Previous")
                    }
                    OutlinedButton(
                        onClick = { if (selectedHole < holeCount) onHoleChanged(selectedHole + 1) },
                        enabled = selectedHole < holeCount
                    ) {
                        Text("Next")
                    }
                }
            }
        }

        if (detail.course.hasCoordinates) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Course Location",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Latitude ${detail.course.latitude}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Text(
                        text = "Longitude ${detail.course.longitude}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }
        }

        hole?.let { current ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Hole Details",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        DetailColumn(label = "Par", value = "${current.par}")
                        DetailColumn(label = "Yardage", value = if (yardage > 0) "$yardage" else "--")
                        DetailColumn(
                            label = "Handicap",
                            value = current.handicapIndex?.toString() ?: "--"
                        )
                    }
                }
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Course Summary",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    DetailColumn(label = "Total Par", value = if (detail.totalPar > 0) "${detail.totalPar}" else "--")
                    DetailColumn(label = "Total Yards", value = if (detail.totalYardage > 0) "${detail.totalYardage}" else "--")
                    DetailColumn(label = "Rating", value = detail.course.displayRating)
                    DetailColumn(label = "Slope", value = detail.course.displaySlope)
                }
            }
        }
    }
}

@Composable
private fun DetailColumn(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
