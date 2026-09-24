package com.tmgl.league

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.fragment.app.FragmentActivity
import com.tmgl.league.data.offline.NetworkMonitor
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.model.Profile
import com.tmgl.league.data.model.UserRole
import com.tmgl.league.data.error.GlobalErrorHandler
import com.tmgl.league.ui.navigation.MainScreen
import com.tmgl.league.ui.theme.TmglTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class TestActivity : FragmentActivity() {
    @Inject lateinit var networkMonitor: NetworkMonitor
    @Inject lateinit var errorHandler: GlobalErrorHandler

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        networkMonitor.startMonitoring()
        setContent {
            TmglTheme {
                MainScreen(
                    authState = AuthState.Authenticated(
                        userId = "test-user-id",
                        email = "test@tmgl.com",
                        profile = Profile(
                            id = "test-user-id",
                            fullName = "Test Admin",
                            role = UserRole.SUPER_ADMIN
                        )
                    ),
                    onAuthStateChanged = {},
                    networkMonitor = networkMonitor,
                    errorHandler = errorHandler
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        networkMonitor.stopMonitoring()
    }
}
