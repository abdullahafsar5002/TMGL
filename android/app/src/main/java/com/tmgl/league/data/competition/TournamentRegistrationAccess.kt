package com.tmgl.league.data.competition

import com.tmgl.league.data.model.TournamentRegistration

data class TournamentRegistrationState(
    val isAuthenticated: Boolean = false,
    val playerId: String? = null,
    val registrationId: String? = null,
    val playerCount: Int = 0
) {
    val isRegistered: Boolean
        get() = registrationId != null
}

fun resolveTournamentRegistrationState(
    registrations: List<TournamentRegistration>,
    playerId: String?,
    isAuthenticated: Boolean
): TournamentRegistrationState {
    val resolvedPlayerId = playerId?.trim()?.takeIf { it.isNotEmpty() }
    val registration = resolvedPlayerId
        ?.let { id -> registrations.firstOrNull { it.playerId == id } }
    return TournamentRegistrationState(
        isAuthenticated = isAuthenticated,
        playerId = resolvedPlayerId,
        registrationId = registration?.id,
        playerCount = registrations.size
    )
}

fun canChangeTournamentRegistration(state: TournamentRegistrationState): Boolean =
    state.isAuthenticated && !state.playerId.isNullOrBlank()

fun canEnterTournamentScores(
    state: TournamentRegistrationState,
    canManageTournament: Boolean
): Boolean = canManageTournament || (canChangeTournamentRegistration(state) && state.isRegistered)
