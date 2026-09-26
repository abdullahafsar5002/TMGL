package com.tmgl.league.ui.screens.profile

import android.content.Context
import android.net.Uri
import android.util.Log
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.tmgl.league.BuildConfig
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.LeagueRepository
import com.tmgl.league.data.repository.postgrestWriteError
import com.tmgl.league.ui.components.*
import com.tmgl.league.ui.format.formatOneDecimal
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.Locale

private const val PROFILE_EDIT_TAG = "ProfileEdit"
private const val CONNECT_TIMEOUT_MS = 15_000
private const val READ_TIMEOUT_MS = 30_000
private const val MAX_AVATAR_BYTES = 5 * 1024 * 1024
private const val READ_CHUNK_BYTES = 16 * 1024
private const val SNIFF_HEADER_BYTES = 12
private val ALLOWED_AVATAR_MIME_TYPES = setOf("image/jpeg", "image/png", "image/webp")

@EntryPoint
@InstallIn(SingletonComponent::class)
internal interface ProfileEditDependencies {
    fun authRepository(): AuthRepository
    fun leagueRepository(): LeagueRepository
}

private sealed interface AvatarUploadResult {
    data class Success(val publicUrl: String) : AvatarUploadResult
    data class Failure(val message: String) : AvatarUploadResult
}

private class AvatarTooLargeException : IOException()

