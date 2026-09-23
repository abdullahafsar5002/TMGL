package com.tmgl.league

import android.content.Intent
import android.os.Bundle
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController
import com.tmgl.league.auth.BiometricAuthManager
import com.tmgl.league.data.offline.NetworkMonitor
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.error.GlobalErrorHandler
import com.tmgl.league.ui.navigation.AppNavigation
import com.tmgl.league.ui.navigation.DeepLinkHandler
import com.tmgl.league.ui.navigation.MainScreen
import com.tmgl.league.ui.theme.TmglTheme
import com.tmgl.league.ui.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var networkMonitor: NetworkMonitor
    @Inject lateinit var errorHandler: GlobalErrorHandler
    @Inject lateinit var biometricAuthManager: BiometricAuthManager

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        WindowCompat.setDecorFitsSystemWindows(window, false)
        networkMonitor.startMonitoring()

        val deepLinkUri = intent?.data

        setContent {
            TmglTheme {
                val authViewModel: AuthViewModel = hiltViewModel()
                var authState by remember { mutableStateOf<AuthState>(AuthState.Loading) }
                var showBiometricPrompt by remember { mutableStateOf(false) }

                LaunchedEffect(authViewModel.authState) {
                    authViewModel.authState.collect { state ->
                        if (state !is AuthState.Loading) {
                            authState = state
                            if (state is AuthState.Authenticated && biometricAuthManager.isBiometricEnabled.value) {
                                showBiometricPrompt = true
                            }
                        }
                    }
                }

                splashScreen.setKeepOnScreenCondition {
                    authState is AuthState.Loading
                }

                if (showBiometricPrompt && authState is AuthState.Authenticated) {
                    biometricAuthManager.authenticate(
                        activity = this@MainActivity,
                        title = "Welcome Back",
                        subtitle = "Authenticate to access TMGL",
                        onSuccess = {
                            showBiometricPrompt = false
                        },
                        onError = { showBiometricPrompt = false },
                        onFailed = { showBiometricPrompt = false }
                    )
                }

                Surface(modifier = Modifier.fillMaxSize()) {
                    when (val state = authState) {
                        is AuthState.Loading -> { /* Splash handles this */ }
                        is AuthState.Authenticated -> {
                            MainScreen(
                                authState = state,
                                onAuthStateChanged = { newState -> authState = newState },
                                networkMonitor = networkMonitor,
                                errorHandler = errorHandler,
                                initialDeepLink = deepLinkUri
                            )
                        }
                        is AuthState.Unauthenticated -> {
                            val navController = rememberNavController()
                            AppNavigation(
                                navController = navController,
                                authState = state,
                                onAuthStateChanged = { newState -> authState = newState },
                                networkMonitor = networkMonitor
                            )
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val deepLinkUri = intent?.data
        if (deepLinkUri != null) {
            // Handle deep link when app is already running
            DeepLinkHandler.handleDeepLink(deepLinkUri)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        networkMonitor.stopMonitoring()
    }

    companion object {
        fun performHapticClick(view: View) {
            view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
        }

        fun performHapticLongPress(view: View) {
            view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        }

        fun performHapticError(view: View) {
            view.performHapticFeedback(HapticFeedbackConstants.REJECT)
        }
    }
}
