package com.tmgl.league.ui.navigation

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.runtime.*
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.tmgl.league.data.offline.NetworkMonitor
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.ui.screens.auth.ForgotPasswordScreen
import com.tmgl.league.ui.screens.auth.LoginScreen
import com.tmgl.league.ui.screens.auth.RegisterScreen

@Composable
fun AppNavigation(
    navController: NavHostController,
    authState: AuthState,
    onAuthStateChanged: (AuthState) -> Unit = {},
    onLoginSuccess: () -> Unit = {},
    onRegisterSuccess: () -> Unit = {},
    networkMonitor: NetworkMonitor
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Login.route,
        enterTransition = { fadeIn(animationSpec = tween(300)) },
        exitTransition = { fadeOut(animationSpec = tween(300)) }
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = onLoginSuccess,
                onRegisterClick = {
                    navController.navigate(Screen.Register.route)
                },
                onForgotPasswordClick = {
                    navController.navigate(Screen.ForgotPassword.route)
                }
            )
        }

        composable(Screen.ForgotPassword.route) {
            ForgotPasswordScreen(navController = navController)
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                onRegisterSuccess = onRegisterSuccess,
                onLoginClick = {
                    navController.popBackStack()
                }
            )
        }
    }
}
