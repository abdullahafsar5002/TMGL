import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { RoleBadge } from '@/components/auth/RoleBadge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
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
    await signOut();
    navigate('/', { replace: true });
  };

  const role = profile?.role ?? 'player';
  const isManager = role === 'league_manager' || role === 'super_admin';

  if (isLoading) {
    return <Container size="lg" className="py-4"><LoadingState message="Loading dashboard..." /></Container>;
  }

  if (error) {
    return (
      <Container size="lg" className="py-4">
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <p className="font-semibold">Failed to load dashboard: {error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="mt-3">Retry</Button>
      </Container>
    );
  }

  const activityIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    tournament: Trophy,
    round: Flag,
    match: Swords,
    scorecard: FileText,
  };

  return (
    <Container size="lg" className="space-y-6 py-4">
      {/* Identity card */}
      <Card variant="elevated">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-tmgl-green-100 border-2 border-tmgl-green-200 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-tmgl-green-700" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-tmgl-charcoal-900 truncate">
                {profile?.full_name || 'TMGL Member'}
              </h2>
              <p className="text-sm text-tmgl-charcoal-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RoleBadge role={profile?.role} />
          </div>
        </div>
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={handleSignOut} className="text-red-600 border-red-200 hover:bg-red-50">
            Sign out
          </Button>
        </div>
      </Card>

      {/* Role banner */}
      {role === 'super_admin' && (
        <div className="flex items-start gap-3 p-4 bg-tmgl-gold-50 border border-tmgl-gold-200 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-tmgl-gold-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-tmgl-charcoal-900">Super Admin access active.</p>
            <p className="text-tmgl-charcoal-600 mt-0.5">
              Full system access. Manage seasons, teams, players, and all league operations.
            </p>
          </div>
        </div>
      )}
      {role === 'league_manager' && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-tmgl-charcoal-900">League Manager access active.</p>
            <p className="text-tmgl-charcoal-600 mt-0.5">
              Manage competition records, seasons, teams, and players.
            </p>
          </div>
        </div>
      )}

      {/* Manager dashboard */}
      {isManager && (
        <>
          <DashboardSection title="League Overview">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Players" value={leagueStats?.players ?? 0} icon={Users} path="/players" color="bg-blue-50 text-blue-700 border-blue-200" />
              <StatCard label="Teams" value={leagueStats?.teams ?? 0} icon={Shield} path="/teams" color="bg-amber-50 text-amber-700 border-amber-200" />
              <StatCard label="Tournaments" value={dashStats?.totalTournaments ?? 0} icon={Trophy} path="/tournaments" color="bg-purple-50 text-purple-700 border-purple-200" />
              <StatCard label="Rounds" value={dashStats?.totalRounds ?? 0} icon={Flag} path="/tournaments" color="bg-emerald-50 text-emerald-700 border-emerald-200" />
            </div>
          </DashboardSection>

          <DashboardSection title="Tournament Status">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Open" value={dashStats?.openTournaments ?? 0} icon={Trophy} path="/tournaments" color="bg-emerald-50 text-emerald-700 border-emerald-200" />
              <StatCard label="Live" value={dashStats?.liveTournaments ?? 0} icon={TrendingUp} path="/tournaments" color="bg-red-50 text-red-700 border-red-200" />
              <StatCard label="Completed" value={dashStats?.completedTournaments ?? 0} icon={Medal} path="/tournaments" color="bg-blue-50 text-blue-700 border-blue-200" />
            </div>
          </DashboardSection>

          <DashboardSection title="Match Status">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Scheduled" value={dashStats?.scheduledMatches ?? 0} icon={Calendar} path="/matches" color="bg-amber-50 text-amber-700 border-amber-200" />
              <StatCard label="Live" value={dashStats?.liveMatches ?? 0} icon={Swords} path="/matches" color="bg-red-50 text-red-700 border-red-200" />
              <StatCard label="Completed" value={dashStats?.completedMatches ?? 0} icon={Medal} path="/matches" color="bg-emerald-50 text-emerald-700 border-emerald-200" />
            </div>
          </DashboardSection>

          <DashboardSection title="Quick Links">
            <div className="space-y-2">
              {[
                { label: 'Players', path: '/players', icon: Users, color: 'text-blue-600' },
                { label: 'Teams', path: '/teams', icon: Shield, color: 'text-amber-600' },
                { label: 'Tournaments', path: '/tournaments', icon: Trophy, color: 'text-purple-600' },
                { label: 'Leaderboard', path: '/leaderboard', icon: Medal, color: 'text-emerald-600' },
                { label: 'Analytics', path: '/analytics', icon: TrendingUp, color: 'text-tmgl-green-700' },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <button key={link.path} onClick={() => navigate(link.path)}
                    className="w-full flex items-center justify-between p-4 bg-white border border-tmgl-charcoal-200 rounded-xl hover:border-tmgl-green-300 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${link.color}`} />
                      <span className="text-sm font-semibold text-tmgl-charcoal-900">{link.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-tmgl-charcoal-400" />
                  </button>
                );
              })}
            </div>
          </DashboardSection>
        </>
      )}

      {/* Player dashboard */}
      {!isManager && (
        <>
          <DashboardSection title="My Quick Stats">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Scorecards" value={dashStats?.completedScorecards ?? 0} icon={FileText} path="/scoring" color="bg-blue-50 text-blue-700 border-blue-200" />
              <StatCard label="Tournaments" value={dashStats?.totalTournaments ?? 0} icon={Trophy} path="/tournaments" color="bg-purple-50 text-purple-700 border-purple-200" />
            </div>
          </DashboardSection>

          <DashboardSection title="Quick Links">
            <div className="space-y-2">
              {[
                { label: 'Practice Hub', path: '/practice', icon: FileText, color: 'text-green-600' },
                { label: 'My Scores', path: '/my-scores', icon: Medal, color: 'text-blue-600' },
                { label: 'My Statistics', path: '/my-statistics', icon: TrendingUp, color: 'text-purple-600' },
                { label: 'My Tournaments', path: '/my-tournaments', icon: Trophy, color: 'text-amber-600' },
                { label: 'Leaderboard', path: '/leaderboard', icon: Medal, color: 'text-emerald-600' },
                { label: 'Profile Settings', path: '/profile/settings', icon: Users, color: 'text-gray-600' },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <button key={link.path} onClick={() => navigate(link.path)}
                    className="w-full flex items-center justify-between p-4 bg-white border border-tmgl-charcoal-200 rounded-xl hover:border-tmgl-green-300 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${link.color}`} />
                      <span className="text-sm font-semibold text-tmgl-charcoal-900">{link.label}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-tmgl-charcoal-400" />
                  </button>
                );
              })}
            </div>
          </DashboardSection>
        </>
      )}

      {/* Activity Feed — shared for both roles */}
      <DashboardSection title="Recent Activity" action={
        <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
          <Activity className="w-4 h-4 mr-1" /> View All
        </Button>
      }>
        {activity.length === 0 ? (
          <EmptyState icon={Activity} title="No recent activity" description="Activity will appear here as events occur." />
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
