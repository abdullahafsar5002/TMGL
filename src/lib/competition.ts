/**
 * Phase 3 Service Layer — Tournaments, Rounds, Matches, Scorecards, Leaderboard
 *
 * All Supabase access is isolated here. Components call these functions
 * instead of writing queries inline.
 *
 * Authorization is enforced by RLS on the database side.
 * These functions do not perform authorization checks themselves.
 */

import { supabase } from '@/lib/supabase';
import {
  LEADERBOARD_ELIGIBLE_STATUSES,
  countCompletedHoles,
  filterLeaderboardEligibleScorecards,
  isLeaderboardEligibleStatus,
  isScorecardComplete,
} from '@/lib/scorecardEligibility';
import { resolveScoringTarget } from '@/lib/scoringTarget';
import { resolveExpectedHoleNumbers, DEFAULT_HOLES_COUNT } from '@/lib/validation';
import type {
  Tournament,
  Round,
  Match,
  Scorecard,
  ScorecardHole,
  LeaderboardEntry,
  TournamentStatus,
  MatchStatus,
  PaginatedResult,
} from '@/types/database';
import type { ServiceResult } from '@/types/service';

export {
  LEADERBOARD_ELIGIBLE_STATUSES,
  filterLeaderboardEligibleScorecards,
  isLeaderboardEligibleStatus,
  isScorecardComplete,
} from '@/lib/scorecardEligibility';

// -------------------------------------------------------------------
// Tournaments
// -------------------------------------------------------------------

export async function getTournamentsPaginated(
  page: number,
  pageSize: number
): Promise<ServiceResult<PaginatedResult<Tournament>>> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('tournaments')
    .select('*', { count: 'exact' })
    .order('event_date', { ascending: false })
    .range(from, to);

  if (error) return { data: null, error: error.message };
  return { data: { data: (data ?? []) as Tournament[], total: count ?? 0 }, error: null };
}

export async function getTournaments(seasonId?: string): Promise<ServiceResult<Tournament[]>> {
  let query = supabase
    .from('tournaments')
    .select('*')
    .order('event_date', { ascending: false });

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Tournament[], error: null };
}

export async function getTournament(id: string): Promise<ServiceResult<Tournament>> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Tournament, error: null };
}

export async function createTournament(
  tournament: Pick<Tournament, 'season_id' | 'name' | 'description' | 'event_date' | 'course_id' | 'status'>
): Promise<ServiceResult<Tournament>> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      season_id: tournament.season_id,
      name: tournament.name.trim(),
      description: tournament.description || null,
      event_date: tournament.event_date || null,
      course_id: tournament.course_id || null,
      status: tournament.status || 'draft',
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Tournament, error: null };
}

export async function updateTournament(
  id: string,
  updates: Partial<Pick<Tournament, 'name' | 'description' | 'event_date' | 'course_id' | 'status'>>
): Promise<ServiceResult<Tournament>> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.description !== undefined) payload.description = updates.description || null;
  if (updates.event_date !== undefined) payload.event_date = updates.event_date || null;
  if (updates.course_id !== undefined) payload.course_id = updates.course_id || null;
  if (updates.status !== undefined) payload.status = updates.status;

  const { data, error } = await supabase
    .from('tournaments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Tournament, error: null };
}

export async function deleteTournament(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Rounds
// -------------------------------------------------------------------

export async function getRoundsByTournament(tournamentId: string): Promise<ServiceResult<Round[]>> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Round[], error: null };
}

export async function getRound(id: string): Promise<ServiceResult<Round>> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Round, error: null };
}

export async function createRound(
  round: Pick<Round, 'tournament_id' | 'round_number' | 'name' | 'date'>
): Promise<ServiceResult<Round>> {
  const { data, error } = await supabase
    .from('rounds')
    .insert({
      tournament_id: round.tournament_id,
      round_number: round.round_number,
      name: round.name.trim(),
      date: round.date || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Round, error: null };
}

export async function updateRound(
  id: string,
  updates: Partial<Pick<Round, 'name' | 'date' | 'status'>>
): Promise<ServiceResult<Round>> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.date !== undefined) payload.date = updates.date || null;
  if (updates.status !== undefined) payload.status = updates.status;

  const { data, error } = await supabase
    .from('rounds')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Round, error: null };
}

