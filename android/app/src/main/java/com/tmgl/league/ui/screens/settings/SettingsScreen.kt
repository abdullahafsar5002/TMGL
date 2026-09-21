package com.tmgl.league.ui.screens.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.platform.LocalContext
import com.tmgl.league.BuildConfig
import com.tmgl.league.ui.components.*

@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onSignOut: () -> Unit,
    isDarkMode: Boolean = false,
    onDarkModeChanged: (Boolean) -> Unit = {}
) {
    var showSignOutDialog by remember { mutableStateOf(false) }
    val context = LocalContext.current

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

    Scaffold(topBar = { TmglTopBar(title = "Settings", onBack = onBack) }) { paddingValues ->
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
                    InfoRow("Version", BuildConfig.VERSION_NAME)
                    InfoRow("Build", BuildConfig.VERSION_CODE.toString())
                }
            }

            TmglCard {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Account", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    TmglButton(
                        text = "Sign Out",
                        onClick = onSignOut
                    )
                }
            }

            TmglCard {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Appearance", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    SettingsItem(
                        title = "Dark Theme",
                        subtitle = "Follow system setting",
                        trailing = {
                            Switch(checked = isDarkMode, onCheckedChange = onDarkModeChanged)
                        }
                    )
                }
            }

            TmglCard {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "About", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    SettingsItem(
                        title = "Privacy Policy",
                        subtitle = "View privacy policy",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://tmgl.app/privacy"))
                            context.startActivity(intent)
                        }
                    )
                    SettingsItem(
                        title = "Terms of Service",
                        subtitle = "View terms",
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://tmgl.app/terms"))
                            context.startActivity(intent)
                        }
                    )
                    SettingsItem(
                        title = "About",
                        subtitle = "TMGL v1.0.0 - Toruk Maktu Golf League",
                        onClick = { }
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsItem(title: String, subtitle: String, onClick: (() -> Unit)? = null, trailing: @Composable (() -> Unit)? = null) {
    Row(
        modifier = Modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, style = MaterialTheme.typography.bodyLarge)
            Text(text = subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        trailing?.invoke()
    }
}
