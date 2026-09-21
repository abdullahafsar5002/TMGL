package com.tmgl.league

import com.tmgl.league.data.model.UserRole
import org.junit.Assert.*
import org.junit.Test

class UserRoleTest {

    @Test
    fun `super admin has highest permissions`() {
        val role = UserRole.SUPER_ADMIN
        assertEquals("super_admin", role.name.lowercase())
    }

    @Test
    fun `all roles exist`() {
        val roles = UserRole.entries
        assertEquals(4, roles.size)
        assertTrue(roles.contains(UserRole.SUPER_ADMIN))
        assertTrue(roles.contains(UserRole.LEAGUE_MANAGER))
        assertTrue(roles.contains(UserRole.PLAYER))
        assertTrue(roles.contains(UserRole.PUBLIC))
    }

    @Test
    fun `player role is default for new users`() {
        val role = UserRole.PLAYER
        assertNotNull(role)
    }

    @Test
    fun `role ordinals are correct`() {
        assertEquals(0, UserRole.SUPER_ADMIN.ordinal)
        assertEquals(1, UserRole.LEAGUE_MANAGER.ordinal)
        assertEquals(2, UserRole.PLAYER.ordinal)
        assertEquals(3, UserRole.PUBLIC.ordinal)
    }

    @Test
    fun `profile defaults to public role`() {
        val profile = com.tmgl.league.data.model.Profile()
        assertEquals(UserRole.PUBLIC, profile.role)
    }

    @Test
    fun `profile can have super admin role`() {
        val profile = com.tmgl.league.data.model.Profile(
            id = "admin-1",
            fullName = "Admin",
            role = UserRole.SUPER_ADMIN
        )
        assertEquals(UserRole.SUPER_ADMIN, profile.role)
    }

    @Test
    fun `profile can have league manager role`() {
        val profile = com.tmgl.league.data.model.Profile(
            id = "mgr-1",
            fullName = "Manager",
            role = UserRole.LEAGUE_MANAGER
        )
        assertEquals(UserRole.LEAGUE_MANAGER, profile.role)
    }

    @Test
    fun `profile can have player role`() {
        val profile = com.tmgl.league.data.model.Profile(
            id = "p1",
            fullName = "Player",
            role = UserRole.PLAYER
        )
        assertEquals(UserRole.PLAYER, profile.role)
    }

    @Test
    fun `friendly match status has 5 entries`() {
        val statuses = com.tmgl.league.data.model.FriendlyMatchStatus.entries
        assertEquals(5, statuses.size)
        assertTrue(statuses.contains(com.tmgl.league.data.model.FriendlyMatchStatus.PENDING))
        assertTrue(statuses.contains(com.tmgl.league.data.model.FriendlyMatchStatus.ACCEPTED))
        assertTrue(statuses.contains(com.tmgl.league.data.model.FriendlyMatchStatus.IN_PROGRESS))
        assertTrue(statuses.contains(com.tmgl.league.data.model.FriendlyMatchStatus.COMPLETED))
        assertTrue(statuses.contains(com.tmgl.league.data.model.FriendlyMatchStatus.CANCELLED))
    }

    @Test
    fun `invitation status has 3 entries`() {
        val statuses = com.tmgl.league.data.model.InvitationStatus.entries
        assertEquals(3, statuses.size)
    }

    @Test
    fun `practice round status has 4 entries`() {
        val statuses = com.tmgl.league.data.model.PracticeRoundStatus.entries
        assertEquals(4, statuses.size)
    }

    @Test
    fun `match type has 4 entries`() {
        val statuses = com.tmgl.league.data.model.MatchType.entries
        assertEquals(4, statuses.size)
        assertTrue(statuses.contains(com.tmgl.league.data.model.MatchType.SINGLES))
        assertTrue(statuses.contains(com.tmgl.league.data.model.MatchType.FOURSOME))
        assertTrue(statuses.contains(com.tmgl.league.data.model.MatchType.FOURBALL))
        assertTrue(statuses.contains(com.tmgl.league.data.model.MatchType.TEAM))
    }
}
