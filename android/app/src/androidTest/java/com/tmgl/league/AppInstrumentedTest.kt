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

    @Test
    fun appPackageName_isCorrect() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("com.tmgl.league", appContext.packageName)
    }

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
}
