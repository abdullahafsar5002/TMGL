import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { getPublishedAnnouncements, getAllAnnouncements } from '@/lib/announcements';
import type { Announcement } from '@/types/database';
import type { Profile } from '@/types/database';
import { supabase } from '@/lib/supabase';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isManager, setIsManager] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = (profile as Profile | null)?.role;
      const manager = role === 'super_admin' || role === 'league_manager';
      setIsManager(manager);

      const result = manager ? await getAllAnnouncements() : await getPublishedAnnouncements();
      if (result.error) setError(result.error);
      else setAnnouncements(result.data ?? []);
    } catch {
      setError('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingState message="Loading announcements..." />;

  return (
    <Container className="py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 mt-1">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
        </div>
        {isManager && (
          <Link to="/announcements/new">
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="There are no announcements at this time."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map(announcement => (
            <Link key={announcement.id} to={`/announcements/${announcement.id}`}>
              <Card variant="bordered" className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{announcement.title}</h3>
                        {!announcement.is_published && (
                          <Badge variant="warning">Draft</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {announcement.content.substring(0, 150)}
                        {announcement.content.length > 150 ? '...' : ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(announcement.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