export async function deleteRound(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('rounds').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Matches
// -------------------------------------------------------------------

export async function getMatchesPaginated(
  page: number,
  pageSize: number
): Promise<ServiceResult<PaginatedResult<Match>>> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('matches')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return { data: null, error: error.message };
  return { data: { data: (data ?? []) as Match[], total: count ?? 0 }, error: null };
}

export async function getMatchesByRound(roundId: string): Promise<ServiceResult<Match[]>> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('round_id', roundId)
    .order('scheduled_at');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Match[], error: null };
}

export async function getAllMatches(): Promise<ServiceResult<Match[]>> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Match[], error: null };
}

export async function getMatch(id: string): Promise<ServiceResult<Match>> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Match, error: null };
}

export async function createMatch(
  match: Pick<Match, 'round_id' | 'match_type' | 'team_a_id' | 'team_b_id' | 'player_a_id' | 'player_b_id' | 'scheduled_at'>
): Promise<ServiceResult<Match>> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      round_id: match.round_id,
      match_type: match.match_type,
      team_a_id: match.team_a_id || null,
      team_b_id: match.team_b_id || null,
      player_a_id: match.player_a_id || null,
      player_b_id: match.player_b_id || null,
      scheduled_at: match.scheduled_at || null,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Match, error: null };
}

export async function updateMatch(
  id: string,
  updates: Partial<Pick<Match, 'status' | 'result' | 'winner_team_id' | 'winner_player_id' | 'completed_at'>>
): Promise<ServiceResult<Match>> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.result !== undefined) payload.result = updates.result || null;
  if (updates.winner_team_id !== undefined) payload.winner_team_id = updates.winner_team_id || null;
  if (updates.winner_player_id !== undefined) payload.winner_player_id = updates.winner_player_id || null;
  if (updates.completed_at !== undefined) payload.completed_at = updates.completed_at || null;

  const { data, error } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Match, error: null };
}

export async function deleteMatch(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Scorecards
// -------------------------------------------------------------------

export async function getScorecardsByRound(roundId: string): Promise<ServiceResult<Scorecard[]>> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('round_id', roundId)
    .order('created_at');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Scorecard[], error: null };
}

export async function getScorecard(id: string): Promise<ServiceResult<Scorecard>> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Scorecard, error: null };
}

export async function getScorecardByRoundPlayer(
  roundId: string,
  playerId: string
): Promise<ServiceResult<Scorecard>> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('round_id', roundId)
    .eq('player_id', playerId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Scorecard, error: null };
}

