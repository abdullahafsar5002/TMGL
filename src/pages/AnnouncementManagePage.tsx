import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
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

  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const isEditing = !!id;

  useEffect(() => {
    async function load() {
      if (!user) return;

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
        }
      }
      setLoading(false);
    }
    load();
  }, [id, user]);

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
        toast.success('Announcement updated!');
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
        toast.success('Announcement created!');
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
        <div className="text-center text-gray-500">You do not have permission to manage announcements.</div>
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {isEditing ? 'Edit Announcement' : 'New Announcement'}
      </h1>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Announcement title"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={12}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Write your announcement here..."
                maxLength={5000}
              />
              <p className="text-xs text-gray-400 mt-1">{content.length} / 5000 characters</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublished ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublished ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <label className="text-sm font-medium text-gray-700">
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
