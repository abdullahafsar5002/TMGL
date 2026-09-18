import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { getPlayerByProfileId, getCourses } from '@/lib/league';
import { createPracticeRound } from '@/lib/practice';
import { validatePracticeRound } from '@/lib/validation';
import type { Course } from '@/types/database';

export default function PracticeCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  const [courseId, setCourseId] = useState('');
  const [roundType, setRoundType] = useState<9 | 18>(
    (Number(searchParams.get('holes')) === 9 ? 9 : 18) as 9 | 18
  );
  const [teeBox, setTeeBox] = useState('');
  const [notes, setNotes] = useState('');
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

    const result = validatePracticeRound({
      course_id: courseId,
      round_type: roundType,
      tee_box: teeBox,
      notes,
    });

    if (!result.isValid) {
      setValidationErrors(result.errors);
      return;
    }

    const playerResult = await getPlayerByProfileId(user.id);
    if (playerResult.error || !playerResult.data) {
      setError('Player profile not found.');
      return;
    }

    setSubmitting(true);
    try {
      const roundResult = await createPracticeRound({
        player_id: playerResult.data.id,
        course_id: courseId,
        round_type: roundType,
        tee_box: teeBox || null,
        notes: notes || null,
      });

      if (roundResult.error) {
        setError(roundResult.error);
        return;
      }

      if (!roundResult.data) {
        setError('Failed to create practice round.');
        return;
      }

      navigate(`/practice/${roundResult.data.id}/score`);
    } catch {
      setError('Failed to create practice round.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState message="Loading courses..." />;

  return (
    <Container className="py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">New Practice Round</h1>

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
          <CardTitle>Round Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Tee Box (optional)</label>
              <select
                value={teeBox}
                onChange={e => setTeeBox(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select tee box</option>
                <option value="red">Red (Forward)</option>
                <option value="white">White (Middle)</option>
                <option value="blue">Blue (Back)</option>
                <option value="black">Black (Championship)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Weather conditions, practice focus, etc."
              />
            </div>

            <Button type="submit" variant="primary" fullWidth size="lg" disabled={submitting}>
              <Play className="h-5 w-5 mr-2" />
              {submitting ? 'Starting...' : 'Start Practice Round'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
