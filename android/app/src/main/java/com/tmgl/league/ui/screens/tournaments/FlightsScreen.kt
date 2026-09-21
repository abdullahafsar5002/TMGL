package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Flight
import com.tmgl.league.data.model.Player
import com.tmgl.league.ui.theme.TmglGreen
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FlightsScreen(
    tournamentId: String,
    onBack: () -> Unit
) {
    var flights by remember { mutableStateOf<List<Flight>>(emptyList()) }
    var players by remember { mutableStateOf<List<Player>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showCreateDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(tournamentId) {
        try {
            flights = SupabaseConfig.client.from("flights")
                .select() { filter { eq("tournament_id", tournamentId) } }
                .decodeList<Flight>()
            players = SupabaseConfig.client.from("players").select().decodeList<Player>()
        } catch (_: Exception) {}
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Flights") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = {
                    IconButton(onClick = { showCreateDialog = true }) {
                        Icon(Icons.Default.Add, "Create Flight", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TmglGreen, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = TmglGreen) }
        } else {
            LazyColumn(modifier = Modifier.padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(flights) { flight ->
                    val hcMin = flight.handicapMin?.toInt() ?: 0
                    val hcMax = flight.handicapMax?.toInt() ?: 54
                    val playersInFlight = players.filter { p ->
                        val hc = p.handicapIndex ?: 0.0
                        hc >= hcMin && hc <= hcMax
                    }
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(flight.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("Handicap: $hcMin - $hcMax", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("${playersInFlight.size} players", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                if (flights.isEmpty()) {
                    item {
                        Text("No flights created. Flights group players by skill level.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(16.dp))
                    }
                }
            }
        }

        if (showCreateDialog) {
            var flightName by remember { mutableStateOf("") }
            var hcMin by remember { mutableStateOf("0") }
            var hcMax by remember { mutableStateOf("18") }
            AlertDialog(
                onDismissRequest = { showCreateDialog = false },
                title = { Text("Create Flight") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = flightName, onValueChange = { flightName = it }, label = { Text("Flight Name") }, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(value = hcMin, onValueChange = { hcMin = it.filter { c -> c.isDigit() || c == '.' } }, label = { Text("Min Handicap") }, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(value = hcMax, onValueChange = { hcMax = it.filter { c -> c.isDigit() || c == '.' } }, label = { Text("Max Handicap") }, modifier = Modifier.fillMaxWidth())
                    }
                },
                confirmButton = {
                    TextButton(onClick = {
                        scope.launch {
                            try {
                                SupabaseConfig.client.from("flights").insert(mapOf<String, Any>(
                                    "tournament_id" to tournamentId,
                                    "name" to flightName,
                                    "handicap_min" to (hcMin.toDoubleOrNull() ?: 0.0),
                                    "handicap_max" to (hcMax.toDoubleOrNull() ?: 18.0)
                                ))
                                flights = SupabaseConfig.client.from("flights")
                                    .select() { filter { eq("tournament_id", tournamentId) } }
                                    .decodeList<Flight>()
                            } catch (_: Exception) {}
                        }
                        showCreateDialog = false
                    }) { Text("Create") }
                },
                dismissButton = { TextButton(onClick = { showCreateDialog = false }) { Text("Cancel") } }
            )
        }
    }
}