export async function createScorecard(
  scorecard: Pick<Scorecard, 'round_id' | 'player_id' | 'match_id' | 'course_id'>
): Promise<ServiceResult<Scorecard>> {
  const { data, error } = await supabase
    .from('scorecards')
    .insert({
      round_id: scorecard.round_id,
      player_id: scorecard.player_id,
      match_id: scorecard.match_id || null,
      course_id: scorecard.course_id || null,
      status: 'draft',
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Scorecard, error: null };
}

export interface CourseContext {
  courseId: string | null;
  pars: Record<number, number>;
  expectedHoles: number[];
  holeCount: number;
}

export async function getCourseContextForCourse(courseId: string): Promise<ServiceResult<CourseContext>> {
  const { data: course } = await supabase
    .from('courses')
    .select('id, holes_count')
    .eq('id', courseId)
    .maybeSingle();

  const { data: courseHoles } = await supabase
    .from('course_holes')
    .select('hole_number, par')
    .eq('course_id', courseId)
    .order('hole_number');

  const target = resolveScoringTarget({
    round: null,
    course: course ?? { id: courseId, holes_count: null },
    courseHoles: courseHoles ?? [],
  });

  return {
    data: { courseId, pars: target.pars, expectedHoles: target.expectedHoles, holeCount: target.holeCount },
    error: null,
  };
}

export async function getCourseContextForRound(roundId: string): Promise<ServiceResult<CourseContext>> {
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('id, tournament_id')
    .eq('id', roundId)
    .maybeSingle();

  if (roundError) return { data: null, error: roundError.message };
  if (!round?.tournament_id) return { data: null, error: 'Round not found.' };

  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, course_id')
    .eq('id', round.tournament_id)
    .maybeSingle();

  if (tournamentError) return { data: null, error: tournamentError.message };

  const courseId = tournament?.course_id ?? null;
  if (courseId) return getCourseContextForCourse(courseId);

  const target = resolveScoringTarget({ round, tournament, course: null, courseHoles: [] });
  return {
    data: { courseId: null, pars: target.pars, expectedHoles: target.expectedHoles, holeCount: target.holeCount },
    error: null,
  };
}

export async function getRoundHoleCount(roundId: string): Promise<number> {
  const { data: round } = await supabase
    .from('rounds')
    .select('tournament_id')
    .eq('id', roundId)
    .maybeSingle();

  if (!round?.tournament_id) return DEFAULT_HOLES_COUNT;

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('course_id')
    .eq('id', round.tournament_id)
    .maybeSingle();

  if (!tournament?.course_id) return DEFAULT_HOLES_COUNT;

  const { data: course } = await supabase
    .from('courses')
    .select('holes_count')
    .eq('id', tournament.course_id)
    .maybeSingle();

  const { data: courseHoles } = await supabase
    .from('course_holes')
    .select('hole_number')
    .eq('course_id', tournament.course_id);

  return resolveExpectedHoleNumbers({
    holesCount: course?.holes_count ?? null,
    courseHoleNumbers: (courseHoles ?? []).map((h) => h.hole_number),
  }).length;
}

export interface ScorecardCompletion {
  scorecard_id: string;
  player_id: string;
  course_id: string | null;
  holes_completed: number;
  total_holes: number;
  is_complete: boolean;
}

function buildCompletion(
  scorecard: Pick<Scorecard, 'id' | 'player_id' | 'course_id'>,
  holeNumbers: Array<number | null>,
  totalHoles: number
): ScorecardCompletion {
  const holesCompleted = countCompletedHoles(holeNumbers);
  return {
    scorecard_id: scorecard.id,
    player_id: scorecard.player_id,
    course_id: scorecard.course_id,
    holes_completed: holesCompleted,
    total_holes: totalHoles,
    is_complete: isScorecardComplete({ holes_completed: holesCompleted, total_holes: totalHoles }),
  };
}

export async function getScorecardCompletion(
  scorecardId: string
): Promise<ServiceResult<ScorecardCompletion>> {
  const { data: scorecard, error } = await supabase
    .from('scorecards')
    .select('id, round_id, player_id, course_id')
    .eq('id', scorecardId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  if (!scorecard) return { data: null, error: 'Scorecard not found.' };

  const courseId = scorecard.course_id;
  let expectedHoles: number[] = [];

  if (courseId) {
    const context = await getCourseContextForCourse(courseId);
    if (context.error) return { data: null, error: context.error };
    expectedHoles = context.data?.expectedHoles ?? [];
  } else {
    const context = await getCourseContextForRound(scorecard.round_id);
    if (context.error) return { data: null, error: context.error };
    expectedHoles = context.data?.expectedHoles ?? [];
  }

  const { data: holeRows, error: holesError } = await supabase
    .from('scorecard_holes')
    .select('hole_number')
    .eq('scorecard_id', scorecardId);

  if (holesError) return { data: null, error: holesError.message };

  return {
    data: buildCompletion(
      { id: scorecard.id, player_id: scorecard.player_id, course_id: scorecard.course_id },
      (holeRows ?? []).map((h) => h.hole_number),
      expectedHoles.length
    ),
    error: null,
  };
}

export async function getScorecardsCompletionByRound(
  roundId: string
): Promise<ServiceResult<ScorecardCompletion[]>> {
  const { data: scorecards, error } = await supabase
    .from('scorecards')
    .select('id, player_id, course_id')
    .eq('round_id', roundId);

  if (error) return { data: null, error: error.message };
  const cards = (scorecards ?? []) as Array<Pick<Scorecard, 'id' | 'player_id' | 'course_id'>>;
  if (cards.length === 0) return { data: [], error: null };

  const courseIds = Array.from(new Set(cards.map((c) => c.course_id).filter((c): c is string => Boolean(c))));

  let fallbackTotal = 0;
  if (courseIds.length < cards.length) {
    const roundContext = await getCourseContextForRound(roundId);
    fallbackTotal = roundContext.data?.expectedHoles.length ?? 0;
  }

  const holesCountByCourse = new Map<string, number | null>();
  if (courseIds.length > 0) {
    const { data: courseRows, error: courseError } = await supabase
      .from('courses')
      .select('id, holes_count')
      .in('id', courseIds);
    if (courseError) return { data: null, error: courseError.message };
    for (const course of (courseRows ?? []) as Array<{ id: string; holes_count: number | null }>) {
      holesCountByCourse.set(course.id, course.holes_count ?? null);
    }
  }

  const unknownLayoutCourses = courseIds.filter((id) => holesCountByCourse.get(id) == null);
  const holeNumbersByCourse = new Map<string, number[]>();
  if (unknownLayoutCourses.length > 0) {
    const { data: rows, error: courseHoleError } = await supabase
      .from('course_holes')
      .select('course_id, hole_number')
      .in('course_id', unknownLayoutCourses);
    if (courseHoleError) return { data: null, error: courseHoleError.message };
    for (const row of (rows ?? []) as Array<{ course_id: string | null; hole_number: number }>) {
      const owner = row.course_id ?? unknownLayoutCourses[0];
      const list = holeNumbersByCourse.get(owner) ?? [];
      list.push(row.hole_number);
      holeNumbersByCourse.set(owner, list);
    }
  }

  const totalByCourse = new Map<string, number>();
  for (const courseId of courseIds) {
    totalByCourse.set(
      courseId,
      resolveExpectedHoleNumbers({
        holesCount: holesCountByCourse.get(courseId) ?? null,
        courseHoleNumbers: holeNumbersByCourse.get(courseId) ?? [],
      }).length
    );
  }

  const { data: holeRows, error: holesError } = await supabase
    .from('scorecard_holes')
    .select('scorecard_id, hole_number')
    .in('scorecard_id', cards.map((c) => c.id));

  if (holesError) return { data: null, error: holesError.message };

  const holeNumbersByCard = new Map<string, number[]>();
  for (const row of (holeRows ?? []) as Array<{ scorecard_id: string; hole_number: number }>) {
    const list = holeNumbersByCard.get(row.scorecard_id) ?? [];
    list.push(row.hole_number);
    holeNumbersByCard.set(row.scorecard_id, list);
  }

  return {
    data: cards.map((card) => {
      const total = (card.course_id ? totalByCourse.get(card.course_id) : undefined) ?? fallbackTotal;
      return buildCompletion(card, holeNumbersByCard.get(card.id) ?? [], total);
    }),
    error: null,
  };
}

export async function verifyScorecard(scorecardId: string): Promise<ServiceResult<Scorecard>> {
  const completion = await getScorecardCompletion(scorecardId);
  if (completion.error) return { data: null, error: completion.error };
  if (completion.data && !completion.data.is_complete) {
    return {
      data: null,
      error: `Cannot verify an incomplete scorecard (${completion.data.holes_completed}/${completion.data.total_holes} holes scored).`,
    };
  }
  return updateScorecard(scorecardId, { status: 'verified' });
}

export async function rejectScorecard(
  scorecardId: string,
  reason?: string
): Promise<ServiceResult<Scorecard>> {
  const payload: Record<string, unknown> = {
    status: 'rejected',
    updated_at: new Date().toISOString(),
  };
  if (reason) payload.rejection_reason = reason;

  const { data, error } = await supabase
    .from('scorecards')
    .update(payload)
    .eq('id', scorecardId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Scorecard, error: null };
}

export async function updateScorecard(
  id: string,
  updates: Partial<Pick<Scorecard, 'status' | 'total_strokes' | 'total_score_to_par'>>
): Promise<ServiceResult<Scorecard>> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.total_strokes !== undefined) payload.total_strokes = updates.total_strokes;
  if (updates.total_score_to_par !== undefined) payload.total_score_to_par = updates.total_score_to_par;

  const { data, error } = await supabase
    .from('scorecards')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Scorecard, error: null };
}

