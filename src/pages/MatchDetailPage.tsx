import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Swords, ArrowLeft, Loader2, AlertCircle, Edit3, Trash2, FileText, CheckCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getMatch, getRound, updateMatch, deleteMatch } from '@/lib/competition';
import { getPlayers, getAllTeams } from '@/lib/league';
import type { Match, MatchStatus, Player, Team } from '@/types/database';

const STATUS_VARIANTS: Record<MatchStatus, BadgeVariant> = {
  draft: 'outline', scheduled: 'warning', live: 'danger', completed: 'info', cancelled: 'outline',
};

const STATUS_OPTIONS: MatchStatus[] = ['scheduled', 'live', 'completed', 'cancelled'];

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [roundName, setRoundName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showResult, setShowResult] = useState(false);
  const [resultText, setResultText] = useState('');
  const [winnerPlayerId, setWinnerPlayerId] = useState('');
  const [winnerTeamId, setWinnerTeamId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const mRes = await getMatch(id);
    if (mRes.error || !mRes.data) { setError(mRes.error || 'Match not found'); setIsLoading(false); return; }
    setMatch(mRes.data);

    const [rRes, pRes, tRes] = await Promise.all([
      getRound(mRes.data.round_id),
      getPlayers(),
      getAllTeams(),
    ]);
    if (rRes.data) {
      setRoundName(`Round ${rRes.data.round_number}: ${rRes.data.name}`);
    }
    if (pRes.data) setPlayers(pRes.data);
    if (tRes.data) setTeams(tRes.data);
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const getPlayerName = (pid: string | null) => {
    if (!pid) return 'TBA';
    return players.find((p) => p.id === pid)?.full_name ?? 'Unknown';
  };

  const getTeamName = (tid: string | null) => {
    if (!tid) return 'TBA';
    return teams.find((t) => t.id === tid)?.name ?? 'Unknown';
  };

  const startResultEntry = () => {
    if (!match) return;
    setResultText(match.result || '');
    setWinnerPlayerId(match.winner_player_id || '');
    setWinnerTeamId(match.winner_team_id || '');
    setShowResult(true);
  };

  const handleSaveResult = async () => {
    if (!id) return;
    setIsSaving(true);
    const updates: Parameters<typeof updateMatch>[1] = {
      result: resultText || null,
      winner_player_id: winnerPlayerId || null,
      winner_team_id: winnerTeamId || null,
    };
    const result = await updateMatch(id, updates);
    setIsSaving(false);
    if (result.error) { setError(result.error); return; }
    if (result.data) { setMatch(result.data); setShowResult(false); }
  };

  const handleStatusChange = async (newStatus: MatchStatus) => {
    if (!id) return;
    const updates: Parameters<typeof updateMatch>[1] = { status: newStatus };
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
    const result = await updateMatch(id, updates);
    if (result.error) { setError(result.error); return; }
    if (result.data) setMatch(result.data);
  };

  const handleDelete = async () => {
    if (!id || !match) return;
    setIsDeleting(true);
    const result = await deleteMatch(id);
    setIsDeleting(false);
    if (result.error) { setError(result.error); setShowDelete(false); return; }
    navigate(`/rounds/${match.round_id}`);
  };

  if (isLoading) return <Container size="lg" className="py-4"><LoadingState /></Container>;
  if (error || !match) return (
    <Container size="lg" className="py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><p>{error || 'Match not found'}</p>
      </div>
    </Container>
  );

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button onClick={() => navigate(`/rounds/${match.round_id}`)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800">
        <ArrowLeft className="w-4 h-4" /> {roundName || 'Back to Round'}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
          <Swords className="w-5 h-5 text-tmgl-green-800" /> {match.match_type.charAt(0).toUpperCase() + match.match_type.slice(1)} Match
        </h1>
        <Badge variant={STATUS_VARIANTS[match.status]}>{match.status}</Badge>
      </div>

      <Card className="space-y-3">
        {match.match_type === 'singles' || match.match_type === 'foursome' || match.match_type === 'fourball' ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-tmgl-charcoal-500">Player A</span>
              <span className="font-medium">{getPlayerName(match.player_a_id)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-tmgl-charcoal-500">Player B</span>
              <span className="font-medium">{getPlayerName(match.player_b_id)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-tmgl-charcoal-500">Team A</span>
              <span className="font-medium">{getTeamName(match.team_a_id)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-tmgl-charcoal-500">Team B</span>
              <span className="font-medium">{getTeamName(match.team_b_id)}</span>
            </div>
          </>
        )}
        {match.scheduled_at && <div className="flex justify-between text-sm"><span className="text-tmgl-charcoal-500">Scheduled</span><span className="font-medium">{new Date(match.scheduled_at).toLocaleString()}</span></div>}
        {match.completed_at && <div className="flex justify-between text-sm"><span className="text-tmgl-charcoal-500">Completed</span><span className="font-medium">{new Date(match.completed_at).toLocaleString()}</span></div>}
        {match.result && <div className="flex justify-between text-sm"><span className="text-tmgl-charcoal-500">Result</span><span className="font-medium">{match.result}</span></div>}
        {match.winner_player_id && <div className="flex justify-between text-sm"><span className="text-tmgl-charcoal-500">Winner</span><span className="font-medium">{getPlayerName(match.winner_player_id)}</span></div>}
        {match.winner_team_id && <div className="flex justify-between text-sm"><span className="text-tmgl-charcoal-500">Winner</span><span className="font-medium">{getTeamName(match.winner_team_id)}</span></div>}
      </Card>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate(`/scoring?match_id=${match.id}`)} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            <Edit3 className="w-4 h-4 mr-1.5" /> Enter Scores
          </Button>
          <Button variant="outline" size="sm" onClick={startResultEntry}><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Set Result</Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete</Button>
          {STATUS_OPTIONS.filter((s) => s !== match.status).map((s) => (
            <Button key={s} variant="outline" size="sm" onClick={() => handleStatusChange(s)} className="capitalize">{s}</Button>
          ))}
        </div>
      )}

      <Button variant="outline" fullWidth onClick={() => navigate('/leaderboard')}>
        <FileText className="w-4 h-4 mr-2" /> View Leaderboard
      </Button>

      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-tmgl-charcoal-900">Set Match Result</h2>
              <div>
                <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Result</label>
                <input type="text" value={resultText} onChange={(e) => setResultText(e.target.value)} placeholder="e.g. Player A won 3&2"
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
              </div>
              {(match.match_type === 'singles' || match.match_type === 'foursome' || match.match_type === 'fourball') && (
                <div>
                  <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Winner</label>
                  <select value={winnerPlayerId} onChange={(e) => setWinnerPlayerId(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
                    <option value="">No winner / Tie</option>
                    {match.player_a_id && <option value={match.player_a_id}>{getPlayerName(match.player_a_id)}</option>}
                    {match.player_b_id && <option value={match.player_b_id}>{getPlayerName(match.player_b_id)}</option>}
                  </select>
                </div>
              )}
              {match.match_type === 'team' && (
                <div>
                  <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Winner</label>
                  <select value={winnerTeamId} onChange={(e) => setWinnerTeamId(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
                    <option value="">No winner / Tie</option>
                    {match.team_a_id && <option value={match.team_a_id}>{getTeamName(match.team_a_id)}</option>}
                    {match.team_b_id && <option value={match.team_b_id}>{getTeamName(match.team_b_id)}</option>}
                  </select>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowResult(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSaveResult} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Result'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={showDelete} title="Delete Match"
        message="Are you sure you want to delete this match? This will also delete any associated scorecards. This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
    </Container>
  );
}
