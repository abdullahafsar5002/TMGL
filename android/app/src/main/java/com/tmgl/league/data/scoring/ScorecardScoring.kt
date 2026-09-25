package com.tmgl.league.data.scoring

import com.tmgl.league.data.model.ScorecardHole
import com.tmgl.league.data.model.ScorecardStatus

const val DEFAULT_HOLE_COUNT = 18
const val DEFAULT_PAR = 4
const val MIN_STROKES = 1
const val MAX_STROKES = 15

private val STANDARD_PARS = listOf(4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4)

data class ExpectedHole(
    val holeNumber: Int,
    val par: Int = DEFAULT_PAR
)

data class ScorecardTotals(
    val totalStrokes: Int,
    val totalToPar: Int
)

data class CompletionCheck(
    val expectedHoleCount: Int,
    val enteredHoleCount: Int,
    val missingHoles: List<Int>
) {
    val isComplete: Boolean
        get() = expectedHoleCount > 0 && missingHoles.isEmpty()

    val isEmpty: Boolean
        get() = enteredHoleCount == 0

    fun missingHolesMessage(): String {
        if (missingHoles.isEmpty()) return ""
        val listed = missingHoles.joinToString(", ")
        return "Score $enteredHoleCount of $expectedHoleCount holes. Missing holes: $listed"
    }
}

fun isValidStrokes(strokes: Int?): Boolean = strokes != null && strokes in MIN_STROKES..MAX_STROKES

fun normalizeHoleCount(holeCount: Int?): Int = when {
    holeCount == null || holeCount <= 0 -> DEFAULT_HOLE_COUNT
    holeCount > DEFAULT_HOLE_COUNT -> DEFAULT_HOLE_COUNT
    else -> holeCount
}

fun defaultPars(holeCount: Int): List<Int> {
    val count = normalizeHoleCount(holeCount)
    return (1..count).map { holeNumber ->
        STANDARD_PARS.getOrElse(holeNumber - 1) { DEFAULT_PAR }
    }
}

fun expectedHoles(holeCount: Int? = null, parByHole: Map<Int, Int> = emptyMap()): List<ExpectedHole> {
    val count = normalizeHoleCount(holeCount)
    val fallback = defaultPars(count)
    return (1..count).map { holeNumber ->
        ExpectedHole(holeNumber = holeNumber, par = parByHole[holeNumber]?.takeIf { it in 3..6 } ?: fallback[holeNumber - 1])
    }
}

fun buildScorecardHoles(
    scorecardId: String,
    expected: List<ExpectedHole>,
    strokesByHole: Map<Int, Int?>
): List<ScorecardHole> {
    return expected.mapNotNull { hole ->
        val strokes = strokesByHole[hole.holeNumber]
        if (!isValidStrokes(strokes)) return@mapNotNull null
        ScorecardHole(
            scorecardId = scorecardId,
            holeNumber = hole.holeNumber,
            par = hole.par,
            strokes = strokes ?: 0,
            scoreToPar = (strokes ?: 0) - hole.par
        )
    }
}

fun mergeScorecardHoles(
    existing: List<ScorecardHole>,
    incoming: List<ScorecardHole>
): List<ScorecardHole> {
    if (incoming.isEmpty()) return existing.sortedBy { it.holeNumber }
    if (existing.isEmpty()) return incoming.sortedBy { it.holeNumber }

    val merged = linkedMapOf<Int, ScorecardHole>()
    existing.forEach { hole -> merged[hole.holeNumber] = hole }
    incoming.forEach { hole ->
        val previous = merged[hole.holeNumber]
        merged[hole.holeNumber] = if (previous == null) {
            hole
        } else {
            hole.copy(
                id = previous.id,
                createdAt = previous.createdAt,
                par = hole.par
            )
        }
    }
    return merged.values.sortedBy { it.holeNumber }
}

fun totalsFromHoles(holes: List<ScorecardHole>): ScorecardTotals = ScorecardTotals(
    totalStrokes = holes.sumOf { it.strokes },
    totalToPar = holes.sumOf { it.strokes - it.par }
)

fun validateCompletion(
    expected: List<ExpectedHole>,
    strokesByHole: Map<Int, Int?>
): CompletionCheck {
    val missing = expected
        .filter { !isValidStrokes(strokesByHole[it.holeNumber]) }
        .map { it.holeNumber }
        .sorted()
    val entered = expected.count { isValidStrokes(strokesByHole[it.holeNumber]) }
    return CompletionCheck(
        expectedHoleCount = expected.size,
        enteredHoleCount = entered,
        missingHoles = missing
    )
}

fun completionFromHoles(
    expected: List<ExpectedHole>,
    holes: List<ScorecardHole>
): CompletionCheck = validateCompletion(
    expected = expected,
    strokesByHole = holes.associate { it.holeNumber to it.strokes }
)

fun nextStatus(
    check: CompletionCheck,
    current: ScorecardStatus,
    submitting: Boolean
): ScorecardStatus = when {
    submitting && check.isComplete -> ScorecardStatus.SUBMITTED
    current == ScorecardStatus.VERIFIED || current == ScorecardStatus.REJECTED -> current
    check.isEmpty -> ScorecardStatus.DRAFT
    else -> ScorecardStatus.IN_PROGRESS
}

fun statusRequiresCompleteScorecard(status: ScorecardStatus): Boolean =
    status == ScorecardStatus.SUBMITTED ||
        status == ScorecardStatus.VERIFIED ||
        status == ScorecardStatus.AMENDED

fun statusWireValue(status: ScorecardStatus): String = when (status) {
    ScorecardStatus.DRAFT -> "draft"
    ScorecardStatus.IN_PROGRESS -> "in_progress"
    ScorecardStatus.SUBMITTED -> "submitted"
    ScorecardStatus.VERIFIED -> "verified"
    ScorecardStatus.REJECTED -> "rejected"
    ScorecardStatus.AMENDED -> "amended"
}
