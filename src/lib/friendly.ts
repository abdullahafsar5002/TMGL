import { supabase } from '@/lib/supabase';
import { toUserFacingServiceError } from '@/lib/errors';
import type {
  FriendlyMatch,
  FriendlyMatchFormat,
  FriendlyMatchPlayer,
  FriendlyMatchScore,
  FriendlyMatchStatus,
  InvitationStatus,
} from '@/types/database';
import type { ServiceResult } from '@/types/service';

type FriendlyPlayerRow = Omit<FriendlyMatchPlayer, 'player'> & {
  players?: { full_name: string; handicap_index: number | null } | { full_name: string; handicap_index: number | null }[] | null;
};

function normalizePlayer(row: FriendlyPlayerRow): FriendlyMatchPlayer {
  const joined = Array.isArray(row.players) ? row.players[0] : row.players;
  return {
    ...row,
    handicap_index: row.handicap_index ?? joined?.handicap_index ?? null,
    player: joined ? { full_name: joined.full_name, handicap_index: joined.handicap_index } : null,
  };
}

export async function getFriendlyMatchesByPlayer(playerId: string): Promise<ServiceResult<FriendlyMatch[]>> {
  const { data: created, error: createdError } = await supabase
    .from('friendly_matches')
    .select('*')
    .eq('creator_id', playerId);
  if (createdError) return { data: null, error: toUserFacingServiceError(createdError, 'Unable to load friendly matches.') };

  const { data: invited, error: invitedError } = await supabase
    .from('friendly_match_players')
    .select('match_id')
    .eq('player_id', playerId);
  if (invitedError) return { data: null, error: toUserFacingServiceError(invitedError, 'Unable to load friendly invitations.') };

  const invitedMatchIds = (invited ?? []).map((row: { match_id: string }) => row.match_id);
  const createdIds = (created ?? []).map((match: FriendlyMatch) => match.id);
  const allIds = [...new Set([...createdIds, ...invitedMatchIds])];
  if (allIds.length === 0) return { data: [], error: null };

  const { data: matches, error } = await supabase
    .from('friendly_matches')
    .select('*')
    .in('id', allIds)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to load friendly matches.') };
  return { data: (matches ?? []) as FriendlyMatch[], error: null };
}

export async function getFriendlyMatch(id: string): Promise<ServiceResult<FriendlyMatch>> {
  const { data, error } = await supabase.from('friendly_matches').select('*').eq('id', id).single();
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Friendly match not found.') };
  return { data: data as FriendlyMatch, error: null };
}

export async function createFriendlyMatch(match: {
  creator_id: string;
  course_id: string;
  title: string;
  description?: string;
  match_format: FriendlyMatchFormat;
  round_type: 9 | 18;
  scheduled_at?: string;
}): Promise<ServiceResult<FriendlyMatch>> {
  const { data, error } = await supabase
    .from('friendly_matches')
    .insert({
      creator_id: match.creator_id,
      course_id: match.course_id,
      title: match.title.trim(),
      description: match.description?.trim() || null,
      match_format: match.match_format,
      round_type: match.round_type,
      scheduled_at: match.scheduled_at || null,
      status: 'in_progress',
    })
    .select()
    .single();
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to create the friendly match.') };
  const { error: participantError } = await supabase.from('friendly_match_players').insert({
    match_id: data.id,
    player_id: match.creator_id,
    invitation_status: 'accepted',
    joined_at: new Date().toISOString(),
  });
  if (participantError) {
    await supabase.from('friendly_matches').delete().eq('id', data.id);
    return { data: null, error: toUserFacingServiceError(participantError, 'Unable to add the match creator as a participant.') };
  }
  return { data: data as FriendlyMatch, error: null };
}

export async function updateFriendlyMatch(
  id: string,
  updates: Partial<Pick<FriendlyMatch, 'status' | 'title' | 'description' | 'scheduled_at' | 'started_at' | 'completed_at'>>
): Promise<ServiceResult<FriendlyMatch>> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) payload[key] = value;
  }
  const { data, error } = await supabase.from('friendly_matches').update(payload).eq('id', id).select().single();
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to update the friendly match.') };
  return { data: data as FriendlyMatch, error: null };
}

