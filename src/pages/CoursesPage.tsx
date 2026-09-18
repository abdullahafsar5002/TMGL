import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Search, ChevronRight, Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getCourses } from '@/lib/league';
import type { Course } from '@/types/database';

export function CoursesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getCourses();
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setCourses(result.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = courses.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.location && c.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-tmgl-green-800" />
            Courses
          </h1>
          <p className="text-sm text-tmgl-charcoal-500 mt-0.5">
            {courses.length} course{courses.length !== 1 ? 's' : ''} total
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/courses/new')}
            className="bg-tmgl-green-800 hover:bg-tmgl-green-700"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Course
          </Button>
        )}
      </div>

      {courses.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tmgl-charcoal-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm text-tmgl-charcoal-900 placeholder-tmgl-charcoal-400 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
          />
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" />
          <span className="ml-2 text-sm text-tmgl-charcoal-500">Loading courses...</span>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load courses</p>
            <p className="mt-0.5 text-red-700">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="mt-2">Retry</Button>
          </div>
        </div>
      )}

      {!isLoading && !error && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-tmgl-charcoal-100 flex items-center justify-center mb-3">
            <Inbox className="w-7 h-7 text-tmgl-charcoal-400" />
          </div>
          <p className="text-base font-semibold text-tmgl-charcoal-700">No courses yet</p>
          <p className="text-sm text-tmgl-charcoal-500 mt-1">
            {canManage ? 'Create your first course to get started.' : 'Courses will appear here once created by a manager.'}
          </p>
          {canManage && (
            <Button variant="primary" size="md" onClick={() => navigate('/courses/new')} className="mt-4 bg-tmgl-green-800 hover:bg-tmgl-green-700">
              <Plus className="w-4 h-4 mr-1.5" /> Create Course
            </Button>
          )}
        </div>
      )}

      {!isLoading && courses.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-tmgl-charcoal-500">No courses match &quot;{search}&quot;</p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((course) => (
            <button key={course.id} onClick={() => navigate(`/courses/${course.id}`)} className="w-full text-left">
              <Card variant="hover" className="cursor-pointer hover:border-tmgl-green-300 transition-colors">
                <CardHeader>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{course.name}</CardTitle>
                    <div className="flex items-center gap-3 mt-1 text-xs text-tmgl-charcoal-500">
                      {course.location && <span>{course.location}</span>}
                      <span>{course.holes_count} holes</span>
                      {course.course_rating != null && <span>CR {course.course_rating}</span>}
                      {course.slope_rating != null && <span>SR {course.slope_rating}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-tmgl-charcoal-400 shrink-0" />
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      )}
    </Container>
  );
}
