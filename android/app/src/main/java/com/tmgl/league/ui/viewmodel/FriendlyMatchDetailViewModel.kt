package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.FriendlyMatch
import com.tmgl.league.data.model.FriendlyMatchPlayer
import com.tmgl.league.data.model.FriendlyMatchStatus
import com.tmgl.league.data.repository.CourseRepository
import com.tmgl.league.data.repository.CurrentPlayerRepository
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.FriendlyMatchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FriendlyMatchDetailState(
    val isLoading: Boolean = true,
    val isUpdatingStatus: Boolean = false,
    val match: FriendlyMatch? = null,
    val players: List<FriendlyMatchPlayer> = emptyList(),
    val courseName: String? = null,
    val isCreator: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class FriendlyMatchDetailViewModel @Inject constructor(
    private val friendlyMatchRepository: FriendlyMatchRepository,
    private val currentPlayerRepository: CurrentPlayerRepository,
    private val courseRepository: CourseRepository
) : ViewModel() {

    private val _state = MutableStateFlow(FriendlyMatchDetailState())
    val state: StateFlow<FriendlyMatchDetailState> = _state

    fun load(matchId: String) {
        if (matchId.isBlank()) {
            _state.value = FriendlyMatchDetailState(isLoading = false, error = "Invalid match")
            return
        }
        _state.value = FriendlyMatchDetailState(isLoading = true)
        viewModelScope.launch {
            when (val result = friendlyMatchRepository.getFriendlyMatchParticipants(matchId)) {
                is DataResult.Error -> _state.value = FriendlyMatchDetailState(
                    isLoading = false,
                    error = result.message
                )
                is DataResult.Success -> {
                    val match = result.data.match
                    val courseName = match.courseId.takeIf { it.isNotBlank() }?.let { id ->
                        when (val course = courseRepository.getCourse(id)) {
                            is DataResult.Success -> course.data?.name
                            is DataResult.Error -> null
                        }
                    }
                    val currentPlayerId = currentPlayerRepository.getCurrentPlayerId()
                    _state.value = FriendlyMatchDetailState(
                        isLoading = false,
                        match = match,
                        players = result.data.players,
                        courseName = courseName,
                        isCreator = !currentPlayerId.isNullOrBlank() && match.creatorId == currentPlayerId
                    )
                }
            }
        }
    }

    fun startScoring(onReady: (String) -> Unit) {
        val match = _state.value.match ?: return
        if (match.id.isBlank()) return
        _state.value = _state.value.copy(isUpdatingStatus = true)
        viewModelScope.launch {
            when (val result = friendlyMatchRepository.updateStatus(match.id, FriendlyMatchStatus.IN_PROGRESS)) {
                is DataResult.Success -> {
                    _state.value = _state.value.copy(isUpdatingStatus = false, match = result.data)
                    onReady(match.id)
                }
                is DataResult.Error -> _state.value = _state.value.copy(
                    isUpdatingStatus = false,
                    error = result.message
                )
            }
        }
    }

    fun rejectMatch() {
        val match = _state.value.match ?: return
        if (!_state.value.isCreator) return
        _state.value = _state.value.copy(isUpdatingStatus = true)
        viewModelScope.launch {
            when (val result = friendlyMatchRepository.updateStatus(match.id, FriendlyMatchStatus.REJECTED)) {
                is DataResult.Success -> _state.value =
                    _state.value.copy(isUpdatingStatus = false, match = result.data)
                is DataResult.Error -> _state.value = _state.value.copy(
                    isUpdatingStatus = false,
                    error = result.message
                )
            }
        }
    }
}
