package com.tmgl.league.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class CompetitionRepositoryTest {

    @Test
    fun `repository is constructible for dependency injection`() {
        val repository = CompetitionRepository()
        assertNotNull(repository)
    }

    @Test
    fun `getScorecardHoles maps the canonical score column`() {
        val rows = listOf(
            com.tmgl.league.data.model.ScorecardHoleRow(
                id = "hole-1",
                scorecardId = "scorecard-1",
                holeNumber = 1,
                score = 4,
                par = 4
            ),
            com.tmgl.league.data.model.ScorecardHoleRow(
                id = "hole-2",
                scorecardId = "scorecard-1",
                holeNumber = 2,
                strokes = 5
            )
        )
        val mapped = rows.map { com.tmgl.league.data.model.scorecardHoleRowToModel(it) }
        assertEquals(listOf(1, 2), mapped.map { it.holeNumber })
        assertEquals(listOf(4, 5), mapped.map { it.score })
        assertEquals(4, mapped.first().par)
        assertEquals(null, mapped[1].par)
    }
}
