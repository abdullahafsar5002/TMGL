package com.tmgl.league.ui.screens.friendly

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthState
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FriendlyMatchCreateScreen(navController: NavHostController) {
    val scope = rememberCoroutineScope()
    val authRepository = remember { AuthRepository() }
    var playerName by remember { mutableStateOf("") }
    var opponentEmail by remember { mutableStateOf("") }
    var matchDate by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Friendly Match") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = playerName,
                onValueChange = { playerName = it },
                label = { Text("Your Name") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = opponentEmail,
                onValueChange = { opponentEmail = it },
                label = { Text("Opponent Email") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = matchDate,
                onValueChange = { matchDate = it },
                label = { Text("Date (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth()
            )

            errorMessage?.let {
                Text(text = it, color = MaterialTheme.colorScheme.error)
            }

            Button(
                onClick = {
                    if (playerName.isBlank() || opponentEmail.isBlank()) {
                        errorMessage = "Please fill in all fields"
                        return@Button
                    }
                    isLoading = true; errorMessage = null
                    scope.launch {
                        try {
                            val authState = authRepository.getCurrentUser()
                            val playerId = (authState as? AuthState.Authenticated)?.userId ?: ""
                            SupabaseConfig.client.from("friendly_matches").insert(
                                mapOf(
                                    "created_by" to playerId,
                                    "player1_name" to playerName,
                                    "player2_email" to opponentEmail,
                                    "match_date" to matchDate,
                                    "status" to "pending"
                                )
                            )
                            navController.popBackStack()
                        } catch (e: Exception) {
                            errorMessage = e.message ?: "Failed to create match"
                        }
                        isLoading = false
                    }
                },
                enabled = !isLoading && playerName.isNotBlank() && opponentEmail.isNotBlank(),
                modifier = Modifier.fillMaxWidth()
            ) {
                if (isLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                else Text("Create Match")
            }
        }
    }
}
