import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, ChevronRight, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Pagination } from '@/components/common/Pagination';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getTournamentsPaginated } from '@/lib/competition';
import { cn } from '@/lib/utils';
import type { Tournament, TournamentStatus } from '@/types/database';

const STATUS_VARIANTS: Record<TournamentStatus, BadgeVariant> = {
  draft: 'warning',
  open: 'success',
  closed: 'info',
  live: 'danger',
  completed: 'info',
  cancelled: 'outline',
};

const STATUS_ACCENT: Record<TournamentStatus, string> = {
  draft: 'bg-tmgl-gold-500',
  open: 'bg-tmgl-green-500',
  closed: 'bg-tmgl-charcoal-400',
  live: 'bg-red-500',
  completed: 'bg-tmgl-charcoal-300',
  cancelled: 'bg-tmgl-charcoal-300',
};

const FORMAT_LABELS: Record<string, string> = {
  stroke_play: 'Stroke Play',
  stableford: 'Stableford',
  match_play: 'Match Play',
  nassau: 'Nassau',
  best_ball: 'Best Ball',
  scramble: 'Scramble',
};

const PAGE_SIZE = 20;

function formatEventDate(tournament: Tournament): string | null {
  const range =
    tournament.start_date && tournament.end_date
      ? `${tournament.start_date} to ${tournament.end_date}`
      : tournament.event_date || tournament.start_date;
  if (!range) return null;
  const [raw] = range.split(' to ');
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return range;
  const formatted = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return range.includes(' to ') ? `${formatted} onwards` : formatted;
}

export function TournamentsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getTournamentsPaginated(page, PAGE_SIZE);
    if (result.error) setError(result.error);
    else if (result.data) {
      setTournaments(result.data.data);
      setTotal(result.data.total);
    }
    setIsLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const filtered = tournaments.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container size="lg" className="space-y-6 py-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-green-700">
            Events
          </p>
          <h1 className="mt-1 font-display text-display-lg text-tmgl-green-950">Tournaments</h1>
          <p className="mt-1 text-sm text-tmgl-charcoal-500">
            {total} tournament{total !== 1 ? 's' : ''} on the calendar
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={() => navigate('/tournaments/new')}>
            <Plus className="mr-1.5 h-4 w-4" /> New tournament
          </Button>
        )}
      </div>

      {total > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tmgl-charcoal-400" />
          <input
            type="text"
            placeholder="Search tournaments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tournaments"
            className="min-h-[44px] w-full rounded-lg border border-tmgl-charcoal-300 bg-white py-2.5 pl-10 pr-4 text-sm text-tmgl-charcoal-900 placeholder-tmgl-charcoal-400 focus:border-tmgl-green-500 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700/25"
          />
        </div>
      )}

      {isLoading && <LoadingState message="Loading tournaments..." />}

      {!isLoading && error && (
        <div className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load tournaments</p>
            <p className="mt-0.5 text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="mt-2">
              Retry
            </Button>
          </div>
        </div>
      )}

      {!isLoading && !error && tournaments.length === 0 && (
        <EmptyState
          title="No tournaments yet"
          description={
            canManage
              ? 'Create your first tournament to get started.'
              : 'Tournaments appear here once a manager creates them.'
          }
          action={
            canManage ? (
              <Button variant="primary" onClick={() => navigate('/tournaments/new')}>
                <Plus className="mr-1.5 h-4 w-4" /> Create tournament
              </Button>
            ) : undefined
          }
        />
      )}

      {!isLoading && tournaments.length > 0 && filtered.length === 0 && (
        <div className="rounded-card border border-dashed border-tmgl-charcoal-300 bg-white px-6 py-12 text-center">
          <p className="text-sm text-tmgl-charcoal-500">
            No tournaments match &quot;{search}&quot;
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((tournament) => {
            const date = formatEventDate(tournament);
            const format = FORMAT_LABELS[tournament.scoring_format] ?? tournament.scoring_format;
            return (
              <li key={tournament.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/tournaments/${tournament.id}`)}
                  className="group block w-full text-left"
                >
                  <div className="relative flex items-start gap-4 overflow-hidden rounded-card border border-tmgl-charcoal-200 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-tmgl-green-300 hover:shadow-card-hover sm:p-6">
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-y-0 left-0 w-1',
                        STATUS_ACCENT[tournament.status]
                      )}
                    />
                    <div className="min-w-0 flex-1 pl-2">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="min-w-0 truncate font-display text-lg font-semibold text-tmgl-green-950">
                          {tournament.name}
                        </h2>
                        <Badge variant={STATUS_VARIANTS[tournament.status]}>
                          {tournament.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tmgl-charcoal-500">
                        {date && (
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {date}
                          </span>
                        )}
                        <span>{format}</span>
                        {tournament.flight_count > 0 && (
                          <span>
                            {tournament.flight_count} flight
                            {tournament.flight_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-tmgl-charcoal-300 transition-all group-hover:translate-x-1 group-hover:text-tmgl-green-600" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && Math.ceil(total / PAGE_SIZE) > 1 && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          onPageChange={setPage}
        />
      )}
    </Container>
  );
}
