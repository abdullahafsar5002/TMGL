import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { getPlayerByProfileId, getCourses } from '@/lib/league';
import { createFriendlyMatch } from '@/lib/friendly';
import type { Course } from '@/types/database';
import { ROUTES } from '@/router/routes';

const MATCH_FORMATS = [
  { value: 'stroke_play', label: 'Stroke Play' },
  { value: 'stableford', label: 'Stableford' },
  { value: 'match_play', label: 'Match Play' },
  { value: 'best_ball', label: 'Best Ball' },
  { value: 'scramble', label: 'Scramble' },
];

export default function FriendlyMatchCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [matchFormat, setMatchFormat] = useState('stroke_play');
  const [roundType, setRoundType] = useState<9 | 18>(18);
  const [scheduledAt, setScheduledAt] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const coursesResult = await getCourses();
      if (coursesResult.data) setCourses(coursesResult.data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    if (!user) {
      setError('You must be logged in.');
      return;
    }

    const errors: string[] = [];
    if (!title.trim()) errors.push('Match title is required.');
    else if (title.trim().length > 100) errors.push('Title must be 100 characters or fewer.');
    if (!courseId) errors.push('Please select a golf course.');
    if (!matchFormat) errors.push('Please select a match format.');
    if (description.length > 500) errors.push('Description must be 500 characters or fewer.');

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const playerResult = await getPlayerByProfileId(user.id);
    if (playerResult.error || !playerResult.data) {
      setError('Player profile not found.');
      return;
    }

    setSubmitting(true);
    try {
      const matchResult = await createFriendlyMatch({
        creator_id: playerResult.data.id,
        course_id: courseId,
        title: title.trim(),
        description: description || undefined,
        match_format: matchFormat,
        round_type: roundType,
        scheduled_at: scheduledAt || undefined,
      });

      if (matchResult.error) {
        setError(matchResult.error);
        return;
      }

      if (!matchResult.data) {
        setError('Failed to create match.');
        return;
      }

      navigate(ROUTES.friendlyMatch(matchResult.data.id));
    } catch {
      setError('Failed to create friendly match.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState message="Loading courses..." />;

  return (
    <Container className="py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">New Friendly Match</h1>

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
          <CardTitle>Match Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Match Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g. Saturday 4-Ball"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Additional details about the match..."
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Golf Course *</label>
              <select
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select a course</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.location ? ` — ${c.location}` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Match Format *</label>
              <select
                value={matchFormat}
                onChange={e => setMatchFormat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {MATCH_FORMATS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Holes *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRoundType(9)}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
                    roundType === 9
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  9 Holes
                </button>
                <button
                  type="button"
                  onClick={() => setRoundType(18)}
                  className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
                    roundType === 18
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  18 Holes
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date (optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <Button type="submit" variant="primary" fullWidth size="lg" disabled={submitting}>
              <Users className="h-5 w-5 mr-2" />
              {submitting ? 'Creating...' : 'Create Match'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
