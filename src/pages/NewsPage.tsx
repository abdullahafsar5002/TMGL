import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, ArrowRight } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { getPublishedAnnouncements } from '@/lib/announcements';
import type { Announcement } from '@/types/database';

export function NewsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublishedAnnouncements().then((res) => {
      setAnnouncements(res.data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState message="Loading news..." />;

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="News"
          title="Announcements"
          description="Fixtures, results and updates from around the league."
        />

        {announcements.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="No announcements yet"
            description="Check back later for updates from the league."
          />
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <Link key={a.id} to={`/announcements/${a.id}`} className="block">
                <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:border-tmgl-green-300 hover:shadow-card-hover">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-lg font-semibold text-tmgl-charcoal-950">{a.title}</h2>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wider text-tmgl-charcoal-400">
                          {new Date(a.created_at).toLocaleDateString()}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-tmgl-charcoal-600">{a.content}</p>
                      </div>
                      <ArrowRight className="mt-1 ml-4 h-5 w-5 shrink-0 text-tmgl-charcoal-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
