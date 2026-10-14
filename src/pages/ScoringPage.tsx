import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, Edit3, Minus, Plus, Save } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  createScorecard,
  getCourseIdForRound,
  getRoundsByTournament,
  isPlayerAssignedToRound,
  getScorecardByRoundPlayer,
  getScorecardHoles,
  getTournaments,
  updateScorecard,
  upsertScorecardHoles,
} from '@/lib/competition';
import { getCourseHoles, getPlayerByAuthUserId, getPlayers } from '@/lib/league';
import { canManageLeague } from '@/lib/roleGuards';
import { isRetryableServiceError, toUserFacingServiceError } from '@/lib/errors';
import { enqueueScoreOperation, getScoreQueueOperations, removeScoreOperationsForScorecard, syncScoreQueue, type QueuedScoreHole, type ScoreQueueOperation } from '@/lib/scoreQueue';
import { computeScorecardSummary, holeScoreToPar } from '@/lib/scoring';
import { subscribeToSkins } from '@/lib/skins';
import { formatToPar } from '@/utils/golf';
import { validateScorecardHoles } from '@/lib/validation';
import { isSubmissionComplete } from '@/lib/standingsRules';
import type { Player, Round, Tournament } from '@/types/database';

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

const NO_COURSE_MESSAGE = 'This round has no course assigned. Assign a course to the tournament before entering scores.';

const SELECT_CLASS =
  'min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 bg-white px-3 py-2.5 text-sm text-tmgl-charcoal-800 focus:border-tmgl-green-500 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700/25 disabled:opacity-50';

const LABEL_CLASS = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500';

const HOLE_GRID_CLASS = 'grid grid-cols-[3.25rem_1fr_4rem] items-center gap-2 sm:gap-3';

function toParClassName(toPar: number): string {
  if (toPar < 0) return 'text-tmgl-green-700';
  if (toPar > 0) return 'text-red-600';
  return 'text-tmgl-charcoal-600';
}

