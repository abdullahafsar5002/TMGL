import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { createSeason } from '@/lib/league';
import { validateSeason, type SeasonInput } from '@/lib/validation';
import type { SeasonStatus } from '@/types/database';

export function SeasonCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SeasonInput>({ name: '', start_date: null, end_date: null });
  const [status, setStatus] = useState<SeasonStatus>('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSave = async () => {
    const result = validateSeason(form);
    if (!result.isValid) {
      setValidationErrors(result.errors);
      return;
    }
    setValidationErrors([]);
    setIsSaving(true);
    setError(null);

    const res = await createSeason({
      name: form.name.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      status,
    });

    setIsSaving(false);
    if (res.error || !res.data) {
      setError(res.error || 'Failed to create season');
    } else {
      navigate(`/seasons/${res.data.id}`);
    }
  };

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div>
        <button onClick={() => navigate('/seasons')} className="text-sm text-tmgl-green-700 hover:underline flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Seasons
        </button>
        <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-tmgl-green-800" /> New Season
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
            <label htmlFor="name" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Season Name *</label>
            <input id="name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
              placeholder="e.g. 2026 Summer League" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Start Date</label>
              <input id="start-date" type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">End Date</label>
              <input id="end-date" type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Status</label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value as SeasonStatus)}
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent bg-white">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating...</> : 'Create Season'}
            </Button>
            <Button variant="outline" size="md" onClick={() => navigate('/seasons')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