// -------------------------------------------------------------------
// Scorecard Holes
// -------------------------------------------------------------------

export async function getScorecardHoles(scorecardId: string): Promise<ServiceResult<ScorecardHole[]>> {
  const { data, error } = await supabase
    .from('scorecard_holes')
    .select('*')
    .eq('scorecard_id', scorecardId)
    .order('hole_number');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as ScorecardHole[], error: null };
}

export async function upsertScorecardHoles(
  holes: Array<Pick<ScorecardHole, 'scorecard_id' | 'hole_number' | 'par' | 'strokes' | 'score_to_par'>>
): Promise<ServiceResult<ScorecardHole[]>> {
  const { data, error } = await supabase
    .from('scorecard_holes')
    .upsert(holes, { onConflict: 'scorecard_id,hole_number' })
    .select();

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as ScorecardHole[], error: null };
}

export async function deleteScorecardHoles(scorecardId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('scorecard_holes')
    .delete()
    .eq('scorecard_id', scorecardId);

  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Leaderboard
// -------------------------------------------------------------------

export interface LeaderboardScorecardRow {
  id: string;
  player_id: string;
  status: string | null;
  total_strokes: number | null;
  total_score_to_par: number | null;
  players?: { id: string; full_name: string } | null;
}

export function assignLeaderboardPositions(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...entries].sort(
    (a, b) => a.total_score_to_par - b.total_score_to_par || a.total_strokes - b.total_strokes
  );

  let pos = 1;
  for (let i = 0; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    if (
      previous &&
      sorted[i].total_score_to_par === previous.total_score_to_par &&
      sorted[i].total_strokes === previous.total_strokes
    ) {
      sorted[i].position = previous.position;
    } else {
      sorted[i].position = pos;
    }
    pos = i + 2;
  }

  return sorted;
}

