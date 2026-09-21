import { supabase } from '@/lib/supabase';
import type { FriendlyMatch, FriendlyMatchPlayer, FriendlyMatchScore } from '@/types/database';
import type { ServiceResult } from '@/types/service';

export async function getFriendlyMatchesByPlayer(playerId: string): Promise<ServiceResult<FriendlyMatch[]>> {
  const { data: created, error: err1 } = await supabase
    .from('friendly_matches')
    .select('*')
    .eq('creator_id', playerId);
  if (err1) return { data: null, error: err1.message };

  const { data: invited, error: err2 } = await supabase
    .from('friendly_match_players')
    .select('match_id')
    .eq('player_id', playerId);
  if (err2) return { data: null, error: err2.message };

  const invitedMatchIds = (invited ?? []).map((r: any) => r.match_id);
  const allIds = [...new Set([...(created ?? []).map((m: any) => m.id), ...invitedMatchIds])];

  if (allIds.length === 0) return { data: [], error: null };

  const { data: all, error: err3 } = await supabase
    .from('friendly_matches')
    .select('*')
    .in('id', allIds)
    .order('created_at', { ascending: false });
  if (err3) return { data: null, error: err3.message };

  return { data: (all ?? []) as FriendlyMatch[], error: null };
}

export async function getFriendlyMatch(id: string): Promise<ServiceResult<FriendlyMatch>> {
  const { data, error } = await supabase.from('friendly_matches').select('*').eq('id', id).single();
  if (error) return { data: null, error: error.message };
  return { data: data as FriendlyMatch, error: null };
}

export async function createFriendlyMatch(match: { creator_id: string; course_id: string; title: string; description?: string; match_format: string; round_type: number; scheduled_at?: string }): Promise<ServiceResult<FriendlyMatch>> {
  const { data, error } = await supabase
    .from('friendly_matches')
    .insert({
      creator_id: match.creator_id,
      course_id: match.course_id,
      title: match.title,
      description: match.description ?? null,
      match_format: match.match_format,
      round_type: match.round_type,
      scheduled_at: match.scheduled_at ?? null,
      status: 'pending',
    })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as FriendlyMatch, error: null };
}

export async function updateFriendlyMatch(id: string, updates: Partial<Pick<FriendlyMatch, 'status' | 'title' | 'description' | 'scheduled_at' | 'started_at' | 'completed_at'>>): Promise<ServiceResult<FriendlyMatch>> {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) payload[k] = v;
  }
  const { data, error } = await supabase.from('friendly_matches').update(payload).eq('id', id).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as FriendlyMatch, error: null };
}

export async function deleteFriendlyMatch(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('friendly_matches').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function getFriendlyMatchPlayers(matchId: string): Promise<ServiceResult<FriendlyMatchPlayer[]>> {
  const { data, error } = await supabase
    .from('friendly_match_players')
    .select('*, players!player_id(full_name, handicap)')
    .eq('match_id', matchId)
    .order('created_at');
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as unknown as FriendlyMatchPlayer[], error: null };
}

export async function invitePlayer(matchId: string, playerId: string): Promise<ServiceResult<FriendlyMatchPlayer>> {
  const { data, error } = await supabase
    .from('friendly_match_players')
    .insert({ match_id: matchId, player_id: playerId, invitation_status: 'pending' })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as FriendlyMatchPlayer, error: null };
}

export async function updateInvitation(id: string, status: string): Promise<ServiceResult<FriendlyMatchPlayer>> {
  const update: Record<string, unknown> = { invitation_status: status };
  if (status === 'accepted') update.joined_at = new Date().toISOString();
  const { data, error } = await supabase.from('friendly_match_players').update(update).eq('id', id).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as FriendlyMatchPlayer, error: null };
}

export async function removePlayer(matchId: string, playerId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('friendly_match_players').delete().eq('match_id', matchId).eq('player_id', playerId);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}

export async function upsertFriendlyMatchScores(scores: Array<{ match_player_id: string; hole_number: number; par: number; score: number; stableford_points?: number | null }>): Promise<ServiceResult<FriendlyMatchScore[]>> {
  const { data, error } = await supabase.from('friendly_match_scores').upsert(scores, { onConflict: 'match_player_id,hole_number' }).select();
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as FriendlyMatchScore[], error: null };
}

export async function getFriendlyMatchScores(matchPlayerId: string): Promise<ServiceResult<FriendlyMatchScore[]>> {
  const { data, error } = await supabase.from('friendly_match_scores').select('*').eq('match_player_id', matchPlayerId).order('hole_number');
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as FriendlyMatchScore[], error: null };
}

export async function updateFriendlyMatchPlayerResult(id: string, updates: { score?: number; to_par?: number; position?: number }): Promise<ServiceResult<FriendlyMatchPlayer>> {
  const { data, error } = await supabase.from('friendly_match_players').update(updates).eq('id', id).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as FriendlyMatchPlayer, error: null };
}

export function getMatchFormatLabel(format: string): string {
  const labels: Record<string, string> = {
    stroke_play: 'Stroke Play',
    stableford: 'Stableford',
    match_play: 'Match Play',
    best_ball: 'Best Ball',
    scramble: 'Scramble',
  };
  return labels[format] ?? format;
}

export function calculateStablefordPoints(score: number, par: number): number {
  const diff = score - par;
  if (diff <= -3) return 5;
  if (diff === -2) return 4;
  if (diff === -1) return 3;
  if (diff === 0) return 2;
  if (diff === 1) return 1;
  return 0;
}
