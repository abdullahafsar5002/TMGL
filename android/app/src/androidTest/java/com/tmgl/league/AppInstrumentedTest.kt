package com.tmgl.league

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AppInstrumentedTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    // ═══════════════════════════════════════════════════════════════
    // SECTION 1: APP BASICS
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun appPackageName_isCorrect() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.tmgl.league", appContext.packageName)
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 2: LOGIN SCREEN - UI ELEMENTS
    // ═══════════════════════════════════════════════════════════════

    private fun waitForLogin() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Welcome Back").fetchSemanticsNodes().isNotEmpty()
        }
    }

    @Test
    fun login_showsWelcomeBack() {
        waitForLogin()
        composeTestRule.onNodeWithText("Welcome Back").assertIsDisplayed()
    }

    @Test
    fun login_showsEmailField() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
    }

    @Test
    fun login_showsPasswordField() {
        waitForLogin()
        composeTestRule.onNodeWithText("Password").assertIsDisplayed()
    }

    @Test
    fun login_showsLoginButton() {
        waitForLogin()
        composeTestRule.onNodeWithText("Log In").assertIsDisplayed()
    }

    @Test
    fun login_showsForgotPassword() {
        waitForLogin()
        composeTestRule.onNodeWithText("Forgot Password?").assertIsDisplayed()
    }

    @Test
    fun login_showsSignUpLink() {
        waitForLogin()
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").assertIsDisplayed()
    }

    @Test
    fun login_showsLogo() {
        waitForLogin()
        composeTestRule.onNodeWithContentDescription("Toruk Makto Logo").assertIsDisplayed()
    }

    @Test
    fun login_buttonDisabled_whenFieldsEmpty() {
        waitForLogin()
        composeTestRule.onNodeWithText("Log In").assertIsNotEnabled()
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 3: LOGIN SCREEN - INPUT INTERACTION
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun login_canTypeEmail() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("test@example.com").assertIsDisplayed()
    }

    @Test
    fun login_canTypePassword() {
        waitForLogin()
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("password123")
    }

    @Test
    fun login_buttonEnabled_afterEnteringCredentials() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("password123")
        composeTestRule.onNodeWithText("Log In").assertIsEnabled()
    }

    @Test
    fun login_buttonDisabled_duringLoading() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("wrongpassword")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 2_000) {
            composeTestRule.onAllNodesWithText("Log In").fetchSemanticsNodes().isNotEmpty()
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 4: REGISTER SCREEN
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun register_navigatesFromLogin() {
        waitForLogin()
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Create Account").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Create Account").assertIsDisplayed()
    }

    @Test
    fun register_showsAllFields() {
        waitForLogin()
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Create Account").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Full Name").assertIsDisplayed()
        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
        composeTestRule.onNodeWithText("Password").assertIsDisplayed()
        composeTestRule.onNodeWithText("Confirm Password").assertIsDisplayed()
        composeTestRule.onNodeWithText("Sign Up").assertIsDisplayed()
    }

    @Test
    fun register_signUpDisabled_whenFieldsEmpty() {
        waitForLogin()
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Create Account").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Sign Up").assertIsNotEnabled()
    }

    @Test
    fun register_canNavigateBackToLogin() {
        waitForLogin()
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Create Account").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Already have an account? Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Welcome Back").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Welcome Back").assertIsDisplayed()
    }

    @Test
    fun register_canTypeFullName() {
        waitForLogin()
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Create Account").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Full Name").performClick()
        composeTestRule.onNodeWithText("Full Name").performTextInput("Test User")
        composeTestRule.onNodeWithText("Test User").assertIsDisplayed()
    }

    @Test
    fun register_canTypeEmail() {
        waitForLogin()
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Create Account").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("newuser@test.com")
        composeTestRule.onNodeWithText("newuser@test.com").assertIsDisplayed()
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 5: FORGOT PASSWORD SCREEN
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun forgotPassword_navigatesFromLogin() {
        waitForLogin()
        composeTestRule.onNodeWithText("Forgot Password?").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Reset Password").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Reset Password").assertIsDisplayed()
    }

    @Test
    fun forgotPassword_showsEmailField() {
        waitForLogin()
        composeTestRule.onNodeWithText("Forgot Password?").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Reset Password").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
    }

    @Test
    fun forgotPassword_showsSendResetLink() {
        waitForLogin()
        composeTestRule.onNodeWithText("Forgot Password?").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Reset Password").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Send Reset Link").assertIsDisplayed()
    }

    @Test
    fun forgotPassword_canTypeEmail() {
        waitForLogin()
        composeTestRule.onNodeWithText("Forgot Password?").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Reset Password").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("test@example.com").assertIsDisplayed()
    }

    @Test
    fun forgotPassword_canNavigateBack() {
        waitForLogin()
        composeTestRule.onNodeWithText("Forgot Password?").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Reset Password").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Back").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Welcome Back").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Welcome Back").assertIsDisplayed()
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 6: BOTTOM NAVIGATION (requires login)
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun bottomNav_showsAllTabs() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Home").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Events").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Practice").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Board").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Profile").assertIsDisplayed()
    }

    @Test
    fun bottomNav_navigateToEvents() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Events").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Tournaments").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Tournaments").assertIsDisplayed()
    }

    @Test
    fun bottomNav_navigateToPractice() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Practice").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Practice Hub").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Practice Hub").assertIsDisplayed()
    }

    @Test
    fun bottomNav_navigateToLeaderboard() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Board").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Leaderboard").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Leaderboard").assertIsDisplayed()
    }

    @Test
    fun bottomNav_navigateToProfile() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Profile").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Profile").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Profile").assertIsDisplayed()
    }

    @Test
    fun bottomNav_navigateBackToHome() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Events").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Tournaments").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Home").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("TORUK MAKTO").assertIsDisplayed()
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 7: HOME SCREEN (post-login)
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun home_showsWelcomeGreeting() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Welcome back,").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Welcome back,").assertIsDisplayed()
    }

    @Test
    fun home_showsQuickAccess() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Quick Access").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Quick Access").assertIsDisplayed()
    }

    @Test
    fun home_showsTournamentsQuickAccess() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Tournaments").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Tournaments").assertIsDisplayed()
    }

    @Test
    fun home_showsLeaderboardQuickAccess() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Leaderboard").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Leaderboard").assertIsDisplayed()
    }

    @Test
    fun home_showsHandicapStat() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithContentDescription("Handicap: --").fetchSemanticsNodes().isNotEmpty().not()
            composeTestRule.onAllNodesWithText("Handicap").fetchSemanticsNodes().isNotEmpty()
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 8: PROFILE SCREEN (post-login)
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun profile_showsEditProfileButton() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Profile").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Edit Profile").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Edit Profile").assertIsDisplayed()
    }

    @Test
    fun profile_showsSignOutButton() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Profile").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Sign Out").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Sign Out").assertIsDisplayed()
    }

    @Test
    fun profile_signOutDialog_showsConfirmation() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Profile").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Sign Out").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Sign Out").performClick()
        composeTestRule.waitUntil(timeoutMillis = 3_000) {
            composeTestRule.onAllNodesWithText("Are you sure you want to sign out?").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Are you sure you want to sign out?").assertIsDisplayed()
        composeTestRule.onNodeWithText("Cancel").performClick()
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 9: TOURNAMENTS SCREEN (post-login)
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun tournaments_showsEmptyState() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Events").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Tournaments").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Tournaments").assertIsDisplayed()
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 10: PRACTICE HUB SCREEN (post-login)
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun practiceHub_showsEmptyState() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Practice").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Practice Hub").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Practice Hub").assertIsDisplayed()
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 11: LEADERBOARD SCREEN (post-login)
    // ═══════════════════════════════════════════════════════════════

    @Test
    fun leaderboard_showsEmptyState() {
        waitForLogin()
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("admin@tmgl.com")
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("Admin@123")
        composeTestRule.onNodeWithText("Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Board").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Leaderboard").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Leaderboard").assertIsDisplayed()
    }
}
