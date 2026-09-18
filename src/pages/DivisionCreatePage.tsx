import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Flag, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { createDivision } from '@/lib/league';
import { validateDivision } from '@/lib/validation';
import { useToast } from '@/context/ToastContext';

export function DivisionCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const seasonId = searchParams.get('seasonId') ?? '';

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSave = async () => {
    const result = validateDivision({ name, season_id: seasonId });
    if (!result.isValid) { setValidationErrors(result.errors); return; }
    setValidationErrors([]);
    setIsSaving(true);
    setError(null);
    const res = await createDivision({ name: name.trim(), season_id: seasonId });
    setIsSaving(false);
    if (res.error || !res.data) {
      setError(res.error || 'Failed to create division');
      toast.error(res.error || 'Failed to create division');
    } else {
      toast.success('Division created successfully');
      navigate(`/seasons/${seasonId}`);
    }
  };

  if (!seasonId) {
    return (
      <Container size="lg" className="py-8">
        <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Missing season</p>
            <p className="mt-0.5">A season ID is required. Navigate from a season page.</p>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div>
        <button onClick={() => navigate(-1)} className="text-sm text-tmgl-green-700 hover:underline flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
          <Flag className="w-5 h-5 text-tmgl-green-800" /> New Division
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
            <label htmlFor="div-name" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Division Name *</label>
            <input id="div-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
              placeholder="e.g. Premier Division" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating...</> : 'Create Division'}
            </Button>
            <Button variant="outline" size="md" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
