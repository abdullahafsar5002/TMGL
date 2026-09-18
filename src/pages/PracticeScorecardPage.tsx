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

  if (loading) return <LoadingState message="Loading scorecard..." />;

  if (!round) {
    return (
      <Container className="py-8">
        <div className="text-center text-gray-500">Practice round not found.</div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Practice Scorecard — {round.round_type} Holes
          </h1>
          <p className="text-gray-500 text-sm">
            {round.tee_box ? `${round.tee_box} tees` : ''}
          </p>
        </div>
        <Badge variant={round.status === 'completed' ? 'success' : round.status === 'in_progress' ? 'warning' : 'default'}>
          {round.status.replace('_', ' ')}
        </Badge>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card variant="bordered">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scorecard</CardTitle>
                <div className="flex gap-2">
                  {Array.from({ length: round.round_type }, (_, i) => i + 1)
                    .filter(h => round.round_type === 18 ? true : h <= 9)
                    .map(h => (
                      <button
                        key={h}
                        onClick={() => setActiveHole(h)}
                        className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                          activeHole === h
                            ? 'bg-green-600 text-white'
                            : entries.find(e => e.hole_number === h)?.score
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-2xl font-bold text-gray-900">Hole {entry.hole_number}</span>
                    <span className="text-gray-500">Par {entry.par}</span>
                    {entry.stroke_index && (
                      <span className="text-gray-400 text-sm">SI {entry.stroke_index}</span>
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Score *</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={entry.score}
                        onChange={e => updateEntry(entry.hole_number, 'score', e.target.value)}
                        disabled={!isEditable}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                        placeholder="Strokes"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Putts</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={entry.putts}
                        onChange={e => updateEntry(entry.hole_number, 'putts', e.target.value)}
                        disabled={!isEditable}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                        placeholder="Putts"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Penalties</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={entry.penalty_strokes}
                        onChange={e => updateEntry(entry.hole_number, 'penalty_strokes', e.target.value)}
                        disabled={!isEditable}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700">Fairway</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateEntry(entry.hole_number, 'fairway_hit', entry.fairway_hit === true ? null : true)}
                          disabled={!isEditable}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            entry.fairway_hit === true ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          Hit
                        </button>
                        <button
                          type="button"
                          onClick={() => updateEntry(entry.hole_number, 'fairway_hit', entry.fairway_hit === false ? null : false)}
                          disabled={!isEditable}
                          className={`flex-1 py-2 rounded text-sm font-medium ${
                            entry.fairway_hit === false ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          Miss
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">GIR:</label>
                    <button
                      type="button"
                      onClick={() => updateEntry(entry.hole_number, 'green_in_regulation', entry.green_in_regulation === true ? null : true)}
                      disabled={!isEditable}
                      className={`px-3 py-1 rounded text-sm ${
                        entry.green_in_regulation === true ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEntry(entry.hole_number, 'green_in_regulation', entry.green_in_regulation === false ? null : false)}
                      disabled={!isEditable}
                      className={`px-3 py-1 rounded text-sm ${
                        entry.green_in_regulation === false ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-500'
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
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Holes Played</span>
                <span className="font-medium">{summary.holesCompleted} / {round.round_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gross Score</span>
                <span className="font-bold text-xl">{summary.grossScore ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">To Par</span>
                <span className={`font-bold text-xl ${
                  summary.toPar < 0 ? 'text-green-600' : summary.toPar > 0 ? 'text-red-600' : ''
                }`}>
                  {summary.holesCompleted > 0 ? formatToPar(summary.toPar) : '—'}
                </span>
              </div>
              <hr />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Front 9</span>
                <span>{summary.front9Gross || '—'} ({summary.front9Par} par)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Back 9</span>
                <span>{summary.back9Gross || '—'} ({summary.back9Par} par)</span>
              </div>
              <hr />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Birdies</span>
                <span className="text-green-600">{summary.birdies}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pars</span>
                <span>{summary.pars}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bogeys</span>
                <span className="text-amber-600">{summary.bogeys}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Double+ Bogeys</span>
                <span className="text-red-600">{summary.doubleBogeys}</span>
              </div>
              {summary.averagePutts !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg Putts</span>
                  <span>{summary.averagePutts}</span>
                </div>
              )}
              {summary.fairwayPercentage !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Fairways</span>
                  <span>{summary.fairwayPercentage}%</span>
                </div>
              )}
              {summary.girPercentage !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GIR</span>
                  <span>{summary.girPercentage}%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {isEditable && (
            <div className="space-y-2">
              <Button variant="primary" fullWidth onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button variant="gold" fullWidth onClick={handleComplete} disabled={submitting}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {submitting ? 'Completing...' : 'Complete Round'}
              </Button>
              {round.status === 'draft' && (
                <Button variant="danger" fullWidth onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
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
