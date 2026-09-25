package com.tmgl.league

import android.app.Application
import android.content.ComponentCallbacks2
import coil.ImageLoader
import coil.ImageLoaderFactory
import com.tmgl.league.data.SupabaseConfig
import com.tmgl.league.data.offline.NetworkMonitor
import com.tmgl.league.data.offline.OfflineScoreQueue
import com.tmgl.league.notification.NotificationHelper
import com.tmgl.league.util.ImageLoaderProvider
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class TMGLApplication : Application(), ImageLoaderFactory {

    @Inject
    lateinit var imageLoaderProvider: ImageLoaderProvider

    @Inject
    lateinit var networkMonitor: NetworkMonitor

    override fun onCreate() {
        super.onCreate()
        SupabaseConfig.initialize(this)
        NotificationHelper.createChannels(this)
        networkMonitor.startMonitoring()
        OfflineScoreQueue.initialize(this, networkMonitor)
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (::imageLoaderProvider.isInitialized) {
            imageLoaderProvider.trimMemory(level)
        }
    }

    override fun newImageLoader(): ImageLoader {
        return if (::imageLoaderProvider.isInitialized) {
            imageLoaderProvider.imageLoader
        } else {
            ImageLoader.Builder(this).build()
        }
    }
}
