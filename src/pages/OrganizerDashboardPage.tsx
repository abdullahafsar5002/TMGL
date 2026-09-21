import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, BarChart3, Plus, ClipboardCheck } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatsCard } from '@/components/common/StatsCard';
import { LoadingState } from '@/components/common/LoadingState';
import { supabase } from '@/lib/supabase';

export function OrganizerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ tournaments: 0, players: 0, teams: 0, pendingVerifications: 0 });

  useEffect(() => {
    const load = async () => {
      const [tournRes, playersRes, teamsRes, scRes] = await Promise.all([
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
        supabase.from('players').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('scorecards').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      ]);
      setStats({
        tournaments: tournRes.count ?? 0,
        players: playersRes.count ?? 0,
        teams: teamsRes.count ?? 0,
        pendingVerifications: scRes.count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;

  return (
    <Container className="py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-tmgl-charcoal-900">Organizer Dashboard</h1>
        <p className="text-tmgl-charcoal-600 mt-2">Manage tournaments, players, and league operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Tournaments" value={stats.tournaments} icon={<Trophy className="h-5 w-5" />} />
        <StatsCard label="Players" value={stats.players} icon={<Users className="h-5 w-5" />} />
        <StatsCard label="Teams" value={stats.teams} icon={<BarChart3 className="h-5 w-5" />} />
        <StatsCard label="Pending Verifications" value={stats.pendingVerifications} icon={<ClipboardCheck className="h-5 w-5" />} variant={stats.pendingVerifications > 0 ? 'gold' : 'default'} />
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
            <h3 className="text-lg font-semibold text-tmgl-charcoal-900 mb-4">Management</h3>
            <div className="space-y-2">
              {[
                { label: 'Manage Tournaments', path: '/tournaments', icon: Trophy },
                { label: 'Manage Players', path: '/players', icon: Users },
                { label: 'Manage Teams', path: '/teams', icon: Users },
                { label: 'Manage Courses', path: '/courses', icon: Calendar },
              ].map((item) => (
                <Link key={item.path} to={item.path} className="flex items-center gap-3 p-2 rounded-lg hover:bg-tmgl-charcoal-50 transition-colors">
                  <item.icon className="w-4 h-4 text-tmgl-green-700" />
                  <span className="text-sm font-medium text-tmgl-charcoal-700">{item.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
