import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Edit3, ArrowLeft, Loader2, AlertCircle, Save, CheckCircle, Plus, Minus } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import {
  getScorecardHoles,
  upsertScorecardHoles,
  updateScorecard,
  getRoundsByTournament,
  getRound,
  getTournaments,
  getCourseContextForRound,
  getCourseContextForCourse,
} from '@/lib/competition';
import { getPlayers } from '@/lib/league';
import { supabase } from '@/lib/supabase';
import { buildHoleEntries, computeTotalsFromHoles, holeScoreToPar } from '@/lib/scoring';
import { isScoringTargetUsable, resolveScorecardSaveStatus, type ScoringTarget } from '@/lib/scoringTarget';
import { formatToPar } from '@/utils/golf';
import { validateScorecardCompletion, validateScorecardHoles } from '@/lib/validation';
import type { Tournament, Round, Player } from '@/types/database';
import { useToast } from '@/context/ToastContext';

const NO_COURSE_MESSAGE = 'This round has no course assigned. Assign a course to the tournament before entering scores.';

export function ScoringPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [selectedTournamentId, setSelectedTournamentId] = useState(searchParams.get('tournament_id') || '');
  const [selectedRoundId, setSelectedRoundId] = useState(searchParams.get('round_id') || '');
  const [selectedPlayerId, setSelectedPlayerId] = useState(searchParams.get('player_id') || '');
  const [scorecardId, setScorecardId] = useState<string | null>(null);
  const [target, setTarget] = useState<ScoringTarget | null>(null);

  const [holeScores, setHoleScores] = useState<Record<number, string>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => { getTournaments().then((r) => { if (r.data) setTournaments(r.data); }); }, []);
  useEffect(() => { getPlayers().then((r) => { if (r.data) setPlayers(r.data); }); }, []);

  useEffect(() => {
    const initialRoundId = searchParams.get('round_id');
    if (!initialRoundId || selectedTournamentId) return;
    getRound(initialRoundId).then((res) => {
      if (res.data) setSelectedTournamentId(res.data.tournament_id);
      else setError('Round not found.');
    });
  }, [searchParams, selectedTournamentId]);

  useEffect(() => {
    let active = true;
    if (selectedTournamentId) {
      getRoundsByTournament(selectedTournamentId).then((r) => {
        if (active && r.data) setRounds(r.data);
      });
    } else {
      setRounds([]);
    }
    return () => { active = false; };
  }, [selectedTournamentId]);

  const handleTournamentChange = (value: string) => {
    setSelectedTournamentId(value);
    setSelectedRoundId('');
    setSelectedPlayerId('');
    setScorecardId(null);
    setTarget(null);
    setHoleScores({});
    setValidationErrors([]);
    setSuccess(null);
    setError(null);
  };

  const loadScorecard = useCallback(async () => {
    if (!selectedRoundId || !selectedPlayerId) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setValidationErrors([]);

    try {
      const { data: existingSc, error: existingError } = await supabase
        .from('scorecards')
        .select('id, course_id')
        .eq('round_id', selectedRoundId)
        .eq('player_id', selectedPlayerId)
        .maybeSingle();

      if (existingError) {
        setError(existingError.message);
        setIsLoading(false);
        return;
      }

      const roundContext = await getCourseContextForRound(selectedRoundId);
      if (roundContext.error) {
        setError(roundContext.error);
        setIsLoading(false);
        return;
      }

      const existingCourseId = existingSc?.course_id ?? null;
      const context = existingCourseId && existingCourseId !== roundContext.data?.courseId
        ? await getCourseContextForCourse(existingCourseId)
        : roundContext;

      if (context.error) {
        setError(context.error);
        setIsLoading(false);
        return;
      }

      const courseId = existingCourseId ?? context.data?.courseId ?? null;
      const roundRes = await getRound(selectedRoundId);
      const resolvedTarget: ScoringTarget = {
        roundId: selectedRoundId,
        tournamentId: roundRes.data?.tournament_id ?? null,
        courseId,
        pars: context.data?.pars ?? {},
        expectedHoles: context.data?.expectedHoles ?? [],
        holeCount: context.data?.holeCount ?? 0,
      };

      setTarget(resolvedTarget);

      if (!isScoringTargetUsable(resolvedTarget)) {
        setScorecardId(existingSc?.id ?? null);
        setHoleScores({});
        setError(NO_COURSE_MESSAGE);
        setIsLoading(false);
        return;
      }

      let scId: string;

      if (existingSc) {
        scId = existingSc.id;
      } else {
        const { data: newSc, error: createErr } = await supabase
          .from('scorecards')
          .insert({
            round_id: selectedRoundId,
            player_id: selectedPlayerId,
            course_id: courseId,
            status: 'draft',
          })
          .select('id')
          .single();
        if (createErr) { setError(createErr.message); toast.error(createErr.message); setIsLoading(false); return; }
        scId = newSc.id;
      }

      setScorecardId(scId);

      const { data: existingHoles } = await getScorecardHoles(scId);
      if (existingHoles && existingHoles.length > 0) {
        const scores: Record<number, string> = {};
        for (const h of existingHoles) {
          scores[h.hole_number] = String(h.strokes);
          if (resolvedTarget.pars[h.hole_number] === undefined) resolvedTarget.pars[h.hole_number] = h.par;
        }
        setHoleScores(scores);
        setTarget(resolvedTarget);
      } else {
        setHoleScores({});
      }
    } catch {
      setError('Failed to load scorecard');
      toast.error('Failed to load scorecard');
    }
    setIsLoading(false);
  }, [selectedRoundId, selectedPlayerId, toast]);

  useEffect(() => { if (selectedRoundId && selectedPlayerId) loadScorecard(); }, [loadScorecard]);

  const handleScoreChange = (holeNum: number, value: string) => {
    setHoleScores((prev) => ({ ...prev, [holeNum]: value }));
    setSuccess(null);
    setValidationErrors([]);
  };

  const adjustScore = (holeNum: number, delta: number) => {
    const current = parseInt(holeScores[holeNum] || '0', 10);
    const newValue = current + delta;
    if (newValue >= 1 && newValue <= 20) {
      handleScoreChange(holeNum, String(newValue));
    }
  };

  const holeCount = target?.holeCount ?? 18;
  const pars = target?.pars ?? {};
  const expectedHoles = target?.expectedHoles ?? [];

  const entries = target ? buildHoleEntries(holeScores, pars, expectedHoles) : [];
  const totals = computeTotalsFromHoles(entries);
  const holesCompleted = totals.holesCompleted;
  const canSave = Boolean(scorecardId) && isScoringTargetUsable(target);

  const handleSave = async (submit: boolean) => {
    if (!scorecardId || !target) return;
    if (submit && !isScoringTargetUsable(target)) {
      setValidationErrors([NO_COURSE_MESSAGE]);
      return;
    }

    setIsSaving(true);
    setError(null);
    setValidationErrors([]);
    setSuccess(null);

    const holesToSave = entries.map((e) => ({
      scorecard_id: scorecardId,
      hole_number: e.holeNumber,
      par: e.par,
      strokes: e.strokes,
      score_to_par: holeScoreToPar(e.strokes, e.par),
    }));

    if (submit) {
      const perHole = validateScorecardHoles(
        holesToSave.map((h) => ({ hole_number: h.hole_number, par: h.par, strokes: h.strokes })),
        target.holeCount
      );
      const completion = validateScorecardCompletion(
        holesToSave.map((h) => ({ hole_number: h.hole_number, strokes: h.strokes })),
        target.expectedHoles
      );

      if (!perHole.isValid || !completion.isValid) {
        setValidationErrors([...perHole.errors, ...completion.errors]);
        setIsSaving(false);
        return;
      }
    }

    if (holesToSave.length > 0) {
      const result = await upsertScorecardHoles(holesToSave);
      if (result.error) { setError(result.error); toast.error(result.error); setIsSaving(false); return; }
    }

    const status = resolveScorecardSaveStatus({ hasScores: holesToSave.length > 0, submit });
    const scResult = await updateScorecard(scorecardId, {
      status,
      total_strokes: holesToSave.length > 0 ? totals.totalStrokes : null,
      total_score_to_par: holesToSave.length > 0 ? totals.totalToPar : null,
    });
    if (scResult.error) { setError(scResult.error); toast.error(scResult.error); setIsSaving(false); return; }

    if (submit) {
      setSuccess('Scorecard submitted!');
      toast.success('Scorecard submitted successfully');
    } else if (holesToSave.length > 0) {
      setSuccess(`Progress saved (${holesCompleted}/${holeCount} holes).`);
      toast.success('Progress saved');
    } else {
      setSuccess('Draft saved.');
      toast.success('Draft saved');
    }
    setIsSaving(false);
  };

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
        <Edit3 className="w-5 h-5 text-tmgl-green-800" /> Score Entry
      </h1>

      <Card className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Tournament</label>
          <select value={selectedTournamentId} onChange={(e) => handleTournamentChange(e.target.value)}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
            <option value="">Select tournament</option>
            {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Round</label>
          <select value={selectedRoundId} onChange={(e) => { setSelectedRoundId(e.target.value); setScorecardId(null); setTarget(null); setHoleScores({}); setError(null); setSuccess(null); setValidationErrors([]); }} disabled={!selectedTournamentId}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 disabled:opacity-50">
            <option value="">Select round</option>
            {rounds.map((r) => <option key={r.id} value={r.id}>Round {r.round_number}: {r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Player</label>
          <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} disabled={!selectedRoundId}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 disabled:opacity-50">
            <option value="">Select player</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>
      </Card>

      {isLoading && <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" /></div>}

      {error && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{error}</p></div>}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {validationErrors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}
      {success && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800"><CheckCircle className="w-4 h-4" /><p>{success}</p></div>}

      {!isLoading && scorecardId && selectedPlayerId && (
        <>
          <Card>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-tmgl-charcoal-900">{totals.totalStrokes || '-'}</p>
                <p className="text-xs text-tmgl-charcoal-500">Total</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${totals.totalToPar <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {totals.totalStrokes > 0 ? formatToPar(totals.totalToPar) : '-'}
                </p>
                <p className="text-xs text-tmgl-charcoal-500">To Par</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-tmgl-charcoal-900">{holesCompleted}/{holeCount}</p>
                <p className="text-xs text-tmgl-charcoal-500">Holes</p>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            {expectedHoles.length > 0
              ? expectedHoles.map((holeNum) => {
                const par = pars[holeNum] || 4;
                const strokes = parseInt(holeScores[holeNum] || '', 10);
                const toPar = !isNaN(strokes) ? holeScoreToPar(strokes, par) : null;

                return (
                  <Card key={holeNum} className="flex items-center gap-3 p-3 bg-white hover:bg-tmgl-charcoal-50 transition-colors">
                    <div className="w-10 text-center shrink-0">
                      <p className="text-sm font-bold text-tmgl-charcoal-900">{holeNum}</p>
                      <p className="text-[10px] text-tmgl-charcoal-500">Par {par}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adjustScore(holeNum, -1)}
                        className="w-8 h-8 p-0 rounded-full border-tmgl-charcoal-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={holeScores[holeNum] || ''}
                        onChange={(e) => handleScoreChange(holeNum, e.target.value)}
                        placeholder="0"
                        className="w-12 text-center py-2 rounded-lg border border-tmgl-charcoal-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-tmgl-green-700"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adjustScore(holeNum, 1)}
                        className="w-8 h-8 p-0 rounded-full border-tmgl-charcoal-200 hover:bg-green-50 hover:text-green-600"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="w-14 text-right">
                      {toPar !== null && (
                        <span className={`text-sm font-bold ${toPar <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatToPar(toPar)}
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })
              : Array.from({ length: holeCount }, (_, i) => i + 1).map((holeNum) => (
                <Card key={holeNum} className="p-3 bg-white">
                  <p className="text-sm text-tmgl-charcoal-600">Hole {holeNum} (Par {pars[holeNum] || 4})</p>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={holeScores[holeNum] || ''}
                    onChange={(e) => handleScoreChange(holeNum, e.target.value)}
                    placeholder="0"
                    className="w-12 mt-2 text-center py-2 rounded-lg border border-tmgl-charcoal-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-tmgl-green-700"
                  />
                </Card>
              ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => handleSave(false)} disabled={isSaving || !canSave}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
            </Button>
            <Button variant="primary" fullWidth onClick={() => handleSave(true)} disabled={isSaving || !canSave || holesCompleted < holeCount} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />} Submit
            </Button>
          </div>
        </>
      )}
    </Container>
  );
}
