package com.tmgl.league.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

val LocalDarkMode = staticCompositionLocalOf { false }

private val LightColorScheme = lightColorScheme(
    primary = TmglOnyx,
    onPrimary = TmglPlatinum,
    primaryContainer = TmglSlate,
    onPrimaryContainer = TmglPlatinum,
    secondary = TmglGoldMuted,
    onSecondary = TmglPlatinum,
    secondaryContainer = TmglGoldLight,
    onSecondaryContainer = TmglGoldDeep,
    tertiary = TmglGoldDeep,
    onTertiary = TmglPlatinum,
    tertiaryContainer = TmglGoldLight,
    onTertiaryContainer = TmglGoldDeep,
    background = BackgroundLight,
    onBackground = OnSurfaceLight,
    surface = SurfaceLight,
    onSurface = OnSurfaceLight,
    surfaceVariant = SurfaceVariantLight,
    onSurfaceVariant = TmglCharcoalLight,
    outline = OutlineLight,
    outlineVariant = Color(0xFFE6E0D2),
    error = OutOfBounds,
    onError = TmglPlatinum,
    errorContainer = Color(0xFFF9DEDC),
    onErrorContainer = Color(0xFF410E0B)
)

private val DarkColorScheme = darkColorScheme(
    primary = TmglGraphite,
    onPrimary = TmglGoldLight,
    primaryContainer = TmglSlate,
    onPrimaryContainer = TmglGoldLight,
    secondary = TmglGold,
    onSecondary = TmglOnyx,
    secondaryContainer = TmglGoldDeep,
    onSecondaryContainer = TmglGoldLight,
    tertiary = TmglGoldBright,
    onTertiary = TmglOnyx,
    tertiaryContainer = TmglGraphite,
    onTertiaryContainer = TmglGoldLight,
    background = BackgroundDark,
    onBackground = OnSurfaceDark,
    surface = SurfaceDark,
    onSurface = OnSurfaceDark,
    surfaceVariant = SurfaceVariantDark,
    onSurfaceVariant = Color(0xFFCDC9BE),
    outline = OutlineDark,
    outlineVariant = Color(0xFF2C2C35),
    error = Color(0xFFF2B8B5),
    onError = Color(0xFF601410),
    errorContainer = Color(0xFF8C1D18),
    onErrorContainer = Color(0xFFF9DEDC)
)

@Composable
fun TmglTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    CompositionLocalProvider(LocalDarkMode provides darkTheme) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = TmglTypography,
            shapes = TmglShapes,
            content = content
        )
    }
}
