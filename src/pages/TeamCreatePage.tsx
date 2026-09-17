import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { createTeam, getSeasons, getDivisionsBySeason } from '@/lib/league';
import { validateTeam } from '@/lib/validation';
import type { Season, Division } from '@/types/database';

export function TeamCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetSeasonId = searchParams.get('seasonId') ?? '';

  const [name, setName] = useState('');
  const [seasonId, setSeasonId] = useState(presetSeasonId);
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const loadSeasons = useCallback(async () => {
    setIsLoadingSeasons(true);
    const res = await getSeasons();
    if (res.data) setSeasons(res.data);
    setIsLoadingSeasons(false);
  }, []);

  useEffect(() => { loadSeasons(); }, [loadSeasons]);

  useEffect(() => {
    if (!seasonId) { setDivisions([]); return; }
    getDivisionsBySeason(seasonId).then((res) => {
      setDivisions(res.data ?? []);
      setDivisionId(null);
    });
  }, [seasonId]);

  const handleSave = async () => {
    const result = validateTeam({ name, season_id: seasonId, division_id: divisionId });
    if (!result.isValid) { setValidationErrors(result.errors); return; }
    setValidationErrors([]);
    setIsSaving(true);
    setError(null);

    const res = await createTeam({
      name: name.trim(),
      season_id: seasonId,
      division_id: divisionId,
      captain_player_id: null,
      vice_captain_player_id: null,
      logo_url: null,
    });
    setIsSaving(false);
    if (res.error || !res.data) setError(res.error || 'Failed to create team');
    else navigate(`/teams/${res.data.id}`);
  };

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div>
        <button onClick={() => navigate('/teams')} className="text-sm text-tmgl-green-700 hover:underline flex items-center gap-1 mb-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Teams
        </button>
        <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-tmgl-green-800" /> New Team
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
            <label htmlFor="t-name" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Team Name *</label>
            <input id="t-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent"
              placeholder="e.g. Eagles" />
          </div>
          <div>
            <label htmlFor="t-season" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Season *</label>
            {isLoadingSeasons ? (
              <div className="flex items-center gap-2 py-3 text-sm text-tmgl-charcoal-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading seasons...
              </div>
            ) : (
              <select id="t-season" value={seasonId} onChange={(e) => setSeasonId(e.target.value)}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent">
                <option value="">Select a season...</option>
                {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
          {divisions.length > 0 && (
            <div>
              <label htmlFor="t-div" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Division</label>
              <select id="t-div" value={divisionId ?? ''} onChange={(e) => setDivisionId(e.target.value || null)}
                className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent">
                <option value="">No division</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating...</> : 'Create Team'}
            </Button>
            <Button variant="outline" size="md" onClick={() => navigate('/teams')}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
