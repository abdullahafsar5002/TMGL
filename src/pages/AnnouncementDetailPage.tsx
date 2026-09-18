import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { getAnnouncement, deleteAnnouncement } from '@/lib/announcements';
import type { Announcement } from '@/types/database';
import type { Profile } from '@/types/database';
import { supabase } from '@/lib/supabase';

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        const role = (profile as Profile | null)?.role;
        setIsManager(role === 'super_admin' || role === 'league_manager');
      }

      const result = await getAnnouncement(id);
      if (result.error || !result.data) {
        setError('Announcement not found.');
        return;
      }
      setAnnouncement(result.data);
    } catch {
      setError('Failed to load announcement.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDelete() {
    if (!id) return;
    const result = await deleteAnnouncement(id);
    if (result.error) {
      setError(result.error);
    } else {
      toast.success('Announcement deleted.');
      navigate('/announcements');
    }
  }

  if (loading) return <LoadingState message="Loading announcement..." />;

  if (!announcement) {
    return (
      <Container className="py-8">
        <div className="text-center text-gray-500">Announcement not found.</div>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{announcement.title}</h1>
            {!announcement.is_published && (
              <Badge variant="warning">Draft</Badge>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {new Date(announcement.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/announcements/${announcement.id}/edit`)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <Card variant="bordered">
        <CardContent className="p-6">
          <div className="prose prose-green max-w-none">
            {announcement.content.split('\n').map((paragraph, i) => (
              <p key={i} className="text-gray-700 whitespace-pre-wrap mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Announcement?"
        message="This will permanently delete this announcement."
      />
    </Container>
  );
}
