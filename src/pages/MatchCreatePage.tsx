import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Swords, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { createMatch } from '@/lib/competition';
import { getPlayers, getAllTeams } from '@/lib/league';
import { validateMatch } from '@/lib/validation';
import type { Player, Team, MatchType } from '@/types/database';
import { useToast } from '@/context/ToastContext';

export function MatchCreatePage() {
  const { roundId } = useParams<{ roundId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [matchType, setMatchType] = useState<MatchType>('singles');
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPlayers(), getAllTeams()]).then(([pRes, tRes]) => {
      if (pRes.data) setPlayers(pRes.data);
      if (tRes.data) setTeams(tRes.data);
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundId) return;
    setErrors([]);
    setServerError(null);

    const validation = validateMatch({
      round_id: roundId, match_type: matchType,
      team_a_id: teamA || null, team_b_id: teamB || null,
      player_a_id: playerA || null, player_b_id: playerB || null,
    });
    if (!validation.isValid) { setErrors(validation.errors); return; }

    setIsSubmitting(true);
    const result = await createMatch({
      round_id: roundId, match_type: matchType,
      team_a_id: teamA || null, team_b_id: teamB || null,
      player_a_id: playerA || null, player_b_id: playerB || null,
      scheduled_at: null,
    });
    setIsSubmitting(false);

    if (result.error) { setServerError(result.error); toast.error(result.error); return; }
    if (result.data) { toast.success('Match created successfully'); navigate(`/matches/${result.data.id}`); }
  }, [roundId, matchType, playerA, playerB, teamA, teamB, navigate]);

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
        <Swords className="w-5 h-5 text-tmgl-green-800" /> New Match
      </h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{errors.map((e, i) => <p key={i}>{e}</p>)}</div>}
          {serverError && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{serverError}</p></div>}

          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Match Type *</label>
            <select value={matchType} onChange={(e) => setMatchType(e.target.value as MatchType)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
              <option value="singles">Singles (1v1)</option>
              <option value="foursome">Foursome (2v2 Alternate Shot)</option>
              <option value="fourball">Fourball (2v2 Best Ball)</option>
              <option value="team">Team vs Team</option>
            </select>
          </div>

          {(matchType === 'singles' || matchType === 'foursome' || matchType === 'fourball') && (
            <>
              <div>
                <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Player A *</label>
                <select value={playerA} onChange={(e) => setPlayerA(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
                  <option value="">Select player</option>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Player B *</label>
                <select value={playerB} onChange={(e) => setPlayerB(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
                  <option value="">Select player</option>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
            </>
          )}

          {matchType === 'team' && (
            <>
              <div>
                <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Team A *</label>
                <select value={teamA} onChange={(e) => setTeamA(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
                  <option value="">Select team</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Team B *</label>
                <select value={teamB} onChange={(e) => setTeamB(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
                  <option value="">Select team</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </>
          )}

          <Button type="submit" variant="primary" fullWidth disabled={isSubmitting} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Match'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
