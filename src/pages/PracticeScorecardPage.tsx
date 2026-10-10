import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, CheckCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getPracticeRound, getPracticeScores, upsertPracticeScores, updatePracticeRound, deletePracticeRound, getCourseHolesForPractice } from '@/lib/practice';
import { calculatePracticeScoreSummary, formatToPar, getScoreTerminology } from '@/utils/practiceCalculations';
import { validatePracticeScores } from '@/lib/validation';
import type { PracticeRound } from '@/types/database';

interface HoleEntry {
  hole_number: number;
  par: number;
  stroke_index: number | null;
  score: string;
  putts: string;
  fairway_hit: boolean | null;
  green_in_regulation: boolean | null;
  penalty_strokes: string;
}

const INPUT_CLASS = 'min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 bg-white px-3 py-2 text-sm text-tmgl-charcoal-800 placeholder-tmgl-charcoal-400 focus:border-tmgl-green-500 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700/25 disabled:bg-tmgl-charcoal-50';

const LABEL_CLASS = 'mb-1 block text-sm font-medium text-tmgl-charcoal-700';

function toParClassName(toPar: number): string {
  if (toPar < 0) return 'text-tmgl-green-700';
  if (toPar > 0) return 'text-red-600';
  return 'text-tmgl-charcoal-600';
}

