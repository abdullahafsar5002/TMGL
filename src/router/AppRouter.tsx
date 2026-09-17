import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

// Pages
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Phase 2 pages
import { SeasonsPage } from '@/pages/SeasonsPage';
import { SeasonDetailPage } from '@/pages/SeasonDetailPage';
import { SeasonCreatePage } from '@/pages/SeasonCreatePage';
import { DivisionDetailPage } from '@/pages/DivisionDetailPage';
import { DivisionCreatePage } from '@/pages/DivisionCreatePage';
import { PlayersPage } from '@/pages/PlayersPage';
import { PlayerDetailPage } from '@/pages/PlayerDetailPage';
import { PlayerCreatePage } from '@/pages/PlayerCreatePage';
import { TeamsPage } from '@/pages/TeamsPage';
import { TeamDetailPage } from '@/pages/TeamDetailPage';
import { TeamCreatePage } from '@/pages/TeamCreatePage';

// Phase 3 pages
import { TournamentsPage } from '@/pages/TournamentsPage';
import { TournamentDetailPage } from '@/pages/TournamentDetailPage';
import { TournamentCreatePage } from '@/pages/TournamentCreatePage';
import { RoundDetailPage } from '@/pages/RoundDetailPage';
import { MatchesPage } from '@/pages/MatchesPage';
import { MatchDetailPage } from '@/pages/MatchDetailPage';
import { MatchCreatePage } from '@/pages/MatchCreatePage';
import { ScoringPage } from '@/pages/ScoringPage';
import { ScorecardPage } from '@/pages/ScorecardPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';

// Phase 6 pages
import { AnalyticsPage } from '@/pages/AnalyticsPage';

export function AppRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />

      {/* Auth pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Public read-only league pages */}
      <Route path="/seasons" element={<PublicLayout><SeasonsPage /></PublicLayout>} />
      <Route path="/seasons/:id" element={<PublicLayout><SeasonDetailPage /></PublicLayout>} />
      <Route path="/players" element={<PublicLayout><PlayersPage /></PublicLayout>} />
      <Route path="/players/:id" element={<PublicLayout><PlayerDetailPage /></PublicLayout>} />
      <Route path="/teams" element={<PublicLayout><TeamsPage /></PublicLayout>} />
      <Route path="/teams/:id" element={<PublicLayout><TeamDetailPage /></PublicLayout>} />

      {/* Public competition pages */}
      <Route path="/tournaments" element={<PublicLayout><TournamentsPage /></PublicLayout>} />
      <Route path="/tournaments/:id" element={<PublicLayout><TournamentDetailPage /></PublicLayout>} />
      <Route path="/matches" element={<PublicLayout><MatchesPage /></PublicLayout>} />
      <Route path="/matches/:id" element={<PublicLayout><MatchDetailPage /></PublicLayout>} />
      <Route path="/leaderboard" element={<PublicLayout><LeaderboardPage /></PublicLayout>} />

      {/* Manager-only creation/edit routes */}
      <Route path="/seasons/new" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><SeasonCreatePage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/divisions/new" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><DivisionCreatePage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/divisions/:id" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><DivisionDetailPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/players/new" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><PlayerCreatePage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/teams/new" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><TeamCreatePage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Phase 3 manager routes */}
      <Route path="/tournaments/new" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><TournamentCreatePage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/tournaments/:id/rounds/new" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><RoundCreatePageWrapper /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/rounds/:id" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><RoundDetailPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/rounds/:roundId/matches/new" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><MatchCreatePage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Authenticated scoring */}
      <Route path="/scoring" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><ScoringPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/scorecards/:id" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><ScorecardPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Authenticated routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><DashboardPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Phase 6 routes */}
      <Route path="/analytics" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><AnalyticsPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Unauthorized */}
      <Route path="/unauthorized" element={
        isAuthenticated ? (
          <AuthenticatedLayout><UnauthorizedPage /></AuthenticatedLayout>
        ) : (
          <PublicLayout><UnauthorizedPage /></PublicLayout>
        )
      } />

      {/* 404 */}
      <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
    </Routes>
  );
}

// -------------------------------------------------------------------
// Inline wrapper for RoundCreatePage to avoid creating a separate file
// -------------------------------------------------------------------
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { createRound, getTournament } from '@/lib/competition';
import { validateRound } from '@/lib/validation';

function RoundCreatePageWrapper() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournamentName, setTournamentName] = useState('');
  const [roundNumber, setRoundNumber] = useState(1);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (tournamentId) {
      getTournament(tournamentId).then((r) => { if (r.data) setTournamentName(r.data.name); });
    }
  }, [tournamentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId) return;
    setErrors([]);
    setServerError(null);

    const validation = validateRound({ tournament_id: tournamentId, round_number: roundNumber, name, date: date || null });
    if (!validation.isValid) { setErrors(validation.errors); return; }

    setIsSubmitting(true);
    const result = await createRound({ tournament_id: tournamentId, round_number: roundNumber, name, date: date || null });
    setIsSubmitting(false);

    if (result.error) { setServerError(result.error); return; }
    if (result.data) navigate(`/rounds/${result.data.id}`);
  };

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
        <Flag className="w-5 h-5 text-tmgl-green-800" /> New Round {tournamentName && <span className="text-sm font-normal text-tmgl-charcoal-500">for {tournamentName}</span>}
      </h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{errors.map((e, i) => <p key={i}>{e}</p>)}</div>}
          {serverError && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{serverError}</p></div>}

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Round Number *</label>
            <input type="number" min={1} value={roundNumber} onChange={(e) => setRoundNumber(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
          </div>

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Round Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Round 1, Stroke Play"
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
          </div>

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
          </div>

          <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Round'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
