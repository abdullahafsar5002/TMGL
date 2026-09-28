package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import com.tmgl.league.data.repository.ScoringFormatsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class ScoringFormatsViewModel @Inject constructor(
    val repository: ScoringFormatsRepository
) : ViewModel()
