import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Edit3, ArrowLeft, Loader2, AlertCircle, Save, CheckCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { getScorecardHoles, upsertScorecardHoles, updateScorecard } from '@/lib/competition';
import { getRoundsByTournament } from '@/lib/competition';
import { getTournaments } from '@/lib/competition';
import { getPlayers } from '@/lib/league';
import { supabase } from '@/lib/supabase';
import { holeScoreToPar, computeScorecardSummary, type HoleEntry } from '@/lib/scoring';
import { formatToPar } from '@/utils/golf';
import { validateScorecardHoles } from '@/lib/validation';
import type { Tournament, Round, Player } from '@/types/database';

export function ScoringPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [selectedTournamentId, setSelectedTournamentId] = useState(searchParams.get('tournament_id') || '');
  const [selectedRoundId, setSelectedRoundId] = useState(searchParams.get('round_id') || '');
  const [selectedPlayerId, setSelectedPlayerId] = useState(searchParams.get('player_id') || '');
  const [scorecardId, setScorecardId] = useState<string | null>(null);

  const [holeScores, setHoleScores] = useState<Record<number, string>>({});
  const [holePars, setHolePars] = useState<Record<number, number>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => { getTournaments().then((r) => { if (r.data) setTournaments(r.data); }); }, []);
  useEffect(() => { getPlayers().then((r) => { if (r.data) setPlayers(r.data); }); }, []);

  useEffect(() => {
    if (selectedTournamentId) {
      getRoundsByTournament(selectedTournamentId).then((r) => { if (r.data) setRounds(r.data); });
    } else {
      setRounds([]);
    }
    setSelectedRoundId('');
    setSelectedPlayerId('');
  }, [selectedTournamentId]);

  const loadScorecard = useCallback(async () => {
    if (!selectedRoundId || !selectedPlayerId) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: existingSc } = await supabase
        .from('scorecards')
        .select('id, course_id')
        .eq('round_id', selectedRoundId)
        .eq('player_id', selectedPlayerId)
        .single();

      let scId: string;
      let courseId: string | null = null;

      if (existingSc) {
        scId = existingSc.id;
        courseId = existingSc.course_id;
      } else {
        const roundRes = await supabase.from('rounds').select('tournament_id').eq('id', selectedRoundId).single();
        courseId = roundRes.data ? (await supabase.from('tournaments').select('course_id').eq('id', roundRes.data.tournament_id).single()).data?.course_id : null;

        const { data: newSc, error: createErr } = await supabase
          .from('scorecards')
          .insert({ round_id: selectedRoundId, player_id: selectedPlayerId, course_id: courseId })
          .select('id')
          .single();
        if (createErr) { setError(createErr.message); setIsLoading(false); return; }
        scId = newSc.id;
      }

      setScorecardId(scId);

      if (courseId) {
        const { data: holes } = await supabase.from('course_holes').select('hole_number, par').eq('course_id', courseId).order('hole_number');
        if (holes && holes.length > 0) {
          const pars: Record<number, number> = {};
          holes.forEach((h) => { pars[h.hole_number] = h.par; });
          setHolePars(pars);
        }
      }

      const { data: existingHoles } = await getScorecardHoles(scId);
      if (existingHoles && existingHoles.length > 0) {
        const scores: Record<number, string> = {};
        const pars2: Record<number, number> = {};
        existingHoles.forEach((h) => {
          scores[h.hole_number] = String(h.strokes);
          pars2[h.hole_number] = h.par;
        });
        setHoleScores(scores);
        setHolePars((prev) => ({ ...prev, ...pars2 }));
      } else {
        setHoleScores({});
      }
    } catch {
      setError('Failed to load scorecard');
    }
    setIsLoading(false);
  }, [selectedRoundId, selectedPlayerId]);

  useEffect(() => { if (selectedRoundId && selectedPlayerId) loadScorecard(); }, [loadScorecard]);

  const handleScoreChange = (holeNum: number, value: string) => {
    setHoleScores((prev) => ({ ...prev, [holeNum]: value }));
    setSuccess(null);
    setValidationErrors([]);
  };

  const summary = (() => {
    const entries: HoleEntry[] = [];
    for (const [num, strokes] of Object.entries(holeScores)) {
      const holeNum = Number(num);
      const par = holePars[holeNum] || 4;
      const s = parseInt(strokes, 10);
      if (!isNaN(s) && s > 0) {
        entries.push({ holeNumber: holeNum, par, strokes: s });
      }
    }
    return computeScorecardSummary(entries.map((e) => ({
      id: '', scorecard_id: '', hole_number: e.holeNumber, par: e.par, strokes: e.strokes, score_to_par: holeScoreToPar(e.strokes, e.par), created_at: '', updated_at: '',
    })));
  })();

  const holeCount = Object.keys(holePars).length || 18;

  const handleSave = async (submit: boolean) => {
    if (!scorecardId) return;
    setIsSaving(true);
    setError(null);
    setValidationErrors([]);
    setSuccess(null);

    const holesToSave: Array<{ scorecard_id: string; hole_number: number; par: number; strokes: number; score_to_par: number }> = [];
    for (const [num, strokes] of Object.entries(holeScores)) {
      const holeNum = Number(num);
      const par = holePars[holeNum] || 4;
      const s = parseInt(strokes, 10);
      if (!isNaN(s) && s > 0) {
        holesToSave.push({ scorecard_id: scorecardId, hole_number: holeNum, par, strokes: s, score_to_par: holeScoreToPar(s, par) });
      }
    }

    const validation = validateScorecardHoles(holesToSave.map((h) => ({ hole_number: h.hole_number, par: h.par, strokes: h.strokes })), holeCount);
    if (!validation.isValid) { setValidationErrors(validation.errors); setIsSaving(false); return; }

    const result = await upsertScorecardHoles(holesToSave);
    if (result.error) { setError(result.error); setIsSaving(false); return; }

    if (submit) {
      const scResult = await updateScorecard(scorecardId, {
        status: 'submitted',
        total_strokes: summary.totalStrokes,
        total_score_to_par: summary.totalToPar,
      });
      if (scResult.error) { setError(scResult.error); setIsSaving(false); return; }
      setSuccess('Scorecard submitted!');
    } else {
      const scResult = await updateScorecard(scorecardId, {
        status: 'in_progress',
        total_strokes: summary.totalStrokes,
        total_score_to_par: summary.totalToPar,
      });
      if (scResult.error) { setError(scResult.error); setIsSaving(false); return; }
      setSuccess('Scorecard saved!');
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
          <select value={selectedTournamentId} onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
            <option value="">Select tournament</option>
            {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Round</label>
          <select value={selectedRoundId} onChange={(e) => setSelectedRoundId(e.target.value)} disabled={!selectedTournamentId}
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
                <p className="text-2xl font-bold text-tmgl-charcoal-900">{summary.totalStrokes || '-'}</p>
                <p className="text-xs text-tmgl-charcoal-500">Total</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${summary.totalToPar <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {summary.totalStrokes > 0 ? formatToPar(summary.totalToPar) : '-'}
                </p>
                <p className="text-xs text-tmgl-charcoal-500">To Par</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-tmgl-charcoal-900">{summary.holesCompleted}/{holeCount}</p>
                <p className="text-xs text-tmgl-charcoal-500">Holes</p>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            {Array.from({ length: holeCount }, (_, i) => i + 1).map((holeNum) => {
              const par = holePars[holeNum] || 4;
              const strokes = parseInt(holeScores[holeNum] || '', 10);
              const toPar = !isNaN(strokes) ? holeScoreToPar(strokes, par) : null;

              return (
                <Card key={holeNum} className="flex items-center gap-3">
                  <div className="w-10 text-center">
                    <p className="text-sm font-bold text-tmgl-charcoal-900">{holeNum}</p>
                    <p className="text-[10px] text-tmgl-charcoal-500">Par {par}</p>
                  </div>
                  <div className="flex-1">
                    <input type="number" min={1} max={20} value={holeScores[holeNum] || ''}
                      onChange={(e) => handleScoreChange(holeNum, e.target.value)}
                      placeholder="Strokes"
                      className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
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
            })}
          </div>

          {summary.holesCompleted > 0 && (
            <Card>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-tmgl-charcoal-500">Front 9</p><p className="font-bold">{summary.front9Strokes || '-'} ({summary.front9Strokes > 0 ? formatToPar(summary.front9ToPar) : '-'})</p></div>
                <div><p className="text-tmgl-charcoal-500">Back 9</p><p className="font-bold">{summary.back9Strokes || '-'} ({summary.back9Strokes > 0 ? formatToPar(summary.back9ToPar) : '-'})</p></div>
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => handleSave(false)} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
            </Button>
            <Button variant="primary" fullWidth onClick={() => handleSave(true)} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />} Submit
            </Button>
          </div>
        </>
      )}
    </Container>
  );
}
