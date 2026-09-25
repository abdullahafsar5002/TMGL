package com.tmgl.league.data.offline

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.concurrent.CopyOnWriteArrayList

class NetworkMonitor(
    @ApplicationContext private val context: Context
) {
    private val _isOnline = MutableStateFlow(true)
    val isOnline: StateFlow<Boolean> = _isOnline

    private val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val restorationListeners = CopyOnWriteArrayList<() -> Unit>()

    @Volatile
    private var monitoring = false

    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            updateOnline(true)
        }

        override fun onLost(network: Network) {
            updateOnline(isCurrentlyConnected())
        }

        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
            val hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            val isValidated = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            updateOnline(hasInternet && isValidated)
        }
    }

    fun addOnConnectionRestoredListener(listener: () -> Unit) {
        restorationListeners.addIfAbsent(listener)
    }

    fun removeOnConnectionRestoredListener(listener: () -> Unit) {
        restorationListeners.remove(listener)
    }

    fun startMonitoring() {
        if (!monitoring) {
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            connectivityManager.registerNetworkCallback(request, networkCallback)
            monitoring = true
        }
        updateOnline(isCurrentlyConnected())
    }

    fun stopMonitoring() {
        if (!monitoring) return
        monitoring = false
        runCatching { connectivityManager.unregisterNetworkCallback(networkCallback) }
    }

    private fun updateOnline(online: Boolean) {
        val wasOnline = _isOnline.value
        _isOnline.value = online
        if (online && !wasOnline) {
            restorationListeners.forEach { listener -> runCatching { listener() } }
        }
    }

    private fun isCurrentlyConnected(): Boolean {
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
}
