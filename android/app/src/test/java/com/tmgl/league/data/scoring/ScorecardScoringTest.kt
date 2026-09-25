package com.tmgl.league.data.scoring

import com.tmgl.league.data.model.ScorecardHole
import com.tmgl.league.data.model.ScorecardStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScorecardScoringTest {

    @Test
    fun `merge keeps holes that were not submitted`() {
        val existing = listOf(
            hole(1, 4, 4),
            hole(2, 4, 5),
            hole(3, 3, 3)
        )

        val merged = mergeScorecardHoles(existing, listOf(hole(2, 4, 4)))

        assertEquals(listOf(1, 2, 3), merged.map { it.holeNumber })
        assertEquals(4, merged.first { it.holeNumber == 1 }.strokes)
        assertEquals(4, merged.first { it.holeNumber == 2 }.strokes)
        assertEquals(3, merged.first { it.holeNumber == 3 }.strokes)
    }

    @Test
    fun `merge does not lose seventeen valid scores when one hole is blank`() {
        val existing = (1..18).map { hole(it, 4, 4) }

        val merged = mergeScorecardHoles(existing, emptyList())

        assertEquals(18, merged.size)
        assertEquals(72, totalsFromHoles(merged).totalStrokes)
    }

    @Test
    fun `merge replaces strokes and score to par for submitted holes only`() {
        val existing = (1..5).map { hole(it, 4, 4) }
        val incoming = listOf(hole(1, 4, 6), hole(4, 4, 2))

        val merged = mergeScorecardHoles(existing, incoming)

        assertEquals(6, merged.first { it.holeNumber == 1 }.strokes)
        assertEquals(2, merged.first { it.holeNumber == 1 }.scoreToPar)
        assertEquals(2, merged.first { it.holeNumber == 4 }.strokes)
        assertEquals(-2, merged.first { it.holeNumber == 4 }.scoreToPar)
        assertEquals(4, merged.first { it.holeNumber == 2 }.strokes)
    }

    @Test
    fun `merge keeps the existing row identity when a hole is overwritten`() {
        val existing = listOf(hole(1, 4, 4).copy(id = "hole-1", createdAt = "2024-01-01"))
        val incoming = listOf(hole(1, 5, 5))

        val merged = mergeScorecardHoles(existing, incoming)

        assertEquals("hole-1", merged.single().id)
        assertEquals("2024-01-01", merged.single().createdAt)
        assertEquals(5, merged.single().strokes)
    }

    @Test
    fun `merge is idempotent when the same holes are submitted twice`() {
        val first = mergeScorecardHoles(listOf(hole(1, 4, 4)), listOf(hole(1, 4, 5), hole(2, 4, 4)))
        val second = mergeScorecardHoles(first, listOf(hole(1, 4, 5), hole(2, 4, 4)))

        assertEquals(first, second)
    }

    @Test
    fun `build skips holes without a valid stroke`() {
        val expected = expectedHoles(4)
        val strokes = mapOf(1 to 4, 2 to null, 3 to 0, 4 to 5)

        val rows = buildScorecardHoles("sc-1", expected, strokes)

        assertEquals(listOf(1, 4), rows.map { it.holeNumber })
        assertEquals("sc-1", rows.first().scorecardId)
    }

    @Test
    fun `build computes score to par from the expected par`() {
        val expected = listOf(ExpectedHole(1, 5), ExpectedHole(2, 3))

        val rows = buildScorecardHoles("sc-1", expected, mapOf(1 to 4, 2 to 5))

        assertEquals(-1, rows.first { it.holeNumber == 1 }.scoreToPar)
        assertEquals(2, rows.first { it.holeNumber == 2 }.scoreToPar)
    }

    @Test
    fun `build rejects strokes above the allowed maximum`() {
        val rows = buildScorecardHoles("sc-1", expectedHoles(1), mapOf(1 to MAX_STROKES + 1))

        assertTrue(rows.isEmpty())
    }

    @Test
    fun `totals come from persisted holes`() {
        val persisted = listOf(hole(1, 4, 4), hole(2, 4, 6), hole(3, 3, 2))

        val totals = totalsFromHoles(persisted)

        assertEquals(12, totals.totalStrokes)
        assertEquals(1, totals.totalToPar)
    }

    @Test
    fun `totals ignore the stored score to par column and recompute from par`() {
        val persisted = listOf(hole(1, 4, 5).copy(scoreToPar = 99))

        val totals = totalsFromHoles(persisted)

        assertEquals(5, totals.totalStrokes)
        assertEquals(1, totals.totalToPar)
    }

    @Test
    fun `validation blocks submission while holes are missing`() {
        val expected = expectedHoles(18)
        val strokes = (1..17).associateWith { 4 }

        val check = validateCompletion(expected, strokes)

        assertFalse(check.isComplete)
        assertEquals(listOf(18), check.missingHoles)
        assertEquals(17, check.enteredHoleCount)
        assertTrue(check.missingHolesMessage().contains("18"))
    }

    @Test
    fun `validation passes when every expected hole has a score`() {
        val expected = expectedHoles(9)
        val strokes = (1..9).associateWith { 4 }

        val check = validateCompletion(expected, strokes)

        assertTrue(check.isComplete)
        assertTrue(check.missingHoles.isEmpty())
    }

    @Test
    fun `validation counts only expected holes`() {
        val expected = listOf(ExpectedHole(1, 4), ExpectedHole(2, 4))
        val strokes = mapOf(1 to 4, 2 to 4, 3 to 4)

        val check = validateCompletion(expected, strokes)

        assertEquals(2, check.enteredHoleCount)
        assertTrue(check.isComplete)
    }

    @Test
    fun `validation treats zero and out of range strokes as missing`() {
        val expected = listOf(ExpectedHole(1, 4), ExpectedHole(2, 4), ExpectedHole(3, 4))
        val strokes = mapOf(1 to 0, 2 to MAX_STROKES + 3, 3 to 4)

        val check = validateCompletion(expected, strokes)

        assertEquals(listOf(1, 2), check.missingHoles)
        assertEquals(1, check.enteredHoleCount)
    }

    @Test
    fun `completion from persisted holes mirrors submitted strokes`() {
        val expected = expectedHoles(3)
        val persisted = listOf(hole(1, 4, 4), hole(3, 3, 3))

        val check = completionFromHoles(expected, persisted)

        assertFalse(check.isComplete)
        assertEquals(listOf(2), check.missingHoles)
    }

    @Test
    fun `incomplete save stays in progress instead of submitted`() {
        val expected = expectedHoles(3)
        val check = validateCompletion(expected, mapOf(1 to 4, 2 to 4))

        val status = nextStatus(check, ScorecardStatus.DRAFT, submitting = true)

        assertEquals(ScorecardStatus.IN_PROGRESS, status)
    }

    @Test
    fun `empty save is a draft`() {
        val check = validateCompletion(expectedHoles(3), mapOf(1 to null, 2 to null, 3 to null))

        val status = nextStatus(check, ScorecardStatus.SUBMITTED, submitting = false)

        assertEquals(ScorecardStatus.DRAFT, status)
    }

    @Test
    fun `complete save becomes submitted`() {
        val expected = expectedHoles(3)
        val check = validateCompletion(expected, mapOf(1 to 4, 2 to 4, 3 to 4))

        val status = nextStatus(check, ScorecardStatus.DRAFT, submitting = true)

        assertEquals(ScorecardStatus.SUBMITTED, status)
    }

    @Test
    fun `autosave never downgrades a verified card`() {
        val check = validateCompletion(expectedHoles(3), mapOf(1 to 4))

        val status = nextStatus(check, ScorecardStatus.VERIFIED, submitting = false)

        assertEquals(ScorecardStatus.VERIFIED, status)
    }

    @Test
    fun `submitted and verified require a complete scorecard`() {
        assertTrue(statusRequiresCompleteScorecard(ScorecardStatus.SUBMITTED))
        assertTrue(statusRequiresCompleteScorecard(ScorecardStatus.VERIFIED))
        assertTrue(statusRequiresCompleteScorecard(ScorecardStatus.AMENDED))
        assertFalse(statusRequiresCompleteScorecard(ScorecardStatus.DRAFT))
        assertFalse(statusRequiresCompleteScorecard(ScorecardStatus.IN_PROGRESS))
    }

    @Test
    fun `expected holes follow the course hole count and pars`() {
        val expected = expectedHoles(9, mapOf(1 to 5, 4 to 3))

        assertEquals(9, expected.size)
        assertEquals(5, expected.first { it.holeNumber == 1 }.par)
        assertEquals(3, expected.first { it.holeNumber == 4 }.par)
        assertEquals(4, expected.first { it.holeNumber == 2 }.par)
    }

    @Test
    fun `expected holes fall back to eighteen holes for invalid counts`() {
        assertEquals(18, expectedHoles(null).size)
        assertEquals(18, expectedHoles(0).size)
        assertEquals(18, expectedHoles(99).size)
    }

    @Test
    fun `status wire values match the database enum`() {
        assertEquals("in_progress", statusWireValue(ScorecardStatus.IN_PROGRESS))
        assertEquals("submitted", statusWireValue(ScorecardStatus.SUBMITTED))
        assertEquals("verified", statusWireValue(ScorecardStatus.VERIFIED))
    }

    private fun hole(holeNumber: Int, par: Int, strokes: Int) = ScorecardHole(
        scorecardId = "sc-1",
        holeNumber = holeNumber,
        par = par,
        strokes = strokes,
        scoreToPar = strokes - par
    )
}
