import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { History, Eye, Edit, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { Pagination } from '@/components/common/Pagination';
import { getPlayerByProfileId } from '@/lib/league';
import { getPracticeRoundsByPlayer } from '@/lib/practice';
import { formatToPar } from '@/utils/golf';
import type { PracticeRound } from '@/types/database';

const PAGE_SIZE = 10;

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  draft: 'default',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

export default function PracticeHistoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<PracticeRound[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const playerResult = await getPlayerByProfileId(user.id);
      if (playerResult.error || !playerResult.data) {
        setError('Player profile not found.');
        return;
      }

      const roundsResult = await getPracticeRoundsByPlayer(playerResult.data.id);
      if (roundsResult.error) setError(roundsResult.error);
      else setRounds(roundsResult.data ?? []);
    } catch {
      setError('Failed to load practice history.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState message="Loading practice history..." />;

  const filtered = rounds.filter(r => {
    if (!search) return true;
    return r.status.includes(search.toLowerCase()) ||
      r.round_type.toString().includes(search);
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Container className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Practice History</h1>
          <p className="text-gray-500 mt-1">{rounds.length} total rounds</p>
        </div>
        <Link to="/practice/new">
          <Button variant="primary">New Practice Round</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search rounds..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full md:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          icon={History}
          title="No practice rounds found"
          description={search ? 'Try a different search.' : 'Complete your first practice round to see it here.'}
        />
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(round => (
              <Card key={round.id} variant="bordered">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">
                          {round.round_type}-Hole Round
                        </span>
                        <Badge variant={STATUS_VARIANTS[round.status] ?? 'default'}>
                          {round.status.replace('_', ' ')}
                        </Badge>
                        {round.tee_box && (
                          <span className="text-sm text-gray-500 capitalize">{round.tee_box} tees</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(round.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                        {round.completed_at && ` — Completed ${new Date(round.completed_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {round.gross_score !== null && (
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">{round.gross_score}</p>
                          {round.total_to_par !== null && (
                            <p className={`text-sm ${round.total_to_par < 0 ? 'text-green-600' : round.total_to_par > 0 ? 'text-red-600' : ''}`}>
                              {formatToPar(round.total_to_par)}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Link to={`/practice/${round.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {(round.status === 'draft' || round.status === 'in_progress') && (
                          <Link to={`/practice/${round.id}/score`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
