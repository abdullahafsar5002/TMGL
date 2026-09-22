package com.tmgl.league.data.repository

import android.content.Context
import com.tmgl.league.BuildConfig
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.model.Profile
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Columns
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
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

class AuthRepository(private val context: android.content.Context) {
    private val postgrest = SupabaseConfig.client

    private val httpClient = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
            })
        }
    }

    private val prefs by lazy {
        context.getSharedPreferences("tmgl_auth", Context.MODE_PRIVATE)
    }

    private fun saveSession(accessToken: String, refreshToken: String, userId: String, email: String?) {
        prefs.edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .putString("user_id", userId)
            .putString("user_email", email)
            .apply()
    }

    private fun clearSession() {
        prefs.edit().clear().apply()
    }

    private fun getStoredAccessToken(): String? = prefs.getString("access_token", null)

    private fun getStoredUserId(): String? = prefs.getString("user_id", null)

    private fun getStoredEmail(): String? = prefs.getString("user_email", null)

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
            val json = Json.parseToJsonElement(text).jsonObject

            val accessToken = json["access_token"]?.jsonPrimitive?.content
            val refreshToken = json["refresh_token"]?.jsonPrimitive?.content
            val userObj = json["user"]?.jsonObject
            val userId = userObj?.get("id")?.jsonPrimitive?.content
            val userEmail = userObj?.get("email")?.jsonPrimitive?.content

            if (accessToken != null && userId != null) {
                saveSession(accessToken, refreshToken ?: "", userId, userEmail)
                AuthResult.Success
            } else {
                val errorMsg = json["error_description"]?.jsonPrimitive?.content
                    ?: json["msg"]?.jsonPrimitive?.content
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
            val json = Json.parseToJsonElement(text).jsonObject

            val accessToken = json["access_token"]?.jsonPrimitive?.content
            val refreshToken = json["refresh_token"]?.jsonPrimitive?.content
            val userObj = json["user"]?.jsonObject
            val userId = userObj?.get("id")?.jsonPrimitive?.content
            val userEmail = userObj?.get("email")?.jsonPrimitive?.content

            if (accessToken != null && userId != null) {
                saveSession(accessToken, refreshToken ?: "", userId, userEmail)
                AuthResult.Success
            } else {
                val errorMsg = json["error_description"]?.jsonPrimitive?.content
                    ?: json["msg"]?.jsonPrimitive?.content
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
        clearSession()
    }

    suspend fun getCurrentUser(): AuthState {
        val accessToken = getStoredAccessToken()
        val userId = getStoredUserId()
        val email = getStoredEmail()

        if (accessToken == null || userId == null) {
            return AuthState.Unauthenticated
        }

        return try {
            val profile = fetchProfile(userId, accessToken)
            AuthState.Authenticated(userId, email, profile)
        } catch (e: Exception) {
            clearSession()
            AuthState.Unauthenticated
        }
    }

    suspend fun refreshSession(): AuthState {
        val refreshToken = prefs.getString("refresh_token", null)
        if (refreshToken == null) {
            clearSession()
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
            val json = Json.parseToJsonElement(text).jsonObject

            val newAccessToken = json["access_token"]?.jsonPrimitive?.content
            val newRefreshToken = json["refresh_token"]?.jsonPrimitive?.content
            val userObj = json["user"]?.jsonObject
            val userId = userObj?.get("id")?.jsonPrimitive?.content
            val userEmail = userObj?.get("email")?.jsonPrimitive?.content

            if (newAccessToken != null && userId != null) {
                saveSession(newAccessToken, newRefreshToken ?: refreshToken, userId, userEmail)
                val profile = fetchProfile(userId, newAccessToken)
                AuthState.Authenticated(userId, userEmail, profile)
            } else {
                clearSession()
                AuthState.Unauthenticated
            }
        } catch (e: Exception) {
            clearSession()
            AuthState.Unauthenticated
        }
    }

    private suspend fun fetchProfile(userId: String, accessToken: String): Profile? {
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
