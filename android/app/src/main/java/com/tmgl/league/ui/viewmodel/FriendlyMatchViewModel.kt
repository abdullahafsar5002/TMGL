package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.FriendlyMatch
import com.tmgl.league.data.model.FriendlyMatchFormat
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.repository.CourseRepository
import com.tmgl.league.data.repository.CurrentPlayerRepository
import com.tmgl.league.data.repository.DataResult
import com.tmgl.league.data.repository.FriendlyMatchRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FriendlyMatchCreateState(
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val courses: List<Course> = emptyList(),
    val createdMatch: FriendlyMatch? = null,
    val error: String? = null
)

@HiltViewModel
class FriendlyMatchViewModel @Inject constructor(
    private val friendlyMatchRepository: FriendlyMatchRepository,
    private val currentPlayerRepository: CurrentPlayerRepository,
    private val courseRepository: CourseRepository
) : ViewModel() {

    private val _matches = MutableStateFlow<List<FriendlyMatch>>(emptyList())
    val matches: StateFlow<List<FriendlyMatch>> = _matches

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    private val _createState = MutableStateFlow(FriendlyMatchCreateState())
    val createState: StateFlow<FriendlyMatchCreateState> = _createState

    fun loadMatches() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            val playerId = currentPlayerRepository.getCurrentPlayerId()
            if (playerId.isNullOrBlank()) {
                _error.value = "No player record is linked to this account."
                _isLoading.value = false
                return@launch
            }
            when (val result = friendlyMatchRepository.getFriendlyMatchesByPlayer(playerId)) {
                is DataResult.Success -> _matches.value = result.data
                is DataResult.Error -> _error.value = result.message
            }
            _isLoading.value = false
        }
    }

    fun loadCourses() {
        if (_createState.value.courses.isNotEmpty() || _createState.value.isLoading) return
        _createState.value = _createState.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            when (val result = courseRepository.getCourses()) {
                is DataResult.Success -> _createState.value =
                    _createState.value.copy(isLoading = false, courses = result.data)
                is DataResult.Error -> _createState.value =
                    _createState.value.copy(isLoading = false, error = result.message)
            }
        }
    }

    fun createMatch(
        courseId: String,
        title: String,
        description: String,
        matchFormat: String,
        roundType: Int,
        scheduledAt: String?,
        opponentEmail: String?
    ) {
        if (_createState.value.isSubmitting) return
        _createState.value = _createState.value.copy(isSubmitting = true, error = null, createdMatch = null)
        viewModelScope.launch {
            val playerId = currentPlayerRepository.getCurrentPlayerId()
            if (playerId.isNullOrBlank()) {
                _createState.value = _createState.value.copy(
                    isSubmitting = false,
                    error = "No player record is linked to this account."
                )
                return@launch
            }
            val opponentPlayerId = if (!opponentEmail.isNullOrBlank()) {
                when (val lookup = friendlyMatchRepository.resolvePlayerIdByEmail(opponentEmail)) {
                    is DataResult.Success -> lookup.data
                    is DataResult.Error -> null
                }
            } else {
                null
            }
            if (!opponentEmail.isNullOrBlank() && opponentPlayerId.isNullOrBlank()) {
                _createState.value = _createState.value.copy(
                    isSubmitting = false,
                    error = "No TMGL player is registered with that email."
                )
                return@launch
            }
            when (
                val result = friendlyMatchRepository.createFriendlyMatch(
                    creatorPlayerId = playerId,
                    courseId = courseId,
                    title = title,
                    description = description,
                    matchFormat = FriendlyMatchFormat.entries.firstOrNull {
                        it.name.equals(matchFormat, ignoreCase = true)
                    } ?: FriendlyMatchFormat.STROKE_PLAY,
                    roundType = roundType,
                    scheduledAt = scheduledAt,
                    opponentPlayerId = opponentPlayerId
                )
            ) {
                is DataResult.Success -> {
                    _createState.value = _createState.value.copy(
                        isSubmitting = false,
                        createdMatch = result.data
                    )
                    loadMatches()
                }
                is DataResult.Error -> _createState.value = _createState.value.copy(
                    isSubmitting = false,
                    error = result.message
                )
            }
        }
    }

    fun clearCreateState() {
        _createState.value = FriendlyMatchCreateState(courses = _createState.value.courses)
    }
}
