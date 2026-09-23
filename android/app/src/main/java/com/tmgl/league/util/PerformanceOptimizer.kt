package com.tmgl.league.util

import android.content.Context
import android.os.Build
import android.view.Choreographer
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.*
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache
import coil.request.ImageRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

object PerformanceOptimizer {

    // Image cache configuration
    fun createImageLoader(context: Context): ImageLoader {
        return ImageLoaderFactory.create {
            memoryCache {
                MemoryCache.Builder(context)
                    .maxSizePercent(0.25)
                    .strongMemoryCache(Build.VERSION.SDK_INT < Build.VERSION_CODES.O)
                    .build()
            }
            diskCache {
                DiskCache.Builder()
                    .directory(File(context.cacheDir, "image_cache"))
                    .maxSizePercent(0.02)
                    .build()
            }
            crossfade(true)
            allowHardware(true)
            bitmapConfig(android.graphics.Bitmap.Config.RGB_565)
        }
    }

    // Frame drop monitoring
    @Composable
    fun rememberFrameDropDetector(
        onFrameDrop: (Long) -> Unit = {}
    ): FrameDropDetector {
        val detector = remember { FrameDropDetector() }
        LaunchedEffect(Unit) {
            detector.startMonitoring(onFrameDrop)
        }
        DisposableEffect(Unit) {
            onDispose { detector.stopMonitoring() }
        }
        return detector
    }

    class FrameDropDetector {
        private var choreographer: Choreographer? = null
        private var lastFrameTime = 0L
        private var isMonitoring = false

        fun startMonitoring(onFrameDrop: (Long) -> Unit) {
            if (isMonitoring) return
            isMonitoring = true

            choreographer = Choreographer.getInstance()
            val frameCallback = object : Choreographer.FrameCallback {
                override fun doFrame(frameTimeNanos: Long) {
                    if (lastFrameTime != 0L) {
                        val elapsedMs = (frameTimeNanos - lastFrameTime) / 1_000_000
                        if (elapsedMs > 32) { // More than 2 frames at 60fps
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

    // Lazy list scroll performance
    @Composable
    fun rememberOptimizedScrollState(): LazyListState {
        return rememberLazyListState()
    }

    @Composable
    private fun rememberLazyListState(): LazyListState {
        return remember { LazyListState() }
    }

    // Debounced search
    @Composable
    fun <T> rememberDebouncedState(
        value: T,
        delayMs: Long = 300
    ): State<T> {
        val debouncedState = remember { mutableStateOf(value) }
        LaunchedEffect(value) {
            kotlinx.coroutines.delay(delayMs)
            debouncedState.value = value
        }
        return debouncedState
    }

    // Background processing
    suspend fun <T> processInBackground(block: suspend () -> T): T {
        return withContext(Dispatchers.Default) {
            block()
        }
    }

    // Memory cleanup
    fun trimMemory(context: Context, level: Int) {
        when (level) {
            android.content.ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN -> {
                // Clean up image cache
                val imageLoader = createImageLoader(context)
                imageLoader.memoryCache?.clear()
            }
            android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW,
            android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL -> {
                // More aggressive cleanup
                val imageLoader = createImageLoader(context)
                imageLoader.memoryCache?.clear()
                imageLoader.diskCache?.clear()
            }
        }
    }
}
