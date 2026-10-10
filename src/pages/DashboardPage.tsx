import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { RoleBadge } from '@/components/auth/RoleBadge';
import { Button } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { ActivityItem as ActivityItemComponent } from '@/components/dashboard/ActivityItem';
import { getLeagueStats } from '@/lib/league';
import { getDashboardStats, getRecentActivity, type DashboardStats, type ActivityItem } from '@/lib/competition';
import {
  User,
  Calendar,
  Shield,
  Users,
  Flag,
  ArrowRight,
  ShieldCheck,
  Trophy,
  Swords,
  Medal,
  FileText,
  TrendingUp,
  Activity,
} from 'lucide-react';

interface LeagueStats {
  seasons: number;
  divisions: number;
  players: number;
  teams: number;
}

type LinkItem = { label: string; path: string; icon: typeof Users };

const MANAGER_LINKS: LinkItem[] = [
  { label: 'Players', path: '/players', icon: Users },
  { label: 'Teams', path: '/teams', icon: Shield },
  { label: 'Tournaments', path: '/tournaments', icon: Trophy },
  { label: 'Leaderboard', path: '/leaderboard', icon: Medal },
  { label: 'Analytics', path: '/analytics', icon: TrendingUp },
];

const PLAYER_LINKS: LinkItem[] = [
  { label: 'Practice Hub', path: '/practice', icon: FileText },
  { label: 'My Scores', path: '/my-scores', icon: Medal },
  { label: 'My Statistics', path: '/my-statistics', icon: TrendingUp },
  { label: 'My Tournaments', path: '/my-tournaments', icon: Trophy },
  { label: 'Leaderboard', path: '/leaderboard', icon: Medal },
  { label: 'Profile Settings', path: '/profile/settings', icon: Users },
];

const TONE_GREEN = 'bg-tmgl-green-50 text-tmgl-green-800 border-tmgl-green-100';
const TONE_SLATE = 'bg-tmgl-charcoal-100 text-tmgl-charcoal-700 border-tmgl-charcoal-200';
const TONE_GOLD = 'bg-tmgl-gold-50 text-tmgl-gold-800 border-tmgl-gold-200';
const TONE_RED = 'bg-red-50 text-red-700 border-red-200';