export function buildLeaderboardEntries(
  scorecards: LeaderboardScorecardRow[],
  totalHoles: number
): LeaderboardEntry[] {
  const eligible = filterLeaderboardEligibleScorecards(scorecards).filter(
    (sc) => sc.total_strokes != null
  );

  const entries: LeaderboardEntry[] = eligible.map((sc) => {
    const player = sc.players ?? null;
    return {
      position: 0,
      player_id: sc.player_id,
      player_name: player?.full_name ?? 'Unknown',
      team_id: null,
      team_name: null,
      total_strokes: sc.total_strokes ?? 0,
      total_score_to_par: sc.total_score_to_par ?? 0,
      holes_completed: totalHoles,
      total_holes: totalHoles,
      scorecard_id: sc.id,
      scorecard_status: (sc.status ?? null) as LeaderboardEntry['scorecard_status'],
    };
  });

  return assignLeaderboardPositions(entries);
}

export function buildTournamentLeaderboardEntries(
  scorecards: LeaderboardScorecardRow[],
  totalHolesPerRound: number,
  roundCount: number
): LeaderboardEntry[] {
  const eligible = filterLeaderboardEligibleScorecards(scorecards).filter(
    (sc) => sc.total_strokes != null
  );

  const byPlayer = new Map<string, LeaderboardEntry>();

  for (const sc of eligible) {
    const player = sc.players ?? null;
    const existing = byPlayer.get(sc.player_id);

    if (existing) {
      existing.total_strokes += sc.total_strokes ?? 0;
      existing.total_score_to_par += sc.total_score_to_par ?? 0;
      existing.holes_completed += totalHolesPerRound;
    } else {
      byPlayer.set(sc.player_id, {
        position: 0,
        player_id: sc.player_id,
        player_name: player?.full_name ?? 'Unknown',
        team_id: null,
        team_name: null,
        total_strokes: sc.total_strokes ?? 0,
        total_score_to_par: sc.total_score_to_par ?? 0,
        holes_completed: totalHolesPerRound,
        total_holes: totalHolesPerRound * roundCount,
        scorecard_id: sc.id,
        scorecard_status: (sc.status ?? null) as LeaderboardEntry['scorecard_status'],
      });
    }
  }

  return assignLeaderboardPositions(Array.from(byPlayer.values()));
}

export async function getLeaderboard(roundId: string): Promise<ServiceResult<LeaderboardEntry[]>> {
  const { data: scorecards, error } = await supabase
    .from('scorecards')
    .select('*, players(id, full_name)')
    .eq('round_id', roundId)
    .in('status', LEADERBOARD_ELIGIBLE_STATUSES)
    .not('total_strokes', 'is', null);

  if (error) return { data: null, error: error.message };

  if (!scorecards || scorecards.length === 0) {
    return { data: [], error: null };
  }

  const totalHoles = await getRoundHoleCount(roundId);

  return { data: buildLeaderboardEntries(scorecards as unknown as LeaderboardScorecardRow[], totalHoles), error: null };
}

