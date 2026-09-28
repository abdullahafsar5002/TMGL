package com.tmgl.league.ui.screens.tournaments

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Round
import com.tmgl.league.data.pairing.FlightsBuilder
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.ui.theme.TmglGreen
import com.tmgl.league.ui.viewmodel.CompetitionViewModel
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.SerialName

data class FlightPlayerCard(
    val playerId: String,
    val name: String,
    val handicapIndex: Double?,
    val pairingNo: Int,
    val teeTime: String?
)

data class FlightCard(
    val id: String,
    val name: String,
    val orderIndex: Int,
    val members: List<FlightPlayerCard>
)

@kotlinx.serialization.Serializable
private data class FlightRow(
    val id: String = "",
    val name: String = "",
    @SerialName("order_index") val orderIndex: Int = 0
)

@kotlinx.serialization.Serializable
private data class FlightPlayerRow(
    @SerialName("flight_id") val flightId: String = "",
    @SerialName("player_id") val playerId: String = "",
    @SerialName("pairing_no") val pairingNo: Int = 1,
    @SerialName("tee_time") val teeTime: String? = null
)

@kotlinx.serialization.Serializable
private data class PlayerRow(
    val id: String = "",
    @SerialName("full_name") val fullName: String = "",
    @SerialName("handicap_index") val handicapIndex: Double? = null
)

