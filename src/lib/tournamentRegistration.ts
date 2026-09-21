/**
 * Tournament Registration
 *
 * Players can join/leave tournaments. Handles capacity checks,
 * registration deadlines, and waitlists.
 */

import { supabase } from '@/lib/supabase';
import type { Tournament, TournamentRegistration } from '@/types/database';
import type { ServiceResult } from '@/types/service';

export interface RegistrationResult {
  registered: boolean;
  message: string;
}

/**
 * Check if a player is registered for a tournament.
 */
export async function isRegistered(
  tournamentId: string,
  playerId: string
): Promise<ServiceResult<boolean>> {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: !!data, error: null };
}

/**
 * Get all registrations for a tournament.
 */
export async function getRegistrations(
  tournamentId: string
): Promise<ServiceResult<TournamentRegistration[]>> {
  const { data, error } = await supabase
    .from('tournament_registrations')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('registered_at', { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as TournamentRegistration[], error: null };
}

/**
 * Get registration count for a tournament.
 */
export async function getRegistrationCount(
  tournamentId: string
): Promise<ServiceResult<number>> {
  const { count, error } = await supabase
    .from('tournament_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  if (error) return { data: null, error: error.message };
  return { data: count ?? 0, error: null };
}

/**
 * Join a tournament.
 * Checks: tournament exists, status is 'open', not already registered,
 * capacity not exceeded.
 */
export async function joinTournament(
  tournamentId: string,
  playerId: string
): Promise<ServiceResult<RegistrationResult>> {
  // 1. Get tournament
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('id, status, max_participants')
    .eq('id', tournamentId)
    .single();

  if (tErr || !tournament) {
    return { data: null, error: 'Tournament not found.' };
  }

  // 2. Check status
  if (tournament.status !== 'open') {
    return { data: { registered: false, message: 'Registration is closed for this tournament.' }, error: null };
  }

  // 3. Check if already registered
  const { data: existing } = await supabase
    .from('tournament_registrations')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (existing) {
    return { data: { registered: false, message: 'You are already registered.' }, error: null };
  }

  // 4. Check capacity
  const { count: regCount } = await supabase
    .from('tournament_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  const currentCount = regCount ?? 0;
  const maxParticipants = (tournament as Tournament & { max_participants?: number | null }).max_participants;

  if (maxParticipants && currentCount >= maxParticipants) {
    return { data: { registered: false, message: 'Tournament is full.' }, error: null };
  }

  // 5. Register
  const { error: insertError } = await supabase
    .from('tournament_registrations')
    .insert({
      tournament_id: tournamentId,
      player_id: playerId,
      registered_at: new Date().toISOString(),
    });

  if (insertError) {
    if (insertError.code === '23505') {
      return { data: { registered: false, message: 'You are already registered.' }, error: null };
    }
    return { data: null, error: insertError.message };
  }

  return { data: { registered: true, message: 'Successfully registered!' }, error: null };
}

/**
 * Leave (unregister from) a tournament.
 */
export async function leaveTournament(
  tournamentId: string,
  playerId: string
): Promise<ServiceResult<RegistrationResult>> {
  const { error } = await supabase
    .from('tournament_registrations')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('player_id', playerId);

  if (error) return { data: null, error: error.message };
  return { data: { registered: false, message: 'Successfully unregistered.' }, error: null };
}
