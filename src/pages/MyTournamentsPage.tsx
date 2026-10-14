import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { Pagination } from '@/components/common/Pagination';
import { getPlayerByAuthUserId } from '@/lib/league';
import { getRegistrations } from '@/lib/tournamentRegistration';
import { toUserFacingServiceError } from '@/lib/errors';
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

type TournamentFilter = 'all' | 'registered' | 'open' | 'live' | 'completed';

const FILTERS: Array<{ value: TournamentFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'registered', label: 'Registered' },
  { value: 'open', label: 'Open' },
  { value: 'live', label: 'Live' },
  { value: 'completed', label: 'Completed' },
];

export default function MyTournamentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<TournamentFilter>('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const playerResult = await getPlayerByAuthUserId(user.id);
      if (playerResult.error || !playerResult.data) {
        setError(playerResult.error || 'Player profile not found.');
        return;
      }
      const playerId = playerResult.data.id;

      // Registrations and scorecards are independent: either one failing must
      // not hide the tournaments the other one knows about.
      const [registrationsResult, scorecardsResult] = await Promise.all([
        getRegistrations(undefined, playerId),
        supabase.from('scorecards').select('round_id').eq('player_id', playerId),
      ]);

      if (registrationsResult.data) {
        setRegisteredIds(registrationsResult.data.map((r) => r.tournament_id));
      } else if (registrationsResult.error) {
        setRegisteredIds([]);
      }

      const tournamentIds = new Set<string>(
        (registrationsResult.data ?? []).map((r) => r.tournament_id)
      );

      if (scorecardsResult.error) {
        setError(toUserFacingServiceError(scorecardsResult.error, 'Unable to load your played rounds.'));
      } else {
        const roundIds = [...new Set((scorecardsResult.data ?? []).map(sc => sc.round_id as string))];
        if (roundIds.length > 0) {
          const { data: rounds } = await supabase
            .from('rounds')
            .select('tournament_id')
            .in('id', roundIds);
          if (!rounds) {
            setError('Unable to load your played rounds.');
          } else {
            for (const round of rounds) tournamentIds.add(round.tournament_id as string);
          }
        }
      }

      if (tournamentIds.size === 0) {
        setTournaments([]);
        return;
      }

      const { data: tData, error: tError } = await supabase
        .from('tournaments')
        .select('*')
        .in('id', [...tournamentIds])
        .order('event_date', { ascending: false });

      if (tError) setError(toUserFacingServiceError(tError, 'Unable to load your tournaments.'));
      else setTournaments(tData ?? []);
    } catch {
      setError('Failed to load tournaments.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState message="Loading your tournaments..." />;

  const registered = new Set(registeredIds);
  const filtered = tournaments.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'registered') return registered.has(t.id);
    return t.status === filter;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Container className="py-8">
      <PageHeader
        eyebrow="Your league"
        title="My tournaments"
        description="Everything you are registered for, plus anything you have already played."
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            aria-pressed={filter === f.value}
            className={`rounded-pill border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.value
                ? 'border-tmgl-green-800 bg-tmgl-green-800 text-white'
                : 'border-tmgl-charcoal-200 bg-white text-tmgl-charcoal-600 hover:border-tmgl-green-300 hover:text-tmgl-charcoal-900'
            }`}
          >
            {f.label}
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
              <Link key={t.id} to={`/tournaments/${t.id}`} className="block">
                <Card variant="hover" className="transition-all hover:shadow-card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-semibold text-tmgl-charcoal-950">
                            {t.name}
                          </h3>
                          {registered.has(t.id) && <Badge variant="success">Registered</Badge>}
                          <Badge variant={STATUS_VARIANTS[t.status] ?? 'default'}>{t.status}</Badge>
                        </div>
                        <div className="mt-1.5 flex items-center gap-4 text-sm text-tmgl-charcoal-500">
                          {t.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(t.event_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-tmgl-charcoal-300" />
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