// -------------------------------------------------------------------
// Player Match History
// -------------------------------------------------------------------

export async function getMatchesByPlayer(playerId: string): Promise<ServiceResult<Match[]>> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Match[], error: null };
}

export async function getMatchesByTeam(teamId: string): Promise<ServiceResult<Match[]>> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Match[], error: null };
}

// -------------------------------------------------------------------
// Player Scorecard History
// -------------------------------------------------------------------

export async function getScorecardsByPlayer(playerId: string): Promise<ServiceResult<Scorecard[]>> {
  const { data, error } = await supabase
    .from('scorecards')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Scorecard[], error: null };
}

// -------------------------------------------------------------------
// Tournament Participants (from matches)
// -------------------------------------------------------------------

export interface TournamentParticipant {
  type: 'player' | 'team';
  id: string;
  name: string;
}

export async function getTournamentParticipants(tournamentId: string): Promise<ServiceResult<TournamentParticipant[]>> {
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('id')
    .eq('tournament_id', tournamentId);

  if (roundsError) return { data: null, error: roundsError.message };
  if (!rounds || rounds.length === 0) return { data: [], error: null };

  const roundIds = rounds.map((r) => r.id);

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('player_a_id, player_b_id, team_a_id, team_b_id')
    .in('round_id', roundIds);

  if (matchesError) return { data: null, error: matchesError.message };
  if (!matches || matches.length === 0) return { data: [], error: null };

  const participantMap = new Map<string, TournamentParticipant>();

  for (const m of matches) {
    if (m.player_a_id && !participantMap.has(`player:${m.player_a_id}`)) {
      participantMap.set(`player:${m.player_a_id}`, { type: 'player', id: m.player_a_id, name: '' });
    }
    if (m.player_b_id && !participantMap.has(`player:${m.player_b_id}`)) {
      participantMap.set(`player:${m.player_b_id}`, { type: 'player', id: m.player_b_id, name: '' });
    }
    if (m.team_a_id && !participantMap.has(`team:${m.team_a_id}`)) {
      participantMap.set(`team:${m.team_a_id}`, { type: 'team', id: m.team_a_id, name: '' });
    }
    if (m.team_b_id && !participantMap.has(`team:${m.team_b_id}`)) {
      participantMap.set(`team:${m.team_b_id}`, { type: 'team', id: m.team_b_id, name: '' });
    }
  }

  const playerIds = [...participantMap.values()].filter((p) => p.type === 'player').map((p) => p.id);
  const teamIds = [...participantMap.values()].filter((p) => p.type === 'team').map((p) => p.id);

  if (playerIds.length > 0) {
    const { data: playersData } = await supabase.from('players').select('id, full_name').in('id', playerIds);
    if (playersData) {
      for (const p of playersData) {
        const entry = participantMap.get(`player:${p.id}`);
        if (entry) entry.name = p.full_name;
      }
    }
  }

  if (teamIds.length > 0) {
    const { data: teamsData } = await supabase.from('teams').select('id, name').in('id', teamIds);
    if (teamsData) {
      for (const t of teamsData) {
        const entry = participantMap.get(`team:${t.id}`);
        if (entry) entry.name = t.name;
      }
    }
  }

  return { data: [...participantMap.values()], error: null };
}

// -------------------------------------------------------------------
// Leaderboard
// -------------------------------------------------------------------

export async function getTournamentLeaderboard(tournamentId: string): Promise<ServiceResult<LeaderboardEntry[]>> {
  const { data: rounds, error: roundsError } = await supabase
    .from('rounds')
    .select('id')
    .eq('tournament_id', tournamentId);

  if (roundsError) return { data: null, error: roundsError.message };
  if (!rounds || rounds.length === 0) return { data: [], error: null };

  const roundIds = rounds.map((r) => r.id);

  const { data: scorecards, error } = await supabase
    .from('scorecards')
    .select('*, players(id, full_name)')
    .in('round_id', roundIds)
    .in('status', LEADERBOARD_ELIGIBLE_STATUSES)
    .not('total_strokes', 'is', null);

  if (error) return { data: null, error: error.message };
  if (!scorecards || scorecards.length === 0) return { data: [], error: null };

  let holesPerRound = DEFAULT_HOLES_COUNT;
  const firstRound = roundIds[0];
  if (firstRound) {
    holesPerRound = await getRoundHoleCount(firstRound);
  }

  return {
    data: buildTournamentLeaderboardEntries(
      scorecards as unknown as LeaderboardScorecardRow[],
      holesPerRound,
      roundIds.length
    ),
    error: null,
  };
}

