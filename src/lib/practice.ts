/**
 * Practice Round Service Layer
 *
 * All Supabase access for practice rounds is isolated here.
 * Authorization is enforced by RLS on the database side.
 */

import { supabase } from '@/lib/supabase';
import type { PracticeRound, PracticeScore, CourseHole } from '@/types/database';
import type { ServiceResult } from '@/types/service';

// -------------------------------------------------------------------
// Practice Rounds
// -------------------------------------------------------------------

export async function getPracticeRoundsByPlayer(
  playerId: string
): Promise<ServiceResult<PracticeRound[]>> {
  const { data, error } = await supabase
    .from('practice_rounds')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as PracticeRound[], error: null };
}

export async function getPracticeRound(
  id: string
): Promise<ServiceResult<PracticeRound>> {
  const { data, error } = await supabase
    .from('practice_rounds')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as PracticeRound, error: null };
}

export async function createPracticeRound(
  round: Pick<PracticeRound, 'player_id' | 'course_id' | 'round_type' | 'tee_box' | 'notes'>
): Promise<ServiceResult<PracticeRound>> {
  const { data, error } = await supabase
    .from('practice_rounds')
    .insert({
      player_id: round.player_id,
      course_id: round.course_id,
      round_type: round.round_type,
      tee_box: round.tee_box || null,
      notes: round.notes || null,
      status: 'draft',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as PracticeRound, error: null };
}

export async function updatePracticeRound(
  id: string,
  updates: Partial<Pick<PracticeRound, 'status' | 'gross_score' | 'net_score' | 'total_to_par' | 'notes' | 'completed_at'>>
): Promise<ServiceResult<PracticeRound>> {
  const payload: Record<string, unknown> = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.gross_score !== undefined) payload.gross_score = updates.gross_score;
  if (updates.net_score !== undefined) payload.net_score = updates.net_score;
  if (updates.total_to_par !== undefined) payload.total_to_par = updates.total_to_par;
  if (updates.notes !== undefined) payload.notes = updates.notes;
  if (updates.completed_at !== undefined) payload.completed_at = updates.completed_at;

  const { data, error } = await supabase
    .from('practice_rounds')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as PracticeRound, error: null };
}

export async function deletePracticeRound(
  id: string
): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('practice_rounds').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Practice Scores
// -------------------------------------------------------------------

export async function getPracticeScores(
  practiceRoundId: string
): Promise<ServiceResult<PracticeScore[]>> {
  const { data, error } = await supabase
    .from('practice_scores')
    .select('*')
    .eq('practice_round_id', practiceRoundId)
    .order('hole_number');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as PracticeScore[], error: null };
}

export async function upsertPracticeScores(
  scores: Array<Pick<PracticeScore, 'practice_round_id' | 'hole_number' | 'par' | 'stroke_index' | 'score' | 'putts' | 'fairway_hit' | 'green_in_regulation' | 'penalty_strokes' | 'notes'>>
): Promise<ServiceResult<PracticeScore[]>> {
  const { data, error } = await supabase
    .from('practice_scores')
    .upsert(scores, { onConflict: 'practice_round_id,hole_number' })
    .select();

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as PracticeScore[], error: null };
}

export async function deletePracticeScores(
  practiceRoundId: string
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('practice_scores')
    .delete()
    .eq('practice_round_id', practiceRoundId);

  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

// -------------------------------------------------------------------
// Course Holes (for loading par/stroke index data)
// -------------------------------------------------------------------

export async function getCourseHolesForPractice(
  courseId: string
): Promise<ServiceResult<CourseHole[]>> {
  const { data, error } = await supabase
    .from('course_holes')
    .select('*')
    .eq('course_id', courseId)
    .order('hole_number');

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as CourseHole[], error: null };
}
