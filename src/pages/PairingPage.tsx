import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, CalendarClock, Layers, Loader2, RefreshCw, Save, Users } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { BackLink } from '@/components/common/BackLink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getRound, getTournament } from '@/lib/competition';
import { supabase } from '@/lib/supabase';
import { PAIRING, type PairingFlight, type SeedablePlayer } from '@/lib/pairing';
import type { Round, Tournament } from '@/types/database';

interface FlightRow {
  id: string;
  name: string;
  order_index: number;
}

interface PairingRow {
  flight_id: string;
  flight_name: string;
  order_index: number;
  player_id: string;
  player_name: string;
  handicap_index: number | null;
  pairing_no: number;
  tee_time: string | null;
}

interface PairingMember {
  playerId: string;
  playerName: string;
  handicapIndex: number | null;
  pairingNo: number;
  teeTime: string | null;
}

interface DisplayFlight {
  key: string;
  name: string;
  orderIndex: number;
  members: PairingMember[];
}

const DEFAULT_INTERVAL_MINUTES = 9;
const DEFAULT_FIRST_TEE_TIME = '08:00';
const TARGET_FLIGHT_SIZE = 4;
const MAX_FLIGHTS = 26;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 60;

const inputClass = 'w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500 focus:border-tmgl-gold-500';
const labelClass = 'block text-sm font-medium text-tmgl-charcoal-700 mb-1';

