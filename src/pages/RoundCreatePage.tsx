import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { createRound, getTournament } from '@/lib/competition';
import { validateRound } from '@/lib/validation';
import { useToast } from '@/context/ToastContext';
import { SCORING_FORMATS } from '@/lib/scoringFormats';
import type { ScoringFormat } from '@/types/database';

export function RoundCreatePage() {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [tournamentName, setTournamentName] = useState('');
  const [roundNumber, setRoundNumber] = useState(1);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [scoringFormat, setScoringFormat] = useState<ScoringFormat>('stroke_play');
  const [firstTeeTime, setFirstTeeTime] = useState('');
  const [teeInterval, setTeeInterval] = useState(9);
  const [hasCut, setHasCut] = useState(false);
  const [cutAfterHole, setCutAfterHole] = useState(9);
  const [cutLineScore, setCutLineScore] = useState(36);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (tournamentId) {
      getTournament(tournamentId).then((r) => {
        if (r.data) {
          setTournamentName(r.data.name);
          if (r.data.scoring_format) setScoringFormat(r.data.scoring_format as ScoringFormat);
        }
      });
    }
  }, [tournamentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId) return;
    setErrors([]);
    setServerError(null);

    const validation = validateRound({ tournament_id: tournamentId, round_number: roundNumber, name, date: date || null });
    if (!validation.isValid) { setErrors(validation.errors); return; }

    setIsSubmitting(true);
    const result = await createRound({
      tournament_id: tournamentId,
      round_number: roundNumber,
      name,
      date: date || null,
      scoring_format: scoringFormat,
      tee_interval_minutes: teeInterval,
      first_tee_time: firstTeeTime || null,
      cut_after_hole: hasCut ? cutAfterHole : null,
      cut_line_score: hasCut ? cutLineScore : null,
    });
    setIsSubmitting(false);

    if (result.error) { setServerError(result.error); toast.error(result.error); return; }
    if (result.data) {
      toast.success('Round created successfully');
      navigate(`/rounds/${result.data.id}/pairings`);
    }
  };

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
        <Flag className="w-5 h-5 text-tmgl-green-800" /> New Round {tournamentName && <span className="text-sm font-normal text-tmgl-charcoal-500">for {tournamentName}</span>}
      </h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{errors.map((e, i) => <p key={i}>{e}</p>)}</div>}
          {serverError && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{serverError}</p></div>}

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Round Number *</label>
            <input type="number" min={1} value={roundNumber} onChange={(e) => setRoundNumber(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
          </div>

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Round Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Round 1, Stroke Play"
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
          </div>

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
          </div>

          <div>
            <label htmlFor="round-scoring-format" className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Scoring Format</label>
            <select id="round-scoring-format" value={scoringFormat} onChange={(e) => setScoringFormat(e.target.value as ScoringFormat)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
              {SCORING_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <p className="mt-1 text-xs text-tmgl-charcoal-500">{SCORING_FORMATS.find((f) => f.value === scoringFormat)?.hint}</p>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-tmgl-charcoal-200 p-3">
            <legend className="px-1 text-sm font-medium text-tmgl-charcoal-700">Tee Times</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="first-tee-time" className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">First Tee</label>
                <input id="first-tee-time" type="time" value={firstTeeTime} onChange={(e) => setFirstTeeTime(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
              </div>
              <div>
                <label htmlFor="tee-interval" className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Interval (minutes)</label>
                <input id="tee-interval" type="number" min={3} max={30} value={teeInterval}
                  onChange={(e) => setTeeInterval(Math.min(30, Math.max(3, parseInt(e.target.value, 10) || 9)))}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-tmgl-charcoal-200 p-3">
            <legend className="px-1 text-sm font-medium text-tmgl-charcoal-700">Cut Line</legend>
            <label className="flex items-center gap-2 text-sm text-tmgl-charcoal-700">
              <input type="checkbox" checked={hasCut} onChange={(e) => setHasCut(e.target.checked)}
                className="w-4 h-4 min-h-[44px]" />
              Apply a cut after a set number of holes
            </label>
            {hasCut && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="cut-after-hole" className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Cut after hole</label>
                  <select id="cut-after-hole" value={cutAfterHole}
                    onChange={(e) => setCutAfterHole(parseInt(e.target.value, 10) || 9)}
                    className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
                    {[6, 9, 12, 15].map((h) => <option key={h} value={h}>After {h}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="cut-line-score" className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Cut at cumulative strokes</label>
                  <input id="cut-line-score" type="number" min={1} value={cutLineScore}
                    onChange={(e) => setCutLineScore(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
                </div>
              </div>
            )}
            {hasCut && <p className="text-xs text-tmgl-charcoal-500">Players above the cut line after hole {cutAfterHole} are marked withdrawn and excluded from the final standings.</p>}
          </fieldset>

          <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Round'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
