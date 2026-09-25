import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { Pagination } from '@/components/common/Pagination';
import { getPlayerByProfileId } from '@/lib/league';
import { getFriendlyMatchesByPlayer, getMatchFormatLabel } from '@/lib/friendly';
import type { FriendlyMatch } from '@/types/database';
import { ROUTES } from '@/router/routes';

const PAGE_SIZE = 10;

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  pending: 'info',
  active: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

export default function FriendlyMatchesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<FriendlyMatch[]>([]);
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

      const matchesResult = await getFriendlyMatchesByPlayer(playerResult.data.id);
      if (matchesResult.error) setError(matchesResult.error);
      else setMatches(matchesResult.data ?? []);
    } catch {
      setError('Failed to load friendly matches.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState message="Loading friendly matches..." />;

  const filtered = matches.filter(m => {
    if (!search) return true;
    return m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.status.includes(search.toLowerCase()) ||
      getMatchFormatLabel(m.match_format).toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Container className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Friendly Matches</h1>
          <p className="text-gray-500 mt-1">{matches.length} total matches</p>
        </div>
        <Link to={ROUTES.friendlyMatchCreate}>
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            New Match
          </Button>
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
            placeholder="Search matches..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full md:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No friendly matches found"
          description={search ? 'Try a different search.' : 'Create a friendly match to play with other members.'}
          action={
            !search ? (
              <Link to={ROUTES.friendlyMatchCreate}>
                <Button variant="primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Match
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(match => (
              <Link key={match.id} to={ROUTES.friendlyMatch(match.id)}>
                <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">{match.title}</span>
                          <Badge variant={STATUS_VARIANTS[match.status] ?? 'default'}>
                            {match.status}
                          </Badge>
                          <Badge variant="outline">{getMatchFormatLabel(match.match_format)}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {match.round_type}-hole · Created {new Date(match.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                          {match.scheduled_at && ` · Scheduled ${new Date(match.scheduled_at).toLocaleDateString()}`}
                        </p>
                      </div>
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