function toInt(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function handicapLabel(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'NR';
  return value.toFixed(1);
}

function toPairGroups(members: PairingMember[]): Array<{ pairingNo: number; players: PairingMember[]; teeTime: string | null }> {
  const groups = new Map<number, PairingMember[]>();
  for (const member of members) {
    const existing = groups.get(member.pairingNo);
    if (existing) existing.push(member);
    else groups.set(member.pairingNo, [member]);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([pairingNo, players]) => ({
      pairingNo,
      players,
      teeTime: players.find((player) => player.teeTime)?.teeTime ?? null,
    }));
}

async function fetchRegisteredPlayers(tournamentId: string): Promise<{ players: SeedablePlayer[]; error: string | null }> {
  const registrations = await supabase
    .from('tournament_registrations')
    .select('player_id')
    .eq('tournament_id', tournamentId);

  if (registrations.error) return { players: [], error: registrations.error.message };

  const ids = Array.from(new Set(
    ((registrations.data ?? []) as Array<{ player_id: string | null }>)
      .map((row) => row.player_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  ));

  if (ids.length === 0) return { players: [], error: null };

  const players = await supabase
    .from('players')
    .select('id, full_name, handicap_index')
    .in('id', ids);

  if (players.error) return { players: [], error: players.error.message };

  const rows = (players.data ?? []) as Array<{ id: string; full_name: string | null; handicap_index: number | null }>;
  return {
    players: rows.map((row) => ({
      id: row.id,
      full_name: row.full_name ?? 'Unknown Player',
      handicap_index: row.handicap_index,
    })),
    error: null,
  };
}

function previewToDisplay(flight: PairingFlight, position: number): DisplayFlight {
  return {
    key: `preview-${flight.name}-${position}`,
    name: flight.name,
    orderIndex: flight.orderIndex,
    members: flight.members.map((member) => ({
      playerId: member.playerId,
      playerName: member.playerName,
      handicapIndex: Number.isFinite(member.handicapIndex) ? member.handicapIndex : null,
      pairingNo: member.pairingNo,
      teeTime: member.teeTime,
    })),
  };
}

function FlightCard({ flight, isPreview = false }: { flight: DisplayFlight; isPreview?: boolean }) {
  const groups = toPairGroups(flight.members);

  return (
    <Card variant="bordered" className="border-tmgl-charcoal-200">
      <CardHeader>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">Flight {flight.name}</CardTitle>
          <p className="text-xs text-tmgl-charcoal-500 mt-0.5">
            {flight.members.length} player{flight.members.length === 1 ? '' : 's'} · {groups.length} pairing{groups.length === 1 ? '' : 's'}
          </p>
        </div>
        {isPreview && (
          <span className="shrink-0 rounded-full bg-tmgl-gold-50 px-2.5 py-1 text-xs font-semibold text-tmgl-gold-700 border border-tmgl-gold-200">
            Preview
          </span>
        )}
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-tmgl-charcoal-100">
          {groups.map((group) => (
            <li key={group.pairingNo} className="flex items-center justify-between gap-3 py-2 min-h-[44px]">
              <div className="min-w-0">
                <p className="text-sm font-medium text-tmgl-charcoal-900 truncate">
                  {group.players.map((player) => player.playerName).join(' & ')}
                </p>
                <p className="text-xs text-tmgl-charcoal-500">
                  Pairing {group.pairingNo} · HI {group.players.map((player) => handicapLabel(player.handicapIndex)).join(' / ')}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-tmgl-gold-700 tabular-nums">
                {group.teeTime || 'TBC'}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function PairingPage() {
  const params = useParams<{ id?: string; roundId?: string }>();
  const roundId = params.roundId ?? params.id ?? '';
  const { profile } = useAuth();
  const toast = useToast();

  const [round, setRound] = useState<Round | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<SeedablePlayer[]>([]);
  const [pairings, setPairings] = useState<PairingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [pairingsError, setPairingsError] = useState<string | null>(null);

  const [flightCount, setFlightCount] = useState(1);
  const [intervalMinutes, setIntervalMinutes] = useState(DEFAULT_INTERVAL_MINUTES);
  const [firstTeeTime, setFirstTeeTime] = useState(DEFAULT_FIRST_TEE_TIME);
  const [editorOpen, setEditorOpen] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasAppliedDefaults = useRef(false);

  const canManage = canManageLeague(profile?.role);

  const loadPairings = useCallback(async () => {
    if (!roundId) return;
    const flightsResult = await supabase.from('flights').select('id').eq('round_id', roundId);
    if (flightsResult.error) {
      setPairings([]);
      setPairingsError(flightsResult.error.message);
      return;
    }
    const flightIds = ((flightsResult.data ?? []) as Array<{ id: string }>).map((flight) => flight.id);
    if (flightIds.length === 0) {
      setPairings([]);
      setPairingsError(null);
      return;
    }
    const pairingsResult = await supabase
      .from('round_pairings')
      .select('flight_id, flight_name, order_index, player_id, player_name, handicap_index, pairing_no, tee_time')
      .in('flight_id', flightIds);

    if (pairingsResult.error) {
      setPairings([]);
      setPairingsError(pairingsResult.error.message);
      return;
    }
    const rows = ((pairingsResult.data ?? []) as PairingRow[]).slice().sort((a, b) => (
      a.order_index - b.order_index || a.pairing_no - b.pairing_no || a.player_name.localeCompare(b.player_name)
    ));
    setPairings(rows);
    setPairingsError(null);
  }, [roundId]);

  const load = useCallback(async (applyDefaults: boolean) => {
    if (!roundId) return;
    setIsLoading(true);
    setError(null);

    const roundResult = await getRound(roundId);
    if (roundResult.error || !roundResult.data) {
      setError(roundResult.error ?? 'Round not found.');
      setIsLoading(false);
      return;
    }

    const loadedRound = roundResult.data;
    setRound(loadedRound);

    const [tournamentResult, playersResult] = await Promise.all([
      getTournament(loadedRound.tournament_id),
      fetchRegisteredPlayers(loadedRound.tournament_id),
    ]);
    setTournament(tournamentResult.data);
    setPlayers(playersResult.players);
    setPlayersError(playersResult.error);

    if (applyDefaults && !hasAppliedDefaults.current) {
      hasAppliedDefaults.current = true;
      const config = loadedRound as Round & { tee_interval_minutes?: number | null; first_tee_time?: string | null };
      setIntervalMinutes(
        typeof config.tee_interval_minutes === 'number' && config.tee_interval_minutes > 0
          ? toInt(String(config.tee_interval_minutes), MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES, DEFAULT_INTERVAL_MINUTES)
          : DEFAULT_INTERVAL_MINUTES
      );
      setFirstTeeTime(
        config.first_tee_time ? PAIRING.formatTeeTime(config.first_tee_time) ?? DEFAULT_FIRST_TEE_TIME : DEFAULT_FIRST_TEE_TIME
      );
      setFlightCount(Math.max(1, Math.min(MAX_FLIGHTS, Math.ceil(playersResult.players.length / TARGET_FLIGHT_SIZE) || 1)));
    }

    await loadPairings();
    setIsLoading(false);
  }, [roundId, loadPairings]);

  useEffect(() => { void load(true); }, [load]);

  const preview = useMemo(() => PAIRING.buildFlights(players, {
    flightCount: Math.max(1, flightCount),
    intervalMinutes,
    firstTeeTime: firstTeeTime.trim() || null,
  }), [players, flightCount, intervalMinutes, firstTeeTime]);

  const existingFlights = useMemo<DisplayFlight[]>(() => {
    const flights = new Map<string, DisplayFlight>();
    for (const row of pairings) {
      let flight = flights.get(row.flight_id);
      if (!flight) {
        flight = { key: row.flight_id, name: row.flight_name, orderIndex: row.order_index, members: [] };
        flights.set(row.flight_id, flight);
      }
      flight.members.push({
        playerId: row.player_id,
        playerName: row.player_name,
        handicapIndex: row.handicap_index,
        pairingNo: row.pairing_no,
        teeTime: PAIRING.formatTeeTime(row.tee_time),
      });
    }
    return Array.from(flights.values()).sort((a, b) => a.orderIndex - b.orderIndex);
  }, [pairings]);

  const showEditor = canManage && (editorOpen ?? (pairings.length === 0 && players.length > 0));
  const teeSheet = showEditor ? preview.map(previewToDisplay) : existingFlights;

  const handleSave = async () => {
    if (!roundId || !round) return;
    if (preview.length === 0) {
      toast.error('There are no registered players to pair.');
      return;
    }

    setIsSaving(true);
    const fail = (message: string, detail?: string | null) => {
      toast.error(detail ? `${message} ${detail}` : message);
      setIsSaving(false);
    };

    const roundUpdate = await supabase
      .from('rounds')
      .update({
        tee_interval_minutes: intervalMinutes,
        first_tee_time: firstTeeTime.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', roundId);

    if (roundUpdate.error) {
      fail('Pairings were not saved.', roundUpdate.error.message);
      return;
    }

    const existingFlightsResult = await supabase.from('flights').select('id').eq('round_id', roundId);
    if (existingFlightsResult.error) {
      fail('Pairings were not saved.', existingFlightsResult.error.message);
      return;
    }

    const existingFlightIds = ((existingFlightsResult.data ?? []) as FlightRow[]).map((flight) => flight.id);
    if (existingFlightIds.length > 0) {
      const deleteMembers = await supabase.from('flight_players').delete().in('flight_id', existingFlightIds);
      if (deleteMembers.error) {
        fail('Pairings were not saved.', deleteMembers.error.message);
        return;
      }
    }

    const deleteFlights = await supabase.from('flights').delete().eq('round_id', roundId);
    if (deleteFlights.error) {
      fail('Pairings were not saved.', deleteFlights.error.message);
      return;
    }

    const insertFlights = await supabase
      .from('flights')
      .insert(preview.map((flight) => ({
        round_id: roundId,
        tournament_id: round.tournament_id,
        name: flight.name,
        order_index: flight.orderIndex,
      })))
      .select('id, name, order_index');

    if (insertFlights.error) {
      fail('Pairings were not saved.', insertFlights.error.message);
      return;
    }

    const inserted = (insertFlights.data ?? []) as FlightRow[];
    if (inserted.length !== preview.length) {
      fail('Pairings were not saved.', 'The database returned an unexpected number of flights.');
      return;
    }

    const flightIdByName = new Map(inserted.map((flight) => [flight.name, flight.id]));
    const memberRows = preview
      .flatMap((flight) => flight.members.map((member) => ({
        flight_id: flightIdByName.get(flight.name) ?? '',
        player_id: member.playerId,
        pairing_no: member.pairingNo,
        tee_time: member.teeTime,
      })))
      .filter((row) => row.flight_id !== '');

    if (memberRows.length === 0) {
      fail('Pairings were not saved.', 'No players could be assigned to the new flights.');
      return;
    }

    const insertMembers = await supabase.from('flight_players').insert(memberRows);
    if (insertMembers.error) {
      fail('Pairings were not saved.', insertMembers.error.message);
      return;
    }

    const playerCount = memberRows.length;
    setIsSaving(false);
    toast.success(`Flights saved: ${preview.length} flight${preview.length === 1 ? '' : 's'} and ${playerCount} player${playerCount === 1 ? '' : 's'}.`);
    setEditorOpen(false);
    await loadPairings();
  };

  if (isLoading) {
    return <Container size="lg" className="py-4"><LoadingState message="Loading pairings..." /></Container>;
  }

  if (error || !round) {
    return (
      <Container size="lg" className="space-y-4 py-4">
        <BackLink fallbackTo="/dashboard" label="Back" />
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error || 'Round not found'}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container size="lg" className="space-y-4 py-4">
      <BackLink fallbackTo={`/rounds/${round.id}`} label="Back to round" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-tmgl-gold-600" /> Flights &amp; Tee Sheet
          </h1>
          <p className="text-sm text-tmgl-charcoal-500 mt-0.5">
            {tournament ? `${tournament.name} · ` : ''}Round {round.round_number}: {round.name}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-tmgl-charcoal-600">
          <Users className="w-4 h-4 text-tmgl-charcoal-400" />
          {players.length} registered player{players.length === 1 ? '' : 's'}
        </div>
      </div>

      {!canManage && (
        <p className="text-sm text-tmgl-charcoal-500">
          Only league managers can create or replace pairings. You are viewing the current tee sheet.
        </p>
      )}

      {playersError && (
        <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>Registered players could not be loaded. {playersError}</p>
        </div>
      )}

      {pairingsError && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>Saved pairings could not be loaded. {pairingsError}</p>
        </div>
      )}

      {canManage && showEditor && players.length > 0 && (
        <Card variant="bordered" className="border-tmgl-charcoal-200">
          <CardHeader>
            <CardTitle className="text-base">Auto-pair players</CardTitle>
            <span className="text-xs text-tmgl-charcoal-500">{PAIRING.seedByHandicap(players).length} seeded by handicap</span>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="pairing-flight-count" className={labelClass}>Number of flights</label>
                <input
                  id="pairing-flight-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_FLIGHTS}
                  step={1}
                  value={flightCount}
                  onChange={(event) => setFlightCount(toInt(event.target.value, 1, MAX_FLIGHTS, 1))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pairing-interval-minutes" className={labelClass}>Tee interval (minutes)</label>
                <input
                  id="pairing-interval-minutes"
                  type="number"
                  inputMode="numeric"
                  min={MIN_INTERVAL_MINUTES}
                  max={MAX_INTERVAL_MINUTES}
                  step={1}
                  value={intervalMinutes}
                  onChange={(event) => setIntervalMinutes(toInt(event.target.value, MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES, DEFAULT_INTERVAL_MINUTES))}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pairing-first-tee-time" className={labelClass}>First tee time</label>
                <input
                  id="pairing-first-tee-time"
                  type="time"
                  value={firstTeeTime}
                  onChange={(event) => setFirstTeeTime(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <p className="text-xs text-tmgl-charcoal-500">
              Players are seeded by handicap index, missing handicaps count as the field average, and each pairing of two tees
              {intervalMinutes} minute{intervalMinutes === 1 ? '' : 's'} after the previous one.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || preview.length === 0}
                className="bg-tmgl-charcoal-950 hover:bg-tmgl-charcoal-800"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-1.5" /> {pairings.length > 0 ? 'Replace pairings' : 'Save pairings'}</>
                )}
              </Button>
              {pairings.length > 0 && (
                <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && showEditor && players.length === 0 && (
        <Card variant="bordered" className="border-tmgl-charcoal-200">
          <EmptyState
            icon={Users}
            title="No registered players"
            description="Players must be registered for this tournament before flights can be created."
          />
        </Card>
      )}

      {!showEditor && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-tmgl-charcoal-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-tmgl-gold-600" /> Tee sheet
            </h2>
            {canManage && (
              <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> Replace pairings
              </Button>
            )}
          </div>

          {pairings.length === 0 ? (
            <Card variant="bordered" className="border-tmgl-charcoal-200">
              <EmptyState
                icon={Layers}
                title="No pairings yet"
                description={canManage ? 'Generate flights and a tee sheet for this round.' : 'Pairings will appear here once a manager creates them.'}
                action={canManage ? (
                  <Button
                    variant="primary"
                    onClick={() => setEditorOpen(true)}
                    disabled={players.length === 0}
                    className="bg-tmgl-charcoal-950 hover:bg-tmgl-charcoal-800"
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Generate pairings
                  </Button>
                ) : undefined}
              />
            </Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {existingFlights.map((flight) => (
                <FlightCard key={flight.key} flight={flight} />
              ))}
            </div>
          )}
        </div>
      )}

      {showEditor && preview.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-tmgl-charcoal-900">Preview</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {teeSheet.map((flight) => (
              <FlightCard key={flight.key} flight={flight} isPreview />
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}
