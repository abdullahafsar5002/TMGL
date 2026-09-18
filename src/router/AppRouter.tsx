import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { LoadingState } from '@/components/common/LoadingState';

// Core pages (loaded eagerly for fast initial load)
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Lazy-loaded pages for code splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SeasonsPage = lazy(() => import('@/pages/SeasonsPage').then(m => ({ default: m.SeasonsPage })));
const SeasonDetailPage = lazy(() => import('@/pages/SeasonDetailPage').then(m => ({ default: m.SeasonDetailPage })));
const SeasonCreatePage = lazy(() => import('@/pages/SeasonCreatePage').then(m => ({ default: m.SeasonCreatePage })));
const DivisionDetailPage = lazy(() => import('@/pages/DivisionDetailPage').then(m => ({ default: m.DivisionDetailPage })));
const DivisionCreatePage = lazy(() => import('@/pages/DivisionCreatePage').then(m => ({ default: m.DivisionCreatePage })));
const PlayersPage = lazy(() => import('@/pages/PlayersPage').then(m => ({ default: m.PlayersPage })));
const PlayerDetailPage = lazy(() => import('@/pages/PlayerDetailPage').then(m => ({ default: m.PlayerDetailPage })));
const PlayerCreatePage = lazy(() => import('@/pages/PlayerCreatePage').then(m => ({ default: m.PlayerCreatePage })));
const TeamsPage = lazy(() => import('@/pages/TeamsPage').then(m => ({ default: m.TeamsPage })));
const TeamDetailPage = lazy(() => import('@/pages/TeamDetailPage').then(m => ({ default: m.TeamDetailPage })));
const TeamCreatePage = lazy(() => import('@/pages/TeamCreatePage').then(m => ({ default: m.TeamCreatePage })));
const TournamentsPage = lazy(() => import('@/pages/TournamentsPage').then(m => ({ default: m.TournamentsPage })));
const TournamentDetailPage = lazy(() => import('@/pages/TournamentDetailPage').then(m => ({ default: m.TournamentDetailPage })));
const TournamentCreatePage = lazy(() => import('@/pages/TournamentCreatePage').then(m => ({ default: m.TournamentCreatePage })));
const RoundDetailPage = lazy(() => import('@/pages/RoundDetailPage').then(m => ({ default: m.RoundDetailPage })));
const RoundCreatePage = lazy(() => import('@/pages/RoundCreatePage').then(m => ({ default: m.RoundCreatePage })));
const MatchesPage = lazy(() => import('@/pages/MatchesPage').then(m => ({ default: m.MatchesPage })));
const MatchDetailPage = lazy(() => import('@/pages/MatchDetailPage').then(m => ({ default: m.MatchDetailPage })));
const MatchCreatePage = lazy(() => import('@/pages/MatchCreatePage').then(m => ({ default: m.MatchCreatePage })));
const ScoringPage = lazy(() => import('@/pages/ScoringPage').then(m => ({ default: m.ScoringPage })));
const ScorecardPage = lazy(() => import('@/pages/ScorecardPage').then(m => ({ default: m.ScorecardPage })));
const ScorecardVerifyPage = lazy(() => import('@/pages/ScorecardVerifyPage').then(m => ({ default: m.ScorecardVerifyPage })));
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const CoursesPage = lazy(() => import('@/pages/CoursesPage').then(m => ({ default: m.CoursesPage })));
const CourseDetailPage = lazy(() => import('@/pages/CourseDetailPage').then(m => ({ default: m.CourseDetailPage })));
const CourseCreatePage = lazy(() => import('@/pages/CourseCreatePage').then(m => ({ default: m.CourseCreatePage })));

// Phase 5: Practice + Player Hub
const PracticeHubPage = lazy(() => import('@/pages/PracticeHubPage'));
const PracticeCreatePage = lazy(() => import('@/pages/PracticeCreatePage'));
const PracticeScorecardPage = lazy(() => import('@/pages/PracticeScorecardPage'));
const PracticeDetailPage = lazy(() => import('@/pages/PracticeDetailPage'));
const PracticeHistoryPage = lazy(() => import('@/pages/PracticeHistoryPage'));
const MyTournamentsPage = lazy(() => import('@/pages/MyTournamentsPage'));
const MyScoresPage = lazy(() => import('@/pages/MyScoresPage'));
const MyStatisticsPage = lazy(() => import('@/pages/MyStatisticsPage'));
const ProfileSettingsPage = lazy(() => import('@/pages/ProfileSettingsPage'));

// Phase 6: Friendly Matches + Notifications + Announcements
const FriendlyMatchesPage = lazy(() => import('@/pages/FriendlyMatchesPage'));
const FriendlyMatchCreatePage = lazy(() => import('@/pages/FriendlyMatchCreatePage'));
const FriendlyMatchDetailPage = lazy(() => import('@/pages/FriendlyMatchDetailPage'));
const FriendlyMatchScorePage = lazy(() => import('@/pages/FriendlyMatchScorePage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const AnnouncementsPage = lazy(() => import('@/pages/AnnouncementsPage'));
const AnnouncementDetailPage = lazy(() => import('@/pages/AnnouncementDetailPage'));
const AnnouncementManagePage = lazy(() => import('@/pages/AnnouncementManagePage'));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingState message="Loading..." />
    </div>
  );
}

export function AppRouter() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
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
      <Route path="/courses" element={<PublicLayout><CoursesPage /></PublicLayout>} />
      <Route path="/courses/:id" element={<PublicLayout><CourseDetailPage /></PublicLayout>} />

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
      <Route path="/courses/new" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><CourseCreatePage /></AuthenticatedLayout>
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
          <AuthenticatedLayout><RoundCreatePage /></AuthenticatedLayout>
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
      <Route path="/rounds/:id/verify" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><ScorecardVerifyPage /></AuthenticatedLayout>
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

      {/* Phase 5: Practice routes */}
      <Route path="/practice" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><PracticeHubPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/practice/new" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><PracticeCreatePage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/practice/history" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><PracticeHistoryPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/practice/:id" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><PracticeDetailPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/practice/:id/score" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><PracticeScorecardPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Phase 5: Player Hub routes */}
      <Route path="/my-tournaments" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><MyTournamentsPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/my-scores" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><MyScoresPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/statistics" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><MyStatisticsPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile/settings" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><ProfileSettingsPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Phase 6: Friendly Matches */}
      <Route path="/friendly-matches" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><FriendlyMatchesPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/friendly-matches/new" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><FriendlyMatchCreatePage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/friendly-matches/:id" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><FriendlyMatchDetailPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/friendly-matches/:id/score" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><FriendlyMatchScorePage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Phase 6: Notifications */}
      <Route path="/notifications" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><NotificationsPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />

      {/* Phase 6: Announcements */}
      <Route path="/announcements" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><AnnouncementsPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/announcements/:id" element={
        <ProtectedRoute requiredRole="player">
          <AuthenticatedLayout><AnnouncementDetailPage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/announcements/manage" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><AnnouncementManagePage /></AuthenticatedLayout>
        </ProtectedRoute>
      } />
      <Route path="/announcements/:id/edit" element={
        <ProtectedRoute requiredRole="league_manager">
          <AuthenticatedLayout><AnnouncementManagePage /></AuthenticatedLayout>
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
    </Suspense>
  );
}
