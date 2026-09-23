package com.tmgl.league

import android.app.Application
import android.content.ComponentCallbacks2
import android.os.StrictMode
import coil.ImageLoader
import coil.ImageLoaderFactory
import com.tmgl.league.notification.NotificationHelper
import com.tmgl.league.util.PerformanceOptimizer
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class TMGLApplication : Application(), ImageLoaderFactory {

    private lateinit var imageLoader: ImageLoader

    override fun onCreate() {
        super.onCreate()

        // Initialize image loader with optimized cache
        imageLoader = PerformanceOptimizer.createImageLoader(this)

        // Create notification channels
        NotificationHelper.createChannels(this)

        // Enable strict mode in debug builds
        if (BuildConfig.DEBUG) {
            StrictMode.setThreadPolicy(
                StrictMode.ThreadPolicy.Builder()
                    .detectAll()
                    .penaltyLog()
                    .build()
            )
            StrictMode.setVmPolicy(
                StrictMode.VmPolicy.Builder()
                    .detectLeakedSqlLiteObjects()
                    .detectLeakedClosableObjects()
                    .detectActivityLeaks()
                    .penaltyLog()
                    .build()
            )
        }
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        PerformanceOptimizer.trimMemory(this, level)
    }

    override fun newImageLoader(): ImageLoader = imageLoader

    companion object {
        private const val BuildConfig_DEBUG = false // Fallback for when BuildConfig is not available
    }
}
