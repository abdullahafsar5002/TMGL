package com.tmgl.league.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.produceState
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import com.tmgl.league.data.offline.OfflineCache
import kotlinx.coroutines.flow.first

private val LightColorScheme = lightColorScheme(
    primary = TmglGreen,
    onPrimary = SurfaceLight,
    primaryContainer = TmglGreenLight,
    onPrimaryContainer = SurfaceLight,
    secondary = TmglGold,
    onSecondary = TmglCharcoal,
    secondaryContainer = TmglGoldLight,
    onSecondaryContainer = TmglCharcoal,
    tertiary = TmglEmerald,
    onTertiary = SurfaceLight,
    tertiaryContainer = Color(0xFFE8F5E9),
    onTertiaryContainer = TmglGreenDark,
    background = BackgroundLight,
    onBackground = OnSurfaceLight,
    surface = SurfaceLight,
    onSurface = OnSurfaceLight,
    surfaceVariant = Color(0xFFF3F4F6),
    onSurfaceVariant = TmglCharcoalLight,
    outline = OutlineLight,
    error = OutOfBounds,
    onError = SurfaceLight
)

private val DarkColorScheme = darkColorScheme(
    primary = TmglEmerald,
    onPrimary = SurfaceLight,
    primaryContainer = TmglGreen,
    onPrimaryContainer = SurfaceLight,
    secondary = TmglGold,
    onSecondary = TmglCharcoal,
    secondaryContainer = TmglGoldMuted,
    onSecondaryContainer = SurfaceLight,
    tertiary = Water,
    onTertiary = SurfaceLight,
    tertiaryContainer = Color(0xFF1A2A3E),
    onTertiaryContainer = Water,
    background = BackgroundDark,
    onBackground = OnSurfaceDark,
    surface = SurfaceDark,
    onSurface = OnSurfaceDark,
    surfaceVariant = Color(0xFF242A38),
    onSurfaceVariant = OnSurfaceDark.copy(alpha = 0.7f),
    outline = OutlineDark,
    error = OutOfBounds,
    onError = SurfaceLight
)

@Composable
fun TmglTheme(
    darkTheme: Boolean? = null,
    content: @Composable () -> Unit
) {
    val useDarkTheme = darkTheme ?: storedDarkMode() ?: isSystemInDarkTheme()

    MaterialTheme(
        colorScheme = if (useDarkTheme) DarkColorScheme else LightColorScheme,
        typography = TmglTypography,
        shapes = TmglShapes,
        content = content
    )
}

@Composable
private fun storedDarkMode(): Boolean? {
    val context = LocalContext.current
    val stored = produceState<Boolean?>(initialValue = null, context) {
        value = runCatching { OfflineCache.getDarkMode(context).first() }.getOrNull()
    }
    return stored.value
}