// -------------------------------------------------------------------
// Dashboard & Analytics Service Functions
// -------------------------------------------------------------------

export interface DashboardStats {
  totalTournaments: number;
  openTournaments: number;
  liveTournaments: number;
  completedTournaments: number;
  cancelledTournaments: number;
  totalRounds: number;
  totalMatches: number;
  scheduledMatches: number;
  liveMatches: number;
  completedMatches: number;
  cancelledMatches: number;
  totalScorecards: number;
  completedScorecards: number;
}

export async function getDashboardStats(): Promise<ServiceResult<DashboardStats>> {
  const [tournamentsRes, roundsRes, matchesRes, scorecardsRes] = await Promise.all([
    supabase.from('tournaments').select('status'),
    supabase.from('rounds').select('id', { count: 'exact', head: true }),
    supabase.from('matches').select('status'),
    supabase.from('scorecards').select('status'),
  ]);

  if (tournamentsRes.error) return { data: null, error: tournamentsRes.error.message };
  if (roundsRes.error) return { data: null, error: roundsRes.error.message };
  if (matchesRes.error) return { data: null, error: matchesRes.error.message };
  if (scorecardsRes.error) return { data: null, error: scorecardsRes.error.message };

  const tournaments = (tournamentsRes.data ?? []) as { status: TournamentStatus }[];
  const matches = (matchesRes.data ?? []) as { status: MatchStatus }[];
  const scorecards = (scorecardsRes.data ?? []) as { status: string }[];

  return {
    data: {
      totalTournaments: tournaments.length,
      openTournaments: tournaments.filter((t) => t.status === 'open').length,
      liveTournaments: tournaments.filter((t) => t.status === 'live').length,
      completedTournaments: tournaments.filter((t) => t.status === 'completed').length,
      cancelledTournaments: tournaments.filter((t) => t.status === 'cancelled').length,
      totalRounds: roundsRes.count ?? 0,
      totalMatches: matches.length,
      scheduledMatches: matches.filter((m) => m.status === 'scheduled').length,
      liveMatches: matches.filter((m) => m.status === 'live').length,
      completedMatches: matches.filter((m) => m.status === 'completed').length,
      cancelledMatches: matches.filter((m) => m.status === 'cancelled').length,
      totalScorecards: scorecards.length,
      completedScorecards: scorecards.filter((sc) => isLeaderboardEligibleStatus(sc.status)).length,
    },
    error: null,
  };
}

export interface LeagueAnalytics {
  tournaments: {
    total: number;
    open: number;
    live: number;
    completed: number;
    cancelled: number;
    draft: number;
  };
  matches: {
    total: number;
    scheduled: number;
    live: number;
    completed: number;
    cancelled: number;
    draft: number;
  };
  scorecards: {
    total: number;
    completed: number;
    averageStrokes: number | null;
    totalStrokes: number;
    totalScoreToPar: number;
  };
}

