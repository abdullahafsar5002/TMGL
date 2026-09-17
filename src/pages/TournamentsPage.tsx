import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, Search, ChevronRight, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getTournaments } from '@/lib/competition';
import type { Tournament, TournamentStatus } from '@/types/database';

const STATUS_VARIANTS: Record<TournamentStatus, BadgeVariant> = {
  draft: 'warning', open: 'success', closed: 'info', live: 'danger', completed: 'info', cancelled: 'outline',
};

export function TournamentsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getTournaments();
    if (result.error) setError(result.error);
    else if (result.data) setTournaments(result.data);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tournaments.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-tmgl-green-800" /> Tournaments
          </h1>
          <p className="text-sm text-tmgl-charcoal-500 mt-0.5">{tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => navigate('/tournaments/new')} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            <Plus className="w-4 h-4 mr-1.5" /> New Tournament
          </Button>
        )}
      </div>

      {tournaments.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tmgl-charcoal-400" />
          <input type="text" placeholder="Search tournaments..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm text-tmgl-charcoal-900 placeholder-tmgl-charcoal-400 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
        </div>
      )}

      {isLoading && <LoadingState message="Loading tournaments..." />}

      {!isLoading && error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load tournaments</p>
            <p className="mt-0.5 text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="mt-2">Retry</Button>
          </div>
        </div>
      )}

      {!isLoading && !error && tournaments.length === 0 && (
        <EmptyState title="No tournaments yet"
          description={canManage ? 'Create your first tournament to get started.' : 'Tournaments will appear here once created by a manager.'}
          action={canManage ? <Button variant="primary" size="md" onClick={() => navigate('/tournaments/new')} className="bg-tmgl-green-800 hover:bg-tmgl-green-700"><Plus className="w-4 h-4 mr-1.5" /> Create Tournament</Button> : undefined} />
      )}

      {!isLoading && tournaments.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-tmgl-charcoal-500">No tournaments match &quot;{search}&quot;</p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((tournament) => (
            <button key={tournament.id} onClick={() => navigate(`/tournaments/${tournament.id}`)} className="w-full text-left">
              <Card variant="hover" className="cursor-pointer hover:border-tmgl-green-300 transition-colors">
                <CardHeader>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{tournament.name}</CardTitle>
                    <div className="flex items-center gap-3 mt-1 text-xs text-tmgl-charcoal-500">
                      {tournament.event_date && <span>{new Date(tournament.event_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[tournament.status]}>{tournament.status}</Badge>
                    <ChevronRight className="w-4 h-4 text-tmgl-charcoal-400 shrink-0" />
                  </div>
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      )}
    </Container>
  );
}
