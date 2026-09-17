import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Search, ChevronRight, Loader2, AlertCircle, Inbox, Calendar } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getAllTeams, getSeasons } from '@/lib/league';
import type { Team, Season } from '@/types/database';

export function TeamsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [teamsRes, seasonsRes] = await Promise.all([getAllTeams(), getSeasons()]);
    if (teamsRes.error) setError(teamsRes.error);
    else if (teamsRes.data) setTeams(teamsRes.data);
    if (seasonsRes.data) setSeasons(seasonsRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const seasonMap = Object.fromEntries(seasons.map((s) => [s.id, s.name]));

  const filtered = teams.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesSeason = seasonFilter === 'all' || t.season_id === seasonFilter;
    return matchesSearch && matchesSeason;
  });

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-tmgl-green-800" /> Teams
          </h1>
          <p className="text-sm text-tmgl-charcoal-500 mt-0.5">{teams.length} team{teams.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => navigate('/teams/new')} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            <Plus className="w-4 h-4 mr-1.5" /> New Team
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tmgl-charcoal-400" />
          <input type="text" placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm text-tmgl-charcoal-900 placeholder-tmgl-charcoal-400 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
        </div>
        {seasons.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button onClick={() => setSeasonFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap touch-target ${seasonFilter === 'all' ? 'bg-tmgl-green-800 text-white border-tmgl-green-800' : 'bg-white text-tmgl-charcoal-700 border-tmgl-charcoal-200 hover:border-tmgl-green-400'}`}>
              All Seasons
            </button>
            {seasons.map((s) => (
              <button key={s.id} onClick={() => setSeasonFilter(s.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap touch-target ${seasonFilter === s.id ? 'bg-tmgl-green-800 text-white border-tmgl-green-800' : 'bg-white text-tmgl-charcoal-700 border-tmgl-charcoal-200 hover:border-tmgl-green-400'}`}>
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" />
          <span className="ml-2 text-sm text-tmgl-charcoal-500">Loading teams...</span>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load teams</p>
            <p className="mt-0.5 text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="mt-2">Retry</Button>
          </div>
        </div>
      )}

      {!isLoading && !error && teams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-tmgl-charcoal-100 flex items-center justify-center mb-3">
            <Inbox className="w-7 h-7 text-tmgl-charcoal-400" />
          </div>
          <p className="text-base font-semibold text-tmgl-charcoal-700">No teams yet</p>
          <p className="text-sm text-tmgl-charcoal-500 mt-1">
            {canManage ? 'Create your first team to get started.' : 'Teams will appear here once created.'}
          </p>
          {canManage && (
            <Button variant="primary" size="md" onClick={() => navigate('/teams/new')} className="mt-4 bg-tmgl-green-800 hover:bg-tmgl-green-700">
              <Plus className="w-4 h-4 mr-1.5" /> Create Team
            </Button>
          )}
        </div>
      )}

      {!isLoading && teams.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-tmgl-charcoal-500">No teams match your filters.</p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((team) => (
            <button key={team.id} onClick={() => navigate(`/teams/${team.id}`)} className="w-full text-left">
              <Card className="cursor-pointer hover:border-tmgl-green-300 transition-colors">
                <CardHeader>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{team.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-xs text-tmgl-charcoal-500">
                      <Calendar className="w-3 h-3" />
                      <span>{seasonMap[team.season_id] ?? 'Unknown season'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-tmgl-charcoal-400 shrink-0" />
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      )}
    </Container>
  );
}
