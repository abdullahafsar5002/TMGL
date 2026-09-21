import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingState } from '@/components/common/LoadingState';

import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function AuthPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute><AuthenticatedLayout>{children}</AuthenticatedLayout></ProtectedRoute>;
}

function AdminPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="league_manager"><AuthenticatedLayout>{children}</AuthenticatedLayout></ProtectedRoute>;
}

function SuperAdminPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="super_admin"><AuthenticatedLayout>{children}</AuthenticatedLayout></ProtectedRoute>;
}

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingState message="Loading..." />
    </div>
  );
}

function lazyPage<T>(importFn: () => Promise<{ default: T }>) {
  return lazy(importFn);
}

// Public pages (lazy)
const TournamentsPage = lazyPage(() => import('@/pages/TournamentsPage').then(m => ({ default: m.TournamentsPage })));
const TournamentDetailPage = lazyPage(() => import('@/pages/TournamentDetailPage').then(m => ({ default: m.TournamentDetailPage })));
const LeaderboardPage = lazyPage(() => import('@/pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })));
const ForgotPasswordPage = lazyPage(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const AboutPage = lazyPage(() => import('@/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = lazyPage(() => import('@/pages/ContactPage').then(m => ({ default: m.ContactPage })));
const NewsPage = lazyPage(() => import('@/pages/NewsPage').then(m => ({ default: m.NewsPage })));
const GalleryPage = lazyPage(() => import('@/pages/GalleryPage').then(m => ({ default: m.GalleryPage })));

// Authenticated pages (lazy)
const DashboardPage = lazyPage(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProfileSettingsPage = lazyPage(() => import('@/pages/ProfileSettingsPage').then(m => ({ default: m.ProfileSettingsPage })));
const PlayersPage = lazyPage(() => import('@/pages/PlayersPage').then(m => ({ default: m.PlayersPage })));
const PlayerDetailPage = lazyPage(() => import('@/pages/PlayerDetailPage').then(m => ({ default: m.PlayerDetailPage })));
const PlayerCreatePage = lazyPage(() => import('@/pages/PlayerCreatePage').then(m => ({ default: m.PlayerCreatePage })));
const TeamsPage = lazyPage(() => import('@/pages/TeamsPage').then(m => ({ default: m.TeamsPage })));
const TeamDetailPage = lazyPage(() => import('@/pages/TeamDetailPage').then(m => ({ default: m.TeamDetailPage })));
const TeamCreatePage = lazyPage(() => import('@/pages/TeamCreatePage').then(m => ({ default: m.TeamCreatePage })));
const SeasonsPage = lazyPage(() => import('@/pages/SeasonsPage').then(m => ({ default: m.SeasonsPage })));
const SeasonDetailPage = lazyPage(() => import('@/pages/SeasonDetailPage').then(m => ({ default: m.SeasonDetailPage })));
const SeasonCreatePage = lazyPage(() => import('@/pages/SeasonCreatePage').then(m => ({ default: m.SeasonCreatePage })));
const DivisionDetailPage = lazyPage(() => import('@/pages/DivisionDetailPage').then(m => ({ default: m.DivisionDetailPage })));
const DivisionCreatePage = lazyPage(() => import('@/pages/DivisionCreatePage').then(m => ({ default: m.DivisionCreatePage })));
const CoursesPage = lazyPage(() => import('@/pages/CoursesPage').then(m => ({ default: m.CoursesPage })));
const CourseDetailPage = lazyPage(() => import('@/pages/CourseDetailPage').then(m => ({ default: m.CourseDetailPage })));
const CourseCreatePage = lazyPage(() => import('@/pages/CourseCreatePage').then(m => ({ default: m.CourseCreatePage })));
const MatchesPage = lazyPage(() => import('@/pages/MatchesPage').then(m => ({ default: m.MatchesPage })));
const MatchDetailPage = lazyPage(() => import('@/pages/MatchDetailPage').then(m => ({ default: m.MatchDetailPage })));
const MatchCreatePage = lazyPage(() => import('@/pages/MatchCreatePage').then(m => ({ default: m.MatchCreatePage })));
const RoundDetailPage = lazyPage(() => import('@/pages/RoundDetailPage').then(m => ({ default: m.RoundDetailPage })));
const RoundCreatePage = lazyPage(() => import('@/pages/RoundCreatePage').then(m => ({ default: m.RoundCreatePage })));
const ScorecardPage = lazyPage(() => import('@/pages/ScorecardPage').then(m => ({ default: m.ScorecardPage })));
const ScorecardVerifyPage = lazyPage(() => import('@/pages/ScorecardVerifyPage').then(m => ({ default: m.ScorecardVerifyPage })));
const ScoringPage = lazyPage(() => import('@/pages/ScoringPage').then(m => ({ default: m.ScoringPage })));
const MyScoresPage = lazyPage(() => import('@/pages/MyScoresPage').then(m => ({ default: m.MyScoresPage })));
const MyStatisticsPage = lazyPage(() => import('@/pages/MyStatisticsPage').then(m => ({ default: m.MyStatisticsPage })));
const MyTournamentsPage = lazyPage(() => import('@/pages/MyTournamentsPage').then(m => ({ default: m.MyTournamentsPage })));
const PracticeHubPage = lazyPage(() => import('@/pages/PracticeHubPage').then(m => ({ default: m.PracticeHubPage })));
const PracticeCreatePage = lazyPage(() => import('@/pages/PracticeCreatePage').then(m => ({ default: m.PracticeCreatePage })));
const PracticeDetailPage = lazyPage(() => import('@/pages/PracticeDetailPage').then(m => ({ default: m.PracticeDetailPage })));
const PracticeHistoryPage = lazyPage(() => import('@/pages/PracticeHistoryPage').then(m => ({ default: m.PracticeHistoryPage })));
const PracticeScorecardPage = lazyPage(() => import('@/pages/PracticeScorecardPage').then(m => ({ default: m.PracticeScorecardPage })));
const FriendlyMatchesPage = lazyPage(() => import('@/pages/FriendlyMatchesPage').then(m => ({ default: m.FriendlyMatchesPage })));
const FriendlyMatchCreatePage = lazyPage(() => import('@/pages/FriendlyMatchCreatePage').then(m => ({ default: m.FriendlyMatchCreatePage })));
const FriendlyMatchDetailPage = lazyPage(() => import('@/pages/FriendlyMatchDetailPage').then(m => ({ default: m.FriendlyMatchDetailPage })));
const FriendlyMatchScorePage = lazyPage(() => import('@/pages/FriendlyMatchScorePage').then(m => ({ default: m.FriendlyMatchScorePage })));
const AnnouncementsPage = lazyPage(() => import('@/pages/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })));
const AnnouncementDetailPage = lazyPage(() => import('@/pages/AnnouncementDetailPage').then(m => ({ default: m.AnnouncementDetailPage })));
const AnnouncementManagePage = lazyPage(() => import('@/pages/AnnouncementManagePage').then(m => ({ default: m.AnnouncementManagePage })));
const NotificationsPage = lazyPage(() => import('@/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const AdminDashboardPage = lazyPage(() => import('@/pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const OrganizerDashboardPage = lazyPage(() => import('@/pages/OrganizerDashboardPage').then(m => ({ default: m.OrganizerDashboardPage })));
const AnalyticsPage = lazyPage(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const UnauthorizedPage = lazyPage(() => import('@/pages/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })));

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* ── Public Routes ── */}
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<PublicLayout><ForgotPasswordPage /></PublicLayout>} />
      <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
      <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
      <Route path="/news" element={<PublicLayout><NewsPage /></PublicLayout>} />
      <Route path="/gallery" element={<PublicLayout><GalleryPage /></PublicLayout>} />
      <Route path="/tournaments" element={<PublicLayout><TournamentsPage /></PublicLayout>} />
      <Route path="/tournaments/:id" element={<PublicLayout><TournamentDetailPage /></PublicLayout>} />
      <Route path="/leaderboard" element={<PublicLayout><LeaderboardPage /></PublicLayout>} />
      <Route path="/unauthorized" element={<PublicLayout><UnauthorizedPage /></PublicLayout>} />

      {/* ── Authenticated Routes ── */}
      <Route path="/dashboard" element={<AuthPage><DashboardPage /></AuthPage>} />
      <Route path="/profile/settings" element={<AuthPage><ProfileSettingsPage /></AuthPage>} />

      {/* Players */}
      <Route path="/players" element={<AuthPage><PlayersPage /></AuthPage>} />
      <Route path="/players/:id" element={<AuthPage><PlayerDetailPage /></AuthPage>} />
      <Route path="/players/new" element={<AdminPage><PlayerCreatePage /></AdminPage>} />

      {/* Teams */}
      <Route path="/teams" element={<AuthPage><TeamsPage /></AuthPage>} />
      <Route path="/teams/:id" element={<AuthPage><TeamDetailPage /></AuthPage>} />
      <Route path="/teams/new" element={<AdminPage><TeamCreatePage /></AdminPage>} />

      {/* Seasons & Divisions */}
      <Route path="/seasons" element={<AuthPage><SeasonsPage /></AuthPage>} />
      <Route path="/seasons/:id" element={<AuthPage><SeasonDetailPage /></AuthPage>} />
      <Route path="/seasons/new" element={<AdminPage><SeasonCreatePage /></AdminPage>} />
      <Route path="/divisions/:id" element={<AuthPage><DivisionDetailPage /></AuthPage>} />
      <Route path="/divisions/new" element={<AdminPage><DivisionCreatePage /></AdminPage>} />

      {/* Courses */}
      <Route path="/courses" element={<AuthPage><CoursesPage /></AuthPage>} />
      <Route path="/courses/:id" element={<AuthPage><CourseDetailPage /></AuthPage>} />
      <Route path="/courses/new" element={<AdminPage><CourseCreatePage /></AdminPage>} />

      {/* Matches */}
      <Route path="/matches" element={<AuthPage><MatchesPage /></AuthPage>} />
      <Route path="/matches/:id" element={<AuthPage><MatchDetailPage /></AuthPage>} />
      <Route path="/matches/new" element={<AdminPage><MatchCreatePage /></AdminPage>} />

      {/* Rounds & Scoring */}
      <Route path="/rounds/:id" element={<AuthPage><RoundDetailPage /></AuthPage>} />
      <Route path="/rounds/new" element={<AdminPage><RoundCreatePage /></AdminPage>} />
      <Route path="/scorecard/:id" element={<AuthPage><ScorecardPage /></AuthPage>} />
      <Route path="/scorecard/:id/verify" element={<AdminPage><ScorecardVerifyPage /></AdminPage>} />
      <Route path="/scoring/:matchId?" element={<AuthPage><ScoringPage /></AuthPage>} />
      <Route path="/my-scores" element={<AuthPage><MyScoresPage /></AuthPage>} />
      <Route path="/my-statistics" element={<AuthPage><MyStatisticsPage /></AuthPage>} />
      <Route path="/my-tournaments" element={<AuthPage><MyTournamentsPage /></AuthPage>} />

      {/* Practice */}
      <Route path="/practice" element={<AuthPage><PracticeHubPage /></AuthPage>} />
      <Route path="/practice/new" element={<AuthPage><PracticeCreatePage /></AuthPage>} />
      <Route path="/practice/:id" element={<AuthPage><PracticeDetailPage /></AuthPage>} />
      <Route path="/practice/history" element={<AuthPage><PracticeHistoryPage /></AuthPage>} />
      <Route path="/practice/:id/scorecard" element={<AuthPage><PracticeScorecardPage /></AuthPage>} />

      {/* Friendly Matches */}
      <Route path="/friendly-matches" element={<AuthPage><FriendlyMatchesPage /></AuthPage>} />
      <Route path="/friendly-matches/new" element={<AuthPage><FriendlyMatchCreatePage /></AuthPage>} />
      <Route path="/friendly-matches/:id" element={<AuthPage><FriendlyMatchDetailPage /></AuthPage>} />
      <Route path="/friendly-matches/:id/score" element={<AuthPage><FriendlyMatchScorePage /></AuthPage>} />

      {/* Announcements & Notifications */}
      <Route path="/announcements" element={<AuthPage><AnnouncementsPage /></AuthPage>} />
      <Route path="/announcements/:id" element={<AuthPage><AnnouncementDetailPage /></AuthPage>} />
      <Route path="/announcements/manage" element={<AdminPage><AnnouncementManagePage /></AdminPage>} />
      <Route path="/notifications" element={<AuthPage><NotificationsPage /></AuthPage>} />

      {/* Admin & Analytics */}
      <Route path="/admin" element={<AdminPage><AdminDashboardPage /></AdminPage>} />
      <Route path="/organizer" element={<AuthPage><OrganizerDashboardPage /></AuthPage>} />
      <Route path="/analytics" element={<AdminPage><AnalyticsPage /></AdminPage>} />

      {/* 404 */}
      <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
    </Routes>
    </Suspense>
  );
}
