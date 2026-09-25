package com.tmgl.league.data

import android.content.Context
import android.util.Log
import com.tmgl.league.BuildConfig
import com.tmgl.league.auth.EncryptedAuthStorage
import com.tmgl.league.auth.EncryptedSessionManager
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.MemorySessionManager
import io.github.jan.supabase.gotrue.SessionManager
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.postgrest.Postgrest

object SupabaseConfig {

    @Volatile
    private var instance: SupabaseClient? = null

    @Volatile
    private var encrypted = false

    fun initialize(context: Context) {
        if (instance != null && encrypted) return
        synchronized(this) {
            if (instance != null && encrypted) return
            instance = createClient(EncryptedSessionManager(EncryptedAuthStorage(context.applicationContext)))
            encrypted = true
        }
    }

    val client: SupabaseClient
        get() = instance ?: createUnmanagedClient()

    private fun createUnmanagedClient(): SupabaseClient = synchronized(this) {
        instance ?: createClient(MemorySessionManager()).also {
            instance = it
            Log.w("SupabaseConfig", "initialize(context) was not called, session will not be persisted")
        }
    }

    private fun createClient(sessionManager: SessionManager): SupabaseClient {
        return createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(Auth) {
                this.sessionManager = sessionManager
                autoLoadFromStorage = true
                autoSaveToStorage = true
                alwaysAutoRefresh = true
            }
            install(Postgrest)
        }
    }
}
