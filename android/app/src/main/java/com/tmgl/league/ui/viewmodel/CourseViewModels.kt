package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tmgl.league.data.model.Course
import com.tmgl.league.data.model.CourseDetail
import com.tmgl.league.data.repository.CourseRepository
import com.tmgl.league.data.repository.DataResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CourseSearchState(
    val isLoading: Boolean = false,
    val query: String = "",
    val courses: List<Course> = emptyList(),
    val error: String? = null,
    val hasSearched: Boolean = false
)

data class CourseGpsState(
    val isLoading: Boolean = true,
    val detail: CourseDetail? = null,
    val error: String? = null
)

@HiltViewModel
class CourseSearchViewModel @Inject constructor(
    private val courseRepository: CourseRepository
) : ViewModel() {

    private val _state = MutableStateFlow(CourseSearchState())
    val state: StateFlow<CourseSearchState> = _state

    private var searchJob: Job? = null

    init {
        viewModelScope.launch { search("") }
    }

    fun onQueryChanged(query: String) {
        _state.value = _state.value.copy(query = query)
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(SEARCH_DEBOUNCE_MILLIS)
            search(query)
        }
    }

    fun refresh() {
        searchJob?.cancel()
        searchJob = viewModelScope.launch { search(_state.value.query) }
    }

    private suspend fun search(query: String) {
        _state.value = _state.value.copy(isLoading = true, error = null)
        when (val result = courseRepository.searchCourses(query)) {
            is DataResult.Success -> _state.value = _state.value.copy(
                isLoading = false,
                courses = result.data,
                error = null,
                hasSearched = true
            )
            is DataResult.Error -> _state.value = _state.value.copy(
                isLoading = false,
                error = result.message,
                hasSearched = true
            )
        }
    }

    private companion object {
        const val SEARCH_DEBOUNCE_MILLIS = 300L
    }
}

@HiltViewModel
class CourseGpsViewModel @Inject constructor(
    private val courseRepository: CourseRepository
) : ViewModel() {

    private val _state = MutableStateFlow(CourseGpsState())
    val state: StateFlow<CourseGpsState> = _state

    fun load(courseId: String) {
        if (courseId.isBlank()) {
            _state.value = CourseGpsState(isLoading = false, error = "Invalid course")
            return
        }
        _state.value = CourseGpsState(isLoading = true)
        viewModelScope.launch {
            when (val result = courseRepository.getCourseDetail(courseId)) {
                is DataResult.Success -> _state.value = CourseGpsState(
                    isLoading = false,
                    detail = result.data
                )
                is DataResult.Error -> _state.value = CourseGpsState(
                    isLoading = false,
                    error = result.message
                )
            }
        }
    }
}