private fun String?.normalizedTeeTime(): String? {
    val raw = this?.trim().orEmpty()
    if (raw.isEmpty()) return null
    return FlightsBuilder.formatTeeTime(FlightsBuilder.parseTeeTime(raw))
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FlightsScreen(
    tournamentId: String,
    onBack: () -> Unit
) {
    var rounds by remember { mutableStateOf<List<Round>>(emptyList()) }
    var selectedRoundId by remember { mutableStateOf<String?>(null) }
    var flightGroups by remember { mutableStateOf<List<FlightCard>>(emptyList()) }
    var isLoadingRounds by remember { mutableStateOf(true) }
    var isLoadingFlights by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var reloadToken by remember { mutableIntStateOf(0) }
    val viewModel: CompetitionViewModel = hiltViewModel()
    val repository = viewModel.repository

    LaunchedEffect(tournamentId, reloadToken) {
        isLoadingRounds = true
        errorMessage = null
        when (val result = repository.getRoundsByTournament(tournamentId)) {
            is DataResult.Success -> {
                rounds = result.data
                selectedRoundId = result.data.firstOrNull()?.id
                if (result.data.isEmpty()) {
                    errorMessage = "This event has no rounds yet, so there are no flights to show."
                }
            }
            is DataResult.Error -> {
                rounds = emptyList()
                errorMessage = result.message
            }
        }
        isLoadingRounds = false
    }

    LaunchedEffect(selectedRoundId, reloadToken) {
        val roundId = selectedRoundId
        flightGroups = emptyList()
        if (roundId.isNullOrBlank()) return@LaunchedEffect
        isLoadingFlights = true
        errorMessage = null
        when (val result = FlightsLoader.load(roundId)) {
            is FlightsLoader.Result.Success -> flightGroups = result.flights
            is FlightsLoader.Result.Error -> errorMessage = result.message
        }
        isLoadingFlights = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Flights") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(onClick = { reloadToken++ }) {
                        Text("Refresh", color = Color.White)
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
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (rounds.size > 1) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(rounds, key = { it.id }) { round ->
                        FilterChip(
                            selected = round.id == selectedRoundId,
                            onClick = { selectedRoundId = round.id },
                            label = { Text(roundLabel(round)) }
                        )
                    }
                }
            }

            val isLoading = isLoadingRounds || isLoadingFlights
            when {
                isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = TmglGreen)
                    }
                }

                errorMessage != null && flightGroups.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Outlined.CloudOff,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(40.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Could not load flights",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = errorMessage ?: "Unknown error",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { reloadToken++ },
                            colors = ButtonDefaults.buttonColors(containerColor = TmglGreen)
                        ) {
                            Text("Try again")
                        }
                    }
                }

                flightGroups.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Outlined.Groups,
                            contentDescription = null,
                            tint = TmglGreen,
                            modifier = Modifier.size(40.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "No flights created",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Flights group players into tee times. Generate them from the round's pairings screen.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(flightGroups, key = { it.id }) { flight ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = flight.name,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Text(
                                            text = "${flight.members.size} players",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                    HorizontalDivider()
                                    flight.members.forEach { member ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Surface(
                                                shape = MaterialTheme.shapes.small,
                                                color = MaterialTheme.colorScheme.primaryContainer
                                            ) {
                                                Text(
                                                    text = "${member.pairingNo}",
                                                    style = MaterialTheme.typography.labelMedium,
                                                    fontWeight = FontWeight.Bold,
                                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(12.dp))
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = member.name,
                                                    style = MaterialTheme.typography.bodyLarge
                                                )
                                                Text(
                                                    text = member.handicapIndex?.let {
                                                        "HC ${String.format("%.1f", it)}"
                                                    } ?: "HC n/a",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                            member.teeTime?.let { tee ->
                                                Text(
                                                    text = tee,
                                                    style = MaterialTheme.typography.titleSmall,
                                                    fontWeight = FontWeight.Bold,
                                                    color = TmglGreen
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
    }
}

private fun roundLabel(round: Round): String =
    round.name.takeIf { it.isNotBlank() } ?: "Round ${round.roundNumber}"

private object FlightsLoader {

    sealed class Result {
        data class Success(val flights: List<FlightCard>) : Result()
        data class Error(val message: String) : Result()
    }

    suspend fun load(roundId: String): Result {
        return try {
            val flightRows = SupabaseConfig.client
                .from("flights")
                .select(Columns.raw("id, name, order_index")) {
                    filter { eq("round_id", roundId) }
                    order("order_index", Order.ASCENDING)
                }
                .decodeList<FlightRow>()

            if (flightRows.isEmpty()) return Result.Success(emptyList())

            val flightIds = flightRows.map { it.id }.filter { it.isNotBlank() }
            val memberRows = if (flightIds.isEmpty()) {
                emptyList()
            } else {
                SupabaseConfig.client
                    .from("flight_players")
                    .select(Columns.raw("flight_id, player_id, pairing_no, tee_time")) {
                        filter { isIn("flight_id", flightIds) }
                        order("pairing_no", Order.ASCENDING)
                    }
                    .decodeList<FlightPlayerRow>()
            }

            val playerIds = memberRows.map { it.playerId }.filter { it.isNotBlank() }.distinct()
            val players = if (playerIds.isEmpty()) {
                emptyList()
            } else {
                SupabaseConfig.client
                    .from("players")
                    .select(Columns.raw("id, full_name, handicap_index")) {
                        filter { isIn("id", playerIds) }
                    }
                    .decodeList<PlayerRow>()
            }
            val playersById = players.associateBy { it.id }
            val membersByFlight = memberRows.groupBy { it.flightId }

            val flights = flightRows
                .sortedWith(compareBy({ it.orderIndex }, { it.name }))
                .map { flight ->
                    val members = membersByFlight[flight.id]
                        .orEmpty()
                        .sortedWith(compareBy({ it.pairingNo }, { playersById[it.playerId]?.fullName.orEmpty() }))
                        .map { member ->
                            val player = playersById[member.playerId]
                            FlightPlayerCard(
                                playerId = member.playerId,
                                name = player?.fullName ?: "Player",
                                handicapIndex = player?.handicapIndex,
                                pairingNo = member.pairingNo,
                                teeTime = member.teeTime.normalizedTeeTime()
                            )
                        }
                    FlightCard(
                        id = flight.id,
                        name = flight.name,
                        orderIndex = flight.orderIndex,
                        members = members
                    )
                }
            Result.Success(flights)
        } catch (e: Exception) {
            Result.Error(e.message ?: "Failed to load flights")
        }
    }
}
