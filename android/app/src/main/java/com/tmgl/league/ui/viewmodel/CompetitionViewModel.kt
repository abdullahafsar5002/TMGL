package com.tmgl.league.ui.viewmodel

import androidx.lifecycle.ViewModel
import com.tmgl.league.data.repository.CompetitionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class CompetitionViewModel @Inject constructor(
    val repository: CompetitionRepository
) : ViewModel()
