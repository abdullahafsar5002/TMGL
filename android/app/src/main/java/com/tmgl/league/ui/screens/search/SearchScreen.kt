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
import com.tmgl.league.ui.theme.TmglGreen
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.launch

data class SearchResult(val type: String, val id: String, val title: String, val subtitle: String)

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
    val scope = rememberCoroutineScope()

    fun doSearch(q: String) {
        if (q.length < 2) { results = emptyList(); return }
        isSearching = true
        scope.launch {
            val allResults = mutableListOf<SearchResult>()
            try {
                val players = SupabaseConfig.client.from("players")
                    .select() {
                        order("full_name", Order.ASCENDING)
                    }
                    .decodeList<Player>()
                players.filter {
                    it.fullName.contains(q, ignoreCase = true) ||
                    it.playerCode?.contains(q, ignoreCase = true) == true
                }.forEach {
                    allResults.add(SearchResult("player", it.id, it.fullName, "Player"))
                }
            } catch (_: Exception) {}

            try {
                val tournaments = SupabaseConfig.client.from("tournaments")
                    .select()
                    .decodeList<Tournament>()
                tournaments.filter {
                    it.name.contains(q, ignoreCase = true)
                }.forEach {
                    allResults.add(SearchResult("tournament", it.id, it.name, "Tournament"))
                }
            } catch (_: Exception) {}

            results = allResults
            isSearching = false
        }
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
        Column(modifier = Modifier.padding(padding).padding(16.dp)) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it; doSearch(it) },
                label = { Text("Search players, tournaments...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(16.dp))

            if (isSearching) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = TmglGreen)
                }
            } else if (query.length >= 2 && results.isEmpty()) {
                Text("No results found", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 32.dp).fillMaxWidth().wrapContentSize(Alignment.Center))
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
                                Surface(shape = MaterialTheme.shapes.small, color = if (result.type == "player") TmglGreen.copy(alpha = 0.1f) else MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)) {
                                    Text(result.type.replaceFirstChar { it.uppercase() }, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = if (result.type == "player") TmglGreen else MaterialTheme.colorScheme.primary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
