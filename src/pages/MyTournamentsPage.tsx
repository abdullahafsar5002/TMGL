import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { Pagination } from '@/components/common/Pagination';
import { getPlayerByProfileId } from '@/lib/league';
import { supabase } from '@/lib/supabase';
import type { Tournament } from '@/types/database';

const PAGE_SIZE = 10;

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  draft: 'default',
  open: 'info',
  closed: 'warning',
  live: 'success',
  completed: 'success',
  cancelled: 'danger',
};

export default function MyTournamentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const playerResult = await getPlayerByProfileId(user.id);
      if (playerResult.error || !playerResult.data) {
        setError('Player profile not found.');
        return;
      }

      const { data: scorecards, error: scError } = await supabase
        .from('scorecards')
        .select('round_id')
        .eq('player_id', playerResult.data.id);

      if (scError) {
        setError(scError.message);
        return;
      }

      const roundIds = [...new Set((scorecards ?? []).map(sc => sc.round_id))];
      if (roundIds.length === 0) {
        setTournaments([]);
        return;
      }

      const { data: rounds, error: rError } = await supabase
        .from('rounds')
        .select('tournament_id')
        .in('id', roundIds);

      if (rError) {
        setError(rError.message);
        return;
      }

      const tournamentIds = [...new Set((rounds ?? []).map(r => r.tournament_id))];
      if (tournamentIds.length === 0) {
        setTournaments([]);
        return;
      }

      const { data: tData, error: tError } = await supabase
        .from('tournaments')
        .select('*')
        .in('id', tournamentIds)
        .order('event_date', { ascending: false });

      if (tError) setError(tError.message);
      else setTournaments(tData ?? []);
    } catch {
      setError('Failed to load tournaments.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState message="Loading your tournaments..." />;

  const filtered = filter === 'all' ? tournaments : tournaments.filter(t => t.status === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Tournaments</h1>
        <p className="text-gray-500 mt-1">Tournaments you have participated in</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {['all', 'open', 'live', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filter === f ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No tournaments found"
          description={filter !== 'all' ? 'Try a different filter.' : 'Join a tournament to see it here.'}
        />
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(t => (
              <Link key={t.id} to={`/tournaments/${t.id}`}>
                <Card variant="hover" className="mb-3">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{t.name}</h3>
                          <Badge variant={STATUS_VARIANTS[t.status] ?? 'default'}>{t.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          {t.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(t.event_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </Container>
  );
}
