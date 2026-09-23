package com.tmgl.league.data.repository

import com.tmgl.league.BuildConfig
import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Profile
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.interceptors.addInterceptor
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
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
    private val encryptedStorage: EncryptedAuthStorage
) {
    private val postgrest = SupabaseConfig.client

    private val httpClient = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
            })
        }
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

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    suspend fun signIn(email: String, password: String): AuthResult {
        return try {
            val response = httpClient.post(
                "${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=password"
            ) {
                contentType(ContentType.Application.Json)
                header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                setBody("""{"email":"$email","password":"$password"}""")
            }
            val text = response.bodyAsText()
            val jsonEl = json.parseToJsonElement(text).jsonObject

            val accessToken = jsonEl["access_token"]?.jsonPrimitive?.content
            val refreshToken = jsonEl["refresh_token"]?.jsonPrimitive?.content
            val expiresIn = jsonEl["expires_in"]?.jsonPrimitive?.content?.toLongOrNull() ?: 3600
            val userObj = jsonEl["user"]?.jsonObject
            val userId = userObj?.get("id")?.jsonPrimitive?.content
            val userEmail = userObj?.get("email")?.jsonPrimitive?.content

            if (accessToken != null && userId != null) {
                encryptedStorage.saveSession(accessToken, refreshToken ?: "", userId, userEmail)
                AuthResult.Success
            } else {
                val errorMsg = jsonEl["error_description"]?.jsonPrimitive?.content
                    ?: jsonEl["msg"]?.jsonPrimitive?.content
                    ?: "Invalid login credentials"
                AuthResult.Error(errorMsg)
            }
        } catch (e: Exception) {
            AuthResult.Error(e.message ?: "Sign in failed")
        }
    }

    suspend fun signUp(email: String, password: String, fullName: String): AuthResult {
        return try {
            val response = httpClient.post(
                "${BuildConfig.SUPABASE_URL}/auth/v1/signup"
            ) {
                contentType(ContentType.Application.Json)
                header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                setBody("""{"email":"$email","password":"$password","data":{"full_name":"$fullName"}}""")
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
        SupabaseConfig.client.auth.resetPasswordForEmail(email)
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
            val response = httpClient.post(
                "${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token"
            ) {
                contentType(ContentType.Application.Json)
                header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                setBody("""{"refresh_token":"$refreshToken"}""")
            }
            val text = response.bodyAsText()
            val jsonEl = json.parseToJsonElement(text).jsonObject

            val newAccessToken = jsonEl["access_token"]?.jsonPrimitive?.content
            val newRefreshToken = jsonEl["refresh_token"]?.jsonPrimitive?.content
            val expiresIn = jsonEl["expires_in"]?.jsonPrimitive?.content?.toLongOrNull() ?: 3600
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

    private suspend fun fetchProfile(userId: String): Profile? {
        return try {
            postgrest.from("profiles")
                .select(Columns.raw("id, full_name, email, avatar_url, role, handicap_index, created_at, updated_at")) {
                    filter { eq("id", userId) }
                }
                .decodeList<Profile>()
                .firstOrNull()
        } catch (e: Exception) {
            null
        }
    }
}
