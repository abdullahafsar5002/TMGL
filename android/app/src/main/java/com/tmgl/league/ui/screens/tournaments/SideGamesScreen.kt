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
import com.tmgl.league.data.model.SideGame
import com.tmgl.league.ui.theme.TmglGreen
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SideGamesScreen(
    tournamentId: String,
    onBack: () -> Unit
) {
    var games by remember { mutableStateOf<List<SideGame>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showCreateDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(tournamentId) {
        try {
            games = SupabaseConfig.client.from("side_games")
                .select() { filter { eq("tournament_id", tournamentId) } }
                .decodeList<SideGame>()
        } catch (_: Exception) {}
        isLoading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Side Games") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                actions = { IconButton(onClick = { showCreateDialog = true }) { Icon(Icons.Default.Add, "Add Game", tint = Color.White) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TmglGreen, titleContentColor = Color.White, navigationIconContentColor = Color.White)
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = TmglGreen) }
        } else {
            LazyColumn(modifier = Modifier.padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(games) { game ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(game.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text("Type: ${game.type.replaceFirstChar { it.uppercase() }}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (game.entryFee > 0) Text("Entry: $${String.format("%.0f", game.entryFee)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                if (games.isEmpty()) {
                    item {
                        Text("No side games. Add skins, closest-to-pin, or longest drive.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(16.dp))
                    }
                }
            }
        }

        if (showCreateDialog) {
            var gameName by remember { mutableStateOf("") }
            var gameType by remember { mutableStateOf("skins") }
            var entryFee by remember { mutableStateOf("") }
            val types = listOf("skins", "closest_to_pin", "longest_drive", "nassau", "individual_match")
            AlertDialog(
                onDismissRequest = { showCreateDialog = false },
                title = { Text("Add Side Game") },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = gameName, onValueChange = { gameName = it }, label = { Text("Game Name") }, modifier = Modifier.fillMaxWidth())
                        Text("Type", style = MaterialTheme.typography.labelMedium)
                        types.forEach { type ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                RadioButton(selected = gameType == type, onClick = { gameType = type })
                                Text(type.replace("_", " ").replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                        OutlinedTextField(value = entryFee, onValueChange = { entryFee = it.filter { c -> c.isDigit() || c == '.' } }, label = { Text("Entry Fee (optional)") }, modifier = Modifier.fillMaxWidth())
                    }
                },
                confirmButton = {
                    TextButton(onClick = {
                        scope.launch {
                            try {
                                SupabaseConfig.client.from("side_games").insert(mapOf<String, Any>(
                                    "tournament_id" to tournamentId,
                                    "name" to gameName,
                                    "type" to gameType,
                                    "entry_fee" to (entryFee.toDoubleOrNull() ?: 0.0)
                                ))
                                games = SupabaseConfig.client.from("side_games")
                                    .select() { filter { eq("tournament_id", tournamentId) } }
                                    .decodeList<SideGame>()
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
