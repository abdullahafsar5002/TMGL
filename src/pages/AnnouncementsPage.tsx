import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { PageHeader } from '@/components/common/PageHeader';
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
      <PageHeader
        eyebrow="News"
        title="Announcements"
        description={`${announcements.length} announcement${announcements.length !== 1 ? 's' : ''} from the league.`}
        actions={
          isManager ? (
            <Link to="/announcements/manage">
              <Button variant="primary">
                <Plus className="mr-2 h-4 w-4" />
                Manage
              </Button>
            </Link>
          ) : undefined
        }
      />

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
            <Link key={announcement.id} to={`/announcements/${announcement.id}`} className="block">
              <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:border-tmgl-green-300 hover:shadow-card-hover">
                <CardContent className="p-5">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-tmgl-charcoal-950">
                        {announcement.title}
                      </h3>
                      {!announcement.is_published && <Badge variant="warning">Draft</Badge>}
                    </div>
                    <p className="line-clamp-2 text-sm text-tmgl-charcoal-600">
                      {announcement.content.substring(0, 150)}
                      {announcement.content.length > 150 ? '...' : ''}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wider text-tmgl-charcoal-400">
                      {new Date(announcement.created_at).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
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
