import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { useToast } from '@/context/ToastContext';
import { getPlayerByAuthUserId } from '@/lib/league';
import {
  getFriendlyMatch,
  getFriendlyMatchPlayers,
  getFriendlyMatchScores,
  upsertFriendlyMatchScores,
  updateFriendlyMatchPlayerResult,
  getMatchFormatLabel,
  calculateStablefordPoints,
  calculateFriendlyScore,
} from '@/lib/friendly';
import { formatToPar } from '@/utils/golf';
import type { FriendlyMatch, FriendlyMatchPlayer, CourseHole } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { ROUTES } from '@/router/routes';

interface HoleEntry {
  hole_number: number;
  par: number;
  score: string;
}

export default function FriendlyMatchScorePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [match, setMatch] = useState<FriendlyMatch | null>(null);
  const [matchPlayer, setMatchPlayer] = useState<FriendlyMatchPlayer | null>(null);
  const [entries, setEntries] = useState<HoleEntry[]>([]);
  const [activeHole, setActiveHole] = useState(1);
  const handicapIndex = matchPlayer?.handicap_index ?? null;

  const isEditable = match?.status === 'active';

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);

    try {
      const playerResult = await getPlayerByAuthUserId(user.id);
      if (playerResult.error || !playerResult.data) {
        setError('Player profile not found.');
        return;
      }

      const matchResult = await getFriendlyMatch(id);
      if (matchResult.error || !matchResult.data) {
        setError('Match not found.');
        return;
      }
      setMatch(matchResult.data);

      const playersResult = await getFriendlyMatchPlayers(id);
      if (playersResult.error) {
        setError(playersResult.error);
        return;
      }

      const myPlayer = (playersResult.data ?? []).find(
        (p: FriendlyMatchPlayer) => p.player_id === playerResult.data!.id
      );
      if (!myPlayer) {
        setError('You are not a participant in this match.');
        return;
      }
      setMatchPlayer(myPlayer);

      const courseHolesResult = await supabase
        .from('course_holes')
        .select('*')
        .eq('course_id', matchResult.data.course_id)
        .order('hole_number');
       if (courseHolesResult.error) {
         setError(courseHolesResult.error.message);
         return;
       }
       const holesData = (courseHolesResult.data ?? []) as CourseHole[];

      const scoresResult = await getFriendlyMatchScores(myPlayer.id);
      if (scoresResult.error) {
        setError(scoresResult.error);
        return;
      }
      const existingScores = scoresResult.data ?? [];

      const totalHoles = matchResult.data.round_type;
      const initialEntries: HoleEntry[] = [];
      for (let h = 1; h <= totalHoles; h++) {
        const existing = existingScores.find(s => s.hole_number === h);
        const holeData = holesData.find(ch => ch.hole_number === h);
        initialEntries.push({
          hole_number: h,
          par: existing?.par ?? holeData?.par ?? 4,
          score: existing?.score?.toString() ?? '',
        });
      }
      setEntries(initialEntries);
    } catch {
      setError('Failed to load scorecard.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { loadData(); }, [loadData]);

  function updateEntry(holeNumber: number, value: string) {
    setEntries(prev => prev.map(e =>
      e.hole_number === holeNumber ? { ...e, score: value } : e
    ));
  }

  const scoredEntries = entries.filter(e => e.score !== '');
  const totalScore = scoredEntries.reduce((sum, e) => sum + parseInt(e.score, 10), 0);
  const totalPar = scoredEntries.reduce((sum, e) => sum + e.par, 0);
  const toPar = scoredEntries.length > 0 ? totalScore - totalPar : 0;
  const matchFormat = match?.match_format ?? 'stroke_play';
  const resultScore = matchFormat === 'stableford'
    ? scoredEntries.reduce(
      (sum, entry) => sum + calculateFriendlyScore(
        parseInt(entry.score, 10),
        entry.par,
        handicapIndex,
        matchFormat
      ),
      0
    )
    : scoredEntries.length > 0
      ? calculateFriendlyScore(totalScore, totalPar, handicapIndex, matchFormat)
      : 0;
  const totalStableford = match?.match_format === 'stableford'
    ? scoredEntries.reduce((sum, e) => sum + calculateStablefordPoints(parseInt(e.score, 10), e.par), 0)
    : null;

  async function handleSave() {
    if (!matchPlayer) return;
    setSaving(true);
    setError(null);

    try {
      const scoresToSave = scoredEntries.map(e => ({
        match_player_id: matchPlayer.id,
        hole_number: e.hole_number,
        par: e.par,
        score: parseInt(e.score, 10),
        stableford_points: match?.match_format === 'stableford' ? calculateStablefordPoints(parseInt(e.score, 10), e.par) : null,
      }));

      const result = await upsertFriendlyMatchScores(scoresToSave);
      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess('Draft saved successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Failed to save scores.');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    if (!matchPlayer || !match) return;

    if (scoredEntries.length < match.round_type) {
      setError(`Please enter scores for all ${match.round_type} holes.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const scoresToSave = scoredEntries.map(e => ({
        match_player_id: matchPlayer.id,
        hole_number: e.hole_number,
        par: e.par,
        score: parseInt(e.score, 10),
        stableford_points: match.match_format === 'stableford' ? calculateStablefordPoints(parseInt(e.score, 10), e.par) : null,
      }));

      const upsertResult = await upsertFriendlyMatchScores(scoresToSave);
      if (upsertResult.error) {
        setError(upsertResult.error);
        return;
      }

      const result = await updateFriendlyMatchPlayerResult(matchPlayer.id, {
        score: resultScore,
        to_par: toPar,
      });
      if (result.error) {
        setError(result.error);
        return;
      }

      toast.success('Scorecard submitted!');
      navigate(ROUTES.friendlyMatch(match.id));
    } catch {
      setError('Failed to complete scorecard.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState message="Loading scorecard..." />;

  if (!match || !matchPlayer) {
    return (
      <Container className="py-8">
        <div className="text-center text-tmgl-charcoal-500">Match not found.</div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-tmgl-charcoal-500 hover:text-tmgl-charcoal-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
<div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-green-700">Scorecard</p>
          <h1 className="mt-1 font-display text-display-lg text-tmgl-charcoal-950">{match.title}</h1>
          <p className="text-tmgl-charcoal-500 text-sm">
            {getMatchFormatLabel(match.match_format)} · {match.round_type}-hole
          </p>
        </div>
        <Badge variant={match.status === 'completed' ? 'success' : match.status === 'active' ? 'warning' : 'default'}>
          {match.status}
        </Badge>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-tmgl-green-50 border border-tmgl-green-200 rounded-lg text-tmgl-green-700">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card variant="bordered">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Scorecard</CardTitle>
                <div className="flex gap-2">
                  {Array.from({ length: match.round_type }, (_, i) => i + 1).map(h => (
                    <button
                      key={h}
                      onClick={() => setActiveHole(h)}
                      className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                        activeHole === h
                          ? 'bg-tmgl-green-700 text-white'
                          : entries.find(e => e.hole_number === h)?.score
                            ? 'bg-tmgl-green-100 text-tmgl-green-700'
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
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-2xl font-bold text-tmgl-charcoal-950">Hole {entry.hole_number}</span>
                    <span className="text-tmgl-charcoal-500">Par {entry.par}</span>
                    {entry.score && (
                      <Badge variant={
                        parseInt(entry.score) < entry.par ? 'success' :
                        parseInt(entry.score) === entry.par ? 'default' : 'warning'
                      }>
                        {formatToPar(parseInt(entry.score) - entry.par)}
                      </Badge>
                    )}
                    {match.match_format === 'stableford' && entry.score && (
                      <Badge variant="info">
                        {calculateStablefordPoints(parseInt(entry.score), entry.par)} pts
                      </Badge>
                    )}
                  </div>

                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Score *</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={entry.score}
                      onChange={e => updateEntry(entry.hole_number, e.target.value)}
                      disabled={!isEditable}
                      className="w-full border border-tmgl-charcoal-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-tmgl-green-700 disabled:bg-tmgl-charcoal-50"
                      placeholder="Strokes"
                    />
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
                <span className="text-tmgl-charcoal-600">Holes Played</span>
                <span className="font-medium">{scoredEntries.length} / {match.round_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tmgl-charcoal-600">Total Score</span>
                <span className="font-bold text-xl">{scoredEntries.length > 0 ? totalScore : '—”'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tmgl-charcoal-600">To Par</span>
                <span className={`font-bold text-xl ${
                  toPar < 0 ? 'text-tmgl-green-700' : toPar > 0 ? 'text-red-600' : ''
                }`}>
                  {scoredEntries.length > 0 ? formatToPar(toPar) : '—”'}
                </span>
              </div>
              {totalStableford !== null && (
                <div className="flex justify-between">
                  <span className="text-tmgl-charcoal-600">Stableford Points</span>
                  <span className="font-bold text-xl text-blue-600">{totalStableford}</span>
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
                {submitting ? 'Submitting...' : 'Complete Scorecard'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
