import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { createCourse } from '@/lib/league';
import {
  validateCourse,
  validateCourseHoles,
  type CourseInput,
  type CourseHoleInput,
} from '@/lib/validation';
import { useToast } from '@/context/ToastContext';

function createEmptyHoles(count: number): CourseHoleInput[] {
  return Array.from({ length: count }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    handicap_index: null,
    yardage: null,
  }));
}

export function CourseCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<CourseInput>({
    name: '',
    location: null,
    description: null,
    holes_count: 18,
    course_rating: null,
    slope_rating: null,
  });
  const [holes, setHoles] = useState<CourseHoleInput[]>(createEmptyHoles(18));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleHolesCountChange = (count: 9 | 18) => {
    setForm({ ...form, holes_count: count });
    setHoles(createEmptyHoles(count));
  };

  const updateHole = (index: number, field: keyof CourseHoleInput, value: number | null) => {
    setHoles((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  const handleSave = async () => {
    const courseResult = validateCourse(form);
    const holesResult = validateCourseHoles(holes, form.holes_count);

    const allErrors = [...courseResult.errors, ...holesResult.errors];
    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      return;
    }

    setValidationErrors([]);
    setIsSaving(true);
    setError(null);

    const res = await createCourse(
      {
        name: form.name.trim(),
        location: form.location,
        description: form.description,
        holes_count: form.holes_count,
        course_rating: form.course_rating,
        slope_rating: form.slope_rating,
      },
      holes
    );

    setIsSaving(false);
    if (res.error || !res.data) {
      setError(res.error || 'Failed to create course');
      toast.error(res.error || 'Failed to create course');
    } else {
      toast.success('Course created successfully');
      navigate(`/courses/${res.data.id}`);
    }
  };

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div>
        <button onClick={() => navigate('/courses')} className="text-sm text-tmgl-green-700 hover:underline flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Courses
        </button>
        <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-tmgl-green-800" /> New Course
        </h1>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
      {validationErrors.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <ul className="list-disc list-inside space-y-0.5">{validationErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}

      <Card>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Course Name *</label>
            <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
              placeholder="e.g. Royal Sydney Golf Club" />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Location</label>
            <input id="location" type="text" value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value || null })}
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
              placeholder="e.g. Rose Bay, NSW" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Description</label>
            <textarea id="description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value || null })}
              className="w-full px-4 py-3 rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
              placeholder="Optional course description" rows={3} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="holes-count" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Holes *</label>
              <select id="holes-count" value={form.holes_count} onChange={(e) => handleHolesCountChange(Number(e.target.value) as 9 | 18)}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent bg-white">
                <option value={9}>9 Holes</option>
                <option value={18}>18 Holes</option>
              </select>
            </div>
            <div>
              <label htmlFor="course-rating" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Course Rating</label>
              <input id="course-rating" type="number" step="0.01" min="0" max="80" value={form.course_rating ?? ''}
                onChange={(e) => setForm({ ...form, course_rating: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
                placeholder="e.g. 72.5" />
            </div>
            <div>
              <label htmlFor="slope-rating" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Slope Rating</label>
              <input id="slope-rating" type="number" step="0.01" min="0" max="200" value={form.slope_rating ?? ''}
                onChange={(e) => setForm({ ...form, slope_rating: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
                placeholder="e.g. 130" />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating...</> : 'Create Course'}
            </Button>
            <Button variant="outline" size="md" onClick={() => navigate('/courses')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Hole Definitions ({holes.length})</CardTitle>
          </div>
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
                {holes.map((hole, index) => (
                  <tr key={hole.hole_number} className="border-b border-tmgl-charcoal-100">
                    <td className="py-1.5 px-2 font-medium text-tmgl-charcoal-900">{hole.hole_number}</td>
                    <td className="py-1.5 px-2">
                      <input type="number" min={3} max={6} value={hole.par}
                        onChange={(e) => updateHole(index, 'par', Number(e.target.value))}
                        className="w-20 px-2 py-1.5 rounded border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-1 focus:ring-tmgl-green-700" />
                    </td>
                    <td className="py-1.5 px-2">
                      <input type="number" min={1} max={18} value={hole.handicap_index ?? ''}
                        onChange={(e) => updateHole(index, 'handicap_index', e.target.value ? Number(e.target.value) : null)}
                        className="w-20 px-2 py-1.5 rounded border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-1 focus:ring-tmgl-green-700"
                        placeholder="-" />
                    </td>
                    <td className="py-1.5 px-2">
                      <input type="number" min={0} value={hole.yardage ?? ''}
                        onChange={(e) => updateHole(index, 'yardage', e.target.value ? Number(e.target.value) : null)}
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
    </Container>
  );
}
