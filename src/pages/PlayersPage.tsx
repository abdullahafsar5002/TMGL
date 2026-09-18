import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, ChevronRight, Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Pagination } from '@/components/common/Pagination';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getPlayersPaginated } from '@/lib/league';
import type { Player } from '@/types/database';

const PAGE_SIZE = 20;

export function PlayersPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getPlayersPaginated(page, PAGE_SIZE, search);
    if (result.error) setError(result.error);
    else if (result.data) {
      setPlayers(result.data.data);
      setTotal(result.data.total);
    }
    setIsLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-tmgl-green-800" /> Players
          </h1>
          <p className="text-sm text-tmgl-charcoal-500 mt-0.5">{total} player{total !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => navigate('/players/new')} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            <Plus className="w-4 h-4 mr-1.5" /> Add Player
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tmgl-charcoal-400" />
        <input type="text" placeholder="Search players by name..." value={search} onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm text-tmgl-charcoal-900 placeholder-tmgl-charcoal-400 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" />
          <span className="ml-2 text-sm text-tmgl-charcoal-500">Loading players...</span>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load players</p>
            <p className="mt-0.5 text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="mt-2">Retry</Button>
          </div>
        </div>
      )}

      {!isLoading && !error && players.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-tmgl-charcoal-100 flex items-center justify-center mb-3">
            <Inbox className="w-7 h-7 text-tmgl-charcoal-400" />
          </div>
          <p className="text-base font-semibold text-tmgl-charcoal-700">No players yet</p>
          <p className="text-sm text-tmgl-charcoal-500 mt-1">
            {canManage ? 'Add your first player to get started.' : 'Players will appear here once registered.'}
          </p>
          {canManage && (
            <Button variant="primary" size="md" onClick={() => navigate('/players/new')} className="mt-4 bg-tmgl-green-800 hover:bg-tmgl-green-700">
              <Plus className="w-4 h-4 mr-1.5" /> Add Player
            </Button>
          )}
        </div>
      )}

      {!isLoading && players.length > 0 && (
        <div className="space-y-2">
          {players.map((player) => (
            <button key={player.id} onClick={() => navigate(`/players/${player.id}`)} className="w-full text-left">
              <Card className="cursor-pointer hover:border-tmgl-green-300 transition-colors">
                <CardHeader>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{player.full_name}</CardTitle>
                    <div className="flex items-center gap-3 mt-1 text-xs text-tmgl-charcoal-500">
                      {player.player_code && <span>Code: {player.player_code}</span>}
                      {player.handicap_index !== null && <span>Handicap: {player.handicap_index}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={player.status === 'active' ? 'success' : 'warning'}>{player.status}</Badge>
                    <ChevronRight className="w-4 h-4 text-tmgl-charcoal-400 shrink-0" />
                  </div>
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </Container>
  );
}
