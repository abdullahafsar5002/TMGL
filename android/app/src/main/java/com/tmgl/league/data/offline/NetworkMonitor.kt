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

    private val connectivityManager: ConnectivityManager? =
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

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

    @Synchronized
    fun startMonitoring() {
        val manager = connectivityManager ?: return
        if (!monitoring) {
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()
            val registered = runCatching { manager.registerNetworkCallback(request, networkCallback) }
            monitoring = registered.isSuccess
            if (!monitoring) {
                _isOnline.value = isCurrentlyConnected()
                return
            }
        }
        updateOnline(isCurrentlyConnected())
    }

    @Synchronized
    fun stopMonitoring() {
        if (!monitoring) return
        monitoring = false
        val manager = connectivityManager ?: return
        runCatching { manager.unregisterNetworkCallback(networkCallback) }
    }

    private fun updateOnline(online: Boolean) {
        val wasOnline = _isOnline.value
        _isOnline.value = online
        if (online && !wasOnline) {
            restorationListeners.forEach { listener -> runCatching { listener() } }
        }
    }

    private fun isCurrentlyConnected(): Boolean {
        val manager = connectivityManager ?: return false
        val network = manager.activeNetwork ?: return false
        val capabilities = manager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
}
