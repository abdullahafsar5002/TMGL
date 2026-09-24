package com.tmgl.league

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MainScreenTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<TestActivity>()

    private fun waitForMainScreen() {
        composeTestRule.waitUntil(timeoutMillis = 10_000) {
            composeTestRule.onAllNodesWithText("TORUK MAKTO").fetchSemanticsNodes().isNotEmpty()
        }
    }

    @Test
    fun bottomNav_showsAllTabs() {
        waitForMainScreen()
        composeTestRule.onNodeWithContentDescription("Home").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Events").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Practice").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Board").assertIsDisplayed()
        composeTestRule.onNodeWithContentDescription("Profile").assertIsDisplayed()
    }

    @Test
    fun bottomNav_navigateToEvents() {
        waitForMainScreen()
        composeTestRule.onNodeWithContentDescription("Events").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Tournaments").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Tournaments").assertIsDisplayed()
    }

    @Test
    fun bottomNav_navigateToPractice() {
        waitForMainScreen()
        composeTestRule.onNodeWithContentDescription("Practice").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Practice Hub").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Practice Hub").assertIsDisplayed()
    }

    @Test
    fun bottomNav_navigateToLeaderboard() {
        waitForMainScreen()
        composeTestRule.onNodeWithContentDescription("Board").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Leaderboard").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Leaderboard").assertIsDisplayed()
    }

    @Test
    fun bottomNav_navigateToProfile() {
        waitForMainScreen()
        composeTestRule.onNodeWithContentDescription("Profile").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Edit Profile").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Edit Profile").assertIsDisplayed()
    }

    @Test
    fun bottomNav_navigateBackToHome() {
        waitForMainScreen()
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

    @Test
    fun home_showsWelcomeGreeting() {
        waitForMainScreen()
        composeTestRule.onNodeWithText("Welcome back,").assertIsDisplayed()
    }

    @Test
    fun home_showsQuickAccess() {
        waitForMainScreen()
        composeTestRule.onNodeWithText("Quick Access").assertIsDisplayed()
    }

    @Test
    fun home_showsTournamentsQuickAccess() {
        waitForMainScreen()
        composeTestRule.onNodeWithText("Tournaments").assertIsDisplayed()
    }

    @Test
    fun home_showsLeaderboardQuickAccess() {
        waitForMainScreen()
        composeTestRule.onNodeWithText("Leaderboard").assertIsDisplayed()
    }

    @Test
    fun home_showsHandicapStat() {
        waitForMainScreen()
        composeTestRule.onAllNodesWithText("Handicap").onFirst().assertIsDisplayed()
    }

    @Test
    fun profile_showsEditProfileButton() {
        waitForMainScreen()
        composeTestRule.onNodeWithContentDescription("Profile").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Edit Profile").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Edit Profile").assertIsDisplayed()
    }

    @Test
    fun profile_showsSignOutButton() {
        waitForMainScreen()
        composeTestRule.onNodeWithContentDescription("Profile").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Sign Out").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Sign Out").assertIsDisplayed()
    }

    @Test
    fun profile_signOutDialog_showsConfirmation() {
        waitForMainScreen()
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

    @Test
    fun tournaments_showsEmptyState() {
        waitForMainScreen()
        composeTestRule.onNodeWithContentDescription("Events").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Tournaments").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Tournaments").assertIsDisplayed()
    }

    @Test
    fun practiceHub_showsEmptyState() {
        waitForMainScreen()
        composeTestRule.onNodeWithContentDescription("Practice").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Practice Hub").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Practice Hub").assertIsDisplayed()
    }

    @Test
    fun leaderboard_showsEmptyState() {
        waitForMainScreen()
        composeTestRule.onNodeWithContentDescription("Board").performClick()
        composeTestRule.waitUntil(timeoutMillis = 5_000) {
            composeTestRule.onAllNodesWithText("Leaderboard").fetchSemanticsNodes().isNotEmpty()
        }
        composeTestRule.onNodeWithText("Leaderboard").assertIsDisplayed()
    }
}
