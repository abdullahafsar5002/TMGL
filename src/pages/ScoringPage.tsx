import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, Edit3, Loader2, Minus, Plus, Save } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
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
import { formatToPar } from '@/utils/golf';
import { validateScorecardHoles } from '@/lib/validation';
import type { Player, Round, Tournament } from '@/types/database';

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
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
        setError('This round does not have an assigned course yet.');
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

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-gold-600">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="flex items-center gap-2 text-xl font-bold text-tmgl-charcoal-950">
        <Edit3 className="h-5 w-5 text-tmgl-gold-600" /> Score Entry
      </h1>

      <Card className="space-y-3">
        <div>
          <label htmlFor="scoring-tournament" className="mb-1 block text-sm font-medium text-tmgl-charcoal-700">Tournament</label>
          <select id="scoring-tournament" value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)} className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 bg-white px-3 py-2.5 text-sm focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500">
            <option value="">Select tournament</option>
            {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="scoring-round" className="mb-1 block text-sm font-medium text-tmgl-charcoal-700">Round</label>
          <select id="scoring-round" value={selectedRoundId} onChange={(event) => setSelectedRoundId(event.target.value)} disabled={!selectedTournamentId} className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 bg-white px-3 py-2.5 text-sm disabled:opacity-50 focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500">
            <option value="">Select round</option>
            {rounds.map((round) => <option key={round.id} value={round.id}>Round {round.round_number}: {round.name}</option>)}
          </select>
        </div>
        {isManager ? (
          <div>
            <label htmlFor="scoring-player" className="mb-1 block text-sm font-medium text-tmgl-charcoal-700">Player</label>
            <select id="scoring-player" value={selectedPlayerId} onChange={(event) => setSelectedPlayerId(event.target.value)} disabled={!selectedRoundId} className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 bg-white px-3 py-2.5 text-sm disabled:opacity-50 focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500">
              <option value="">Select player</option>
              {players.map((player) => <option key={player.id} value={player.id}>{player.full_name}</option>)}
            </select>
          </div>
        ) : (
          <p className="text-sm text-tmgl-charcoal-500">You are editing your assigned scorecard only.</p>
        )}
      </Card>

      {isLoading && <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-tmgl-gold-600" /></div>}
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}
      {queueError && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{queueError}</div>}
      {validationErrors.length > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{validationErrors.map((message) => <p key={message}>{message}</p>)}</div>}
      {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle className="h-4 w-4" /><p>{success}</p></div>}
      {queueState !== 'idle' && (
        <div className="flex items-center justify-between rounded-xl border border-tmgl-gold-300 bg-tmgl-gold-50 px-3 py-2 text-sm text-tmgl-charcoal-800" role="status">
          <span>{queueState === 'queued' ? 'Queued for sync' : queueState === 'syncing' ? 'Syncing saved scores' : queueState === 'synced' ? 'Scores synced' : 'Score sync needs attention'}</span>
          {queueState === 'queued' && <Button size="sm" variant="outline" onClick={() => void syncQueuedScores()} disabled={!isOnline()}>Sync now</Button>}
        </div>
      )}

      {!isLoading && scorecardId && selectedPlayerId && (
        <>
          <Card>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-bold text-tmgl-charcoal-950">{summary.totalStrokes || '-'}</p><p className="text-xs text-tmgl-charcoal-500">Total</p></div>
              <div><p className={`text-2xl font-bold ${summary.totalToPar <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{summary.totalStrokes > 0 ? formatToPar(summary.totalToPar) : '-'}</p><p className="text-xs text-tmgl-charcoal-500">To Par</p></div>
              <div><p className="text-2xl font-bold text-tmgl-charcoal-950">{summary.holesCompleted}/{holeCount}</p><p className="text-xs text-tmgl-charcoal-500">Holes</p></div>
            </div>
          </Card>

          <div className="space-y-2">
            {Array.from({ length: holeCount }, (_, index) => index + 1).map((holeNumber) => {
              const par = holePars[holeNumber] ?? 4;
              const strokes = Number.parseInt(holeScores[holeNumber] ?? '', 10);
              const toPar = Number.isInteger(strokes) ? holeScoreToPar(strokes, par) : null;
              return (
                <Card key={holeNumber} className="flex items-center gap-3 bg-white p-3 transition-colors hover:bg-tmgl-charcoal-50">
                  <div className="w-10 shrink-0 text-center"><p className="text-sm font-bold text-tmgl-charcoal-950">{holeNumber}</p><p className="text-[10px] text-tmgl-charcoal-500">Par {par}</p></div>
                  <div className="flex flex-1 items-center justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => adjustScore(holeNumber, -1)} className="h-8 w-8 rounded-full p-0" aria-label={`Decrease hole ${holeNumber} score`}><Minus className="h-4 w-4" /></Button>
                    <input type="number" min={1} max={20} value={holeScores[holeNumber] ?? ''} onChange={(event) => handleScoreChange(holeNumber, event.target.value)} placeholder="0" aria-label={`Strokes for hole ${holeNumber}`} className="w-12 rounded-lg border border-tmgl-charcoal-300 bg-white py-2 text-center text-sm font-bold focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500" />
                    <Button variant="outline" size="sm" onClick={() => adjustScore(holeNumber, 1)} className="h-8 w-8 rounded-full p-0" aria-label={`Increase hole ${holeNumber} score`}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="w-14 text-right">{toPar !== null && <span className={`text-sm font-bold ${toPar <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatToPar(toPar)}</span>}</div>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" fullWidth onClick={() => void saveOperation(false)} disabled={isSaving}><Save className="mr-2 h-4 w-4" />{isSaving ? 'Saving...' : 'Save'}</Button>
            <Button variant="gold" fullWidth onClick={() => void saveOperation(true)} disabled={isSaving}><CheckCircle className="mr-2 h-4 w-4" />{isSaving ? 'Submitting...' : 'Submit'}</Button>
          </div>
        </>
      )}
    </Container>
  );
}
