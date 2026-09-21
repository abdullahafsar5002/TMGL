package com.tmgl.league.ui.components

import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.tmgl.league.data.error.ErrorEvent
import com.tmgl.league.data.error.GlobalErrorHandler
import com.tmgl.league.ui.theme.TmglGreen
import kotlinx.coroutines.launch

@Composable
fun ErrorSnackbarHost(
    errorHandler: GlobalErrorHandler,
    modifier: Modifier = Modifier
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(errorHandler) {
        errorHandler.errors.collect { event ->
            val result = snackbarHostState.showSnackbar(
                message = event.message,
                actionLabel = if (event.isRetryable) "Retry" else null,
                duration = if (event.isRetryable) SnackbarDuration.Long else SnackbarDuration.Short
            )
            if (result == SnackbarResult.ActionPerformed) {
                event.onRetry?.invoke()
            }
        }
    }

    SnackbarHost(
        hostState = snackbarHostState,
        modifier = modifier,
        snackbar = { snackbarData ->
            Snackbar(
                snackbarData = snackbarData,
                containerColor = TmglGreen,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                actionColor = MaterialTheme.colorScheme.onPrimary
            )
        }
    )
}
