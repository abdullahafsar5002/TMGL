package com.tmgl.league.ui.screens.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.viewmodel.SettingsViewModel

@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onSignOut: () -> Unit,
    isDarkMode: Boolean = false,
    onDarkModeChanged: (Boolean) -> Unit = {},
    settingsViewModel: SettingsViewModel = hiltViewModel()
) {
    val uiState by settingsViewModel.uiState.collectAsState()
    var showSignOutDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.message) {
        val message = uiState.message ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(message)
        settingsViewModel.consumeMessage()
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

    Scaffold(
        topBar = { TmglTopBar(title = "Settings", onBack = onBack) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            TmglCard {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "App", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    InfoRow("Name", "TMGL")
                    InfoRow("Version", uiState.versionName)
                    InfoRow("Build", uiState.versionCode.toString())
                }
            }

            TmglCard {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Security", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    SettingsItem(
                        title = "Biometric Login",
                        subtitle = if (uiState.isBiometricAvailable) "Use fingerprint or face to login" else "Not available on this device",
                        trailing = {
                            Switch(
                                checked = uiState.isBiometricEnabled,
                                onCheckedChange = { settingsViewModel.setBiometricEnabled(it) },
                                enabled = uiState.isBiometricAvailable
                            )
                        }
                    )
                }
            }

            TmglCard {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Notifications", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    SettingsItem(
                        title = "Push Notifications",
                        subtitle = "Receive tournament and score updates",
                        trailing = {
                            Switch(
                                checked = uiState.notificationsEnabled,
                                onCheckedChange = { settingsViewModel.setNotificationsEnabled(it) }
                            )
                        }
                    )
                    SettingsItem(
                        title = "Notification Sound",
                        subtitle = "Play sound for notifications",
                        trailing = {
                            Switch(
                                checked = uiState.soundEnabled,
                                onCheckedChange = { settingsViewModel.setSoundEnabled(it) },
                                enabled = uiState.notificationsEnabled
                            )
                        }
                    )
                    SettingsItem(
                        title = "Vibration",
                        subtitle = "Vibrate for notifications",
                        trailing = {
                            Switch(
                                checked = uiState.vibrationEnabled,
                                onCheckedChange = { settingsViewModel.setVibrationEnabled(it) },
                                enabled = uiState.notificationsEnabled
                            )
                        }
                    )
                }
            }

            TmglCard {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Appearance", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    SettingsItem(
                        title = "Dark Theme",
                        subtitle = "Use the dark colour scheme",
                        trailing = {
                            Switch(
                                checked = uiState.isDarkMode,
                                onCheckedChange = { settingsViewModel.setDarkMode(it) }
                            )
                        }
                    )
                }
            }

            TmglCard {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Account", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    SettingsItem(
                        title = "Sign Out",
                        subtitle = "Sign out of your account",
                        onClick = { showSignOutDialog = true }
                    )
                }
            }

            TmglCard {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Support", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    SettingsItem(
                        title = "Rate App",
                        subtitle = "Rate TMGL on the Play Store",
                        icon = Icons.Default.Star,
                        onClick = { settingsViewModel.rateApp() }
                    )
                    SettingsItem(
                        title = "Send Feedback",
                        subtitle = "Help us improve the app",
                        icon = Icons.Default.Feedback,
                        onClick = { settingsViewModel.sendFeedback() }
                    )
                    SettingsItem(
                        title = "Privacy Policy",
                        subtitle = "View privacy policy",
                        icon = Icons.Default.Security,
                        onClick = { settingsViewModel.openPrivacyPolicy() }
                    )
                    SettingsItem(
                        title = "Terms of Service",
                        subtitle = "View terms",
                        icon = Icons.Default.Description,
                        onClick = { settingsViewModel.openTerms() }
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsItem(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    onClick: (() -> Unit)? = null,
    trailing: @Composable (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .heightIn(min = 48.dp)
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = title, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, style = MaterialTheme.typography.bodyLarge)
            Text(text = subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        trailing?.invoke()
    }
}
