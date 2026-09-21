import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, BarChart3, History, Target, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatsCard } from '@/components/common/StatsCard';
import { Badge } from '@/components/common/Badge';
import { getPlayerByProfileId } from '@/lib/league';
import { getPracticeRoundsByPlayer } from '@/lib/practice';
import { getPlayerStatistics } from '@/lib/statistics';
import { formatToPar } from '@/utils/golf';
import { VirtualCaddie } from '@/components/caddie/VirtualCaddie';
import type { PracticeRound, PlayerStatistics } from '@/types/database';

export default function PracticeHubPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<PracticeRound[]>([]);
  const [stats, setStats] = useState<PlayerStatistics | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const playerResult = await getPlayerByProfileId(user.id);
      if (playerResult.error || !playerResult.data) {
        setError('Player profile not found.');
        return;
      }

      setPlayerId(playerResult.data.id);

      const [roundsResult, statsResult] = await Promise.all([
        getPracticeRoundsByPlayer(playerResult.data.id),
        getPlayerStatistics(playerResult.data.id),
      ]);

      if (roundsResult.error) setError(roundsResult.error);
      else setRounds(roundsResult.data ?? []);

      if (statsResult.error) setError(statsResult.error);
      else if (statsResult.data) setStats(statsResult.data);
    } catch {
      setError('Failed to load practice data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState message="Loading practice hub..." />;

  const completedRounds = rounds.filter(r => r.status === 'completed');
  const inProgressRounds = rounds.filter(r => r.status === 'in_progress' || r.status === 'draft');
  const recentRounds = completedRounds.slice(0, 5);

  return (
    <Container className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Practice Hub</h1>
        <p className="text-gray-600 mt-2">Track your practice rounds and improve your game</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Rounds Played"
          value={stats?.rounds_played ?? completedRounds.length}
          icon={<Target className="h-5 w-5" />}
        />
        <StatsCard
          label="Average Score"
          value={stats?.average_score !== null && stats?.average_score !== undefined ? Number(stats.average_score).toFixed(1) : '—'}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatsCard
          label="Best Score"
          value={stats?.best_score ?? '—'}
          icon={<Target className="h-5 w-5" />}
          variant="gold"
        />
        <StatsCard
          label="Avg To Par"
          value={stats?.average_to_par !== null && stats?.average_to_par !== undefined ? formatToPar(Number(stats.average_to_par)) : '—'}
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card variant="bordered">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/practice/new?holes=9">
                <Button variant="primary" fullWidth className="h-16 flex-col gap-1">
                  <Play className="h-5 w-5" />
                  <span className="text-xs">Start 9-Hole</span>
                </Button>
              </Link>
              <Link to="/practice/new?holes=18">
                <Button variant="primary" fullWidth className="h-16 flex-col gap-1">
                  <Play className="h-5 w-5" />
                  <span className="text-xs">Start 18-Hole</span>
                </Button>
              </Link>
              <Link to="/practice/history">
                <Button variant="outline" fullWidth className="h-16 flex-col gap-1">
                  <History className="h-5 w-5" />
                  <span className="text-xs">History</span>
                </Button>
              </Link>
              <Link to="/my-statistics">
                <Button variant="outline" fullWidth className="h-16 flex-col gap-1">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-xs">Statistics</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {inProgressRounds.length > 0 && (
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inProgressRounds.map(round => (
                  <Link
                    key={round.id}
                    to={`/practice/${round.id}/score`}
                    className="block p-3 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{round.round_type}-hole round</p>
                        <p className="text-sm text-gray-500">
                          Started {new Date(round.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="warning">In Progress</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {recentRounds.length > 0 ? (
        <Card variant="bordered">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Rounds</CardTitle>
              <Link to="/practice/history" className="text-sm text-green-700 hover:text-green-800">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRounds.map(round => (
                <Link
                  key={round.id}
                  to={`/practice/${round.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{round.round_type}-hole round</p>
                      <p className="text-sm text-gray-500">
                        {new Date(round.completed_at ?? round.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{round.gross_score ?? '—'}</p>
                      <p className="text-sm text-gray-500">
                        {round.total_to_par !== null ? formatToPar(round.total_to_par) : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Target}
          title="No practice rounds yet"
          description="Complete your first practice round to see your statistics."
          action={
            <Link to="/practice/new">
              <Button variant="primary">
                <Plus className="h-4 w-4 mr-2" />
                Start Practice Round
              </Button>
            </Link>
          }
        />
      )}

      {playerId && (
        <div className="mt-8">
          <VirtualCaddie playerId={playerId} />
        </div>
      )}
    </Container>
  );
}
