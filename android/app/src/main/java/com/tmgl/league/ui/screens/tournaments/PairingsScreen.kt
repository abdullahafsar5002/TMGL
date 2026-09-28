package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Player
import com.tmgl.league.data.pairing.FlightsBuilder
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.theme.TmglGreen
import com.tmgl.league.ui.viewmodel.CompetitionViewModel
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
private data class TournamentRegistrationRow(
    val id: String = "",
    @SerialName("player_id") val playerId: String = ""
)

@Serializable
private data class RoundPairingConfig(
    val id: String = "",
    @SerialName("tee_interval_minutes") val teeIntervalMinutes: Int? = null,
    @SerialName("first_tee_time") val firstTeeTime: String? = null
)

@Serializable
private data class TournamentFlightConfig(
    val id: String = "",
    @SerialName("flight_count") val flightCount: Int? = null
)

@Serializable
private data class ExistingFlightRow(
    val id: String = ""
)

@Serializable
private data class PersistedFlightRow(
    val id: String = ""
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PairingsScreen(
    tournamentId: String,
    roundId: String,
    onBack: () -> Unit
) {
    var registeredPlayers by remember { mutableStateOf<List<Player>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var flightCount by remember { mutableStateOf(FlightsBuilder.DEFAULT_FLIGHT_COUNT) }
    var firstTeeTime by remember { mutableStateOf(FlightsBuilder.formatTeeTime(FlightsBuilder.DEFAULT_FIRST_TEE_MINUTES)) }
    var intervalMinutes by remember { mutableStateOf(FlightsBuilder.DEFAULT_TEE_INTERVAL_MINUTES) }
    var plans by remember { mutableStateOf<List<FlightsBuilder.FlightPlan>>(emptyList()) }
    var message by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var reloadToken by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val viewModel: CompetitionViewModel = hiltViewModel()
    val repository = viewModel.repository

    LaunchedEffect(tournamentId, roundId, reloadToken) {
        isLoading = true
        message = null
        errorMessage = null
        try {
            val registrations = SupabaseConfig.client
                .from("tournament_registrations")
                .select(Columns.raw("id, player_id")) {
                    filter { eq("tournament_id", tournamentId) }
                }
                .decodeList<TournamentRegistrationRow>()
            val playerIds = registrations.map { it.playerId }.filter { it.isNotBlank() }.distinct()
            registeredPlayers = if (playerIds.isEmpty()) {
                emptyList()
            } else {
                SupabaseConfig.client
                    .from("players")
                    .select(Columns.raw("id, auth_user_id, full_name, phone, handicap_index, status, player_code, join_date, created_at, updated_at")) {
                        filter { isIn("id", playerIds) }
                    }
                    .decodeList<Player>()
            }

            val roundConfig = SupabaseConfig.client
                .from("rounds")
                .select(Columns.raw("id, tee_interval_minutes, first_tee_time")) {
                    filter { eq("id", roundId) }
                }
                .decodeList<RoundPairingConfig>()
                .firstOrNull()
            val tournamentConfig = SupabaseConfig.client
                .from("tournaments")
                .select(Columns.raw("id, flight_count")) {
                    filter { eq("id", tournamentId) }
                }
                .decodeList<TournamentFlightConfig>()
                .firstOrNull()

            flightCount = FlightsBuilder.resolveFlightCount(
                requested = tournamentConfig?.flightCount,
                playerCount = registeredPlayers.size
            )
            intervalMinutes = roundConfig?.teeIntervalMinutes?.takeIf { it > 0 }
                ?: FlightsBuilder.DEFAULT_TEE_INTERVAL_MINUTES
            firstTeeTime = FlightsBuilder.formatTeeTime(
                FlightsBuilder.parseTeeTime(roundConfig?.firstTeeTime)
            )
        } catch (e: Exception) {
            registeredPlayers = emptyList()
            errorMessage = e.message ?: "Failed to load registered players"
        }
        isLoading = false
    }

    fun persistPairings() {
        if (isSaving) return
        if (registeredPlayers.isEmpty()) {
            errorMessage = "No registered players to pair up."
            return
        }
        val seeds = registeredPlayers.map {
            FlightsBuilder.PairingPlayer(
                playerId = it.id,
                fullName = it.fullName,
                handicapIndex = it.handicapIndex
            )
        }
        val built = FlightsBuilder.buildFlights(
            players = seeds,
            flightCount = flightCount,
            firstTeeTime = firstTeeTime,
            intervalMinutes = intervalMinutes
        )
        if (built.isEmpty()) {
            errorMessage = "Nothing to save: no registered players."
            return
        }
        scope.launch {
            isSaving = true
            errorMessage = null
            message = null
            val result = PairingsWriter.replaceFlights(
                roundId = roundId,
                tournamentId = tournamentId,
                plans = built
            )
            when (result) {
                is PairingsWriter.Result.Success -> {
                    plans = built
                    message = "Saved ${built.size} flight(s) and ${built.sumOf { it.members.size }} players."
                }
                is PairingsWriter.Result.Error -> errorMessage = result.message
            }
            isSaving = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pairings & Tee Times") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = TmglGreen,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TmglGreen)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                "Registered Players: ${registeredPlayers.size}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "Pairings are ordered by handicap index and saved to the round, so everyone sees the same tee times.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            OutlinedTextField(
                                value = flightCount.toString(),
                                onValueChange = { value ->
                                    flightCount = value.filter { it.isDigit() }.toIntOrNull()
                                        ?.coerceIn(1, 10)
                                        ?: flightCount
                                },
                                label = { Text("Flights") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = firstTeeTime,
                                onValueChange = { value -> firstTeeTime = value.take(5) },
                                label = { Text("First tee time (HH:MM)") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = intervalMinutes.toString(),
                                onValueChange = { value ->
                                    intervalMinutes = value.filter { it.isDigit() }.toIntOrNull()
                                        ?.takeIf { it in 3..30 }
                                        ?: intervalMinutes
                                },
                                label = { Text("Interval (minutes)") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )

                            Button(
                                onClick = { persistPairings() },
                                enabled = !isSaving,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(if (isSaving) "Saving..." else "Generate & Save Flights")
                            }
                        }
                    }
                }

                if (errorMessage != null) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.errorContainer
                            )
                        ) {
                            Text(
                                text = errorMessage ?: "",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                    }
                }

                if (message != null) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.secondaryContainer
                            )
                        ) {
                            Text(
                                text = message ?: "",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                    }
                }

                if (plans.isEmpty() && errorMessage == null) {
                    item {
                        Text(
                            text = if (registeredPlayers.isEmpty()) {
                                "No registered players for this event yet."
                            } else {
                                "No flights saved for this round yet. Set the options above and tap Generate & Save Flights."
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                items(plans, key = { it.name }) { plan ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.width(80.dp)
                            ) {
                                Text(
                                    plan.teeTime,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = TmglGreen
                                )
                                Text(
                                    plan.name,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            VerticalDivider(
                                modifier = Modifier.height(60.dp).padding(horizontal = 8.dp)
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                plan.members.forEach { member ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "#${member.pairingNo}",
                                            style = MaterialTheme.typography.labelMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = TmglGreen,
                                            modifier = Modifier.width(28.dp)
                                        )
                                        Text(
                                            text = member.fullName,
                                            style = MaterialTheme.typography.bodyMedium,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Text(
                                            text = member.handicapIndex?.let {
                                                String.format("%.1f", it)
                                            } ?: "n/a",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private object PairingsWriter {

    sealed class Result {
        data class Success(val flightCount: Int) : Result()
        data class Error(val message: String) : Result()
    }

    suspend fun replaceFlights(
        roundId: String,
        tournamentId: String,
        plans: List<FlightsBuilder.FlightPlan>
    ): Result {
        return try {
            val existing = SupabaseConfig.client
                .from("flights")
                .select(Columns.raw("id")) {
                    filter { eq("round_id", roundId) }
                }
                .decodeList<ExistingFlightRow>()
                .map { it.id }
                .filter { it.isNotBlank() }

            if (existing.isNotEmpty()) {
                SupabaseConfig.client
                    .from("flight_players")
                    .delete { filter { isIn("flight_id", existing) } }
                SupabaseConfig.client
                    .from("flights")
                    .delete { filter { isIn("id", existing) } }
            }

            val flightIdsByName = mutableMapOf<String, String>()
            for (plan in plans) {
                val inserted = SupabaseConfig.client
                    .from("flights")
                    .insert(
                        mapOf<String, Any>(
                            "round_id" to roundId,
                            "tournament_id" to tournamentId,
                            "name" to plan.name,
                            "order_index" to (plan.orderIndex + 1)
                        )
                    ) { select() }
                    .decodeList<PersistedFlightRow>()
                    .firstOrNull()
                val flightId = inserted?.id?.takeIf { it.isNotBlank() }
                if (flightId == null) {
                    return Result.Error("Failed to save ${plan.name}. Check your event manager permissions.")
                }
                flightIdsByName[plan.name] = flightId
            }

            val members = plans.flatMap { plan ->
                val flightId = flightIdsByName[plan.name] ?: return@flatMap emptyList()
                plan.members.map { member ->
                    mapOf<String, Any>(
                        "flight_id" to flightId,
                        "player_id" to member.playerId,
                        "pairing_no" to (member.pairingNo ?: 1),
                        "tee_time" to plan.teeTime
                    )
                }
            }

            if (members.isNotEmpty()) {
                SupabaseConfig.client.from("flight_players").insert(members)
            }

            Result.Success(flightIdsByName.size)
        } catch (e: Exception) {
            Result.Error(e.message ?: "Failed to save flights")
        }
    }
}
