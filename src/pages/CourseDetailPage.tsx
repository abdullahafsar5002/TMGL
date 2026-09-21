import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { MapPin, ArrowLeft, Edit, Trash2, Loader2, AlertCircle, Flag } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getCourse, getCourseHoles, updateCourse, deleteCourse, updateCourseHoles } from '@/lib/league';
import {
  validateCourse,
  validateCourseHoles,
  type CourseInput,
  type CourseHoleInput,
} from '@/lib/validation';
import type { Course, CourseHole } from '@/types/database';
import { useToast } from '@/context/ToastContext';

function createEmptyHoles(count: number): CourseHoleInput[] {
  return Array.from({ length: count }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    handicap_index: null,
    yardage: null,
  }));
}

function holesFromDb(dbHoles: CourseHole[], count: number): CourseHoleInput[] {
  const map = new Map(dbHoles.map((h) => [h.hole_number, h]));
  return Array.from({ length: count }, (_, i) => {
    const num = i + 1;
    const existing = map.get(num);
    return {
      hole_number: num,
      par: existing?.par ?? 4,
      handicap_index: existing?.handicap_index ?? null,
      yardage: existing?.yardage ?? null,
    };
  });
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { profile } = useAuth();
  const canManage = canManageLeague(profile?.role);

  const [course, setCourse] = useState<Course | null>(null);
  const [dbHoles, setDbHoles] = useState<CourseHole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CourseInput>({
    name: '',
    location: null,
    description: null,
    holes_count: 18,
    course_rating: null,
    slope_rating: null,
    latitude: null,
    longitude: null,
  });
  const [editHoles, setEditHoles] = useState<CourseHoleInput[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    const [courseRes, holesRes] = await Promise.all([
      getCourse(id),
      getCourseHoles(id),
    ]);

    if (courseRes.error || !courseRes.data) {
      setError(courseRes.error || 'Course not found');
    } else {
      setCourse(courseRes.data);
      setDbHoles(holesRes.data ?? []);
      setEditForm({
        name: courseRes.data.name,
        location: courseRes.data.location,
        description: courseRes.data.description,
        holes_count: courseRes.data.holes_count,
        course_rating: courseRes.data.course_rating,
        slope_rating: courseRes.data.slope_rating,
        latitude: courseRes.data.latitude ?? null,
        longitude: courseRes.data.longitude ?? null,
      });
      setEditHoles(holesFromDb(holesRes.data ?? [], courseRes.data.holes_count));
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateEditHole = (index: number, field: keyof CourseHoleInput, value: number | null) => {
    setEditHoles((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  const handleSave = async () => {
    if (!id) return;

    const courseResult = validateCourse(editForm);
    const holesResult = validateCourseHoles(editHoles, editForm.holes_count);

    const allErrors = [...courseResult.errors, ...holesResult.errors];
    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      return;
    }

    setValidationErrors([]);
    setIsSaving(true);
    setSaveError(null);

    const updateRes = await updateCourse(id, {
      name: editForm.name.trim(),
      location: editForm.location,
      description: editForm.description,
      holes_count: editForm.holes_count,
      course_rating: editForm.course_rating,
      slope_rating: editForm.slope_rating,
      latitude: editForm.latitude,
      longitude: editForm.longitude,
    });

    if (updateRes.error || !updateRes.data) {
      setIsSaving(false);
      setSaveError(updateRes.error || 'Update failed');
      toast.error(updateRes.error || 'Update failed');
      return;
    }

    const holesRes = await updateCourseHoles(id, editHoles);
    setIsSaving(false);

    if (holesRes.error) {
      setSaveError(holesRes.error);
      toast.error(holesRes.error);
    } else {
      setCourse(updateRes.data);
      setDbHoles(
        editHoles.map((h) => ({
          id: '',
          course_id: id,
          ...h,
          handicap_index: h.handicap_index ?? null,
          yardage: h.yardage ?? null,
        })) as CourseHole[]
      );
      setIsEditing(false);
      toast.success('Course updated successfully');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setShowDeleteConfirm(false);
    const result = await deleteCourse(id);
    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      toast.success('Course deleted successfully');
      navigate('/courses');
    }
  };

  if (isLoading) {
    return (
      <Container size="lg" className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" />
      </Container>
    );
  }

  if (error || !course) {
    return (
      <Container size="lg" className="py-8">
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load course</p>
            <p className="mt-0.5 text-red-700">{error || 'Course not found'}</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/courses')} className="mt-2">
              Back to Courses
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/courses" className="text-sm text-tmgl-green-700 hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Courses
          </Link>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-tmgl-green-800" />
            {isEditing ? 'Edit Course' : course.name}
          </h1>
        </div>
        {canManage && !isEditing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{saveError}</span>
        </div>
      )}
      {validationErrors.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <ul className="list-disc list-inside space-y-0.5">{validationErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      {isEditing ? (
        <>
          <Card>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Course Name</label>
                <input id="edit-name" type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
                  placeholder="e.g. Royal Sydney Golf Club" />
              </div>
              <div>
                <label htmlFor="edit-location" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Location</label>
                <input id="edit-location" type="text" value={editForm.location ?? ''} onChange={(e) => setEditForm({ ...editForm, location: e.target.value || null })}
                  className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
                  placeholder="e.g. Rose Bay, NSW" />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Description</label>
                <textarea id="edit-description" value={editForm.description ?? ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value || null })}
                  className="w-full px-4 py-3 rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
                  placeholder="Optional course description" rows={3} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="edit-holes" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Holes</label>
                  <select id="edit-holes" value={editForm.holes_count}
                    onChange={(e) => {
                      const count = Number(e.target.value) as 9 | 18;
                      setEditForm({ ...editForm, holes_count: count });
                      setEditHoles(createEmptyHoles(count));
                    }}
                    className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent bg-white">
                    <option value={9}>9 Holes</option>
                    <option value={18}>18 Holes</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-cr" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Course Rating</label>
                  <input id="edit-cr" type="number" step="0.01" min="0" max="80" value={editForm.course_rating ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, course_rating: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
                    placeholder="e.g. 72.5" />
                </div>
                <div>
                  <label htmlFor="edit-sr" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Slope Rating</label>
                  <input id="edit-sr" type="number" step="0.01" min="0" max="200" value={editForm.slope_rating ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, slope_rating: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
                    placeholder="e.g. 130" />
                </div>
                <div>
                  <label htmlFor="edit-lat" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Latitude</label>
                  <input id="edit-lat" type="number" step="any" value={editForm.latitude ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
                    placeholder="e.g. 33.6844" />
                </div>
                <div>
                  <label htmlFor="edit-lng" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Longitude</label>
                  <input id="edit-lng" type="number" step="any" value={editForm.longitude ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value ? Number(e.target.value) : null })}
                    className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
                    placeholder="e.g. 73.0479" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" size="md" onClick={() => { setIsEditing(false); setValidationErrors([]); setSaveError(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hole Definitions ({editHoles.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-tmgl-charcoal-200">
                      <th className="text-left py-2 px-2 font-semibold text-tmgl-charcoal-700">Hole</th>
                      <th className="text-left py-2 px-2 font-semibold text-tmgl-charcoal-700">Par *</th>
                      <th className="text-left py-2 px-2 font-semibold text-tmgl-charcoal-700">Handicap</th>
                      <th className="text-left py-2 px-2 font-semibold text-tmgl-charcoal-700">Yardage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editHoles.map((hole, index) => (
                      <tr key={hole.hole_number} className="border-b border-tmgl-charcoal-100">
                        <td className="py-1.5 px-2 font-medium text-tmgl-charcoal-900">{hole.hole_number}</td>
                        <td className="py-1.5 px-2">
                          <input type="number" min={3} max={6} value={hole.par}
                            onChange={(e) => updateEditHole(index, 'par', Number(e.target.value))}
                            className="w-20 px-2 py-1.5 rounded border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-1 focus:ring-tmgl-green-700" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" min={1} max={18} value={hole.handicap_index ?? ''}
                            onChange={(e) => updateEditHole(index, 'handicap_index', e.target.value ? Number(e.target.value) : null)}
                            className="w-20 px-2 py-1.5 rounded border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-1 focus:ring-tmgl-green-700"
                            placeholder="-" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" min={0} value={hole.yardage ?? ''}
                            onChange={(e) => updateEditHole(index, 'yardage', e.target.value ? Number(e.target.value) : null)}
                            className="w-24 px-2 py-1.5 rounded border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-1 focus:ring-tmgl-green-700"
                            placeholder="-" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {course.location && (
                  <div>
                    <p className="text-tmgl-charcoal-500 font-medium">Location</p>
                    <p className="text-tmgl-charcoal-900">{course.location}</p>
                  </div>
                )}
                <div>
                  <p className="text-tmgl-charcoal-500 font-medium">Holes</p>
                  <p className="text-tmgl-charcoal-900">{course.holes_count}</p>
                </div>
                {course.course_rating != null && (
                  <div>
                    <p className="text-tmgl-charcoal-500 font-medium">Course Rating</p>
                    <p className="text-tmgl-charcoal-900">{course.course_rating}</p>
                  </div>
                )}
                {course.slope_rating != null && (
                  <div>
                    <p className="text-tmgl-charcoal-500 font-medium">Slope Rating</p>
                    <p className="text-tmgl-charcoal-900">{course.slope_rating}</p>
                  </div>
                )}
                <div>
                  <p className="text-tmgl-charcoal-500 font-medium">Created</p>
                  <p className="text-tmgl-charcoal-900">{new Date(course.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {course.description && (
                <div>
                  <p className="text-tmgl-charcoal-500 font-medium text-sm">Description</p>
                  <p className="text-sm text-tmgl-charcoal-900 mt-1">{course.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-tmgl-green-700" />
                <CardTitle className="text-base">Holes ({dbHoles.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {dbHoles.length === 0 ? (
                <p className="text-sm text-tmgl-charcoal-500">No hole definitions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-tmgl-charcoal-200">
                        <th className="text-left py-2 px-2 font-semibold text-tmgl-charcoal-700">Hole</th>
                        <th className="text-left py-2 px-2 font-semibold text-tmgl-charcoal-700">Par</th>
                        <th className="text-left py-2 px-2 font-semibold text-tmgl-charcoal-700">Handicap</th>
                        <th className="text-left py-2 px-2 font-semibold text-tmgl-charcoal-700">Yardage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dbHoles.map((h) => (
                        <tr key={h.id} className="border-b border-tmgl-charcoal-100">
                          <td className="py-1.5 px-2 font-medium text-tmgl-charcoal-900">{h.hole_number}</td>
                          <td className="py-1.5 px-2 text-tmgl-charcoal-900">{h.par}</td>
                          <td className="py-1.5 px-2 text-tmgl-charcoal-900">{h.handicap_index ?? '\u2014'}</td>
                          <td className="py-1.5 px-2 text-tmgl-charcoal-900">{h.yardage != null ? `${h.yardage} yds` : '\u2014'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Course"
        message="Are you sure you want to delete this course? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Container>
  );
}
