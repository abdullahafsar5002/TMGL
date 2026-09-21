package com.tmgl.league

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController
import com.tmgl.league.data.offline.NetworkMonitor
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.error.GlobalErrorHandler
import com.tmgl.league.ui.navigation.AppNavigation
import com.tmgl.league.ui.navigation.MainScreen
import com.tmgl.league.ui.theme.TmglTheme
import com.tmgl.league.ui.viewmodel.AuthViewModel
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var networkMonitor: NetworkMonitor
    @Inject lateinit var errorHandler: GlobalErrorHandler

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        networkMonitor.startMonitoring()

        setContent {
            TmglTheme {
                val authViewModel: AuthViewModel = hiltViewModel()
                var authState by remember { mutableStateOf<AuthState>(AuthState.Loading) }

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

                Surface(modifier = Modifier.fillMaxSize()) {
                    when (val state = authState) {
                        is AuthState.Loading -> { /* Splash handles this */ }
                        is AuthState.Authenticated -> {
                            MainScreen(
                                authState = state,
                                onAuthStateChanged = { newState -> authState = newState },
                                networkMonitor = networkMonitor,
                                errorHandler = errorHandler
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

    override fun onDestroy() {
        super.onDestroy()
        networkMonitor.stopMonitoring()
    }
}
