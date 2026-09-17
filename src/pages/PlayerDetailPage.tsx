import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Users, ArrowLeft, Edit, Trash2, Loader2, AlertCircle, Calendar, Phone, Hash, Shield, Swords, FileText, ChevronRight } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getPlayer, updatePlayer, deletePlayer, getTeamsByPlayer, getTeamsByIds, getSeason, getPlayers } from '@/lib/league';
import { getMatchesByPlayer, getScorecardsByPlayer } from '@/lib/competition';
import { validatePlayer, type PlayerInput } from '@/lib/validation';
import type { Player, TeamMember, Season, Match, Scorecard, Team } from '@/types/database';

export function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canManage = canManageLeague(profile?.role);

  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMemberships, setTeamMemberships] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasonMap, setSeasonMap] = useState<Record<string, Season>>({});
  const [playerNameMap, setPlayerNameMap] = useState<Record<string, string>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<PlayerInput>({
    full_name: '', phone: null, handicap_index: null, status: 'active',
  });
  const [playerCode, setPlayerCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const [res, teamsRes, matchesRes, scorecardsRes] = await Promise.all([
      getPlayer(id),
      getTeamsByPlayer(id),
      getMatchesByPlayer(id),
      getScorecardsByPlayer(id),
    ]);
    if (res.error || !res.data) {
      setError(res.error || 'Player not found');
    } else {
      setPlayer(res.data);
      setEditForm({
        full_name: res.data.full_name,
        phone: res.data.phone,
        handicap_index: res.data.handicap_index,
        status: res.data.status,
      });
      setPlayerCode(res.data.player_code ?? '');
      setMatches(matchesRes.data ?? []);
      setScorecards(scorecardsRes.data ?? []);
      const memberships = teamsRes.data ?? [];
      setTeamMemberships(memberships);

      const teamIds = [...new Set(memberships.map((m) => m.team_id))];
      if (teamIds.length > 0) {
        const teamsResult = await getTeamsByIds(teamIds);
        const teamsData = teamsResult.data ?? [];
        setTeams(teamsData);

        const seasonIds = [...new Set(teamsData.map((t) => t.season_id))];
        const seasonResults = await Promise.all(seasonIds.map((sid) => getSeason(sid)));
        const sMap: Record<string, Season> = {};
        seasonResults.forEach((sr) => { if (sr.data) sMap[sr.data.id] = sr.data; });
        setSeasonMap(sMap);
      }

      const matchData = matchesRes.data ?? [];
      const opponentIds = [...new Set(
        matchData.flatMap((m) => [m.player_a_id, m.player_b_id]).filter((pid): pid is string => !!pid && pid !== id)
      )];
      if (opponentIds.length > 0) {
        const allPlayersRes = await getPlayers();
        if (allPlayersRes.data) {
          const pMap: Record<string, string> = {};
          allPlayersRes.data.forEach((p) => { pMap[p.id] = p.full_name; });
          setPlayerNameMap(pMap);
        }
      }
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!id) return;
    const result = validatePlayer(editForm);
    if (!result.isValid) { setValidationErrors(result.errors); return; }
    setValidationErrors([]);
    setIsSaving(true);
    setSaveError(null);
    const res = await updatePlayer(id, {
      full_name: editForm.full_name.trim(),
      phone: editForm.phone,
      handicap_index: editForm.handicap_index,
      status: editForm.status,
      player_code: playerCode || null,
    });
    setIsSaving(false);
    if (res.error || !res.data) {
      setSaveError(res.error || 'Update failed');
    } else {
      setPlayer(res.data);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setShowDeleteConfirm(false);
    const res = await deletePlayer(id);
    if (res.error) setError(res.error);
    else navigate('/players');
  };

  if (isLoading) {
    return (
      <Container size="lg" className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" />
      </Container>
    );
  }

  if (error || !player) {
    return (
      <Container size="lg" className="py-8">
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load player</p>
            <p className="mt-0.5 text-red-700">{error || 'Player not found'}</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/players')} className="mt-2">Back to Players</Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to="/players" className="text-sm text-tmgl-green-700 hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Players
          </Link>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-tmgl-green-800" />
            {isEditing ? 'Edit Player' : player.full_name}
          </h1>
        </div>
        {canManage && !isEditing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="w-4 h-4 mr-1" />Edit</Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
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

      <Card>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div>
                <label htmlFor="p-name" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Full Name *</label>
                <input id="p-name" type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
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
                  <input id="p-phone" type="tel" value={editForm.phone ?? ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value || null })}
                    className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
                </div>
                <div>
                  <label htmlFor="p-handicap" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Handicap Index</label>
                  <input id="p-handicap" type="number" step="0.01" min="0" max="54" value={editForm.handicap_index ?? ''} onChange={(e) => setEditForm({ ...editForm, handicap_index: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label htmlFor="p-status" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Status</label>
                <select id="p-status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent bg-white">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" size="md" onClick={() => { setIsEditing(false); setValidationErrors([]); setSaveError(null); }}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Badge variant={player.status === 'active' ? 'success' : player.status === 'suspended' ? 'danger' : 'warning'}>{player.status}</Badge>
                {player.player_code && (
                  <span className="text-sm text-tmgl-charcoal-600 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" /> {player.player_code}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-tmgl-charcoal-500 font-medium flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone</p>
                  <p className="text-tmgl-charcoal-900">{player.phone || '\u2014'}</p>
                </div>
                <div>
                  <p className="text-tmgl-charcoal-500 font-medium">Handicap Index</p>
                  <p className="text-tmgl-charcoal-900">{player.handicap_index ?? '\u2014'}</p>
                </div>
                <div>
                  <p className="text-tmgl-charcoal-500 font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined</p>
                  <p className="text-tmgl-charcoal-900">{player.join_date ? new Date(player.join_date).toLocaleDateString() : '\u2014'}</p>
                </div>
                <div>
                  <p className="text-tmgl-charcoal-500 font-medium">Created</p>
                  <p className="text-tmgl-charcoal-900">{new Date(player.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!isEditing && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-tmgl-green-700" />
                <CardTitle className="text-base">Player Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                  <p className="text-xl font-bold text-tmgl-charcoal-900">{matches.length}</p>
                  <p className="text-xs text-tmgl-charcoal-500">Matches</p>
                </div>
                <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                  <p className="text-xl font-bold text-emerald-700">{matches.filter((m) => m.winner_player_id === id && m.status === 'completed').length}</p>
                  <p className="text-xs text-tmgl-charcoal-500">Wins</p>
                </div>
                <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                  <p className="text-xl font-bold text-red-700">{matches.filter((m) => m.status === 'completed' && m.winner_player_id && m.winner_player_id !== id).length}</p>
                  <p className="text-xs text-tmgl-charcoal-500">Losses</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                  <p className="text-xl font-bold text-tmgl-charcoal-900">{scorecards.length}</p>
                  <p className="text-xs text-tmgl-charcoal-500">Scorecards</p>
                </div>
                <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
                  <p className="text-xl font-bold text-tmgl-charcoal-900">
                    {(() => {
                      const completed = scorecards.filter((sc) => sc.total_strokes !== null);
                      if (completed.length === 0) return '—';
                      return Math.round(completed.reduce((sum, sc) => sum + (sc.total_strokes ?? 0), 0) / completed.length);
                    })()}
                  </p>
                  <p className="text-xs text-tmgl-charcoal-500">Avg Strokes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-tmgl-green-700" />
                <CardTitle className="text-base">Team Memberships ({teamMemberships.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {teamMemberships.length === 0 ? (
                <p className="text-sm text-tmgl-charcoal-500">Not assigned to any team.</p>
              ) : (
                <div className="space-y-2">
                  {teamMemberships.map((member) => {
                    const team = teams.find((t) => t.id === member.team_id);
                    const season = team ? seasonMap[team.season_id] : null;
                    return (
                      <button key={member.id} onClick={() => navigate(`/teams/${member.team_id}`)} className="w-full text-left">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-tmgl-charcoal-200 hover:border-tmgl-green-300 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-tmgl-charcoal-900">{team?.name ?? 'Unknown team'}</p>
                            <p className="text-xs text-tmgl-charcoal-500">
                              {season?.name ?? 'Unknown season'} · Joined {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-tmgl-charcoal-400 shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-tmgl-green-700" />
                <CardTitle className="text-base">Match History ({matches.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <p className="text-sm text-tmgl-charcoal-500">No matches played yet.</p>
              ) : (
                <div className="space-y-2">
                  {matches.slice(0, 10).map((match) => {
                    const isPlayerA = match.player_a_id === id;
                    const opponentId = isPlayerA ? match.player_b_id : match.player_a_id;
                    const opponentName = opponentId ? playerNameMap[opponentId] ?? 'Unknown' : 'TBD';
                    const won = match.winner_player_id === id;
                    const MATCH_STATUS_VARIANTS: Record<string, BadgeVariant> = {
                      completed: 'info', live: 'danger', scheduled: 'outline', draft: 'outline', cancelled: 'outline',
                    };
                    return (
                      <button key={match.id} onClick={() => navigate(`/matches/${match.id}`)} className="w-full text-left">
                        <div className="flex items-center justify-between p-3 rounded-lg border border-tmgl-charcoal-200 hover:border-tmgl-green-300 transition-colors">
                          <div>
                            <p className="text-sm font-medium text-tmgl-charcoal-900">vs {opponentName}</p>
                            <p className="text-xs text-tmgl-charcoal-500">{match.match_type}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {match.status === 'completed' && (
                              <Badge variant={won ? 'success' : 'danger'}>{won ? 'Won' : 'Lost'}</Badge>
                            )}
                            <Badge variant={MATCH_STATUS_VARIANTS[match.status] ?? 'outline'}>{match.status}</Badge>
                            <ChevronRight className="w-4 h-4 text-tmgl-charcoal-400" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-tmgl-green-700" />
                <CardTitle className="text-base">Scorecards ({scorecards.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {scorecards.length === 0 ? (
                <p className="text-sm text-tmgl-charcoal-500">No scorecards submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {scorecards.map((sc) => (
                    <button key={sc.id} onClick={() => navigate(`/scorecards/${sc.id}`)} className="w-full text-left">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-tmgl-charcoal-200 hover:border-tmgl-green-300 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-tmgl-charcoal-900">
                            {sc.total_strokes !== null ? `${sc.total_strokes} strokes` : 'No score yet'}
                          </p>
                          <p className="text-xs text-tmgl-charcoal-500">
                            {sc.total_score_to_par !== null ? (sc.total_score_to_par > 0 ? `+${sc.total_score_to_par}` : sc.total_score_to_par === 0 ? 'E' : sc.total_score_to_par) : '\u2014'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={sc.status === 'verified' ? 'success' : sc.status === 'submitted' ? 'warning' : 'outline'}>{sc.status}</Badge>
                          <ChevronRight className="w-4 h-4 text-tmgl-charcoal-400" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Player"
        message="Delete this player? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Container>
  );
}