export async function getLeagueAnalytics(): Promise<ServiceResult<LeagueAnalytics>> {
  const [tournamentsRes, matchesRes, scorecardsRes] = await Promise.all([
    supabase.from('tournaments').select('status'),
    supabase.from('matches').select('status'),
    supabase.from('scorecards').select('status, total_strokes, total_score_to_par'),
  ]);

  if (tournamentsRes.error) return { data: null, error: tournamentsRes.error.message };
  if (matchesRes.error) return { data: null, error: matchesRes.error.message };
  if (scorecardsRes.error) return { data: null, error: scorecardsRes.error.message };

  const tournaments = (tournamentsRes.data ?? []) as { status: string }[];
  const matches = (matchesRes.data ?? []) as { status: string }[];
  const scorecards = (scorecardsRes.data ?? []) as { status: string; total_strokes: number | null; total_score_to_par: number | null }[];

  const completedScorecards = scorecards.filter(
    (sc) => isLeaderboardEligibleStatus(sc.status) && sc.total_strokes !== null
  );
  const totalStrokes = completedScorecards.reduce((sum, sc) => sum + (sc.total_strokes ?? 0), 0);
  const totalScoreToPar = completedScorecards.reduce((sum, sc) => sum + (sc.total_score_to_par ?? 0), 0);

  return {
    data: {
      tournaments: {
        total: tournaments.length,
        open: tournaments.filter((t) => t.status === 'open').length,
        live: tournaments.filter((t) => t.status === 'live').length,
        completed: tournaments.filter((t) => t.status === 'completed').length,
        cancelled: tournaments.filter((t) => t.status === 'cancelled').length,
        draft: tournaments.filter((t) => t.status === 'draft').length,
      },
      matches: {
        total: matches.length,
        scheduled: matches.filter((m) => m.status === 'scheduled').length,
        live: matches.filter((m) => m.status === 'live').length,
        completed: matches.filter((m) => m.status === 'completed').length,
        cancelled: matches.filter((m) => m.status === 'cancelled').length,
        draft: matches.filter((m) => m.status === 'draft').length,
      },
      scorecards: {
        total: scorecards.length,
        completed: completedScorecards.length,
        averageStrokes: completedScorecards.length > 0 ? Math.round(totalStrokes / completedScorecards.length) : null,
        totalStrokes,
        totalScoreToPar,
      },
    },
    error: null,
  };
}

export interface ActivityItem {
  id: string;
  type: 'tournament' | 'round' | 'match' | 'scorecard';
  description: string;
  timestamp: string;
  path: string;
}

export async function getRecentActivity(limit: number = 10): Promise<ServiceResult<ActivityItem[]>> {
  const [tournamentsRes, roundsRes, matchesRes, scorecardsRes] = await Promise.all([
    supabase.from('tournaments').select('id, name, status, created_at, updated_at').order('updated_at', { ascending: false }).limit(limit),
    supabase.from('rounds').select('id, name, status, tournament_id, created_at, updated_at').order('updated_at', { ascending: false }).limit(limit),
    supabase.from('matches').select('id, match_type, status, player_a_id, player_b_id, team_a_id, team_b_id, created_at, updated_at').order('updated_at', { ascending: false }).limit(limit),
    supabase.from('scorecards').select('id, player_id, status, total_strokes, created_at, updated_at').order('updated_at', { ascending: false }).limit(limit),
  ]);

  const items: ActivityItem[] = [];

  if (tournamentsRes.data) {
    for (const t of tournamentsRes.data) {
      const statusLabel = t.status === 'open' ? 'opened' : t.status === 'live' ? 'started' : t.status === 'completed' ? 'completed' : `updated to ${t.status}`;
      items.push({
        id: `tournament-${t.id}`,
        type: 'tournament',
        description: `Tournament "${t.name}" ${statusLabel}`,
        timestamp: t.updated_at,
        path: `/tournaments/${t.id}`,
      });
    }
  }

  if (roundsRes.data) {
    for (const r of roundsRes.data) {
      const statusLabel = r.status === 'live' ? 'started' : r.status === 'completed' ? 'completed' : `updated`;
      items.push({
        id: `round-${r.id}`,
        type: 'round',
        description: `Round "${r.name}" ${statusLabel}`,
        timestamp: r.updated_at,
        path: `/rounds/${r.id}`,
      });
    }
  }

  if (matchesRes.data) {
    for (const m of matchesRes.data) {
      const statusLabel = m.status === 'completed' ? 'completed' : m.status === 'live' ? 'started' : `scheduled`;
      items.push({
        id: `match-${m.id}`,
        type: 'match',
        description: `${m.match_type} match ${statusLabel}`,
        timestamp: m.updated_at,
        path: `/matches/${m.id}`,
      });
    }
  }

  if (scorecardsRes.data) {
    for (const sc of scorecardsRes.data) {
      const scoreText = sc.total_strokes !== null ? ` (${sc.total_strokes} strokes)` : '';
      items.push({
        id: `scorecard-${sc.id}`,
        type: 'scorecard',
        description: `Scorecard ${sc.status}${scoreText}`,
        timestamp: sc.updated_at,
        path: `/scorecards/${sc.id}`,
      });
    }
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { data: items.slice(0, limit), error: null };
}
