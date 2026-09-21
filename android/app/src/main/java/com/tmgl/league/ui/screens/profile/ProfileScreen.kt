package com.tmgl.league.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.tmgl.league.data.model.Profile
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.ui.components.*

@Composable
fun ProfileScreen(onBack: () -> Unit, onSignOut: () -> Unit, onEditProfile: () -> Unit = {}) {
    var authState by remember { mutableStateOf<AuthState>(AuthState.Loading) }
    val authRepository = remember { AuthRepository() }
    var showSignOutDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        authState = authRepository.getCurrentUser()
    }

    if (showSignOutDialog) {
        AlertDialog(
            onDismissRequest = { showSignOutDialog = false },
            title = { Text("Sign Out") },
            text = { Text("Are you sure you want to sign out?") },
            confirmButton = {
                TextButton(onClick = { showSignOutDialog = false; onSignOut() }) {
                    Text("Sign Out", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSignOutDialog = false }) { Text("Cancel") }
            }
        )
    }

    Scaffold(topBar = { TmglTopBar(title = "Profile", onBack = onBack) }) { paddingValues ->
        when (authState) {
            is AuthState.Loading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            is AuthState.Unauthenticated -> {
                Box(modifier = Modifier.padding(paddingValues).fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Not signed in", style = MaterialTheme.typography.bodyLarge)
                        Spacer(modifier = Modifier.height(16.dp))
                        TmglButton(text = "Sign In", onClick = onSignOut)
                    }
                }
            }
            is AuthState.Authenticated -> {
                val state = authState as AuthState.Authenticated
                val profile = state.profile
                Column(
                    modifier = Modifier
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Avatar
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(profile?.avatarUrl)
                                .crossfade(true)
                                .build(),
                            contentDescription = "Profile photo",
                            modifier = Modifier.size(80.dp).clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    }

                    Text(
                        text = profile?.fullName ?: "TMGL Member",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.fillMaxWidth()
                    )

                    TmglCard {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            InfoRow("Email", state.email ?: "—")
                            InfoRow("Role", profile?.role?.name?.replace("_", " ")?.uppercase() ?: "Player")
                            InfoRow("Joined", profile?.createdAt?.take(10) ?: "—")
                        }
                    }

                    TmglButton(
                        text = "Edit Profile",
                        onClick = onEditProfile
                    )

                    TmglButton(
                        text = "Sign Out",
                        onClick = { showSignOutDialog = true }
                    )
                }
            }
        }
    }
}


