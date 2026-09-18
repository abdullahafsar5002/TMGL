import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Shield, ArrowLeft, Edit, Trash2, Loader2, AlertCircle, Users, Plus, X, Calendar, Swords, ChevronRight } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ImageUpload } from '@/components/common/ImageUpload';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getTeam, updateTeam, deleteTeam, getSeason, getDivisionsBySeason, getTeamMembers, addTeamMember, removeTeamMember, getPlayers, getAllTeams } from '@/lib/league';
import { getMatchesByTeam } from '@/lib/competition';
import { validateTeam } from '@/lib/validation';
import type { Team, Season, Division, TeamMember, Player, Match } from '@/types/database';

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canManage = canManageLeague(profile?.role);

  const [team, setTeam] = useState<Team | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDivisionId, setEditDivisionId] = useState<string | null>(null);
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeTargetPlayerId, setRemoveTargetPlayerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const [teamRes, membersRes, playersRes, matchesRes, allTeamsRes] = await Promise.all([
      getTeam(id),
      getTeamMembers(id),
      getPlayers(),
      getMatchesByTeam(id),
      getAllTeams(),
    ]);
    if (teamRes.error || !teamRes.data) {
      setError(teamRes.error || 'Team not found');
      setIsLoading(false);
      return;
    }
    setTeam(teamRes.data);
    setEditName(teamRes.data.name);
    setEditDivisionId(teamRes.data.division_id);
    setEditLogoUrl(teamRes.data.logo_url);
    setMembers(membersRes.data ?? []);
    setPlayers(playersRes.data ?? []);
    setMatches(matchesRes.data ?? []);
    setAllTeams(allTeamsRes.data ?? []);

    const seasonRes = await getSeason(teamRes.data.season_id);
    if (seasonRes.data) setSeason(seasonRes.data);
    if (seasonRes.data) {
      const divRes = await getDivisionsBySeason(teamRes.data.season_id);
      setDivisions(divRes.data ?? []);
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const handleSave = async () => {
    if (!id || !team) return;
    const result = validateTeam({ name: editName, season_id: team.season_id, division_id: editDivisionId });
    if (!result.isValid) { setValidationErrors(result.errors); return; }
    setValidationErrors([]);
    setIsSaving(true);
    setSaveError(null);
    const res = await updateTeam(id, { name: editName.trim(), division_id: editDivisionId, logo_url: editLogoUrl });
    setIsSaving(false);
    if (res.error || !res.data) {
      setSaveError(res.error || 'Update failed');
    } else {
      setTeam(res.data);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setShowDeleteConfirm(false);
    const res = await deleteTeam(id);
    if (res.error) setError(res.error);
    else navigate(season ? `/seasons/${season.id}` : '/teams');
  };

  const handleAddMember = async () => {
    if (!id || !selectedPlayerId) return;
    setIsAddingMember(true);
    setAddMemberError(null);
    const res = await addTeamMember(id, selectedPlayerId);
    setIsAddingMember(false);
    if (res.error || !res.data) {
      setAddMemberError(res.error || 'Failed to add player');
    } else {
      setMembers([...members, res.data]);
      setSelectedPlayerId('');
      setShowAddMember(false);
    }
  };

  const handleRemoveMember = async (playerId: string) => {
    if (!id) return;
    setRemoveTargetPlayerId(playerId);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveMember = async () => {
    if (!id || !removeTargetPlayerId) return;
    setShowRemoveConfirm(false);
    const res = await removeTeamMember(id, removeTargetPlayerId);
    if (res.error) setAddMemberError(res.error);
    else setMembers(members.filter((m) => m.player_id !== removeTargetPlayerId));
    setRemoveTargetPlayerId(null);
  };

  if (isLoading) {
    return (
      <Container size="lg" className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-tmgl-green-800 animate-spin" />
      </Container>
    );
  }

  if (error || !team) {
    return (
      <Container size="lg" className="py-8">
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to load team</p>
            <p className="mt-0.5 text-red-700">{error || 'Team not found'}</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/teams')} className="mt-2">Back to Teams</Button>
          </div>
        </div>
      </Container>
    );
  }

  const assignedDivision = divisions.find((d) => d.id === team.division_id);
  const enrichedMembers = members.filter((m) => playerMap[m.player_id]);

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link to={season ? `/seasons/${season.id}` : '/teams'} className="text-sm text-tmgl-green-700 hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> {season?.name ?? 'Teams'}
          </Link>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-tmgl-green-800" />
            {isEditing ? 'Edit Team' : team.name}
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
                <label htmlFor="t-name" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Team Name *</label>
                <input id="t-name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm text-tmgl-charcoal-900 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent" />
              </div>
              {divisions.length > 0 && (
                <div>
                  <label htmlFor="t-div" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Division</label>
                  <select id="t-div" value={editDivisionId ?? ''} onChange={(e) => setEditDivisionId(e.target.value || null)}
                    className="w-full px-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent">
                    <option value="">No division</option>
                    {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">Team Logo</label>
                <ImageUpload value={editLogoUrl} onChange={setEditLogoUrl} folder="logos" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" size="md" onClick={() => { setIsEditing(false); setValidationErrors([]); setSaveError(null); setEditLogoUrl(team?.logo_url ?? null); }}>Cancel</Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-tmgl-charcoal-700 space-y-1">
              {team.logo_url && (
                <img src={team.logo_url} alt={`${team.name} logo`} className="w-16 h-16 rounded-lg object-cover border border-tmgl-charcoal-200 mb-2" />
              )}
              <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-tmgl-charcoal-400" /> <span className="font-medium text-tmgl-charcoal-500">Season:</span> {season?.name ?? '\u2014'}</p>
              <p><span className="font-medium text-tmgl-charcoal-500">Division:</span> {assignedDivision?.name ?? 'Unassigned'}</p>
              <p><span className="font-medium text-tmgl-charcoal-500">Members:</span> {members.length}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-tmgl-green-700" />
            <CardTitle className="text-base">Team Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
              <p className="text-xl font-bold text-tmgl-charcoal-900">{members.length}</p>
              <p className="text-xs text-tmgl-charcoal-500">Members</p>
            </div>
            <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
              <p className="text-xl font-bold text-tmgl-charcoal-900">{matches.length}</p>
              <p className="text-xs text-tmgl-charcoal-500">Matches</p>
            </div>
            <div className="text-center p-3 rounded-lg border border-tmgl-charcoal-100">
              <p className="text-xl font-bold text-emerald-700">{matches.filter((m) => m.winner_team_id === id && m.status === 'completed').length}</p>
              <p className="text-xs text-tmgl-charcoal-500">Wins</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-tmgl-green-700" />
            <CardTitle className="text-base">Roster ({members.length})</CardTitle>
          </div>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => { setShowAddMember(!showAddMember); setAddMemberError(null); }}>
              {showAddMember ? <X className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {showAddMember ? 'Cancel' : 'Add Player'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {addMemberError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{addMemberError}</span>
            </div>
          )}

          {showAddMember && canManage && (
            <div className="flex items-end gap-2 p-3 bg-tmgl-charcoal-50 rounded-lg border border-tmgl-charcoal-200">
              <div className="flex-1">
                <label htmlFor="add-player" className="block text-xs font-semibold text-tmgl-charcoal-600 mb-1">Select Player</label>
                <select id="add-player" value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
                  <option value="">Choose a player...</option>
                  {players.filter((p) => !members.some((m) => m.player_id === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
              <Button variant="primary" size="md" onClick={handleAddMember} disabled={!selectedPlayerId || isAddingMember}
                className="bg-tmgl-green-800 hover:bg-tmgl-green-700 shrink-0">
                {isAddingMember ? 'Adding...' : 'Add'}
              </Button>
            </div>
          )}

          {enrichedMembers.length === 0 ? (
            <p className="text-sm text-tmgl-charcoal-500">No players on this team yet.</p>
          ) : (
            <div className="space-y-2">
              {enrichedMembers.map((member) => {
                const player = playerMap[member.player_id];
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-tmgl-charcoal-200">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-tmgl-charcoal-900 truncate">{player?.full_name ?? 'Unknown player'}</p>
                      {player?.player_code && <p className="text-xs text-tmgl-charcoal-500">Code: {player.player_code}</p>}
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.player_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 ml-2">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
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
                const isTeamA = match.team_a_id === id;
                const opponentId = isTeamA ? match.team_b_id : match.team_a_id;
                const opponentTeam = allTeams.find((t) => t.id === opponentId);
                const opponentName = opponentTeam?.name ?? (opponentId ? 'Unknown team' : 'TBD');
                const won = match.winner_team_id === id;
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

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Team"
        message="Delete this team and all its membership records?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <ConfirmDialog
        open={showRemoveConfirm}
        title="Remove Player"
        message="Remove this player from the team?"
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmRemoveMember}
        onCancel={() => { setShowRemoveConfirm(false); setRemoveTargetPlayerId(null); }}
      />
    </Container>
  );
}
