package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.Announcement
import com.tmgl.league.data.model.Notification
import com.tmgl.league.data.repository.AuthRepository
import com.tmgl.league.data.repository.AuthState
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.SocialRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SocialViewModel @Inject constructor(
    private val socialRepository: SocialRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    private val _announcements = MutableStateFlow<List<Announcement>>(emptyList())
    val announcements: StateFlow<List<Announcement>> = _announcements

    private val _notifications = MutableStateFlow<List<Notification>>(emptyList())
    val notifications: StateFlow<List<Notification>> = _notifications

    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun loadAnnouncements() {
        viewModelScope.launch {
            _isLoading.value = true; _error.value = null
            val authState = authRepository.getCurrentUser()
            if (authState !is AuthState.Authenticated) {
                _error.value = "Please sign in to view this content"
                _isLoading.value = false
                return@launch
            }
            when (val result = socialRepository.getPublishedAnnouncements()) {
                is DataResult.Success -> _announcements.value = result.data
                is DataResult.Error -> _error.value = result.message
            }
            _isLoading.value = false
        }
    }

    fun loadNotifications() {
        viewModelScope.launch {
            _isLoading.value = true; _error.value = null
            val authState = authRepository.getCurrentUser()
            if (authState is AuthState.Authenticated) {
                val userId = authState.userId
                when (val result = socialRepository.getNotifications(userId)) {
                    is DataResult.Success -> _notifications.value = result.data
                    is DataResult.Error -> _error.value = result.message
                }
                when (val countResult = socialRepository.getUnreadCount(userId)) {
                    is DataResult.Success -> _unreadCount.value = countResult.data
                    else -> {}
                }
            } else {
                _error.value = "Not authenticated"
            }
            _isLoading.value = false
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            val authState = authRepository.getCurrentUser()
            if (authState is AuthState.Authenticated) {
                socialRepository.markAllAsRead(authState.userId)
                loadNotifications()
            }
        }
    }
}
