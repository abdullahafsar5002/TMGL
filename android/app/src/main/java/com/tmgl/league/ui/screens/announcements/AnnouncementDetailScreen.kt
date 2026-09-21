package com.tmgl.league.ui.screens.announcements

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tmgl.league.data.model.Announcement
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.SocialRepository
import com.tmgl.league.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnnouncementDetailScreen(
    announcementId: String,
    onBack: () -> Unit
) {
    var announcement by remember { mutableStateOf<Announcement?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val repository = remember { SocialRepository() }

    LaunchedEffect(announcementId) {
        isLoading = true; error = null
        when (val result = repository.getAnnouncement(announcementId)) {
            is DataResult.Success -> { announcement = result.data; isLoading = false }
            is DataResult.Error -> { error = result.message; isLoading = false }
        }
    }

    Scaffold(
        topBar = { TmglTopBar(title = announcement?.title ?: "Announcement", onBack = onBack) }
    ) { paddingValues ->
        when {
            isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            error != null -> ErrorState(message = error ?: "", modifier = Modifier.padding(paddingValues))
            announcement != null -> {
                val a = announcement ?: return@Scaffold
                Column(
                    modifier = Modifier
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = a.title,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Published: ${a.createdAt.take(10)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.outline
                    )
                    HorizontalDivider()
                    Text(
                        text = a.content,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }
        }
    }
}
