import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Trophy, Calendar, BarChart3, Database, FileText, Plus } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatsCard } from '@/components/common/StatsCard';
import { LoadingState } from '@/components/common/LoadingState';
import { supabase } from '@/lib/supabase';

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, players: 0, tournaments: 0, matches: 0, scorecards: 0, courses: 0 });

  useEffect(() => {
    const load = async () => {
      const results = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('players').select('id', { count: 'exact', head: true }),
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id', { count: 'exact', head: true }),
        supabase.from('scorecards').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        users: results[0].count ?? 0,
        players: results[1].count ?? 0,
        tournaments: results[2].count ?? 0,
        matches: results[3].count ?? 0,
        scorecards: results[4].count ?? 0,
        courses: results[5].count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <LoadingState message="Loading admin dashboard..." />;

  return (
    <Container className="py-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-tmgl-green-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-tmgl-green-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-tmgl-charcoal-900">Admin Dashboard</h1>
          <p className="text-tmgl-charcoal-600">System-wide overview and management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard label="Total Users" value={stats.users} icon={<Users className="h-5 w-5" />} />
        <StatsCard label="Players" value={stats.players} icon={<Users className="h-5 w-5" />} />
        <StatsCard label="Tournaments" value={stats.tournaments} icon={<Trophy className="h-5 w-5" />} />
        <StatsCard label="Matches" value={stats.matches} icon={<BarChart3 className="h-5 w-5" />} />
        <StatsCard label="Scorecards" value={stats.scorecards} icon={<FileText className="h-5 w-5" />} />
        <StatsCard label="Courses" value={stats.courses} icon={<Database className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-tmgl-charcoal-900">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/tournaments/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" /> New Tournament
                </Button>
              </Link>
              <Link to="/players/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" /> Add Player
                </Button>
              </Link>
              <Link to="/teams/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" /> Create Team
                </Button>
              </Link>
              <Link to="/courses/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" /> Add Course
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-tmgl-charcoal-900 mb-4">System Management</h3>
            <div className="space-y-2">
              {[
                { label: 'Manage Users', path: '/players', icon: Users },
                { label: 'Manage Tournaments', path: '/tournaments', icon: Trophy },
                { label: 'Manage Courses', path: '/courses', icon: Database },
                { label: 'View Matches', path: '/matches', icon: Calendar },
                { label: 'Announcements', path: '/announcements/manage', icon: FileText },
              ].map((item) => (
                <Link key={item.path} to={item.path} className="flex items-center gap-3 p-2 rounded-lg hover:bg-tmgl-charcoal-50 transition-colors">
                  <item.icon className="w-4 h-4 text-tmgl-green-700" />
                  <span className="text-sm font-medium text-tmgl-charcoal-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-tmgl-charcoal-900 mb-4">Analytics</h3>
            <div className="space-y-2">
              <Link to="/analytics" className="flex items-center gap-3 p-2 rounded-lg hover:bg-tmgl-charcoal-50 transition-colors">
                <BarChart3 className="w-4 h-4 text-tmgl-green-700" />
                <span className="text-sm font-medium text-tmgl-charcoal-700">League Analytics</span>
              </Link>
              <Link to="/leaderboard" className="flex items-center gap-3 p-2 rounded-lg hover:bg-tmgl-charcoal-50 transition-colors">
                <Trophy className="w-4 h-4 text-tmgl-green-700" />
                <span className="text-sm font-medium text-tmgl-charcoal-700">Leaderboard</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