export function DashboardPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [leagueStats, setLeagueStats] = useState<LeagueStats | null>(null);
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [lsResult, dsResult, actResult] = await Promise.all([
        getLeagueStats(),
        getDashboardStats(),
        getRecentActivity(8),
      ]);
      if (lsResult.data) setLeagueStats(lsResult.data);
      if (dsResult.data) setDashStats(dsResult.data);
      if (actResult.data) setActivity(actResult.data);
      const firstError = lsResult.error || dsResult.error || actResult.error;
      if (firstError) setError(firstError);
    } catch {
      setError('Failed to load dashboard');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSignOut = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    await signOut();
    navigate('/', { replace: true });
  };

  const role = profile?.role ?? 'public';
  const isManager = role === 'league_manager' || role === 'super_admin';

  if (isLoading) {
    return (
      <Container size="lg" className="py-6">
        <LoadingState message="Loading dashboard..." />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" className="py-6">
        <div className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Failed to load dashboard: {error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="mt-3">
          Retry
        </Button>
      </Container>
    );
  }

  const activityIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    tournament: Trophy,
    round: Flag,
    match: Swords,
    scorecard: FileText,
  };

  const displayName =
    profile?.full_name || user?.email?.split('@')[0] || 'TMGL Member';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  const links = isManager ? MANAGER_LINKS : PLAYER_LINKS;

  return (
    <Container size="lg" className="space-y-6 py-6 sm:py-8">
      {/* Identity banner */}
      <section className="rounded-panel bg-tmgl-green-950 p-6 text-white shadow-panel sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-tmgl-gold font-display text-xl font-bold text-tmgl-green-950 ring-4 ring-tmgl-gold/25">
              {initials || <User className="h-6 w-6" />}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-gold-300">
                Welcome back
              </p>
              <h1 className="mt-1 truncate font-display text-display-md text-white">
                {displayName}
              </h1>
              <p className="mt-0.5 truncate text-sm text-tmgl-charcoal-300">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={profile?.role} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 active:bg-white/25"
            >
              Sign out
            </Button>
          </div>
        </div>
      </section>

      {/* Role banner */}
      {role === 'super_admin' && (
        <div className="flex items-start gap-3 rounded-card border border-tmgl-gold-200 bg-tmgl-gold-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-tmgl-gold-700" />
          <div className="text-sm">
            <p className="font-semibold text-tmgl-charcoal-900">Super Admin access active</p>
            <p className="mt-0.5 text-tmgl-charcoal-600">
              Full system access. Manage seasons, teams, players, and all league operations.
            </p>
          </div>
        </div>
      )}
      {role === 'league_manager' && (
        <div className="flex items-start gap-3 rounded-card border border-tmgl-green-200 bg-tmgl-green-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-tmgl-green-700" />
          <div className="text-sm">
            <p className="font-semibold text-tmgl-charcoal-900">League Manager access active</p>
            <p className="mt-0.5 text-tmgl-charcoal-600">
              Manage competition records, seasons, teams, and players.
            </p>
          </div>
        </div>
      )}

      {isManager && (
        <>
          <DashboardSection title="League overview">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Players" value={leagueStats?.players ?? 0} icon={Users} path="/players" color={TONE_GREEN} />
              <StatCard label="Teams" value={leagueStats?.teams ?? 0} icon={Shield} path="/teams" color={TONE_SLATE} />
              <StatCard label="Tournaments" value={dashStats?.totalTournaments ?? 0} icon={Trophy} path="/tournaments" color={TONE_GOLD} />
              <StatCard label="Rounds" value={dashStats?.totalRounds ?? 0} icon={Flag} path="/tournaments" color={TONE_SLATE} />
            </div>
          </DashboardSection>

          <div className="grid gap-6 md:grid-cols-2">
            <DashboardSection title="Tournament status">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Open" value={dashStats?.openTournaments ?? 0} icon={Trophy} path="/tournaments" color={TONE_GREEN} />
                <StatCard label="Live" value={dashStats?.liveTournaments ?? 0} icon={TrendingUp} path="/tournaments" color={TONE_RED} />
                <StatCard label="Done" value={dashStats?.completedTournaments ?? 0} icon={Medal} path="/tournaments" color={TONE_SLATE} />
              </div>
            </DashboardSection>

            <DashboardSection title="Match status">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Scheduled" value={dashStats?.scheduledMatches ?? 0} icon={Calendar} path="/matches" color={TONE_GOLD} />
                <StatCard label="Live" value={dashStats?.liveMatches ?? 0} icon={Swords} path="/matches" color={TONE_RED} />
                <StatCard label="Done" value={dashStats?.completedMatches ?? 0} icon={Medal} path="/matches" color={TONE_SLATE} />
              </div>
            </DashboardSection>
          </div>
        </>
      )}

      {!isManager && (
        <DashboardSection title="My quick stats">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Scorecards" value={dashStats?.completedScorecards ?? 0} icon={FileText} path="/scoring" color={TONE_GREEN} />
            <StatCard label="Tournaments" value={dashStats?.totalTournaments ?? 0} icon={Trophy} path="/tournaments" color={TONE_GOLD} />
          </div>
        </DashboardSection>
      )}

      <DashboardSection title="Quick links">
        <div className="grid gap-2 sm:grid-cols-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                type="button"
                onClick={() => navigate(link.path)}
                className="group flex items-center justify-between rounded-card border border-tmgl-charcoal-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-tmgl-green-300 hover:shadow-card"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-tmgl-green-50 text-tmgl-green-700 transition-colors group-hover:bg-tmgl-green-800 group-hover:text-white">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-sm font-semibold text-tmgl-charcoal-800">{link.label}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-tmgl-charcoal-300 transition-all group-hover:translate-x-0.5 group-hover:text-tmgl-green-600" />
              </button>
            );
          })}
        </div>
      </DashboardSection>

      <DashboardSection
        title="Recent activity"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
            <Activity className="mr-1 h-4 w-4" /> View all
          </Button>
        }
      >
        {activity.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="Activity appears here as events occur."
          />
        ) : (
          <div className="space-y-2">
            {activity.map((item) => (
              <ActivityItemComponent
                key={item.id}
                description={item.description}
                timestamp={item.timestamp}
                path={item.path}
                icon={activityIconMap[item.type]}
              />
            ))}
          </div>
        )}
      </DashboardSection>
    </Container>
  );
}
