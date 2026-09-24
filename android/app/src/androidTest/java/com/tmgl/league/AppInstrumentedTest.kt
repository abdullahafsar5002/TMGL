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

    @Test
    fun loginScreen_showsWelcomeBack() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Welcome Back").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Welcome Back").assertIsDisplayed()
    }

    @Test
    fun loginScreen_showsEmailField() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Email").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
    }

    @Test
    fun loginScreen_showsPasswordField() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Password").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Password").assertIsDisplayed()
    }

    @Test
    fun loginScreen_showsLoginButton() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Log In").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Log In").assertIsDisplayed()
    }

    @Test
    fun loginScreen_showsForgotPassword() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Forgot Password?").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Forgot Password?").assertIsDisplayed()
    }

    @Test
    fun loginScreen_showsSignUpLink() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Don't have an account? Sign Up").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").assertIsDisplayed()
    }

    @Test
    fun loginScreen_showsLogo() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithContentDescription("Toruk Makto Logo").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithContentDescription("Toruk Makto Logo").assertIsDisplayed()
    }

    @Test
    fun loginScreen_canTypeEmail() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Email").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Email").performClick()
        composeTestRule.onNodeWithText("Email").performTextInput("test@example.com")
        composeTestRule.onNodeWithText("test@example.com").assertIsDisplayed()
    }

    @Test
    fun loginScreen_canTypePassword() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Password").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Password").performClick()
        composeTestRule.onNodeWithText("Password").performTextInput("password123")
    }

    @Test
    fun registerScreen_navigatesToRegister() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Don't have an account? Sign Up").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Create Account").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Create Account").assertIsDisplayed()
    }

    @Test
    fun registerScreen_showsAllFields() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Don't have an account? Sign Up").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Full Name").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Full Name").assertIsDisplayed()
        composeTestRule.onNodeWithText("Email").assertIsDisplayed()
        composeTestRule.onNodeWithText("Confirm Password").assertIsDisplayed()
        composeTestRule.onNodeWithText("Sign Up").assertIsDisplayed()
    }

    @Test
    fun registerScreen_canNavigateBackToLogin() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Don't have an account? Sign Up").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Don't have an account? Sign Up").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Already have an account? Log In").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Already have an account? Log In").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Welcome Back").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Welcome Back").assertIsDisplayed()
    }

    @Test
    fun forgotPasswordScreen_navigatesFromLogin() {
        composeTestRule.waitUntil(timeoutMillis = 15_000) {
            composeTestRule.onAllNodesWithText("Forgot Password?").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Forgot Password?").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Reset Password").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Reset Password").assertIsDisplayed()
    }
}
