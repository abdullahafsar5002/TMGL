package com.tmgl.league.util

import android.content.ComponentCallbacks2
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import coil.ImageLoader
import coil.disk.DiskCache
import coil.memory.MemoryCache
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ImageLoaderProvider @Inject constructor(
    @ApplicationContext private val context: Context
) {
    val imageLoader: ImageLoader = ImageLoader.Builder(context)
        .memoryCache {
            MemoryCache.Builder(context)
                .maxSizePercent(0.25)
                .build()
        }
        .diskCache {
            DiskCache.Builder()
                .directory(File(context.cacheDir, "image_cache"))
                .maxSizePercent(0.02)
                .build()
        }
        .crossfade(true)
        .build()

    fun trimMemory(level: Int) {
        when (level) {
            ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN,
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW,
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL -> {
                imageLoader.memoryCache?.clear()
            }
        }
    }

    fun clearDiskCache() {
        imageLoader.diskCache?.clear()
    }
}

object PerformanceOptimizer {

    // Frame drop monitoring
    @androidx.compose.runtime.Composable
    fun rememberFrameDropDetector(
        onFrameDrop: (Long) -> Unit = {}
    ): FrameDropDetector {
        val detector = androidx.compose.runtime.remember { FrameDropDetector() }
        androidx.compose.runtime.LaunchedEffect(Unit) {
            detector.startMonitoring(onFrameDrop)
        }
        androidx.compose.runtime.DisposableEffect(Unit) {
            onDispose { detector.stopMonitoring() }
        }
        return detector
    }

    class FrameDropDetector {
        private var choreographer: android.view.Choreographer? = null
        private var lastFrameTime = 0L
        private var isMonitoring = false

        fun startMonitoring(onFrameDrop: (Long) -> Unit) {
            if (isMonitoring) return
            isMonitoring = true

            choreographer = android.view.Choreographer.getInstance()
            val frameCallback = object : android.view.Choreographer.FrameCallback {
                override fun doFrame(frameTimeNanos: Long) {
                    if (lastFrameTime != 0L) {
                        val elapsedMs = (frameTimeNanos - lastFrameTime) / 1_000_000
                        if (elapsedMs > 32) {
                            onFrameDrop(elapsedMs)
                        }
                    }
                    lastFrameTime = frameTimeNanos
                    if (isMonitoring) {
                        choreographer?.postFrameCallback(this)
                    }
                }
            }
            choreographer?.postFrameCallback(frameCallback)
        }

        fun stopMonitoring() {
            isMonitoring = false
            choreographer = null
        }
    }

    // Debounced search
    @androidx.compose.runtime.Composable
    fun <T> rememberDebouncedState(
        value: T,
        delayMs: Long = 300
    ): androidx.compose.runtime.State<T> {
        val debouncedState = androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf(value) }
        androidx.compose.runtime.LaunchedEffect(value) {
            kotlinx.coroutines.delay(delayMs)
            debouncedState.value = value
        }
        return debouncedState
    }

    // Background processing
    suspend fun <T> processInBackground(block: suspend () -> T): T {
        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) {
            block()
        }
    }
}
