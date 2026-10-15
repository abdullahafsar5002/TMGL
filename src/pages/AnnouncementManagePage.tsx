import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { useToast } from '@/context/ToastContext';
import { createAnnouncement, getAnnouncement, updateAnnouncement } from '@/lib/announcements';
import type { Profile } from '@/types/database';
import { supabase } from '@/lib/supabase';

export default function AnnouncementManagePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [wasPublished, setWasPublished] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const isEditing = !!id;

  useEffect(() => {
    async function load() {
      if (!user) {
        setError('You must be logged in.');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      const role = (profile as Profile | null)?.role;
      const manager = role === 'super_admin' || role === 'league_manager';
      setIsManager(manager);

      if (!manager) {
        setError('You do not have permission to manage announcements.');
        setLoading(false);
        return;
      }

      if (id) {
        const result = await getAnnouncement(id);
        if (result.error || !result.data) {
          setError('Announcement not found.');
        } else {
          setTitle(result.data.title);
          setContent(result.data.content);
          setIsPublished(result.data.is_published);
          setWasPublished(result.data.is_published);
        }
      }
      setLoading(false);
    }
    load();
  }, [id, user]);

  function buildExcerpt(value: string, limit = 240): string {
    const collapsed = value.replace(/\s+/g, ' ').trim();
    if (collapsed.length <= limit) return collapsed;
    return `${collapsed.slice(0, limit).trimEnd()}…`;
  }

  async function notifyMembers(
    titleText: string,
    contentText: string,
    announcementId: string | null
  ): Promise<{ notified: number; failure: string | null }> {
    const { data, error: rpcError } = await supabase.rpc('notify_all_members', {
      p_title: titleText,
      p_message: buildExcerpt(contentText),
      p_announcement_id: announcementId,
    });
    if (rpcError) {
      return { notified: 0, failure: rpcError.message };
    }
    return { notified: typeof data === 'number' ? data : 0, failure: null };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    if (!user) {
      setError('You must be logged in.');
      return;
    }

    const errors: string[] = [];
    if (!title.trim()) errors.push('Title is required.');
    else if (title.trim().length > 200) errors.push('Title must be 200 characters or fewer.');
    if (!content.trim()) errors.push('Content is required.');
    else if (content.trim().length > 5000) errors.push('Content must be 5000 characters or fewer.');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && id) {
        const result = await updateAnnouncement(id, {
          title: title.trim(),
          content: content.trim(),
          is_published: isPublished,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        const nowPublished = result.data?.is_published ?? isPublished;
        if (nowPublished && !wasPublished) {
          const { notified, failure } = await notifyMembers(
            result.data?.title ?? title.trim(),
            result.data?.content ?? content.trim(),
            id
          );
          if (failure) {
            toast.warning(`Announcement published, but members could not be notified. ${failure}`);
          } else {
            toast.success(
              `Announcement published! ${notified} member${notified === 1 ? '' : 's'} notified.`
            );
          }
        } else {
          toast.success('Announcement updated!');
        }
      } else {
        const result = await createAnnouncement({
          author_id: user.id,
          title: title.trim(),
          content: content.trim(),
          is_published: isPublished,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        // Only published announcements are visible to members, so only those
        // may generate a notification.
        const createdPublished = result.data?.is_published ?? isPublished;
        if (!createdPublished) {
          toast.success('Announcement saved as a draft.');
        } else {
          const { notified, failure } = await notifyMembers(
            result.data?.title ?? title.trim(),
            result.data?.content ?? content.trim(),
            result.data?.id ?? null
          );
          if (failure) {
            toast.warning(`Announcement created, but members could not be notified. ${failure}`);
          } else {
            toast.success(
              `Announcement created! ${notified} member${notified === 1 ? '' : 's'} notified.`
            );
          }
        }
      }
      navigate('/announcements');
    } catch {
      setError('Failed to save announcement.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState message="Loading..." />;

  if (!isManager) {
    return (
      <Container className="py-8">
        <div className="text-center text-tmgl-charcoal-500">You do not have permission to manage announcements.</div>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-2xl">
      <PageHeader eyebrow="News" title={isEditing ? 'Edit announcement' : 'New announcement'} />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
            {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Announcement Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-tmgl-charcoal-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-tmgl-green-700 focus:border-tmgl-green-700"
                placeholder="Announcement title"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Content *</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={12}
                className="w-full border border-tmgl-charcoal-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-tmgl-green-700 focus:border-tmgl-green-700"
                placeholder="Write your announcement here..."
                maxLength={5000}
              />
              <p className="text-xs text-tmgl-charcoal-400 mt-1">{content.length} / 5000 characters</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublished ? 'bg-tmgl-green-700' : 'bg-tmgl-charcoal-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublished ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <label className="text-sm font-medium text-tmgl-charcoal-700">
                {isPublished ? 'Published' : 'Draft'}
              </label>
            </div>

            <Button type="submit" variant="primary" fullWidth size="lg" disabled={submitting}>
              <Megaphone className="h-5 w-5 mr-2" />
              {submitting ? 'Saving...' : isEditing ? 'Update Announcement' : 'Create Announcement'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
