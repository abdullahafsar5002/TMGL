import { useState, useEffect, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatsCard } from '@/components/common/StatsCard';
import { StatPieChart } from '@/components/common/StatPieChart';
import { PerformanceChart } from '@/components/common/PerformanceChart';
import { StatsChart } from '@/components/common/StatsChart';
import { getPlayerByProfileId } from '@/lib/league';
import { getPlayerStatistics } from '@/lib/statistics';
import { supabase } from '@/lib/supabase';
import { formatToPar } from '@/utils/golf';
import type { PlayerStatistics, PracticeRound } from '@/types/database';

export default function MyStatisticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PlayerStatistics | null>(null);
  const [recentRounds, setRecentRounds] = useState<PracticeRound[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const playerResult = await getPlayerByProfileId(user.id);
      if (playerResult.error || !playerResult.data) {
        setError('Player profile not found.');
        return;
      }
      const playerId = playerResult.data.id;

      const [statsResult, roundsResult] = await Promise.all([
        getPlayerStatistics(playerId),
        supabase.from('practice_rounds')
          .select('*')
          .eq('player_id', playerId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(10),
      ]);

      if (statsResult.error) {
        setError(statsResult.error);
        return;
      }
      if (statsResult.data) setStats(statsResult.data);
      setRecentRounds((roundsResult.data ?? []) as PracticeRound[]);
    } catch {
      setError('Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState message="Loading statistics..." />;

  if (!stats || stats.rounds_played === 0) {
    return (
      <Container className="py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Statistics</h1>
        <EmptyState
          icon={BarChart3}
          title="No statistics yet"
          description="Complete your first practice round to see your statistics."
        />
      </Container>
    );
  }

  const scoreTrend = recentRounds
    .filter(r => r.gross_score !== null)
    .reverse()
    .map((r, i) => ({
      label: `R${i + 1}`,
      value: r.gross_score!,
    }));

  const scoringDistribution = [
    { label: 'Eagles', value: stats.eagles, color: '#6366f1' },
    { label: 'Birdies', value: stats.birdies, color: '#10b981' },
    { label: 'Pars', value: stats.pars, color: '#3b82f6' },
    { label: 'Bogeys', value: stats.bogeys, color: '#f59e0b' },
    { label: 'Double+', value: stats.double_bogeys, color: '#ef4444' },
  ];

  const performanceMetrics = [
    { label: 'Avg Putts', value: stats.average_putts ?? 0, color: '#8b5cf6' },
    { label: 'Fairways Hit %', value: stats.fairways_hit_percentage ?? 0, color: '#10b981' },
    { label: 'GIR %', value: stats.greens_in_regulation_percentage ?? 0, color: '#3b82f6' },
  ];

  return (
    <Container className="py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Statistics</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Rounds Played" value={stats.rounds_played} />
        <StatsCard
          label="Average Score"
          value={stats.average_score !== null ? Number(stats.average_score).toFixed(1) : '—'}
        />
        <StatsCard
          label="Best Score"
          value={stats.best_score ?? '—'}
          variant="gold"
        />
        <StatsCard
          label="Avg To Par"
          value={stats.average_to_par !== null ? formatToPar(Number(stats.average_to_par)) : '—'}
          variant={stats.average_to_par !== null && Number(stats.average_to_par) < 0 ? 'success' : 'warning'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <StatPieChart title="Scoring Distribution" items={scoringDistribution} />
        <StatsChart title="Performance Metrics" data={performanceMetrics} />
      </div>

      {scoreTrend.length > 1 && (
        <div className="mb-8">
          <PerformanceChart title="Score Trend (Recent Rounds)" data={scoreTrend} showAverage />
        </div>
      )}

      <Card variant="bordered">
        <CardHeader>
          <CardTitle className="text-lg">Detailed Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Eagles</p>
              <p className="text-xl font-bold text-indigo-600">{stats.eagles}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Birdies</p>
              <p className="text-xl font-bold text-green-600">{stats.birdies}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Pars</p>
              <p className="text-xl font-bold text-blue-600">{stats.pars}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Bogeys</p>
              <p className="text-xl font-bold text-amber-600">{stats.bogeys}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Double Bogeys+</p>
              <p className="text-xl font-bold text-red-600">{stats.double_bogeys}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Avg Putts</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.average_putts !== null ? Number(stats.average_putts).toFixed(1) : '—'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Fairways Hit</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.fairways_hit_percentage !== null ? `${Number(stats.fairways_hit_percentage).toFixed(0)}%` : '—'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">GIR</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.greens_in_regulation_percentage !== null ? `${Number(stats.greens_in_regulation_percentage).toFixed(0)}%` : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