export async function deleteFriendlyMatch(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('friendly_matches').delete().eq('id', id);
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to delete the friendly match.') };
  return { data: null, error: null };
}

export async function getFriendlyMatchPlayers(matchId: string): Promise<ServiceResult<FriendlyMatchPlayer[]>> {
  const { data, error } = await supabase
    .from('friendly_match_players')
    .select('*, players!player_id(full_name, handicap_index)')
    .eq('match_id', matchId)
    .order('created_at');
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to load match participants.') };
  return { data: ((data ?? []) as unknown as FriendlyPlayerRow[]).map(normalizePlayer), error: null };
}

export async function invitePlayer(
  matchId: string,
  playerId: string,
  handicapIndex: number | null = null
): Promise<ServiceResult<FriendlyMatchPlayer>> {
  const { data, error } = await supabase
    .from('friendly_match_players')
    .insert({
      match_id: matchId,
      player_id: playerId,
      invitation_status: 'pending',
    })
    .select()
    .single();
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to invite the player.') };
  const { data: player } = await supabase.from('players').select('handicap_index').eq('id', playerId).maybeSingle();
  const playerRecord = player as { handicap_index: number | null } | null;
  return { data: normalizePlayer({ ...(data as unknown as FriendlyPlayerRow), handicap_index: handicapIndex ?? playerRecord?.handicap_index ?? null }), error: null };
}

export async function updateInvitation(id: string, status: InvitationStatus): Promise<ServiceResult<FriendlyMatchPlayer>> {
  const update: Record<string, unknown> = { invitation_status: status };
  if (status === 'accepted') update.joined_at = new Date().toISOString();
  const { data, error } = await supabase.from('friendly_match_players').update(update).eq('id', id).select().single();
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to update the invitation.') };
  return { data: normalizePlayer(data as unknown as FriendlyPlayerRow), error: null };
}

export async function removePlayer(matchId: string, playerId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('friendly_match_players').delete().eq('match_id', matchId).eq('player_id', playerId);
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to remove the player.') };
  return { data: null, error: null };
}

export async function upsertFriendlyMatchScores(scores: Array<{
  match_player_id: string;
  hole_number: number;
  par: number;
  score: number;
  stableford_points?: number | null;
}>): Promise<ServiceResult<FriendlyMatchScore[]>> {
  const { data, error } = await supabase
    .from('friendly_match_scores')
    .upsert(scores, { onConflict: 'match_player_id,hole_number' })
    .select();
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to save friendly scores.') };
  return { data: (data ?? []) as FriendlyMatchScore[], error: null };
}

export async function getFriendlyMatchScores(matchPlayerId: string): Promise<ServiceResult<FriendlyMatchScore[]>> {
  const { data, error } = await supabase
    .from('friendly_match_scores')
    .select('*')
    .eq('match_player_id', matchPlayerId)
    .order('hole_number');
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to load friendly scores.') };
  return { data: (data ?? []) as FriendlyMatchScore[], error: null };
}

export async function updateFriendlyMatchPlayerResult(
  id: string,
  updates: { score?: number; to_par?: number; position?: number }
): Promise<ServiceResult<FriendlyMatchPlayer>> {
  const { data, error } = await supabase.from('friendly_match_players').update(updates).eq('id', id).select().single();
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to save the friendly result.') };
  return { data: normalizePlayer(data as unknown as FriendlyPlayerRow), error: null };
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

export function calculateHandicapAdjustedScore(score: number, handicapIndex: number | null): number {
  if (!Number.isFinite(score) || score < 0) return 0;
  if (handicapIndex === null || !Number.isFinite(handicapIndex) || handicapIndex < 0) return score;
  return Math.max(0, score - handicapIndex);
}

export function calculateFriendlyScore(
  score: number,
  par: number,
  handicapIndex: number | null,
  format: FriendlyMatchFormat
): number {
  if (format === 'stableford') return calculateStablefordPoints(score, par);
  return calculateHandicapAdjustedScore(score, handicapIndex);
}

export function isFriendlyStatus(value: string): value is FriendlyMatchStatus {
  return value === 'active' || value === 'rejected' || value === 'in_progress' || value === 'completed';
}