export function ScoringPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const isManager = canManageLeague(profile?.role);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [ownPlayerId, setOwnPlayerId] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState(searchParams.get('tournament_id') ?? '');
  const [selectedRoundId, setSelectedRoundId] = useState(searchParams.get('round_id') ?? '');
  const [selectedPlayerId, setSelectedPlayerId] = useState(searchParams.get('player_id') ?? '');
  const [scorecardId, setScorecardId] = useState<string | null>(null);
  const [holeScores, setHoleScores] = useState<Record<number, string>>({});
  const [holePars, setHolePars] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [queueState, setQueueState] = useState<'idle' | 'queued' | 'syncing' | 'synced' | 'error'>('idle');
  const [queueError, setQueueError] = useState<string | null>(null);

  useEffect(() => {
    void getTournaments().then((result) => {
      if (result.data) setTournaments(result.data);
      if (result.error) setError(result.error);
    });
    void getPlayers().then((result) => {
      if (result.data) setPlayers(result.data);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    void getPlayerByAuthUserId(user.id).then((result) => {
      if (result.data) {
        setOwnPlayerId(result.data.id);
        if (!isManager) setSelectedPlayerId(result.data.id);
      } else if (result.error && !isManager) {
        setError(result.error);
      }
    });
  }, [user, isManager]);

  useEffect(() => {
    if (!selectedTournamentId) {
      setRounds([]);
      setSelectedRoundId('');
      if (!isManager) setSelectedPlayerId(ownPlayerId ?? '');
      return;
    }
    void getRoundsByTournament(selectedTournamentId).then((result) => {
      if (result.data) setRounds(result.data);
      if (result.error) setError(result.error);
    });
    setSelectedRoundId('');
    if (!isManager) setSelectedPlayerId(ownPlayerId ?? '');
    else setSelectedPlayerId('');
  }, [selectedTournamentId, isManager, ownPlayerId]);

  const syncQueuedScores = useCallback(async () => {
    if (!isOnline()) {
      setQueueState('queued');
      return;
    }
    setQueueState('syncing');
    setQueueError(null);
    try {
      const result = await syncScoreQueue(async (operation: ScoreQueueOperation) => {
        const holesResult = await upsertScorecardHoles(operation.holes);
        if (holesResult.error) throw new Error(holesResult.error);
        const scorecardResult = await updateScorecard(operation.scorecardId, {
          status: operation.status,
          total_strokes: operation.totalStrokes,
          total_score_to_par: operation.totalScoreToPar,
        });
         if (scorecardResult.error) throw new Error(scorecardResult.error);
       }, user?.id);
      if (result.failed > 0) {
        setQueueState('error');
        setQueueError('Some queued scores could not sync. Check your connection and permissions.');
      } else if (result.synced > 0) {
        setQueueState('synced');
        toast.success('Queued scores synced successfully.');
      } else {
        setQueueState('idle');
      }
    } catch (caught) {
      setQueueState('error');
      setQueueError(toUserFacingServiceError(caught, 'Queued scores could not sync.'));
    }
  }, [toast, user?.id]);

  useEffect(() => {
    void getScoreQueueOperations(user?.id).then((operations) => {
      if (operations.length > 0) setQueueState('queued');
    }).catch(() => setQueueState('error'));
    const handleOnline = () => { void syncQueuedScores(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncQueuedScores]);

  const loadScorecard = useCallback(async () => {
    if (!selectedRoundId || !selectedPlayerId) return;
    if (!isManager && selectedPlayerId !== ownPlayerId) {
      setError('You can only edit your own scorecard.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setValidationErrors([]);

    if (!isManager) {
      const assignment = await isPlayerAssignedToRound(selectedRoundId, selectedPlayerId);
      if (assignment.error) {
        setError(assignment.error);
        setIsLoading(false);
        return;
      }
      if (!assignment.data) {
        setError('You are not assigned to this round.');
        setIsLoading(false);
        return;
      }
    }

    const existingResult = await getScorecardByRoundPlayer(selectedRoundId, selectedPlayerId);
    let currentScorecardId: string;
    let courseId: string | null;
    if (existingResult.data) {
      currentScorecardId = existingResult.data.id;
      courseId = existingResult.data.course_id;
    } else if (existingResult.error === 'Scorecard not found.') {
      const courseResult = await getCourseIdForRound(selectedRoundId);
      if (courseResult.error) {
        setError(courseResult.error);
        setIsLoading(false);
        return;
      }
      courseId = courseResult.data;
      if (!courseId) {
        setError(NO_COURSE_MESSAGE);
        setIsLoading(false);
        return;
      }
      const createResult = await createScorecard({
        round_id: selectedRoundId,
        player_id: selectedPlayerId,
        match_id: null,
        course_id: courseId,
      });
      if (createResult.error || !createResult.data) {
        const message = createResult.error ?? 'Unable to create your scorecard.';
        setError(message);
        toast.error(message);
        setIsLoading(false);
        return;
      }
      currentScorecardId = createResult.data.id;
    } else {
      setError(existingResult.error ?? 'Unable to load your scorecard.');
      setIsLoading(false);
      return;
    }

    setScorecardId(currentScorecardId);
    if (courseId) {
      const courseHolesResult = await getCourseHoles(courseId);
      if (courseHolesResult.error) {
        setError(courseHolesResult.error);
      } else if (courseHolesResult.data) {
        setHolePars(Object.fromEntries(courseHolesResult.data.map((hole) => [hole.hole_number, hole.par])));
      }
    }
    const holesResult = await getScorecardHoles(currentScorecardId);
    if (holesResult.error) {
      setError(holesResult.error);
    } else {
      const existingHoles = holesResult.data ?? [];
      setHoleScores(Object.fromEntries(existingHoles.map((hole) => [hole.hole_number, String(hole.strokes)])));
      setHolePars((previous) => ({
        ...previous,
        ...Object.fromEntries(existingHoles.map((hole) => [hole.hole_number, hole.par])),
      }));
    }
    setIsLoading(false);
  }, [selectedRoundId, selectedPlayerId, isManager, ownPlayerId, toast]);

  useEffect(() => {
    if (selectedRoundId && selectedPlayerId) void loadScorecard();
  }, [loadScorecard]);

  // Live skin wins: watch the selected round so submitted or verified cards
  // award "Hole N Skin Won!" notifications as scores land.
  useEffect(() => {
    if (!selectedRoundId) return;
    return subscribeToSkins(selectedRoundId, (skin) => {
      toast.info(
        `Hole ${skin.holeNumber} skin won by ${skin.winnerName || 'a player'}.`
      );
    });
  }, [selectedRoundId, toast]);

  const handleScoreChange = (holeNumber: number, value: string) => {
    setHoleScores((previous) => ({ ...previous, [holeNumber]: value }));
    setSuccess(null);
    setValidationErrors([]);
  };

  const adjustScore = (holeNumber: number, delta: number) => {
    const current = Number.parseInt(holeScores[holeNumber] ?? '0', 10);
    const next = current + delta;
    if (next >= 1 && next <= 20) handleScoreChange(holeNumber, String(next));
  };

  const entries = useMemo(() => Object.entries(holeScores).flatMap(([number, value]) => {
    const strokes = Number.parseInt(value, 10);
    const holeNumber = Number(number);
    const par = holePars[holeNumber] ?? 4;
    return Number.isInteger(strokes) && strokes > 0 ? [{ holeNumber, par, strokes }] : [];
  }), [holeScores, holePars]);
  const summary = computeScorecardSummary(entries.map((entry) => ({
    id: '',
    scorecard_id: '',
    hole_number: entry.holeNumber,
    par: entry.par,
    strokes: entry.strokes,
    score_to_par: holeScoreToPar(entry.strokes, entry.par),
    created_at: '',
    updated_at: '',
  })));
  const holeCount = Object.keys(holePars).length || 18;

  const saveOperation = async (submit: boolean) => {
    if (!scorecardId) return;
    setIsSaving(true);
    setError(null);
    setValidationErrors([]);
    setSuccess(null);
    const holes: QueuedScoreHole[] = entries.map((entry) => ({
      scorecard_id: scorecardId,
      hole_number: entry.holeNumber,
      par: entry.par,
      strokes: entry.strokes,
      score_to_par: holeScoreToPar(entry.strokes, entry.par),
    }));
    const validation = validateScorecardHoles(holes.map((hole) => ({ hole_number: hole.hole_number, par: hole.par, strokes: hole.strokes })), holeCount);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setIsSaving(false);
      return;
    }
    if (submit && !isSubmissionComplete(
      entries.map((entry) => ({ hole_number: entry.holeNumber, strokes: entry.strokes })),
      holeCount
    )) {
      setValidationErrors([
        `Enter a score for all ${holeCount} holes before submitting. ${entries.length} of ${holeCount} entered so far.`,
      ]);
      setIsSaving(false);
      return;
    }
    const operation = {
      scorecardId,
      ownerId: user?.id ?? '',
      holes,
      status: submit ? 'submitted' as const : 'in_progress' as const,
      totalStrokes: summary.totalStrokes,
      totalScoreToPar: summary.totalToPar,
    };
    if (!isOnline()) {
      try {
        await enqueueScoreOperation(operation);
        setQueueState('queued');
        setSuccess('Saved on this device. It will sync when you are online.');
        toast.info('Score queued for sync.');
      } catch (caught) {
        setError(toUserFacingServiceError(caught, 'This browser cannot store offline scores.'));
      }
      setIsSaving(false);
      return;
    }
    try {
      const holesResult = await upsertScorecardHoles(holes);
      if (holesResult.error) throw new Error(holesResult.error);
      const scorecardResult = await updateScorecard(scorecardId, operation.status === 'submitted'
        ? { status: 'submitted', total_strokes: operation.totalStrokes, total_score_to_par: operation.totalScoreToPar }
        : { status: 'in_progress', total_strokes: operation.totalStrokes, total_score_to_par: operation.totalScoreToPar });
      if (scorecardResult.error) throw new Error(scorecardResult.error);
      if (user?.id) {
        try {
          await removeScoreOperationsForScorecard(scorecardId, user.id);
        } catch {
          setQueueError('The score synced, but an older offline copy could not be cleaned up.');
        }
      }
      setSuccess(submit ? 'Scorecard submitted.' : 'Scorecard saved.');
      toast.success(submit ? 'Scorecard submitted successfully.' : 'Scorecard saved successfully.');
    } catch (caught) {
      if (isRetryableServiceError(caught)) {
        try {
          await enqueueScoreOperation(operation);
          setQueueState('queued');
          setSuccess('Connection lost. Score queued for sync.');
          toast.warning('Score queued for sync.');
        } catch (queueError) {
          setError(toUserFacingServiceError(queueError, 'Score could not be saved offline.'));
        }
      } else {
        setError(toUserFacingServiceError(caught, 'Unable to save the scorecard.'));
        toast.error(toUserFacingServiceError(caught, 'Unable to save the scorecard.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const holeNumbers = Array.from({ length: holeCount }, (_, index) => index + 1);
  const holeGroups = holeCount > 9
    ? [
        { label: 'Front nine', range: 'Holes 1-9', holes: holeNumbers.filter((number) => number <= 9) },
        { label: 'Back nine', range: `Holes 10-${holeCount}`, holes: holeNumbers.filter((number) => number > 9) },
      ]
    : [{ label: 'Holes', range: `Holes 1-${holeCount}`, holes: holeNumbers }];

  return (
    <Container size="lg" className="space-y-6 py-6 sm:py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-tmgl-charcoal-500 transition-colors hover:text-tmgl-green-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header className="animate-fade-up flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-green-700">
            Live scoring
          </p>
          <h1 className="mt-1 font-display text-display-lg text-tmgl-green-950">Score Entry</h1>
          <p className="mt-1 text-sm text-tmgl-charcoal-500">
            Enter a stroke count for every hole, then save your draft or submit the card.
          </p>
        </div>
        {!isLoading && scorecardId && selectedPlayerId && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-pill bg-tmgl-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-tmgl-green-700">
            <Edit3 className="h-3.5 w-3.5" /> Scorecard open
          </span>
        )}
      </header>

      <Card className="border-tmgl-charcoal-200">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="scoring-tournament" className={LABEL_CLASS}>Tournament</label>
            <select id="scoring-tournament" value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)} className={SELECT_CLASS}>
              <option value="">Select tournament</option>
              {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="scoring-round" className={LABEL_CLASS}>Round</label>
            <select id="scoring-round" value={selectedRoundId} onChange={(event) => setSelectedRoundId(event.target.value)} disabled={!selectedTournamentId} className={SELECT_CLASS}>
              <option value="">Select round</option>
              {rounds.map((round) => <option key={round.id} value={round.id}>Round {round.round_number}: {round.name}</option>)}
            </select>
          </div>
          {isManager ? (
            <div>
              <label htmlFor="scoring-player" className={LABEL_CLASS}>Player</label>
              <select id="scoring-player" value={selectedPlayerId} onChange={(event) => setSelectedPlayerId(event.target.value)} disabled={!selectedRoundId} className={SELECT_CLASS}>
                <option value="">Select player</option>
                {players.map((player) => <option key={player.id} value={player.id}>{player.full_name}</option>)}
              </select>
            </div>
          ) : (
            <p className="text-sm text-tmgl-charcoal-500 sm:self-end">You are editing your assigned scorecard only.</p>
          )}
        </div>
      </Card>

      {isLoading && <LoadingState message="Loading scorecard..." />}
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {queueError && (
        <div role="status" className="rounded-card border border-tmgl-gold-300 bg-tmgl-gold-50 p-3 text-sm text-tmgl-gold-900">
          {queueError}
        </div>
      )}
      {validationErrors.length > 0 && (
        <div role="alert" className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {validationErrors.map((message) => <p key={message}>{message}</p>)}
        </div>
      )}
      {success && (
        <div role="status" className="flex items-center gap-2 rounded-card border border-tmgl-green-200 bg-tmgl-green-50 p-3 text-sm text-tmgl-green-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <p>{success}</p>
        </div>
      )}
      {queueState !== 'idle' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-tmgl-gold-300 bg-tmgl-gold-50 px-4 py-2.5 text-sm text-tmgl-charcoal-800" role="status">
          <span>{queueState === 'queued' ? 'Queued for sync' : queueState === 'syncing' ? 'Syncing saved scores' : queueState === 'synced' ? 'Scores synced' : 'Score sync needs attention'}</span>
          {queueState === 'queued' && <Button size="sm" variant="outline" onClick={() => void syncQueuedScores()} disabled={!isOnline()}>Sync now</Button>}
        </div>
      )}

      {!isLoading && scorecardId && selectedPlayerId && (
        <>
          <div className="rounded-card border border-tmgl-charcoal-200 bg-white p-4 shadow-card sm:p-5">
            <div className="grid grid-cols-3 divide-x divide-tmgl-charcoal-200 text-center">
              <div className="px-2">
                <p className="font-display text-display-md tabular text-tmgl-green-950">{summary.totalStrokes || '-'}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">Total</p>
              </div>
              <div className="px-2">
                <p className={`font-display text-display-md tabular ${toParClassName(summary.totalToPar)}`}>
                  {summary.totalStrokes > 0 ? formatToPar(summary.totalToPar) : '-'}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">To Par</p>
              </div>
              <div className="px-2">
                <p className="font-display text-display-md tabular text-tmgl-green-950">{summary.holesCompleted}/{holeCount}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">Holes</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {holeGroups.map((group) => {
              const enteredStrokes = group.holes
                .map((holeNumber) => Number.parseInt(holeScores[holeNumber] ?? '', 10))
                .filter((strokes) => Number.isInteger(strokes) && strokes > 0);
              const groupPar = group.holes.reduce((sum, holeNumber) => sum + (holePars[holeNumber] ?? 4), 0);
              const groupStrokes = enteredStrokes.reduce((sum, strokes) => sum + strokes, 0);
              const groupToPar = groupStrokes - groupPar;
              return (
              <section key={group.label} aria-label={group.label}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold text-tmgl-green-950">{group.label}</h2>
                  <span className="text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-400">{group.range}</span>
                </div>
                <div className="overflow-hidden rounded-card border border-tmgl-charcoal-200 bg-white shadow-card">
                  <div className={`${HOLE_GRID_CLASS} border-b border-tmgl-charcoal-200 bg-tmgl-green-800 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-white`}>
                    <span className="text-center">Hole</span>
                    <span className="text-center">Strokes</span>
                    <span className="text-right">To par</span>
                  </div>
                  {group.holes.map((holeNumber) => {
                    const par = holePars[holeNumber] ?? 4;
                    const strokes = Number.parseInt(holeScores[holeNumber] ?? '', 10);
                    const toPar = Number.isInteger(strokes) ? holeScoreToPar(strokes, par) : null;
                    return (
                      <div
                        key={holeNumber}
                        className={`${HOLE_GRID_CLASS} border-b border-tmgl-charcoal-100 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-tmgl-green-50`}
                      >
                        <div className="text-center">
                          <p className="text-sm font-bold tabular text-tmgl-green-950">{holeNumber}</p>
                          <p className="text-[11px] tabular text-tmgl-charcoal-500">Par {par}</p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => adjustScore(holeNumber, -1)} className="h-11 w-11 min-h-0 rounded-full p-0" aria-label={`Decrease hole ${holeNumber} score`}><Minus className="h-4 w-4" /></Button>
                          <input type="number" min={1} max={20} value={holeScores[holeNumber] ?? ''} onChange={(event) => handleScoreChange(holeNumber, event.target.value)} placeholder="0" aria-label={`Strokes for hole ${holeNumber}`} className="h-11 w-14 rounded-lg border border-tmgl-charcoal-300 bg-white text-center text-base font-bold tabular text-tmgl-green-950 focus:border-tmgl-green-500 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700/25" />
                          <Button variant="outline" size="sm" onClick={() => adjustScore(holeNumber, 1)} className="h-11 w-11 min-h-0 rounded-full p-0" aria-label={`Increase hole ${holeNumber} score`}><Plus className="h-4 w-4" /></Button>
                        </div>
                        <p className="text-right text-sm font-bold tabular">
                          {toPar !== null && <span className={toParClassName(toPar)}>{formatToPar(toPar)}</span>}
                        </p>
                      </div>
                    );
                  })}
                  <div className={`${HOLE_GRID_CLASS} border-t-2 border-tmgl-charcoal-200 bg-tmgl-charcoal-50 px-3 py-2.5 text-sm font-bold tabular`}>
                    <div className="text-center">
                      <p className="text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">Total</p>
                      <p className="text-[11px] tabular text-tmgl-charcoal-500">Par {groupPar}</p>
                    </div>
                    <p className="text-center text-tmgl-green-950">{enteredStrokes.length > 0 ? groupStrokes : '-'}</p>
                    <p className={`text-right ${enteredStrokes.length > 0 ? toParClassName(groupToPar) : 'text-tmgl-charcoal-400'}`}>
                      {enteredStrokes.length > 0 ? formatToPar(groupToPar) : '-'}
                    </p>
                  </div>
                </div>
              </section>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="outline" fullWidth onClick={() => void saveOperation(false)} disabled={isSaving}><Save className="mr-2 h-4 w-4" />{isSaving ? 'Saving...' : 'Save'}</Button>
            <Button variant="primary" fullWidth onClick={() => void saveOperation(true)} disabled={isSaving}><CheckCircle className="mr-2 h-4 w-4" />{isSaving ? 'Submitting...' : 'Submit'}</Button>
          </div>
        </>
      )}
    </Container>
  );
}
