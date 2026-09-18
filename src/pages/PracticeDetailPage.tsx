import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Target } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { StatsCard } from '@/components/common/StatsCard';
import { getPracticeRound, getPracticeScores } from '@/lib/practice';
import { calculatePracticeScoreSummary, formatToPar } from '@/utils/practiceCalculations';
import type { PracticeRound, PracticeScore } from '@/types/database';

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  draft: 'default',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

export default function PracticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState<PracticeRound | null>(null);
  const [scores, setScores] = useState<PracticeScore[]>([]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const roundResult = await getPracticeRound(id);
      if (roundResult.error || !roundResult.data) {
        setError('Practice round not found.');
        return;
      }
      setRound(roundResult.data);

      const scoresResult = await getPracticeScores(id);
      setScores(scoresResult.data ?? []);
    } catch {
      setError('Failed to load practice round.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState message="Loading practice round..." />;

  if (!round) {
    return (
      <Container className="py-8">
        <div className="text-center text-gray-500">Practice round not found.</div>
      </Container>
    );
  }

  const summary = calculatePracticeScoreSummary(scores.map(s => ({
    hole_number: s.hole_number,
    par: s.par,
    score: s.score,
    putts: s.putts,
    fairway_hit: s.fairway_hit,
    green_in_regulation: s.green_in_regulation,
    penalty_strokes: s.penalty_strokes,
  })));

  const isEditable = round.status === 'draft' || round.status === 'in_progress';

  return (
    <Container className="py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Practice Round — {round.round_type} Holes
          </h1>
          <p className="text-gray-500 text-sm">
            {new Date(round.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
            {round.tee_box ? ` · ${round.tee_box} tees` : ''}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[round.status] ?? 'default'}>
          {round.status.replace('_', ' ')}
        </Badge>
        {isEditable && (
          <Link to={`/practice/${round.id}/score`}>
            <Button variant="primary" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Gross Score"
          value={round.gross_score ?? '—'}
          icon={<Target className="h-5 w-5" />}
        />
        <StatsCard
          label="To Par"
          value={round.total_to_par !== null ? formatToPar(round.total_to_par) : '—'}
          icon={<Target className="h-5 w-5" />}
          variant={round.total_to_par !== null && round.total_to_par < 0 ? 'success' : 'warning'}
        />
        <StatsCard
          label="Holes Played"
          value={`${summary.holesCompleted} / ${round.round_type}`}
        />
        <StatsCard
          label="Avg Putts"
          value={summary.averagePutts !== null ? summary.averagePutts.toFixed(1) : '—'}
        />
      </div>

      {scores.length > 0 ? (
        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Scorecard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Hole</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Par</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Score</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">To Par</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">Putts</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">FW</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-500">GIR</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map(s => {
                    const toPar = s.score - s.par;
                    return (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 px-3 font-medium">{s.hole_number}</td>
                        <td className="py-2 px-3 text-center text-gray-500">{s.par}</td>
                        <td className="py-2 px-3 text-center font-medium">{s.score}</td>
                        <td className={`py-2 px-3 text-center font-medium ${
                          toPar < 0 ? 'text-green-600' : toPar > 0 ? 'text-red-600' : ''
                        }`}>
                          {formatToPar(toPar)}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-500">{s.putts ?? '—'}</td>
                        <td className="py-2 px-3 text-center">
                          {s.fairway_hit === true ? '✓' : s.fairway_hit === false ? '✗' : '—'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {s.green_in_regulation === true ? '✓' : s.green_in_regulation === false ? '✗' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-center">{summary.totalPar}</td>
                    <td className="py-2 px-3 text-center">{summary.grossScore}</td>
                    <td className={`py-2 px-3 text-center ${
                      summary.toPar < 0 ? 'text-green-600' : summary.toPar > 0 ? 'text-red-600' : ''
                    }`}>
                      {formatToPar(summary.toPar)}
                    </td>
                    <td className="py-2 px-3 text-center">{summary.totalPutts ?? '—'}</td>
                    <td className="py-2 px-3 text-center">
                      {summary.fairwayPercentage !== null ? `${summary.fairwayPercentage}%` : '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {summary.girPercentage !== null ? `${summary.girPercentage}%` : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card variant="bordered">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No scores recorded yet.</p>
            {isEditable && (
              <Link to={`/practice/${round.id}/score`} className="mt-4 inline-block">
                <Button variant="primary" size="sm">Enter Scores</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {round.notes && (
        <Card variant="bordered" className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{round.notes}</p>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
