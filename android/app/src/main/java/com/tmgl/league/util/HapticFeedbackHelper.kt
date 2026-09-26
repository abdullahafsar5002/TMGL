package com.tmgl.league.util

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import android.view.HapticFeedbackConstants
import android.view.View

object HapticFeedbackHelper {

    enum class HapticType {
        CLICK,
        LONG_PRESS,
        SUCCESS,
        ERROR,
        LIGHT_TAP,
        HEAVY_THUD,
        CLOCK_TICK,
        CONFIRM
    }

    @Composable
    fun rememberHapticPerformer(): (HapticType) -> Unit {
        val context = LocalContext.current
        val view = LocalView.current
        return remember(context, view) {
            { type -> performHapticFeedback(context, view, type) }
        }
    }

    fun performHapticFeedback(context: Context, view: View, type: HapticType) {
        when (type) {
            HapticType.CLICK -> {
                view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
            }
            HapticType.LONG_PRESS -> {
                view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            }
            HapticType.SUCCESS -> {
                performCustomVibration(context, longArrayOf(0, 50, 100, 50), -1)
            }
            HapticType.ERROR -> {
                view.performHapticFeedback(HapticFeedbackConstants.REJECT)
            }
            HapticType.LIGHT_TAP -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    performCustomVibration(context, longArrayOf(0, 10), 0)
                }
            }
            HapticType.HEAVY_THUD -> {
                performCustomVibration(context, longArrayOf(0, 100), -1)
            }
            HapticType.CLOCK_TICK -> {
                view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
            }
            HapticType.CONFIRM -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
                }
            }
        }
    }

    private fun performCustomVibration(context: Context, timings: LongArray, amplitude: Int) {
        val vibrator: Vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager ?: return
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (amplitude == -1) {
                vibrator.vibrate(VibrationEffect.createWaveform(timings, -1))
            } else {
                vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitude))
            }
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(timings, -1)
        }
    }
}
