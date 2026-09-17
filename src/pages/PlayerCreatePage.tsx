import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { createPlayer } from '@/lib/league';
import { validatePlayer, type PlayerInput } from '@/lib/validation';

export function PlayerCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<PlayerInput>({
    full_name: '', phone: null, handicap_index: null, status: 'active',
  });
  const [playerCode, setPlayerCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSave = async () => {
    const result = validatePlayer(form);
    if (!result.isValid) { setValidationErrors(result.errors); return; }
    setValidationErrors([]);
    setIsSaving(true);
    setError(null);

    const res = await createPlayer({
      full_name: form.full_name.trim(),
      phone: form.phone,
      handicap_index: form.handicap_index,
      status: form.status,
      profile_id: null,
      join_date: new Date().toISOString().split('T')[0],
      player_code: playerCode || null,
    });
    setIsSaving(false);
    if (res.error || !res.data) setError(res.error || 'Failed to create player');
    else navigate(`/players/${res.data.id}`);
  };

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div>
        <button onClick={() => navigate('/players')} className="text-sm text-tmgl-green-700 hover:underline flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Players
        </button>
        <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-tmgl-green-800" /> New Player
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
            <label htmlFor="p-name" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Full Name *</label>
            <input id="p-name" type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
              placeholder="John Smith" />
          </div>
          <div>
            <label htmlFor="p-code" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Player Code</label>
            <input id="p-code" type="text" value={playerCode} onChange={(e) => setPlayerCode(e.target.value)}
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
              placeholder="e.g. TM001" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-phone" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Phone</label>
              <input id="p-phone" type="tel" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value || null })}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
            </div>
            <div>
              <label htmlFor="p-handicap" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Handicap Index</label>
              <input id="p-handicap" type="number" step="0.01" min="0" max="54" value={form.handicap_index ?? ''} onChange={(e) => setForm({ ...form, handicap_index: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label htmlFor="p-status" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Status</label>
            <select id="p-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent bg-white">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating...</> : 'Create Player'}
            </Button>
            <Button variant="outline" size="md" onClick={() => navigate('/players')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
