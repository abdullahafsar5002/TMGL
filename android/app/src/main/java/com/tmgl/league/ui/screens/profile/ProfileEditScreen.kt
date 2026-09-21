package com.tmgl.league.ui.screens.profile

import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.theme.TmglGreen
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
private data class ProfileUpdate(
    @SerialName("full_name") val fullName: String,
    val phone: String? = null,
    @SerialName("handicap_index") val handicapIndex: Double? = null
)

@Composable
fun ProfileEditScreen(onBack: () -> Unit) {
    var authState by remember { mutableStateOf<AuthState>(AuthState.Loading) }
    val authRepository = remember { AuthRepository() }
    val scope = rememberCoroutineScope()

    var fullName by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var handicap by rememberSaveable { mutableStateOf("") }
    var avatarUrl by rememberSaveable { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showSuccessSnackbar by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        isLoading = true
        authState = authRepository.getCurrentUser()
        val state = authState as? AuthState.Authenticated
        if (state != null) {
            fullName = state.profile?.fullName ?: ""
            phone = state.profile?.phone ?: ""
            handicap = state.profile?.handicapIndex?.toString() ?: ""
            avatarUrl = state.profile?.avatarUrl ?: ""
        }
        isLoading = false
    }

    LaunchedEffect(showSuccessSnackbar) {
        if (showSuccessSnackbar) {
            snackbarHostState.showSnackbar("Profile updated")
            showSuccessSnackbar = false
        }
    }

    Scaffold(
        topBar = { TmglTopBar(title = "Edit Profile", onBack = onBack) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        when (isLoading) {
            true -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            false -> {
                val state = authState as? AuthState.Authenticated
                if (state == null) {
                    Box(modifier = Modifier.padding(paddingValues).fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                        Text("Not signed in")
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .padding(paddingValues)
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        val context = androidx.compose.ui.platform.LocalContext.current
                        val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
                            uri?.let {
                                scope.launch {
                                    try {
                                        val userId = SupabaseConfig.client.auth.currentUserOrNull()?.id ?: return@launch
                                        val bytes = context.contentResolver.openInputStream(it)?.readBytes() ?: return@launch
                                        val ext = context.contentResolver.getType(it)?.substringAfterLast("/") ?: "jpg"

                                        val storageUrl = "${com.tmgl.league.BuildConfig.SUPABASE_URL}/storage/v1/object/avatars/$userId.$ext"
                                        val apiKey = com.tmgl.league.BuildConfig.SUPABASE_ANON_KEY

                                        val connection = java.net.URL(storageUrl).openConnection() as java.net.HttpURLConnection
                                        connection.requestMethod = "POST"
                                        connection.setRequestProperty("apikey", apiKey)
                                        connection.setRequestProperty("Authorization", "Bearer $apiKey")
                                        connection.setRequestProperty("Content-Type", "image/$ext")
                                        connection.setRequestProperty("x-upsert", "true")
                                        connection.doOutput = true
                                        connection.outputStream.write(bytes)
                                        val responseCode = connection.responseCode
                                        connection.disconnect()

                                        if (responseCode in 200..299) {
                                            val publicUrl = "${com.tmgl.league.BuildConfig.SUPABASE_URL}/storage/v1/object/public/avatars/$userId.$ext"
                                            SupabaseConfig.client.from("profiles").update(mapOf("avatar_url" to publicUrl)) {
                                                filter { eq("id", userId) }
                                            }
                                            avatarUrl = publicUrl
                                            snackbarHostState.showSnackbar("Photo updated!")
                                        } else {
                                            snackbarHostState.showSnackbar("Upload failed ($responseCode)")
                                        }
                                    } catch (e: Exception) {
                                        snackbarHostState.showSnackbar("Failed: ${e.message}")
                                    }
                                }
                            }
                        }

                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                            Box(contentAlignment = Alignment.BottomEnd) {
                                if (avatarUrl.isNotEmpty()) {
                                    AsyncImage(model = avatarUrl, contentDescription = "Avatar", modifier = Modifier.size(100.dp).clip(CircleShape), contentScale = ContentScale.Crop)
                                } else {
                                    Icon(Icons.Default.Person, contentDescription = "Avatar", modifier = Modifier.size(100.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                FilledIconButton(onClick = { launcher.launch("image/*") }, modifier = Modifier.size(32.dp), colors = IconButtonDefaults.filledIconButtonColors(containerColor = TmglGreen)) {
                                    Icon(Icons.Default.CameraAlt, contentDescription = "Change photo", modifier = Modifier.size(16.dp), tint = Color.White)
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                        }

                        TmglCard {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                TmglTextField(
                                    value = fullName,
                                    onValueChange = { fullName = it },
                                    label = "Full Name"
                                )
                                TmglTextField(
                                    value = phone,
                                    onValueChange = { phone = it },
                                    label = "Phone"
                                )
                                TmglTextField(
                                    value = handicap,
                                    onValueChange = { handicap = it },
                                    label = "Handicap"
                                )
                            }
                        }

                        if (errorMessage != null) {
                            Text(
                                text = errorMessage ?: "",
                                color = MaterialTheme.colorScheme.error,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }

                        TmglButton(
                            text = "Save Changes",
                            onClick = {
                                scope.launch {
                                    isSaving = true
                                    errorMessage = null
                                    try {
                                        val updateMap = mutableMapOf<String, Any?>(
                                            "full_name" to fullName
                                        )
                                        if (phone.isNotBlank()) {
                                            updateMap["phone"] = phone
                                        }
                                        val handicapVal = handicap.toDoubleOrNull()
                                        if (handicapVal != null) {
                                            updateMap["handicap_index"] = handicapVal
                                        }
                                        SupabaseConfig.client.from("profiles")
                                            .update(updateMap) {
                                                filter { eq("id", state.userId) }
                                            }
                                        showSuccessSnackbar = true
                                        onBack()
                                    } catch (e: Exception) {
                                        val detail = e.cause?.message ?: e.stackTraceToString().take(200)
                                        errorMessage = "${e.javaClass.simpleName}: ${e.message ?: detail}"
                                    } finally {
                                        isSaving = false
                                    }
                                }
                            },
                            loading = isSaving,
                            enabled = !isSaving
                        )
                    }
                }
            }
        }
    }
}
