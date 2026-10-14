import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Medal, AlertCircle, RefreshCw, FileText, Inbox } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { getTournaments, getRoundsByTournament, getLeaderboard, getTournamentLeaderboard, getFormatStandings, type FormatStandingEntry } from '@/lib/competition';
import { formatUsesTeams, getScoringFormat } from '@/lib/scoringFormats';
import type { ScoringFormat } from '@/types/database';
import { formatToPar } from '@/utils/golf';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Tournament, Round, LeaderboardEntry, ScorecardStatus } from '@/types/database';

const STATUS_VARIANTS: Record<ScorecardStatus, BadgeVariant> = {
  draft: 'outline', in_progress: 'warning', submitted: 'info', verified: 'success', rejected: 'danger', amended: 'warning',
};

const SELECT_CLASS =
  'w-full min-h-[44px] rounded-lg border border-tmgl-charcoal-300 bg-white px-3 py-2.5 text-sm text-tmgl-charcoal-800 focus:border-tmgl-green-500 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700/25';

function RankBadge({ position }: { position: number }) {
  const tone =
    position === 1
      ? 'bg-tmgl-gold text-tmgl-green-950'
      : position === 2
        ? 'bg-tmgl-charcoal-200 text-tmgl-charcoal-800'
        : position === 3
          ? 'bg-tmgl-gold-100 text-tmgl-gold-800'
          : 'bg-tmgl-charcoal-50 text-tmgl-charcoal-500';
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular',
        tone
      )}
    >
      {position}
    </span>
  );
}