@Composable
fun ProfileEditScreen(onBack: () -> Unit) {
    var authState by remember { mutableStateOf<AuthState>(AuthState.Loading) }
    val context = LocalContext.current
    val entryPoint = remember(context) {
        EntryPointAccessors.fromApplication(
            context.applicationContext,
            ProfileEditDependencies::class.java
        )
    }
    val authRepository = remember(entryPoint) { entryPoint.authRepository() }
    val leagueRepository = remember(entryPoint) { entryPoint.leagueRepository() }
    val scope = rememberCoroutineScope()

    var fullName by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var handicap by rememberSaveable { mutableStateOf("") }
    var avatarUrl by rememberSaveable { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }
    var isUploadingPhoto by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(authRepository, leagueRepository) {
        val state = runCatching { authRepository.getCurrentUser() }
            .getOrElse { AuthState.Unauthenticated }
        authState = state
        val authenticated = state as? AuthState.Authenticated
        if (authenticated != null) {
            fullName = authenticated.profile?.fullName.orEmpty()
            avatarUrl = authenticated.profile?.avatarUrl.orEmpty()
            val profileId = authenticated.profile?.id ?: authenticated.userId
            when (val player = leagueRepository.getPlayerByProfileId(profileId)) {
                is DataResult.Success -> {
                    phone = player.data.phone.orEmpty()
                    handicap = player.data.handicapIndex?.let { formatOneDecimal(it) }.orEmpty()
                }
                is DataResult.Error -> Unit
            }
        }
        isLoading = false
    }

    val photoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        val picked = uri ?: return@rememberLauncherForActivityResult
        scope.launch {
            isUploadingPhoto = true
            errorMessage = null
            when (val result = uploadAvatar(context, picked)) {
                is AvatarUploadResult.Success -> {
                    avatarUrl = result.publicUrl
                    snackbarHostState.showSnackbar("Photo updated!")
                }
                is AvatarUploadResult.Failure -> {
                    errorMessage = result.message
                }
            }
            isUploadingPhoto = false
        }
    }

    Scaffold(
        topBar = { TmglTopBar(title = "Edit Profile", onBack = onBack) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        when {
            isLoading -> LoadingIndicator(modifier = Modifier.padding(paddingValues))
            authState !is AuthState.Authenticated -> Box(
                modifier = Modifier.padding(paddingValues).fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text("Not signed in")
            }
            else -> {
                val authenticated = authState as AuthState.Authenticated
                Column(
                    modifier = Modifier
                        .padding(paddingValues)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        Box(contentAlignment = Alignment.BottomEnd) {
                            if (avatarUrl.isNotEmpty()) {
                                AsyncImage(
                                    model = avatarUrl,
                                    contentDescription = "Avatar",
                                    modifier = Modifier.size(100.dp).clip(CircleShape),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = "Avatar",
                                    modifier = Modifier.size(100.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            FilledIconButton(
                                onClick = { photoLauncher.launch("image/*") },
                                enabled = !isUploadingPhoto,
                                modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp),
                                colors = IconButtonDefaults.filledIconButtonColors(
                                    containerColor = MaterialTheme.colorScheme.primary
                                )
                            ) {
                                Icon(
                                    Icons.Default.CameraAlt,
                                    contentDescription = "Change photo",
                                    modifier = Modifier.size(20.dp),
                                    tint = contentColorFor(MaterialTheme.colorScheme.primary)
                                )
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        if (isUploadingPhoto) {
                            Text(
                                "Uploading photo...",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
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
                                onValueChange = { handicap = it.filter { c -> c.isDigit() || c == '.' } },
                                label = "Handicap"
                            )
                            Text(
                                text = "Phone and handicap are saved to your player record. " +
                                    "Leave either field blank to clear it.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    errorMessage?.let { message ->
                        Text(
                            text = message,
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
                                    val name = fullName.trim()
                                    if (name.isBlank()) {
                                        errorMessage = "Enter the name that should appear on the leaderboard."
                                        return@launch
                                    }
                                    val handicapValue = handicap.trim().toDoubleOrNull()
                                    if (handicap.isNotBlank() && handicapValue == null) {
                                        errorMessage = "Enter a valid handicap index, for example 12.4."
                                        return@launch
                                    }
                                    val profileWrite = SupabaseConfig.client.from("profiles")
                                        .update(mapOf<String, Any>("full_name" to name)) {
                                            filter { eq("id", authenticated.userId) }
                                        }
                                    val profileError = postgrestWriteError(profileWrite.data)
                                    if (profileError != null) {
                                        errorMessage = "Couldn't save your profile: $profileError"
                                        return@launch
                                    }
                                    val profileId = authenticated.profile?.id ?: authenticated.userId
                                    when (
                                        val contactResult = leagueRepository.updatePlayerContact(
                                            profileId = profileId,
                                            phone = phone.trim().takeIf { it.isNotEmpty() },
                                            handicapIndex = handicapValue
                                        )
                                    ) {
                                        is DataResult.Success -> {
                                            snackbarHostState.showSnackbar("Profile updated")
                                            onBack()
                                        }
                                        is DataResult.Error -> {
                                            errorMessage = "Your name was saved but your phone and handicap were not: ${contactResult.message}"
                                        }
                                    }
                                } catch (e: Exception) {
                                    Log.e(PROFILE_EDIT_TAG, "Profile save failed", e)
                                    errorMessage = "Couldn't save your profile. Please try again."
                                } finally {
                                    isSaving = false
                                }
                            }
                        },
                        loading = isSaving,
                        enabled = !isSaving && !isUploadingPhoto
                    )
                }
            }
        }
    }
}

private suspend fun uploadAvatar(context: Context, uri: Uri): AvatarUploadResult = withContext(Dispatchers.IO) {
    val mimeType = resolveImageMimeType(context, uri)
        ?: return@withContext AvatarUploadResult.Failure("That file isn't a JPEG, PNG or WebP image.")
    val bytes = readImageBytes(context, uri)
        ?: return@withContext AvatarUploadResult.Failure("That image couldn't be read or is larger than 5 MB.")
    val userId = SupabaseConfig.client.auth.currentUserOrNull()?.id
        ?: return@withContext AvatarUploadResult.Failure("Your session expired. Sign in again to change your photo.")
    val accessToken = SupabaseConfig.client.auth.currentSessionOrNull()?.accessToken
    if (accessToken.isNullOrBlank()) {
        return@withContext AvatarUploadResult.Failure("Your session expired. Sign in again to change your photo.")
    }
    val objectName = "$userId-${contentHash(bytes)}.${extensionFor(mimeType)}"
    val responseCode = try {
        postAvatar(accessToken, objectName, mimeType, bytes)
    } catch (e: Exception) {
        Log.e(PROFILE_EDIT_TAG, "Avatar upload failed", e)
        return@withContext AvatarUploadResult.Failure("The photo upload didn't complete. Please try again.")
    }
    if (responseCode !in 200..299) {
        return@withContext AvatarUploadResult.Failure("The photo upload was rejected (HTTP $responseCode).")
    }
    val publicUrl = "${BuildConfig.SUPABASE_URL}/storage/v1/object/public/avatars/$objectName"
    val writeError = try {
        val result = SupabaseConfig.client.from("profiles")
            .update(mapOf("avatar_url" to publicUrl)) {
                filter { eq("id", userId) }
            }
        postgrestWriteError(result.data)
    } catch (e: Exception) {
        Log.e(PROFILE_EDIT_TAG, "Avatar profile write failed", e)
        "the profile could not be updated"
    }
    if (writeError != null) {
        return@withContext AvatarUploadResult.Failure("Photo uploaded, but your profile was not updated: $writeError")
    }
    AvatarUploadResult.Success(publicUrl)
}

private fun postAvatar(accessToken: String, objectName: String, mimeType: String, bytes: ByteArray): Int {
    val connection = URL("${BuildConfig.SUPABASE_URL}/storage/v1/object/avatars/$objectName")
        .openConnection() as HttpURLConnection
    try {
        connection.requestMethod = "POST"
        connection.connectTimeout = CONNECT_TIMEOUT_MS
        connection.readTimeout = READ_TIMEOUT_MS
        connection.setRequestProperty("apikey", BuildConfig.SUPABASE_ANON_KEY)
        connection.setRequestProperty("Authorization", "Bearer $accessToken")
        connection.setRequestProperty("Content-Type", mimeType)
        connection.setRequestProperty("x-upsert", "true")
        connection.setFixedLengthStreamingMode(bytes.size)
        connection.doOutput = true
        connection.outputStream.use { output -> output.write(bytes) }
        return connection.responseCode
    } finally {
        runCatching { connection.inputStream?.close() }
        runCatching { connection.errorStream?.close() }
        connection.disconnect()
    }
}

private fun resolveImageMimeType(context: Context, uri: Uri): String? {
    val declared = try {
        context.contentResolver.getType(uri)
    } catch (_: Exception) {
        null
    }?.trim()?.lowercase()
    if (declared != null && declared in ALLOWED_AVATAR_MIME_TYPES) return declared
    return sniffImageMimeType(readImageHeader(context, uri))
}

private fun readImageHeader(context: Context, uri: Uri): ByteArray? = try {
    context.contentResolver.openInputStream(uri)?.use { stream ->
        val header = ByteArray(SNIFF_HEADER_BYTES)
        var read = 0
        while (read < header.size) {
            val count = stream.read(header, read, header.size - read)
            if (count <= 0) break
            read += count
        }
        if (read == 0) null else header.copyOf(read)
    }
} catch (_: Exception) {
    null
}

private fun sniffImageMimeType(header: ByteArray?): String? {
    if (header == null || header.size < 4) return null
    if (header[0] == 0xFF.toByte() && header[1] == 0xD8.toByte() && header[2] == 0xFF.toByte()) {
        return "image/jpeg"
    }
    val pngSignature = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
    if (header.size >= pngSignature.size && pngSignature.indices.all { header[it] == pngSignature[it] }) {
        return "image/png"
    }
    val webpRiff = "RIFF".toByteArray(Charsets.US_ASCII)
    val webpMarker = "WEBP".toByteArray(Charsets.US_ASCII)
    if (header.size >= 12 &&
        webpRiff.indices.all { header[it] == webpRiff[it] } &&
        webpMarker.indices.all { header[8 + it] == webpMarker[it] }
    ) {
        return "image/webp"
    }
    return null
}

private fun readImageBytes(context: Context, uri: Uri): ByteArray? {
    return try {
        context.contentResolver.openInputStream(uri)?.use { stream ->
            val output = ByteArrayOutputStream()
            val chunk = ByteArray(READ_CHUNK_BYTES)
            var total = 0
            while (true) {
                val read = stream.read(chunk)
                if (read <= 0) break
                total += read
                if (total > MAX_AVATAR_BYTES) throw AvatarTooLargeException()
                output.write(chunk, 0, read)
            }
            output.toByteArray()
        }
    } catch (_: AvatarTooLargeException) {
        null
    } catch (_: Exception) {
        null
    }
}

private fun extensionFor(mimeType: String): String = when (mimeType) {
    "image/png" -> "png"
    "image/webp" -> "webp"
    else -> "jpg"
}

private fun contentHash(bytes: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
    return digest.take(8).joinToString(separator = "") { byte -> String.format(Locale.ROOT, "%02x", byte) }
}
