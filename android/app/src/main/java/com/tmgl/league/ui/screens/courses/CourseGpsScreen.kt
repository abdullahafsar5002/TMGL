package com.tmgl.league.ui.screens.courses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.model.CourseHole
import com.tmgl.league.ui.components.ErrorState
import com.tmgl.league.ui.components.LoadingIndicator
import com.tmgl.league.ui.components.TmglTopBar

private const val YARDAGE_DELTA = 20
private const val NO_YARDAGE = "—"

@Composable
fun CourseGpsScreen(
    course: Course?,
    isLoading: Boolean = false,
    loadError: String? = null,
    selectedHole: Int = 1,
    onHoleChanged: (Int) -> Unit,
    onBack: () -> Unit
) {
    val holes = course?.holes.orEmpty()
    val hole = holes.firstOrNull { it.holeNumber == selectedHole } ?: holes.firstOrNull()
    val yardage = hole?.yardage ?: 0
    val totalHoles = if (course != null && course.numHoles > 0) course.numHoles else holes.size
    val selectableHoles = remember(holes, totalHoles) {
        if (holes.isNotEmpty()) holes.sortedBy { it.holeNumber }.map { it.holeNumber }
        else (1..totalHoles.coerceAtLeast(1)).toList()
    }
    val effectiveHole = hole?.holeNumber ?: selectedHole.coerceIn(1, selectableHoles.size.coerceAtLeast(1))

    Scaffold(topBar = { TmglTopBar(title = course?.name?.takeIf { it.isNotBlank() } ?: "Course GPS", onBack = onBack) }) { padding ->
        when {
            isLoading -> LoadingIndicator(modifier = Modifier.padding(padding))
            loadError != null -> ErrorState(
                message = loadError,
                onRetry = onBack,
                modifier = Modifier.padding(padding)
            )
            course == null -> Box(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "This course could not be loaded",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            else -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Hole $effectiveHole of $totalHoles",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (holes.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                items(selectableHoles, key = { it }) { holeNumber ->
                                    val selected = holeNumber == effectiveHole
                                    FilterChip(
                                        selected = selected,
                                        onClick = { onHoleChanged(holeNumber) },
                                        modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                                        label = { Text(holeNumber.toString()) }
                                    )
                                }
                            }
                        } else {
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                AssistChip(
                                    onClick = { if (effectiveHole > 1) onHoleChanged(effectiveHole - 1) },
                                    modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                                    label = { Text("Previous hole") },
                                    enabled = effectiveHole > 1
                                )
                                AssistChip(
                                    onClick = { if (effectiveHole < totalHoles) onHoleChanged(effectiveHole + 1) },
                                    modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                                    label = { Text("Next hole") },
                                    enabled = effectiveHole < totalHoles
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Distances to Green",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            DistanceColumn("Front", yardage.takeIf { it > 0 }?.minus(YARDAGE_DELTA))
                            DistanceColumn("Center", yardage.takeIf { it > 0 })
                            DistanceColumn("Back", yardage.takeIf { it > 0 }?.plus(YARDAGE_DELTA))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "Hole Details",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            DetailColumn("Par", hole?.par?.toString() ?: NO_YARDAGE)
                            DetailColumn("Yardage", yardage.takeIf { it > 0 }?.toString() ?: NO_YARDAGE)
                            DetailColumn("Handicap", hole?.handicapIndex?.toString() ?: NO_YARDAGE)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun DistanceColumn(label: String, yardage: Int?) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = label,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.75f)
        )
        Text(
            text = yardage?.toString() ?: NO_YARDAGE,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onPrimary
        )
        Text(
            text = "yds",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.75f)
        )
    }
}

@Composable
private fun DetailColumn(label: String, value: String) {
    Column {
        Text(
            text = label,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
