import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Pagination } from '@/components/common/Pagination';
import { getMatchesPaginated } from '@/lib/competition';
import type { Match, MatchStatus } from '@/types/database';

const STATUS_VARIANTS: Record<MatchStatus, BadgeVariant> = {
  draft: 'outline', scheduled: 'warning', live: 'danger', completed: 'info', cancelled: 'outline',
};

const PAGE_SIZE = 20;

export function MatchesPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getMatchesPaginated(page, PAGE_SIZE);
    if (result.error) setError(result.error);
    else if (result.data) {
      setMatches(result.data.data);
      setTotal(result.data.total);
    }
    setIsLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div>
        <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
          <Swords className="w-5 h-5 text-tmgl-green-800" /> Matches
        </h1>
        <p className="text-sm text-tmgl-charcoal-500 mt-0.5">{total} match{total !== 1 ? 'es' : ''}</p>
      </div>

      {isLoading && <LoadingState message="Loading matches..." />}

      {!isLoading && error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div><p className="font-semibold">Failed to load matches</p><p className="mt-0.5 text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="mt-2">Retry</Button></div>
        </div>
      )}

      {!isLoading && !error && matches.length === 0 && (
        <EmptyState icon={Swords} title="No matches yet" description="Matches will appear here once created by a manager." />
      )}

      {!isLoading && matches.length > 0 && (
        <div className="space-y-3">
          {matches.map((match) => (
            <button key={match.id} onClick={() => navigate(`/matches/${match.id}`)} className="w-full text-left">
              <Card variant="hover" className="cursor-pointer hover:border-tmgl-green-300 transition-colors">
                <CardHeader>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base capitalize">{match.match_type} Match</CardTitle>
                    {match.scheduled_at && <p className="text-xs text-tmgl-charcoal-500 mt-1">{new Date(match.scheduled_at).toLocaleString()}</p>}
                    {match.result && <p className="text-xs text-tmgl-charcoal-600 mt-1">Result: {match.result}</p>}
                  </div>
                  <Badge variant={STATUS_VARIANTS[match.status]}>{match.status}</Badge>
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      )}

      {!isLoading && Math.ceil(total / PAGE_SIZE) > 1 && (
        <Pagination currentPage={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
      )}
    </Container>
  );
}
