package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.tmgl.league.ui.components.EmptyState
import com.tmgl.league.ui.theme.TmglGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FlightsScreen(
    tournamentId: String,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Flights") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = TmglGreen,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            EmptyState(
                icon = Icons.Default.Groups,
                title = "Flights Unavailable",
                message = "Flights are not available. The database has no flights table, so " +
                    "flights cannot be stored or read. Pairings are managed from the Pairings screen instead.",
                modifier = Modifier.padding(24.dp)
            )
        }
    }
}
