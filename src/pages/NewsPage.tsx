import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, ArrowRight } from 'lucide-react';
import { Container } from '@/components/common/Container';
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-tmgl-charcoal-900 mb-2">News & Announcements</h1>
        <p className="text-tmgl-charcoal-600 mb-8">Stay updated with the latest from TMGL</p>

        {announcements.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="No announcements yet"
            description="Check back later for updates from the league."
          />
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <Link key={a.id} to={`/announcements/${a.id}`}>
                <Card className="hover:border-tmgl-green-300 transition-colors cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-tmgl-charcoal-900">{a.title}</h2>
                        <p className="text-sm text-tmgl-charcoal-500 mt-1">
                          {new Date(a.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-tmgl-charcoal-600 mt-2 line-clamp-2">{a.content}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-tmgl-charcoal-400 mt-1 ml-4 shrink-0" />
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
