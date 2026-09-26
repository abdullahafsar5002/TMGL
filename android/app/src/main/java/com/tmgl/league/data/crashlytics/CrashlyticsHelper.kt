package com.tmgl.league.data.crashlytics

import com.google.firebase.crashlytics.FirebaseCrashlytics

object CrashlyticsHelper {
    fun setUserId(userId: String) {
        FirebaseCrashlytics.getInstance().setUserId(userId)
    }

    fun setCustomKey(key: String, value: String) {
        FirebaseCrashlytics.getInstance().setCustomKey(key, value)
    }
}
