import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { getSeasons } from '@/lib/league';
import { createTournament } from '@/lib/competition';
import { validateTournament } from '@/lib/validation';
import type { Season, TournamentStatus } from '@/types/database';
import { useEffect } from 'react';

export function TournamentCreatePage() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [status, setStatus] = useState<TournamentStatus>('draft');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    getSeasons().then((res) => { if (res.data) setSeasons(res.data); });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setServerError(null);

    const validation = validateTournament({ name, season_id: seasonId, description, event_date: eventDate || null, course_id: null });
    if (!validation.isValid) { setErrors(validation.errors); return; }

    setIsSubmitting(true);
    const result = await createTournament({
      season_id: seasonId, name, description: description || null,
      event_date: eventDate || null, course_id: null, status,
    });
    setIsSubmitting(false);

    if (result.error) { setServerError(result.error); return; }
    if (result.data) navigate(`/tournaments/${result.data.id}`);
  }, [name, description, seasonId, eventDate, status, navigate]);

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button onClick={() => navigate('/tournaments')} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800">
        <ArrowLeft className="w-4 h-4" /> Back to Tournaments
      </button>
      <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-tmgl-green-800" /> New Tournament
      </h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}
          {serverError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <p>{serverError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Season *</label>
            <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
              <option value="">Select a season</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Tournament Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TMGL Championship 2026"
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
          </div>

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
          </div>

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Event Date</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
          </div>

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TournamentStatus)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
              <option value="draft">Draft</option>
              <option value="open">Open</option>
            </select>
          </div>

          <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Tournament'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