export default function PracticeScorecardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [round, setRound] = useState<PracticeRound | null>(null);
  const [entries, setEntries] = useState<HoleEntry[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeHole, setActiveHole] = useState(1);

  const isEditable = round?.status === 'draft' || round?.status === 'in_progress';

  const loadRound = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const roundResult = await getPracticeRound(id);
      if (roundResult.error || !roundResult.data) {
        setError('Practice round not found.');
        return;
      }
      setRound(roundResult.data);

      const holesResult = await getCourseHolesForPractice(roundResult.data.course_id);
      const scoresResult = await getPracticeScores(id);
      const existingScores = scoresResult.data ?? [];

      const totalHoles = roundResult.data.round_type;
      const holesData = holesResult.data ?? [];

      const initialEntries: HoleEntry[] = [];
      for (let h = 1; h <= totalHoles; h++) {
        const existing = existingScores.find(s => s.hole_number === h);
        const holeData = holesData.find((ch: { hole_number: number }) => ch.hole_number === h);
        initialEntries.push({
          hole_number: h,
          par: existing?.par ?? holeData?.par ?? 4,
          stroke_index: existing?.stroke_index ?? holeData?.handicap_index ?? null,
          score: existing?.score?.toString() ?? '',
          putts: existing?.putts?.toString() ?? '',
          fairway_hit: existing?.fairway_hit ?? null,
          green_in_regulation: existing?.green_in_regulation ?? null,
          penalty_strokes: existing?.penalty_strokes?.toString() ?? '0',
        });
      }
      setEntries(initialEntries);
    } catch {
      setError('Failed to load practice round.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadRound(); }, [loadRound]);

  function updateEntry(holeNumber: number, field: keyof HoleEntry, value: string | boolean | null) {
    setEntries(prev => prev.map(e =>
      e.hole_number === holeNumber ? { ...e, [field]: value } : e
    ));
  }

  const scoredEntries = entries.filter(e => e.score !== '');
  const summary = calculatePracticeScoreSummary(scoredEntries.map(e => ({
    hole_number: e.hole_number,
    par: e.par,
    score: parseInt(e.score, 10),
    putts: e.putts ? parseInt(e.putts, 10) : null,
    fairway_hit: e.fairway_hit,
    green_in_regulation: e.green_in_regulation,
    penalty_strokes: e.penalty_strokes ? parseInt(e.penalty_strokes, 10) : null,
  })));

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    setError(null);

    try {
      const scoresToSave = scoredEntries.map(e => ({
        practice_round_id: id,
        hole_number: e.hole_number,
        par: e.par,
        stroke_index: e.stroke_index,
        score: parseInt(e.score, 10),
        putts: e.putts ? parseInt(e.putts, 10) : null,
        fairway_hit: e.fairway_hit,
        green_in_regulation: e.green_in_regulation,
        penalty_strokes: e.penalty_strokes ? parseInt(e.penalty_strokes, 10) : 0,
        notes: null,
      }));

      const result = await upsertPracticeScores(scoresToSave);
      if (result.error) {
        setError(result.error);
        return;
      }

      await updatePracticeRound(id, {
        status: 'in_progress',
        gross_score: summary.grossScore,
        total_to_par: summary.toPar,
      });

      setSuccess('Draft saved successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save scores.');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!id || !round) return;

    const validation = validatePracticeScores(
      scoredEntries.map(e => ({
        hole_number: e.hole_number,
        par: e.par,
        score: parseInt(e.score, 10),
        putts: e.putts ? parseInt(e.putts, 10) : null,
        penalty_strokes: e.penalty_strokes ? parseInt(e.penalty_strokes, 10) : null,
      })),
      round.round_type
    );

    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    if (scoredEntries.length < round.round_type) {
      setError(`Please enter scores for all ${round.round_type} holes.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const scoresToSave = scoredEntries.map(e => ({
        practice_round_id: id,
        hole_number: e.hole_number,
        par: e.par,
        stroke_index: e.stroke_index,
        score: parseInt(e.score, 10),
        putts: e.putts ? parseInt(e.putts, 10) : null,
        fairway_hit: e.fairway_hit,
        green_in_regulation: e.green_in_regulation,
        penalty_strokes: e.penalty_strokes ? parseInt(e.penalty_strokes, 10) : 0,
        notes: null,
      }));

      const upsertResult = await upsertPracticeScores(scoresToSave);
      if (upsertResult.error) {
        setError(upsertResult.error);
        return;
      }

      const result = await updatePracticeRound(id, {
        status: 'completed',
        gross_score: summary.grossScore,
        total_to_par: summary.toPar,
        completed_at: new Date().toISOString(),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      navigate(`/practice/${id}`);
    } catch {
      setError('Failed to complete round.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    const result = await deletePracticeRound(id);
    if (result.error) {
      setError(result.error);
    } else {
      navigate('/practice');
    }
  }

  if (loading) return <Container size="lg" className="py-6"><LoadingState message="Loading scorecard..." /></Container>;

  if (!round) {
    return (
      <Container className="py-8">
        <div className="rounded-card border border-tmgl-charcoal-200 bg-white p-6 text-center text-sm text-tmgl-charcoal-500 shadow-card">Practice round not found.</div>
      </Container>
    );
  }

  return (
    <Container className="space-y-6 py-6 sm:py-8">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="mt-1 text-tmgl-charcoal-500 transition-colors hover:text-tmgl-green-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-green-700">Practice round</p>
          <h1 className="mt-1 font-display text-display-md text-tmgl-green-950">
            Practice Scorecard — {round.round_type} Holes
          </h1>
          <p className="mt-1 text-sm text-tmgl-charcoal-500">
            {round.tee_box ? `${round.tee_box} tees` : ''}
          </p>
        </div>
        <Badge variant={round.status === 'completed' ? 'success' : round.status === 'in_progress' ? 'warning' : 'default'}>
          {round.status.replace('_', ' ')}
        </Badge>
      </div>

      {error && (
        <div role="alert" className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div role="status" className="rounded-card border border-tmgl-green-200 bg-tmgl-green-50 p-4 text-sm text-tmgl-green-800">{success}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-tmgl-charcoal-200">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="font-display text-tmgl-green-950">Scorecard</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: round.round_type }, (_, i) => i + 1)
                    .filter(h => round.round_type === 18 ? true : h <= 9)
                    .map(h => (
                      <button
                        key={h}
                        type="button"
                        aria-label={`Hole ${h}`}
                        aria-pressed={activeHole === h}
                        onClick={() => setActiveHole(h)}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold tabular transition-colors ${
                          activeHole === h
                            ? 'bg-tmgl-green-800 text-white'
                            : entries.find(e => e.hole_number === h)?.score
                              ? 'bg-tmgl-green-100 text-tmgl-green-700 hover:bg-tmgl-green-200'
                              : 'bg-tmgl-charcoal-100 text-tmgl-charcoal-500 hover:bg-tmgl-charcoal-200'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {entries.filter(e => e.hole_number === activeHole).map(entry => (
                <div key={entry.hole_number} className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-display-md text-tmgl-green-950">Hole {entry.hole_number}</span>
                    <span className="text-sm text-tmgl-charcoal-500">Par {entry.par}</span>
                    {entry.stroke_index && (
                      <span className="text-sm text-tmgl-charcoal-400">SI {entry.stroke_index}</span>
                    )}
                    {entry.score && (
                      <Badge variant={
                        parseInt(entry.score) < entry.par ? 'success' :
                        parseInt(entry.score) === entry.par ? 'default' : 'warning'
                      }>
                        {getScoreTerminology(parseInt(entry.score), entry.par)}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <label className={LABEL_CLASS}>Score *</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={entry.score}
                        onChange={e => updateEntry(entry.hole_number, 'score', e.target.value)}
                        disabled={!isEditable}
                        className={INPUT_CLASS}
                        placeholder="Strokes"
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Putts</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={entry.putts}
                        onChange={e => updateEntry(entry.hole_number, 'putts', e.target.value)}
                        disabled={!isEditable}
                        className={INPUT_CLASS}
                        placeholder="Putts"
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Penalties</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={entry.penalty_strokes}
                        onChange={e => updateEntry(entry.hole_number, 'penalty_strokes', e.target.value)}
                        disabled={!isEditable}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-tmgl-charcoal-700">Fairway</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateEntry(entry.hole_number, 'fairway_hit', entry.fairway_hit === true ? null : true)}
                          disabled={!isEditable}
                          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                            entry.fairway_hit === true ? 'border border-tmgl-green-300 bg-tmgl-green-100 text-tmgl-green-800' : 'border border-tmgl-charcoal-200 bg-tmgl-charcoal-100 text-tmgl-charcoal-600 hover:bg-tmgl-charcoal-200'
                          }`}
                        >
                          Hit
                        </button>
                        <button
                          type="button"
                          onClick={() => updateEntry(entry.hole_number, 'fairway_hit', entry.fairway_hit === false ? null : false)}
                          disabled={!isEditable}
                          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                            entry.fairway_hit === false ? 'border border-red-300 bg-red-100 text-red-800' : 'border border-tmgl-charcoal-200 bg-tmgl-charcoal-100 text-tmgl-charcoal-600 hover:bg-tmgl-charcoal-200'
                          }`}
                        >
                          Miss
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-tmgl-charcoal-700">GIR:</span>
                    <button
                      type="button"
                      onClick={() => updateEntry(entry.hole_number, 'green_in_regulation', entry.green_in_regulation === true ? null : true)}
                      disabled={!isEditable}
                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                        entry.green_in_regulation === true ? 'border border-tmgl-green-300 bg-tmgl-green-100 text-tmgl-green-800' : 'border border-tmgl-charcoal-200 bg-tmgl-charcoal-100 text-tmgl-charcoal-600 hover:bg-tmgl-charcoal-200'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEntry(entry.hole_number, 'green_in_regulation', entry.green_in_regulation === false ? null : false)}
                      disabled={!isEditable}
                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                        entry.green_in_regulation === false ? 'border border-red-300 bg-red-100 text-red-800' : 'border border-tmgl-charcoal-200 bg-tmgl-charcoal-100 text-tmgl-charcoal-600 hover:bg-tmgl-charcoal-200'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-tmgl-charcoal-200">
            <CardHeader>
              <CardTitle className="font-display text-tmgl-green-950">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-tmgl-charcoal-600">Holes Played</span>
                <span className="font-semibold tabular text-tmgl-charcoal-900">{summary.holesCompleted} / {round.round_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-tmgl-charcoal-600">Gross Score</span>
                <span className="font-display text-display-md tabular text-tmgl-green-950">{summary.grossScore ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-tmgl-charcoal-600">To Par</span>
                <span className={`font-display text-display-md tabular ${toParClassName(summary.toPar)}`}>
                  {summary.holesCompleted > 0 ? formatToPar(summary.toPar) : '—'}
                </span>
              </div>
              <div className="hairline border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-tmgl-charcoal-600">Front 9</span>
                  <span className="tabular text-tmgl-charcoal-800">{summary.front9Gross || '—'} ({summary.front9Par} par)</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-tmgl-charcoal-600">Back 9</span>
                  <span className="tabular text-tmgl-charcoal-800">{summary.back9Gross || '—'} ({summary.back9Par} par)</span>
                </div>
              </div>
              <div className="hairline border-t pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-tmgl-charcoal-600">Birdies</span>
                  <span className="font-semibold tabular text-tmgl-green-700">{summary.birdies}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-tmgl-charcoal-600">Pars</span>
                  <span className="tabular text-tmgl-charcoal-800">{summary.pars}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-tmgl-charcoal-600">Bogeys</span>
                  <span className="font-semibold tabular text-tmgl-gold-600">{summary.bogeys}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-tmgl-charcoal-600">Double+ Bogeys</span>
                  <span className="font-semibold tabular text-red-600">{summary.doubleBogeys}</span>
                </div>
                {summary.averagePutts !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-tmgl-charcoal-600">Avg Putts</span>
                    <span className="tabular text-tmgl-charcoal-800">{summary.averagePutts}</span>
                  </div>
                )}
                {summary.fairwayPercentage !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-tmgl-charcoal-600">Fairways</span>
                    <span className="tabular text-tmgl-charcoal-800">{summary.fairwayPercentage}%</span>
                  </div>
                )}
                {summary.girPercentage !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-tmgl-charcoal-600">GIR</span>
                    <span className="tabular text-tmgl-charcoal-800">{summary.girPercentage}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isEditable && (
            <div className="space-y-2">
              <Button variant="primary" fullWidth onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button variant="gold" fullWidth onClick={handleComplete} disabled={submitting}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {submitting ? 'Completing...' : 'Complete Round'}
              </Button>
              {round.status === 'draft' && (
                <Button variant="danger" fullWidth onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Round
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Practice Round?"
        message="This will permanently delete this practice round and all its scores."
      />
    </Container>
  );
}
