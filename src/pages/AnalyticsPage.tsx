import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Trophy, Swords, Users, FileText, Shield, ArrowLeft, Activity, Flag, RefreshCw } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { LoadingState } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/EmptyState';
import { StatCard } from '@/components/dashboard/StatCard';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { ActivityItem as ActivityItemComponent } from '@/components/dashboard/ActivityItem';
import { getLeagueAnalytics, getRecentActivity, type LeagueAnalytics, type ActivityItem } from '@/lib/competition';

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<LeagueAnalytics | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [aRes, actRes] = await Promise.all([
      getLeagueAnalytics(),
      getRecentActivity(15),
    ]);
    if (aRes.error) setError(aRes.error);
    if (aRes.data) setAnalytics(aRes.data);
    if (actRes.data) setActivity(actRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (isLoading) return <Container size="lg" className="py-4"><LoadingState message="Loading analytics..." /></Container>;

  if (error) {
    return (
      <Container size="lg" className="py-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <p className="font-semibold">Failed to load analytics: {error}</p>
        </div>
        <button onClick={load} className="mt-3 flex items-center gap-1.5 text-sm text-tmgl-green-800 hover:underline">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
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
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </button>

      <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-tmgl-green-800" /> League Analytics
      </h1>

      {!analytics ? (
        <EmptyState icon={TrendingUp} title="No data available" description="Analytics will appear once data is available in the system." />
      ) : (
        <>
          {/* Tournament Stats */}
          <DashboardSection title="Tournament Stats">
            <Card>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { label: 'Total', value: analytics.tournaments.total, variant: 'default' as BadgeVariant },
                    { label: 'Draft', value: analytics.tournaments.draft, variant: 'outline' as BadgeVariant },
                    { label: 'Open', value: analytics.tournaments.open, variant: 'success' as BadgeVariant },
                    { label: 'Live', value: analytics.tournaments.live, variant: 'danger' as BadgeVariant },
                    { label: 'Completed', value: analytics.tournaments.completed, variant: 'info' as BadgeVariant },
                    { label: 'Cancelled', value: analytics.tournaments.cancelled, variant: 'warning' as BadgeVariant },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                      <p className="text-xl font-bold text-tmgl-charcoal-900">{stat.value}</p>
                      <Badge variant={stat.variant} className="mt-1">{stat.label}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </DashboardSection>

          {/* Match Stats */}
          <DashboardSection title="Match Stats">
            <Card>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { label: 'Total', value: analytics.matches.total, variant: 'default' as BadgeVariant },
                    { label: 'Draft', value: analytics.matches.draft, variant: 'outline' as BadgeVariant },
                    { label: 'Scheduled', value: analytics.matches.scheduled, variant: 'warning' as BadgeVariant },
                    { label: 'Live', value: analytics.matches.live, variant: 'danger' as BadgeVariant },
                    { label: 'Completed', value: analytics.matches.completed, variant: 'success' as BadgeVariant },
                    { label: 'Cancelled', value: analytics.matches.cancelled, variant: 'info' as BadgeVariant },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                      <p className="text-xl font-bold text-tmgl-charcoal-900">{stat.value}</p>
                      <Badge variant={stat.variant} className="mt-1">{stat.label}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </DashboardSection>

          {/* Scoring Stats */}
          <DashboardSection title="Scoring Stats">
            <Card>
              <CardContent>
                {analytics.scorecards.completed === 0 ? (
                  <EmptyState icon={FileText} title="No scoring data" description="Scorecards will appear here once scores are entered." />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                      <p className="text-xl font-bold text-tmgl-charcoal-900">{analytics.scorecards.completed}</p>
                      <p className="text-xs text-tmgl-charcoal-500 mt-0.5">Scorecards</p>
                    </div>
                    <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                      <p className="text-xl font-bold text-tmgl-charcoal-900">{analytics.scorecards.totalStrokes.toLocaleString()}</p>
                      <p className="text-xs text-tmgl-charcoal-500 mt-0.5">Total Strokes</p>
                    </div>
                    <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                      <p className="text-xl font-bold text-tmgl-charcoal-900">{analytics.scorecards.averageStrokes ?? '—'}</p>
                      <p className="text-xs text-tmgl-charcoal-500 mt-0.5">Avg Strokes</p>
                    </div>
                    <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                      <p className="text-xl font-bold text-tmgl-charcoal-900">
                        {analytics.scorecards.totalScoreToPar > 0 ? '+' : ''}{analytics.scorecards.totalScoreToPar}
                      </p>
                      <p className="text-xs text-tmgl-charcoal-500 mt-0.5">Total to Par</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </DashboardSection>

          {/* Quick Links */}
          <DashboardSection title="Detailed Views">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Players" value={analytics.matches.total > 0 ? 'View' : '—'} icon={Users} path="/players" color="bg-blue-50 text-blue-700 border-blue-200" />
              <StatCard label="Teams" value={analytics.matches.total > 0 ? 'View' : '—'} icon={Shield} path="/teams" color="bg-amber-50 text-amber-700 border-amber-200" />
              <StatCard label="Leaderboard" value={analytics.scorecards.completed > 0 ? 'View' : '—'} icon={TrendingUp} path="/leaderboard" color="bg-emerald-50 text-emerald-700 border-emerald-200" />
            </div>
          </DashboardSection>

          {/* Activity Feed */}
          <DashboardSection title="Activity Feed">
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
        </>
      )}
    </Container>
  );
}
