package com.tmgl.league.data.offline

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "tmgl_cache")

object OfflineCache {
    private val DARK_MODE_KEY = booleanPreferencesKey("dark_mode")

    suspend fun saveDarkMode(context: Context, enabled: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[DARK_MODE_KEY] = enabled
        }
    }

    fun getDarkMode(context: Context): Flow<Boolean> {
        return context.dataStore.data.map { prefs -> prefs[DARK_MODE_KEY] ?: false }
    }
}
