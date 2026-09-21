package com.tmgl.league.data.error

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

data class ErrorEvent(
    val message: String,
    val title: String = "Error",
    val isRetryable: Boolean = false,
    val onRetry: (() -> Unit)? = null,
    val timestamp: Long = System.currentTimeMillis()
)

@Singleton
class GlobalErrorHandler @Inject constructor() {

    private val _errors = MutableSharedFlow<ErrorEvent>(extraBufferCapacity = 5)
    val errors: SharedFlow<ErrorEvent> = _errors.asSharedFlow()

    fun report(message: String, title: String = "Error", isRetryable: Boolean = false, onRetry: (() -> Unit)? = null) {
        _errors.tryEmit(ErrorEvent(message, title, isRetryable, onRetry))
    }

    fun report(exception: Exception, title: String = "Error", isRetryable: Boolean = false, onRetry: (() -> Unit)? = null) {
        val message = exception.message ?: exception.javaClass.simpleName
        report(message, title, isRetryable, onRetry)
    }

    fun reportNetworkError(exception: Exception, onRetry: (() -> Unit)? = null) {
        report(exception, "Network Error", isRetryable = true, onRetry = onRetry)
    }

    fun reportNotFoundError(resource: String) {
        report("$resource not found", "Not Found")
    }

    fun reportAuthError() {
        report("Session expired. Please sign in again.", "Authentication Required")
    }

    fun reportPermissionError() {
        report("You don't have permission to perform this action.", "Permission Denied")
    }
}
