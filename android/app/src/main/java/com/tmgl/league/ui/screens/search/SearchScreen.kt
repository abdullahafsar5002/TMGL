package com.tmgl.league.ui.screens.search

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Player
import com.tmgl.league.data.model.Tournament
import com.tmgl.league.data.model.TournamentStatus
import com.tmgl.league.ui.theme.TmglGreen
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.delay

private const val MIN_QUERY_LENGTH = 2
private const val SEARCH_DEBOUNCE_MS = 300L
private const val SEARCH_RESULT_LIMIT = 25L
private const val PLAYER_COLUMNS = "id,full_name,player_code"
private const val TOURNAMENT_COLUMNS = "id,name,status"

data class SearchResult(val type: String, val id: String, val title: String, val subtitle: String)

private fun likePattern(query: String): String =
    "%" + query
        .replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_") + "%"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    onBack: () -> Unit,
    onPlayerClick: (String) -> Unit,
    onTournamentClick: (String) -> Unit
) {
    var query by rememberSaveable { mutableStateOf("") }
    var results by remember { mutableStateOf<List<SearchResult>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }

    LaunchedEffect(query) {
        val term = query.trim()
        if (term.length < MIN_QUERY_LENGTH) {
            results = emptyList()
            isSearching = false
            return@LaunchedEffect
        }
        delay(SEARCH_DEBOUNCE_MS)
        isSearching = true
        val pattern = likePattern(term)
        val players = linkedMapOf<String, Player>()

        for (column in listOf("full_name", "player_code")) {
            try {
                SupabaseConfig.client.from("players")
                    .select(Columns.raw(PLAYER_COLUMNS)) {
                        filter { ilike(column, pattern) }
                        order("full_name", Order.ASCENDING)
                        limit(SEARCH_RESULT_LIMIT)
                    }
                    .decodeList<Player>()
                    .forEach { player -> players.getOrPut(player.id) { player } }
            } catch (_: Exception) {}
            if (players.size >= SEARCH_RESULT_LIMIT) break
        }

        val tournaments = try {
            SupabaseConfig.client.from("tournaments")
                .select(Columns.raw(TOURNAMENT_COLUMNS)) {
                    filter {
                        ilike("name", pattern)
                        neq("status", TournamentStatus.CANCELLED.name.lowercase())
                    }
                    order("name", Order.ASCENDING)
                    limit(SEARCH_RESULT_LIMIT)
                }
                .decodeList<Tournament>()
        } catch (_: Exception) {
            emptyList()
        }

        results = buildList {
            players.values.forEach { add(SearchResult("player", it.id, it.fullName, "Player")) }
            tournaments.forEach { add(SearchResult("tournament", it.id, it.name, "Tournament")) }
        }.take(SEARCH_RESULT_LIMIT.toInt())
        isSearching = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Search") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = TmglGreen, titleContentColor = MaterialTheme.colorScheme.onPrimary, navigationIconContentColor = MaterialTheme.colorScheme.onPrimary)
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp)) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text("Search players, tournaments...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(16.dp))

            when {
                isSearching -> Box(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = TmglGreen)
                }
                query.trim().length >= MIN_QUERY_LENGTH && results.isEmpty() -> Text(
                    "No results found",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 32.dp).fillMaxWidth().wrapContentSize(Alignment.Center)
                )
                else -> LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(results) { result ->
                        Card(
                            modifier = Modifier.fillMaxWidth().clickable {
                                if (result.type == "player") onPlayerClick(result.id)
                                else onTournamentClick(result.id)
                            },
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(result.title, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold)
                                    Text(result.subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Surface(
                                    shape = MaterialTheme.shapes.small,
                                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                                ) {
                                    Text(
                                        text = result.type.replaceFirstChar { it.uppercase() },
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.primary
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
