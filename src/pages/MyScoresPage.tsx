import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { Pagination } from '@/components/common/Pagination';
import { getPlayerByAuthUserId } from '@/lib/league';
import { supabase } from '@/lib/supabase';
import { formatToPar } from '@/utils/golf';

interface PracticeRoundWithCourse {
  id: string;
  created_at: string;
  gross_score: number | null;
  total_to_par: number | null;
  status: string;
  round_type: number;
  courses: { name: string } | { name: string }[] | null;
}

interface ScorecardWithRelations {
  id: string;
  created_at: string;
  total_strokes: number | null;
  total_score_to_par: number | null;
  status: string;
  rounds: { tournaments: { courses: { holes_count: number } | { holes_count: number }[] | null } | { courses: { holes_count: number } | { holes_count: number }[] | null }[] | null } | null;
  courses: { name: string } | { name: string }[] | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

const PAGE_SIZE = 10;

interface ScoreRow {
  id: string;
  type: 'tournament' | 'practice';
  date: string;
  courseName: string;
  score: number | null;
  toPar: number | null;
  status: string;
  holes: number;
}

export default function MyScoresPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const playerResult = await getPlayerByAuthUserId(user.id);
      if (playerResult.error || !playerResult.data) {
        setError('Player profile not found.');
        return;
      }
      const playerId = playerResult.data.id;

      const rows: ScoreRow[] = [];

      const { data: practiceRounds } = await supabase
        .from('practice_rounds')
        .select('id, created_at, gross_score, total_to_par, status, round_type, courses!course_id(name)')
        .eq('player_id', playerId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      for (const pr of (practiceRounds ?? []) as unknown as PracticeRoundWithCourse[]) {
        const course = firstRelation(pr.courses);
        rows.push({
          id: pr.id,
          type: 'practice',
          date: pr.created_at,
          courseName: course?.name ?? 'Unknown Course',
          score: pr.gross_score,
          toPar: pr.total_to_par,
          status: pr.status,
          holes: pr.round_type,
        });
      }

      const { data: tournamentScorecards } = await supabase
        .from('scorecards')
        .select('id, created_at, total_strokes, total_score_to_par, status, rounds!round_id(tournaments!tournament_id(courses!course_id(holes_count))), courses!course_id(name)')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      for (const sc of (tournamentScorecards ?? []) as unknown as ScorecardWithRelations[]) {
        const course = firstRelation(sc.courses);
        const round = firstRelation(sc.rounds);
        const tournament = firstRelation(round?.tournaments ?? null);
        const tournamentCourse = firstRelation(tournament?.courses ?? null);
        rows.push({
          id: sc.id,
          type: 'tournament',
          date: sc.created_at,
          courseName: course?.name ?? 'Unknown Course',
          score: sc.total_strokes,
          toPar: sc.total_score_to_par,
          status: sc.status,
          holes: tournamentCourse?.holes_count ?? 18,
        });
      }

      rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setScores(rows);
    } catch {
      setError('Failed to load scores.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState message="Loading your scores..." />;

  const filtered = scores.filter(s => {
    if (!search) return true;
    return s.courseName.toLowerCase().includes(search.toLowerCase()) ||
      s.type.includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Container className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Scores</h1>
        <p className="text-gray-500 mt-1">All your tournament and practice scores</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by course..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full md:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {paginated.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No scores found"
          description={search ? 'Try a different search.' : 'Complete a round to see your scores here.'}
        />
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map(s => (
              <Card key={`${s.type}-${s.id}`} variant="bordered">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <Badge variant={s.type === 'tournament' ? 'info' : 'default'}>
                          {s.type === 'tournament' ? 'Tournament' : 'Practice'}
                        </Badge>
                        <span className="font-medium text-gray-900">{s.courseName}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(s.date).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                        {' · '}{s.holes} holes
                      </p>
                    </div>
                    <div className="text-right">
                      {s.score !== null ? (
                        <>
                          <p className="text-xl font-bold text-gray-900">{s.score}</p>
                          {s.toPar !== null && (
                            <p className={`text-sm ${s.toPar < 0 ? 'text-green-600' : s.toPar > 0 ? 'text-red-600' : ''}`}>
                              {formatToPar(s.toPar)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-400">—</p>
                      )}
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