export function LeaderboardPage() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [searchParams] = useSearchParams();
  const deepLinkedTournamentId = searchParams.get('tournament_id') ?? '';
  const [selectedTournamentId, setSelectedTournamentId] = useState(deepLinkedTournamentId);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [formatBoard, setFormatBoard] = useState<FormatStandingEntry[]>([]);
  const usesTeamBoard = formatBoard.length > 0;
  const [activeFormat, setActiveFormat] = useState<ScoringFormat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [useHandicap, setUseHandicap] = useState(true);
  const [showInProgress, setShowInProgress] = useState(false);
  const scoringFormat = (rounds.find((r) => r.id === selectedRoundId)?.scoring_format
    ?? tournaments.find((t) => t.id === selectedTournamentId)?.scoring_format
    ?? 'stroke_play') as ScoringFormat;

  useEffect(() => { getTournaments().then((r) => { if (r.error) setError(r.error); else if (r.data) setTournaments(r.data); }); }, []);

  // Arriving from a tournament or match page deep-links straight into that
  // tournament, including when the component is already mounted.
  useEffect(() => {
    if (deepLinkedTournamentId) setSelectedTournamentId(deepLinkedTournamentId);
  }, [deepLinkedTournamentId]);

  useEffect(() => {
    if (selectedTournamentId) {
      getRoundsByTournament(selectedTournamentId).then((r) => { if (r.error) setError(r.error); else if (r.data) setRounds(r.data); });
    } else {
      setRounds([]);
    }
    setSelectedRoundId('');
  }, [selectedTournamentId]);

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const options = { useHandicap, includeInProgress: showInProgress };
    if (!selectedTournamentId) {
      setLeaderboard([]);
      setFormatBoard([]);
      setActiveFormat(null);
      setIsLoading(false);
      return;
    }
    const roundFormat = getScoringFormat(
      rounds.find((r) => r.id === selectedRoundId)?.scoring_format
        ?? tournaments.find((t) => t.id === selectedTournamentId)?.scoring_format
    ).value;
    const teamBoard = roundFormat === 'match_play' || roundFormat === 'nassau' || formatUsesTeams(roundFormat);
    if (teamBoard) {
      setActiveFormat(roundFormat);
      const formatResult = await getFormatStandings(selectedTournamentId, roundFormat, {
        ...options,
        roundId: selectedRoundId || undefined
      });
      if (formatResult.error) setError(formatResult.error);
      else setFormatBoard(formatResult.data ?? []);
      setLeaderboard([]);
      setIsLoading(false);
      return;
    }
    setActiveFormat(null);
    setFormatBoard([]);
    const result = selectedRoundId
      ? await getLeaderboard(selectedRoundId, options)
      : await getTournamentLeaderboard(selectedTournamentId, options);
    if (result.error) setError(result.error);
    else if (result.data) setLeaderboard(result.data);
    setIsLoading(false);
  }, [selectedTournamentId, selectedRoundId, useHandicap, showInProgress]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  useEffect(() => {
    if (!selectedTournamentId) return;

    setIsLive(false);
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void loadLeaderboard(); }, 1200);
    };

    const channel = supabase
      .channel(`live-leaderboard-${selectedTournamentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scorecard_holes' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scorecards' },
        scheduleRefresh
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [selectedTournamentId, loadLeaderboard]);

  return (
    <Container size="lg" className="space-y-6 py-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-green-700">
            Standings
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-display-lg text-tmgl-green-950">Leaderboard</h1>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-tmgl-green-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-tmgl-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-tmgl-green-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-tmgl-charcoal-500">
            Select an event and round to see the field.
          </p>
        </div>
        <Button variant="outline" onClick={loadLeaderboard} disabled={isLoading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="rounded-card border border-tmgl-charcoal-200 bg-white p-4 shadow-card sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lb-tournament" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">
              Tournament
            </label>
            <select
              id="lb-tournament"
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">All tournaments</option>
              {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {selectedTournamentId && (
            <div>
              <label htmlFor="lb-round" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">
                Round
              </label>
              <select
                id="lb-round"
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Tournament total</option>
                {rounds.map((r) => <option key={r.id} value={r.id}>Round {r.round_number}: {r.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {isLoading && <LoadingState message="Loading leaderboard..." />}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{error}</p>
        </div>
      )}

      {!isLoading && !error && !usesTeamBoard && leaderboard.length === 0 && (selectedTournamentId || selectedRoundId) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-tmgl-charcoal-100 flex items-center justify-center mb-3">
            <Inbox className="w-7 h-7 text-tmgl-charcoal-400" />
          </div>
          <p className="text-base font-semibold text-tmgl-charcoal-700">No leaderboard data</p>
          <p className="text-sm text-tmgl-charcoal-500 mt-1">No scorecards have been submitted for this selection yet.</p>
        </div>
      )}

      {!isLoading && !error && leaderboard.length === 0 && !selectedTournamentId && !selectedRoundId && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-tmgl-charcoal-100 flex items-center justify-center mb-3">
            <Medal className="w-7 h-7 text-tmgl-charcoal-400" />
          </div>
          <p className="text-base font-semibold text-tmgl-charcoal-700">Select a tournament</p>
          <p className="text-sm text-tmgl-charcoal-500 mt-1">Choose a tournament and round to view the leaderboard.</p>
        </div>
      )}

      {!isLoading && leaderboard.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-col gap-3 rounded-card border border-tmgl-charcoal-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-tmgl-charcoal-600">
              {useHandicap ? 'Ranked on net score, handicap applied' : 'Ranked on gross score'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="leaderboard-scope" className="sr-only">Leaderboard scope</label>
              <select
                id="leaderboard-scope"
                value={showInProgress ? 'all' : 'ranked'}
                onChange={(event) => setShowInProgress(event.target.value === 'all')}
                className="min-h-[40px] rounded-lg border border-tmgl-charcoal-300 bg-white px-3 py-2 text-sm text-tmgl-charcoal-800 focus:border-tmgl-green-500 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700/25"
              >
                <option value="ranked">Submitted cards only</option>
                <option value="all">Include in-progress cards</option>
              </select>
              <div className="flex rounded-lg border border-tmgl-charcoal-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setUseHandicap(true)}
                  aria-pressed={useHandicap}
                  className={cn(
                    'min-h-[36px] rounded-md px-3 text-sm font-medium transition-colors',
                    useHandicap ? 'bg-tmgl-green-800 text-white' : 'text-tmgl-charcoal-600 hover:text-tmgl-green-800'
                  )}
                >
                  Net
                </button>
                <button
                  type="button"
                  onClick={() => setUseHandicap(false)}
                  aria-pressed={!useHandicap}
                  className={cn(
                    'min-h-[36px] rounded-md px-3 text-sm font-medium transition-colors',
                    !useHandicap ? 'bg-tmgl-green-800 text-white' : 'text-tmgl-charcoal-600 hover:text-tmgl-green-800'
                  )}
                >
                  Gross
                </button>
              </div>
            </div>
          </div>
          {usesTeamBoard && formatBoard.length > 0 && (
            <div className="space-y-2">
              <p className="rounded-lg border border-tmgl-gold-500/40 bg-tmgl-gold-500/10 p-3 text-xs text-tmgl-charcoal-700">
                {activeFormat === 'match_play' && 'Match play standings. Each pairing plays the neighbouring pairing; ranking is on holes won, then holes lost.'}
                {activeFormat === 'nassau' && 'Nassau standings. Each pairing plays the neighbouring pairing over the front nine, back nine and total; ranking is on strokes relative to par.'}
                {activeFormat === 'best_ball' && 'Best ball standings. Each pairing is a team and only the lower score on each hole counts.'}
                {activeFormat === 'scramble' && 'Scramble standings. Players are split into groups of four and only the lowest score on each hole counts for the group.'}
              </p>
              {formatBoard.map((row) => (
                <Card key={row.unit_id} className="flex items-center gap-4 p-4 sm:p-5">
                  <RankBadge position={row.position} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-tmgl-green-950">{row.label}</p>
                    <p className="mt-0.5 text-xs text-tmgl-charcoal-500">
                      {row.member_count} player{row.member_count === 1 ? '' : 's'} &middot; thru {row.holes_played}
                      {row.holes_won + row.holes_lost > 0 ? ` \u00B7 ${row.holes_won}W ${row.holes_lost}L` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular text-tmgl-green-950">{row.display_value}</p>
                    {row.net_to_par !== null && (
                      <p className="text-xs tabular text-tmgl-charcoal-500">
                        net {row.net_to_par > 0 ? `+${row.net_to_par}` : row.net_to_par}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
          {!usesTeamBoard && leaderboard.map((entry) => {
            const isPoints = scoringFormat === 'stableford';
            const strokes = useHandicap ? entry.net_strokes : entry.total_strokes;
            const toPar = useHandicap ? entry.net_to_par : entry.total_score_to_par;
            const thru = entry.holes_completed > 0 ? `Thru ${entry.holes_completed}` : 'Not started';
            return (
              <Card key={entry.player_id} className="flex items-center gap-4 p-4 sm:p-5">
                <RankBadge position={entry.position} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-tmgl-green-950">{entry.player_name}</p>
                  <p className="mt-0.5 text-xs text-tmgl-charcoal-500">
                    {thru} &middot; Index {entry.handicap_index}
                    {!isPoints && entry.handicap_index > 0 && useHandicap
                      ? ` \u2192 net ${entry.net_strokes}`
                      : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {isPoints ? (
                    <>
                      <p className="text-xl font-bold tabular text-tmgl-green-950">
                        {entry.points ?? 0}
                      </p>
                      <p className="text-xs text-tmgl-charcoal-500">pts</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold tabular text-tmgl-green-950">{strokes}</p>
                      <p
                        className={`text-xs font-semibold ${
                          toPar <= 0 ? 'text-tmgl-green-700' : 'text-red-600'
                        }`}
                      >
                        {useHandicap ? 'net ' : 'gross '}
                        {formatToPar(toPar)}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {entry.cut && (
                    <Badge variant="outline" className="border-amber-400 bg-amber-50 font-semibold text-amber-800">
                      {entry.cut === 'DNF' ? 'DNF' : 'Cut'}
                    </Badge>
                  )}
                  {entry.scorecard_status && (
                    <Badge variant={STATUS_VARIANTS[entry.scorecard_status] ?? 'outline'}>
                      {entry.scorecard_status?.replace('_', ' ')}
                    </Badge>
                  )}
                  {entry.scorecard_id && (
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/scorecard/${entry.scorecard_id}`); }}
                      className="text-xs text-tmgl-green-800 hover:underline flex items-center gap-0.5">
                      <FileText className="w-3 h-3" /> Scorecard
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Container>
  );
}
