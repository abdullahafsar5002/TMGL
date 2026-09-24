package com.tmgl.league.data.repository

import com.tmgl.league.BuildConfig
import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.model.Profile
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthResult {
    data object Success : AuthResult()
    data class Error(val message: String) : AuthResult()
}

sealed class AuthState {
    data object Loading : AuthState()
    data object Unauthenticated : AuthState()
    data class Authenticated(
        val userId: String,
        val email: String?,
        val profile: Profile?
    ) : AuthState()
}

@Singleton
class AuthRepository @Inject constructor(
    val encryptedStorage: EncryptedAuthStorage
) {
    private val httpClient = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
            })
        }
        engine {
            config {
                addInterceptor { chain ->
                    val original = chain.request()
                    val token = encryptedStorage.getAccessToken()
                    if (token != null) {
                        val request = original.newBuilder()
                            .header("Authorization", "Bearer $token")
                            .build()
                        chain.proceed(request)
                    } else {
                        chain.proceed(original)
                    }
                }
            }
        }
    }

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    suspend fun signIn(email: String, password: String): AuthResult {
        return try {
            val body = buildJsonObject {
                put("email", email)
                put("password", password)
            }
            val response = httpClient.post(
                "${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=password"
            ) {
                contentType(ContentType.Application.Json)
                header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                setBody(body.toString())
            }
            val text = response.bodyAsText()
            val jsonEl = json.parseToJsonElement(text).jsonObject

            val accessToken = jsonEl["access_token"]?.jsonPrimitive?.content
            val refreshToken = jsonEl["refresh_token"]?.jsonPrimitive?.content
            val userObj = jsonEl["user"]?.jsonObject
            val userId = userObj?.get("id")?.jsonPrimitive?.content
            val userEmail = userObj?.get("email")?.jsonPrimitive?.content

            if (accessToken != null && userId != null) {
                encryptedStorage.saveSession(accessToken, refreshToken ?: "", userId, userEmail)
                AuthResult.Success
            } else {
                val rawError = jsonEl["error_description"]?.jsonPrimitive?.content
                    ?: jsonEl["msg"]?.jsonPrimitive?.content
                    ?: jsonEl["error"]?.jsonPrimitive?.content
                    ?: "Invalid login credentials"
                AuthResult.Error(mapAuthError(rawError))
            }
        } catch (e: Exception) {
            android.util.Log.e("AuthRepository", "Sign in failed", e)
            val detail = e.message ?: "Unknown error"
            AuthResult.Error("Sign in failed: $detail")
        }
    }

    suspend fun signUp(email: String, password: String, fullName: String): AuthResult {
        return try {
            val body = buildJsonObject {
                put("email", email)
                put("password", password)
                put("full_name", fullName)
            }
            val response = httpClient.post(
                "${BuildConfig.SUPABASE_URL}/auth/v1/signup"
            ) {
                contentType(ContentType.Application.Json)
                header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                setBody(body.toString())
            }
            val text = response.bodyAsText()
            val jsonEl = json.parseToJsonElement(text).jsonObject

            val accessToken = jsonEl["access_token"]?.jsonPrimitive?.content
            val refreshToken = jsonEl["refresh_token"]?.jsonPrimitive?.content
            val userObj = jsonEl["user"]?.jsonObject
            val userId = userObj?.get("id")?.jsonPrimitive?.content
            val userEmail = userObj?.get("email")?.jsonPrimitive?.content

            if (accessToken != null && userId != null) {
                encryptedStorage.saveSession(accessToken, refreshToken ?: "", userId, userEmail)
                AuthResult.Success
            } else {
                val errorMsg = jsonEl["error_description"]?.jsonPrimitive?.content
                    ?: jsonEl["msg"]?.jsonPrimitive?.content
                    ?: "Sign up failed"
                AuthResult.Error(errorMsg)
            }
        } catch (e: Exception) {
            AuthResult.Error(e.message ?: "Sign up failed")
        }
    }

    suspend fun resetPassword(email: String) {
        val body = buildJsonObject {
            put("email", email)
        }
        httpClient.post(
            "${BuildConfig.SUPABASE_URL}/auth/v1/recover"
        ) {
            contentType(ContentType.Application.Json)
            header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            setBody(body.toString())
        }
    }

    suspend fun signOut() {
        encryptedStorage.clearSession()
    }

    suspend fun getCurrentUser(): AuthState {
        val accessToken = encryptedStorage.getAccessToken()
        val userId = encryptedStorage.getUserId()
        val email = encryptedStorage.getUserEmail()

        if (accessToken == null || userId == null) {
            return AuthState.Unauthenticated
        }

        if (encryptedStorage.isTokenExpired()) {
            return refreshSession()
        }

        return try {
            val profile = fetchProfile(userId)
            AuthState.Authenticated(userId, email, profile)
        } catch (e: Exception) {
            encryptedStorage.clearSession()
            AuthState.Unauthenticated
        }
    }

    suspend fun refreshSession(): AuthState {
        val refreshToken = encryptedStorage.getRefreshToken()
        if (refreshToken == null) {
            encryptedStorage.clearSession()
            return AuthState.Unauthenticated
        }

        return try {
            val body = buildJsonObject {
                put("refresh_token", refreshToken)
            }
            val response = httpClient.post(
                "${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token"
            ) {
                contentType(ContentType.Application.Json)
                header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                setBody(body.toString())
            }
            val text = response.bodyAsText()
            val jsonEl = json.parseToJsonElement(text).jsonObject

            val newAccessToken = jsonEl["access_token"]?.jsonPrimitive?.content
            val newRefreshToken = jsonEl["refresh_token"]?.jsonPrimitive?.content
            val userObj = jsonEl["user"]?.jsonObject
            val userId = userObj?.get("id")?.jsonPrimitive?.content
            val userEmail = userObj?.get("email")?.jsonPrimitive?.content

            if (newAccessToken != null && userId != null) {
                encryptedStorage.saveSession(
                    newAccessToken,
                    newRefreshToken ?: refreshToken,
                    userId,
                    userEmail
                )
                val profile = fetchProfile(userId)
                AuthState.Authenticated(userId, userEmail, profile)
            } else {
                encryptedStorage.clearSession()
                AuthState.Unauthenticated
            }
        } catch (e: Exception) {
            encryptedStorage.clearSession()
            AuthState.Unauthenticated
        }
    }

    private fun mapAuthError(rawError: String): String {
        return when {
            rawError.contains("Invalid login credentials", ignoreCase = true) ->
                "Incorrect email or password. Please try again."
            rawError.contains("Email not confirmed", ignoreCase = true) ->
                "Please confirm your email address before signing in."
            rawError.contains("User not found", ignoreCase = true) ->
                "No account found with this email. Please sign up first."
            rawError.contains("Pin verification", ignoreCase = true) ->
                "Incorrect email or password. Please try again."
            rawError.contains("rate limit", ignoreCase = true) ->
                "Too many attempts. Please wait a moment and try again."
            rawError.contains("Invalid email", ignoreCase = true) ->
                "Please enter a valid email address."
            rawError.contains("Password should be", ignoreCase = true) ->
                "Password must be at least 6 characters."
            rawError.contains("Signup is disabled", ignoreCase = true) ->
                "Registration is currently disabled. Please contact support."
            else -> rawError
        }
    }

    private suspend fun fetchProfile(userId: String): Profile? {
        return try {
            val token = encryptedStorage.getAccessToken() ?: return null
            val response = httpClient.get(
                "${BuildConfig.SUPABASE_URL}/rest/v1/profiles?id=eq.$userId&select=id,full_name,email,avatar_url,role,handicap_index,created_at,updated_at"
            ) {
                header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                header("Authorization", "Bearer $token")
            }
            val text = response.bodyAsText()
            val arr = json.parseToJsonElement(text) as? JsonArray
            arr?.firstOrNull()?.let { json.decodeFromString<Profile>(it.toString()) }
        } catch (e: Exception) {
            android.util.Log.e("AuthRepository", "fetchProfile failed", e)
            null
        }
    }
}
