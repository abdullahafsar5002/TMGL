package com.tmgl.league.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class FriendlyMatchScore(
    val id: String = "",
    @SerialName("match_player_id") val matchPlayerId: String = "",
    @SerialName("hole_number") val holeNumber: Int = 0,
    val par: Int = 4,
    val score: Int = 0,
    @SerialName("stableford_points") val stablefordPoints: Int? = null,
    @SerialName("created_at") val createdAt: String = ""
)
