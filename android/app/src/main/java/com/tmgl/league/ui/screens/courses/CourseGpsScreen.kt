package com.tmgl.league.ui.screens.courses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tmgl.league.ui.theme.*
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.model.CourseHole

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CourseGpsScreen(
    course: Course,
    selectedHole: Int = 1,
    onHoleChanged: (Int) -> Unit,
    onBack: () -> Unit
) {
    val hole = course.holes.find { it.holeNumber == selectedHole } ?: course.holes.firstOrNull()
    val yardage = hole?.yardage ?: 0

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(course.name) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = TmglGold
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Hole $selectedHole of ${course.numHoles}",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TmglGold
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        AssistChip(
                            onClick = { if (selectedHole > 1) onHoleChanged(selectedHole - 1) },
                            label = { Text("← Prev") },
                            enabled = selectedHole > 1
                        )
                        AssistChip(
                            onClick = { if (selectedHole < course.numHoles) onHoleChanged(selectedHole + 1) },
                            label = { Text("Next →") },
                            enabled = selectedHole < course.numHoles
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            hole?.let { h ->
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
                            color = TmglGold
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "Front",
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                                )
                                Text(
                                    text = "${yardage - 20}",
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TmglGold
                                )
                                Text(
                                    text = "yds",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                                )
                            }

                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "Center",
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                                )
                                Text(
                                    text = "${yardage}",                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TmglGold
                                )
                                Text(
                                    text = "yds",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                                )
                            }

                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "Back",
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                                )
                                Text(
                                    text = "${yardage + 20}",
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TmglGold
                                )
                                Text(
                                    text = "yds",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                                )
                            }
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
                            color = TmglGold
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("Par", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                                Text("${h.par}", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            }
                            Column {
                                Text("Yardage", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                                Text("${yardage}", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            }
                            Column {
                                Text("Handicap", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                                Text("${h.handicapIndex ?: 1}", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (h.teeBoxes.isNotEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "Tee Boxes",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TmglGold
                            )
                            Spacer(modifier = Modifier.height(8.dp))

                            h.teeBoxes.forEach { tee ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(tee.name, fontSize = 14.sp)
                                    Text("${tee.yardage} yds", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                    Text("Rating: ${tee.rating}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
