package com.tmgl.league.data.crashlytics

import com.google.firebase.crashlytics.FirebaseCrashlytics

object CrashlyticsHelper {
    fun log(message: String) {
        FirebaseCrashlytics.getInstance().log(message)
    }

    fun setUserId(userId: String) {
        FirebaseCrashlytics.getInstance().setUserId(userId)
    }

    fun recordException(throwable: Throwable, message: String? = null) {
        message?.let { FirebaseCrashlytics.getInstance().log(it) }
        FirebaseCrashlytics.getInstance().recordException(throwable)
    }

    fun setCustomKey(key: String, value: String) {
        FirebaseCrashlytics.getInstance().setCustomKey(key, value)
    }

    fun setCustomKey(key: String, value: Long) {
        FirebaseCrashlytics.getInstance().setCustomKey(key, value)
    }

    fun setCustomKey(key: String, value: Boolean) {
        FirebaseCrashlytics.getInstance().setCustomKey(key, value)
    }

    fun setCrashlyticsCollectionEnabled(enabled: Boolean) {
        FirebaseCrashlytics.getInstance().isCrashlyticsCollectionEnabled = enabled
    }
}
