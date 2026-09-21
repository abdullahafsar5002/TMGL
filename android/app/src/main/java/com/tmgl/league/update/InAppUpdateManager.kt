package com.tmgl.league.update

import android.app.Activity
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability

object InAppUpdateManager {
    private var appUpdateManager: AppUpdateManager? = null

    fun checkForUpdate(activity: Activity) {
        val manager = AppUpdateManagerFactory.create(activity)
        appUpdateManager = manager

        manager.appUpdateInfo.addOnSuccessListener { info ->
            if (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                && info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
            ) {
                manager.startUpdateFlowForResult(
                    info,
                    AppUpdateType.FLEXIBLE,
                    activity,
                    REQUEST_CODE
                )
            }
        }
    }

    private const val REQUEST_CODE = 1001
}
