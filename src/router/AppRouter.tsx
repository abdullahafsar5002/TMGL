import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { lazyNamed } from './pageLoader';
import { ROUTE_PATTERNS } from './routes';
import { getRequiredRoleForPath } from '@/components/layout/authNavigation';

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

function ManagerPage({ children }: { children: React.ReactNode }) {
  const requiredRole = getRequiredRoleForPath(MANAGER_ROUTE_ROOT) ?? 'league_manager';
  return <ProtectedRoute requiredRole={requiredRole}><AuthenticatedLayout>{children}</AuthenticatedLayout></ProtectedRoute>;
}

function CompetitionLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  return isAuthenticated
    ? <AuthenticatedLayout>{children}</AuthenticatedLayout>
    : <PublicLayout>{children}</PublicLayout>;
}

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <LoadingState message="Loading..." />
    </div>
  );
}

// Public pages
const TournamentsPage = lazyNamed(() => import('@/pages/TournamentsPage'), 'TournamentsPage');
const TournamentDetailPage = lazyNamed(() => import('@/pages/TournamentDetailPage'), 'TournamentDetailPage');
const TournamentCreatePage = lazyNamed(() => import('@/pages/TournamentCreatePage'), 'TournamentCreatePage');
const LeaderboardPage = lazyNamed(() => import('@/pages/LeaderboardPage'), 'LeaderboardPage');
const ForgotPasswordPage = lazyNamed(() => import('@/pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('@/pages/ResetPasswordPage'), 'ResetPasswordPage');
const AboutPage = lazyNamed(() => import('@/pages/AboutPage'), 'AboutPage');
const ContactPage = lazyNamed(() => import('@/pages/ContactPage'), 'ContactPage');
const NewsPage = lazyNamed(() => import('@/pages/NewsPage'), 'NewsPage');
const GalleryPage = lazyNamed(() => import('@/pages/GalleryPage'), 'GalleryPage');

// Authenticated pages
const DashboardPage = lazyNamed(() => import('@/pages/DashboardPage'), 'DashboardPage');
const ProfileSettingsPage = lazyNamed(() => import('@/pages/ProfileSettingsPage'), 'ProfileSettingsPage');
const PlayersPage = lazyNamed(() => import('@/pages/PlayersPage'), 'PlayersPage');
const PlayerDetailPage = lazyNamed(() => import('@/pages/PlayerDetailPage'), 'PlayerDetailPage');
const PlayerCreatePage = lazyNamed(() => import('@/pages/PlayerCreatePage'), 'PlayerCreatePage');
const TeamsPage = lazyNamed(() => import('@/pages/TeamsPage'), 'TeamsPage');
const TeamDetailPage = lazyNamed(() => import('@/pages/TeamDetailPage'), 'TeamDetailPage');
const TeamCreatePage = lazyNamed(() => import('@/pages/TeamCreatePage'), 'TeamCreatePage');
const SeasonsPage = lazyNamed(() => import('@/pages/SeasonsPage'), 'SeasonsPage');
const SeasonDetailPage = lazyNamed(() => import('@/pages/SeasonDetailPage'), 'SeasonDetailPage');
const SeasonCreatePage = lazyNamed(() => import('@/pages/SeasonCreatePage'), 'SeasonCreatePage');
const DivisionDetailPage = lazyNamed(() => import('@/pages/DivisionDetailPage'), 'DivisionDetailPage');
const DivisionCreatePage = lazyNamed(() => import('@/pages/DivisionCreatePage'), 'DivisionCreatePage');
const CoursesPage = lazyNamed(() => import('@/pages/CoursesPage'), 'CoursesPage');
const CourseDetailPage = lazyNamed(() => import('@/pages/CourseDetailPage'), 'CourseDetailPage');
const CourseCreatePage = lazyNamed(() => import('@/pages/CourseCreatePage'), 'CourseCreatePage');
const MatchesPage = lazyNamed(() => import('@/pages/MatchesPage'), 'MatchesPage');
const MatchDetailPage = lazyNamed(() => import('@/pages/MatchDetailPage'), 'MatchDetailPage');
const MatchCreatePage = lazyNamed(() => import('@/pages/MatchCreatePage'), 'MatchCreatePage');
const RoundDetailPage = lazyNamed(() => import('@/pages/RoundDetailPage'), 'RoundDetailPage');
const RoundCreatePage = lazyNamed(() => import('@/pages/RoundCreatePage'), 'RoundCreatePage');
const ScorecardPage = lazyNamed(() => import('@/pages/ScorecardPage'), 'ScorecardPage');
const ScorecardVerifyPage = lazyNamed(() => import('@/pages/ScorecardVerifyPage'), 'ScorecardVerifyPage');
const ScoringPage = lazyNamed(() => import('@/pages/ScoringPage'), 'ScoringPage');
const MyScoresPage = lazyNamed(() => import('@/pages/MyScoresPage'), 'MyScoresPage');
const MyStatisticsPage = lazyNamed(() => import('@/pages/MyStatisticsPage'), 'MyStatisticsPage');
const MyTournamentsPage = lazyNamed(() => import('@/pages/MyTournamentsPage'), 'MyTournamentsPage');
const PracticeHubPage = lazyNamed(() => import('@/pages/PracticeHubPage'), 'PracticeHubPage');
const PracticeCreatePage = lazyNamed(() => import('@/pages/PracticeCreatePage'), 'PracticeCreatePage');
const PracticeDetailPage = lazyNamed(() => import('@/pages/PracticeDetailPage'), 'PracticeDetailPage');
const PracticeHistoryPage = lazyNamed(() => import('@/pages/PracticeHistoryPage'), 'PracticeHistoryPage');
const PracticeScorecardPage = lazyNamed(() => import('@/pages/PracticeScorecardPage'), 'PracticeScorecardPage');
const FriendlyMatchesPage = lazyNamed(() => import('@/pages/FriendlyMatchesPage'), 'FriendlyMatchesPage');
const FriendlyMatchCreatePage = lazyNamed(() => import('@/pages/FriendlyMatchCreatePage'), 'FriendlyMatchCreatePage');
const FriendlyMatchDetailPage = lazyNamed(() => import('@/pages/FriendlyMatchDetailPage'), 'FriendlyMatchDetailPage');
const FriendlyMatchScorePage = lazyNamed(() => import('@/pages/FriendlyMatchScorePage'), 'FriendlyMatchScorePage');
const AnnouncementsPage = lazyNamed(() => import('@/pages/AnnouncementsPage'), 'AnnouncementsPage');
const AnnouncementDetailPage = lazyNamed(() => import('@/pages/AnnouncementDetailPage'), 'AnnouncementDetailPage');
const AnnouncementManagePage = lazyNamed(() => import('@/pages/AnnouncementManagePage'), 'AnnouncementManagePage');
const NotificationsPage = lazyNamed(() => import('@/pages/NotificationsPage'), 'NotificationsPage');
const AdminDashboardPage = lazyNamed(() => import('@/pages/AdminDashboardPage'), 'AdminDashboardPage');
const OrganizerDashboardPage = lazyNamed(() => import('@/pages/OrganizerDashboardPage'), 'OrganizerDashboardPage');
const AnalyticsPage = lazyNamed(() => import('@/pages/AnalyticsPage'), 'AnalyticsPage');
const UnauthorizedPage = lazyNamed(() => import('@/pages/UnauthorizedPage'), 'UnauthorizedPage');

// Membership
const MembershipPage = lazyNamed(() => import('@/components/membership/MembershipPage'), 'MembershipPage');

const MANAGER_ROUTE_ROOT = '/organizer';

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* ── Public Routes ── */}
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<PublicLayout><ForgotPasswordPage /></PublicLayout>} />
      <Route path="/reset-password" element={<PublicLayout><ResetPasswordPage /></PublicLayout>} />
      <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
      <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
      <Route path="/news" element={<PublicLayout><NewsPage /></PublicLayout>} />
      <Route path="/gallery" element={<PublicLayout><GalleryPage /></PublicLayout>} />
      <Route path="/tournaments" element={<CompetitionLayout><TournamentsPage /></CompetitionLayout>} />
      <Route path="/tournaments/:id" element={<CompetitionLayout><TournamentDetailPage /></CompetitionLayout>} />
      <Route path="/leaderboard" element={<CompetitionLayout><LeaderboardPage /></CompetitionLayout>} />
      <Route path="/unauthorized" element={<PublicLayout><UnauthorizedPage /></PublicLayout>} />

      {/* ── Authenticated Routes ── */}
      <Route path="/dashboard" element={<AuthPage><DashboardPage /></AuthPage>} />
      <Route path={ROUTE_PATTERNS.authenticatedEvents} element={<AuthPage><TournamentsPage /></AuthPage>} />
      <Route path={ROUTE_PATTERNS.authenticatedLeaderboard} element={<AuthPage><LeaderboardPage /></AuthPage>} />
      <Route path="/profile/settings" element={<AuthPage><ProfileSettingsPage /></AuthPage>} />

      <Route path="/tournaments/new" element={<AdminPage><TournamentCreatePage /></AdminPage>} />
      <Route path={ROUTE_PATTERNS.tournamentRoundCreate} element={<AdminPage><RoundCreatePage /></AdminPage>} />

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

      {/* Rounds & Scoring */}
      <Route path={ROUTE_PATTERNS.roundMatchCreate} element={<AdminPage><MatchCreatePage /></AdminPage>} />
      <Route path="/rounds/:id" element={<AuthPage><RoundDetailPage /></AuthPage>} />
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
      <Route path={ROUTE_PATTERNS.practiceScore} element={<AuthPage><PracticeScorecardPage /></AuthPage>} />
      <Route path={ROUTE_PATTERNS.practiceScorecard} element={<AuthPage><PracticeScorecardPage /></AuthPage>} />

      {/* Friendly Matches */}
      <Route path={ROUTE_PATTERNS.friendlyMatches} element={<AuthPage><FriendlyMatchesPage /></AuthPage>} />
      <Route path={ROUTE_PATTERNS.friendlyMatchCreate} element={<AuthPage><FriendlyMatchCreatePage /></AuthPage>} />
      <Route path={ROUTE_PATTERNS.friendlyMatch} element={<AuthPage><FriendlyMatchDetailPage /></AuthPage>} />
      <Route path={ROUTE_PATTERNS.friendlyMatchScore} element={<AuthPage><FriendlyMatchScorePage /></AuthPage>} />
      <Route path={ROUTE_PATTERNS.legacyFriendlyMatches} element={<AuthPage><FriendlyMatchesPage /></AuthPage>} />
      <Route path={ROUTE_PATTERNS.legacyFriendlyMatchCreate} element={<AuthPage><FriendlyMatchCreatePage /></AuthPage>} />
      <Route path={ROUTE_PATTERNS.legacyFriendlyMatch} element={<AuthPage><FriendlyMatchDetailPage /></AuthPage>} />
      <Route path={ROUTE_PATTERNS.legacyFriendlyMatchScore} element={<AuthPage><FriendlyMatchScorePage /></AuthPage>} />

      {/* Announcements & Notifications */}
      <Route path="/announcements" element={<AuthPage><AnnouncementsPage /></AuthPage>} />
      <Route path="/announcements/:id" element={<AuthPage><AnnouncementDetailPage /></AuthPage>} />
      <Route path="/announcements/manage" element={<AdminPage><AnnouncementManagePage /></AdminPage>} />
      <Route path="/notifications" element={<AuthPage><NotificationsPage /></AuthPage>} />

      {/* Admin & Analytics */}
      <Route path="/admin" element={<AdminPage><AdminDashboardPage /></AdminPage>} />
      <Route path="/organizer" element={<ManagerPage><OrganizerDashboardPage /></ManagerPage>} />
      <Route path="/analytics" element={<AdminPage><AnalyticsPage /></AdminPage>} />

      {/* Membership */}
      <Route path="/membership" element={<AuthPage><MembershipPage /></AuthPage>} />

      {/* 404 */}
      <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
    </Routes>
    </Suspense>
  );
}
