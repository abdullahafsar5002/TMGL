package com.tmgl.league

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.fragment.app.FragmentActivity
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.lifecycleScope
import androidx.navigation.compose.rememberNavController
import com.tmgl.league.auth.BiometricAuthManager
import com.tmgl.league.data.offline.NetworkMonitor
import com.tmgl.league.data.offline.OfflineCache
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.error.GlobalErrorHandler
import com.tmgl.league.notification.NotificationHelper
import com.tmgl.league.ui.navigation.AppNavigation
import com.tmgl.league.ui.navigation.DeepLinkHandler
import com.tmgl.league.ui.navigation.MainScreen
import com.tmgl.league.ui.theme.TmglTheme
import com.tmgl.league.ui.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : FragmentActivity() {
    @Inject lateinit var networkMonitor: NetworkMonitor
    @Inject lateinit var errorHandler: GlobalErrorHandler
    @Inject lateinit var biometricAuthManager: BiometricAuthManager

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        WindowCompat.setDecorFitsSystemWindows(window, false)

        val launchIntent = intent
        val deepLinkUri = launchIntent?.data ?: notificationRouteFor(launchIntent)
        consumeNavigationExtras(launchIntent)

        lifecycleScope.launch {
            NotificationHelper.refreshPreferences(applicationContext)
        }

        setContent {
            TmglTheme {
                val authViewModel: AuthViewModel = hiltViewModel()
                var authState by remember { mutableStateOf<AuthState>(AuthState.Loading) }
                var biometricRequired by remember { mutableStateOf(false) }
                var isUnlocked by remember { mutableStateOf(false) }
                var lockMessage by remember { mutableStateOf<String?>(null) }

                val notificationPermissionLauncher = rememberLauncherForActivityResult(
                    ActivityResultContracts.RequestPermission()
                ) { granted ->
                    if (granted) NotificationHelper.createChannels(applicationContext)
                }

                LaunchedEffect(authState) {
                    if (authState !is AuthState.Loading) {
                        requestNotificationPermission(notificationPermissionLauncher)
                    }
                }

                LaunchedEffect(Unit) {
                    val stored = try {
                        OfflineCache.isBiometricEnabled(applicationContext).first()
                    } catch (_: Exception) {
                        false
                    }
                    biometricAuthManager.setBiometricEnabled(stored)
                    biometricRequired = stored
                    isUnlocked = !stored || !biometricAuthManager.isBiometricAvailable.value
                }

                LaunchedEffect(authViewModel.authState) {
                    authViewModel.authState.collect { state ->
                        if (state !is AuthState.Loading) {
                            authState = state
                        }
                    }
                }

                splashScreen.setKeepOnScreenCondition {
                    authState is AuthState.Loading
                }

                fun authenticate() {
                    biometricAuthManager.authenticate(
                        activity = this@MainActivity,
                        title = "Welcome Back",
                        subtitle = "Authenticate to access TMGL",
                        onSuccess = {
                            lockMessage = null
                            isUnlocked = true
                        },
                        onError = { message ->
                            lockMessage = message
                            isUnlocked = true
                        },
                        onFailed = { }
                    )
                }

                LaunchedEffect(authState, biometricRequired, isUnlocked) {
                    if (authState is AuthState.Authenticated && biometricRequired && !isUnlocked) {
                        authenticate()
                    }
                }

                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .windowInsetsPadding(WindowInsets.systemBars)
                        .consumeWindowInsets(WindowInsets.systemBars)
                ) {
                    when (val state = authState) {
                        is AuthState.Loading -> Unit
                        is AuthState.Authenticated -> {
                            if (!biometricRequired || isUnlocked) {
                                MainScreen(
                                    authState = state,
                                    onAuthStateChanged = { newState -> authState = newState },
                                    networkMonitor = networkMonitor,
                                    errorHandler = errorHandler,
                                    onSignOut = { authViewModel.signOut() },
                                    initialDeepLink = deepLinkUri
                                )
                            } else {
                                LockedContent(
                                    message = lockMessage,
                                    onUnlock = {
                                        lockMessage = null
                                        authenticate()
                                    }
                                )
                            }
                        }
                        is AuthState.Unauthenticated -> {
                            val navController = rememberNavController()
                            AppNavigation(navController = navController)
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val deepLinkUri = intent?.data ?: notificationRouteFor(intent)
        consumeNavigationExtras(intent)
        if (deepLinkUri != null) {
            DeepLinkHandler.handleDeepLink(deepLinkUri)
        }
    }

    private fun requestNotificationPermission(
        launcher: androidx.activity.result.ActivityResultLauncher<String>
    ) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            NotificationHelper.createChannels(this)
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            NotificationHelper.createChannels(this)
            return
        }
        launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }

    private fun notificationRouteFor(intent: Intent?): Uri? {
        if (intent == null) return null
        val screen = intent.getStringExtra(NotificationHelper.EXTRA_NAVIGATE_TO)
            ?.trim()
            ?.lowercase()
            ?.takeIf { value -> value.isNotEmpty() && value.all { it.isLetterOrDigit() || it == '_' } }
            ?: return null
        val screenId = intent.getStringExtra(NotificationHelper.EXTRA_SCREEN_ID)
            ?.trim()
            ?.takeIf { value ->
                value.isNotEmpty() && value.length <= 64 && value.all { it.isLetterOrDigit() || it == '-' || it == '_' }
            }
            .orEmpty()
        val builder = Uri.Builder().scheme("tmgl").authority(screen)
        if (screenId.isNotEmpty()) {
            builder.appendPath(screenId)
        }
        return try {
            builder.build()
        } catch (_: IllegalArgumentException) {
            null
        }
    }

    private fun consumeNavigationExtras(intent: Intent?) {
        if (intent == null) return
        intent.removeExtra(NotificationHelper.EXTRA_NAVIGATE_TO)
        intent.removeExtra(NotificationHelper.EXTRA_SCREEN_ID)
    }
}

@Composable
private fun LockedContent(message: String?, onUnlock: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "TMGL is locked",
                style = MaterialTheme.typography.titleMedium
            )
            message?.let { reason ->
                Text(
                    text = reason,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center
                )
            }
            Button(onClick = onUnlock) {
                Text("Unlock")
            }
        }
    }
}
