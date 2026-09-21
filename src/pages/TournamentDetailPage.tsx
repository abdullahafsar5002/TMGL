import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trophy, Plus, Calendar, MapPin, Loader2, AlertCircle, ArrowLeft, Edit3, Trash2, ChevronRight, Flag, Users, Swords, Medal, Shield, BarChart3, UserPlus, UserMinus } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getTournament, getRoundsByTournament, updateTournament, deleteTournament, getTournamentParticipants, type TournamentParticipant } from '@/lib/competition';
import { finalizeTournament } from '@/lib/tournamentFinalize';
import { joinTournament, leaveTournament, isRegistered, getRegistrationCount } from '@/lib/tournamentRegistration';
import { getPlayerByProfileId } from '@/lib/league';
import { validateTournament } from '@/lib/validation';
import { getSeasons } from '@/lib/league';
import { supabase } from '@/lib/supabase';
import type { Tournament, Round, TournamentStatus, Season, Match, Scorecard } from '@/types/database';
import { useToast } from '@/context/ToastContext';

const STATUS_VARIANTS: Record<TournamentStatus, BadgeVariant> = {
  draft: 'warning', open: 'success', closed: 'info', live: 'danger', completed: 'info', cancelled: 'outline',
};

const STATUS_OPTIONS: TournamentStatus[] = ['draft', 'open', 'live', 'completed', 'cancelled'];

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [activeTab, setActiveTab] = useState<'rounds' | 'participants' | 'stats'>('rounds');
  const [tournamentMatches, setTournamentMatches] = useState<Match[]>([]);
  const [tournamentScorecards, setTournamentScorecards] = useState<Scorecard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState<TournamentStatus>('draft');
  const [editSeasonId, setEditSeasonId] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isPlayerRegistered, setIsPlayerRegistered] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const [tRes, rRes, pRes] = await Promise.all([getTournament(id), getRoundsByTournament(id), getTournamentParticipants(id)]);
    if (tRes.error) setError(tRes.error);
    else {
      setTournament(tRes.data);
      const roundsData = rRes.data ?? [];
      if (roundsData.length > 0) setRounds(roundsData);
      if (pRes.data) setParticipants(pRes.data);

      const roundIds = roundsData.map((r) => r.id);
      if (roundIds.length > 0) {
        const [matchesRes, scorecardsRes] = await Promise.all([
          supabase.from('matches').select('*').in('round_id', roundIds),
          supabase.from('scorecards').select('*').in('round_id', roundIds),
        ]);
        if (matchesRes.data) setTournamentMatches(matchesRes.data as Match[]);
        if (scorecardsRes.data) setTournamentScorecards(scorecardsRes.data as Scorecard[]);
      }
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Check registration status for current player
  useEffect(() => {
    if (!id || !user) return;
    async function checkRegistration() {
      const playerResult = await getPlayerByProfileId(user!.id);
      if (playerResult.data) {
        setPlayerId(playerResult.data.id);
        const regResult = await isRegistered(id!, playerResult.data.id);
        if (regResult.data !== null) setIsPlayerRegistered(regResult.data);
      }
      const countResult = await getRegistrationCount(id!);
      if (countResult.data !== null) setRegistrationCount(countResult.data);
    }
    checkRegistration();
  }, [id, user]);

  const startEdit = () => {
    if (!tournament) return;
    setEditName(tournament.name);
    setEditDesc(tournament.description || '');
    setEditDate(tournament.event_date || '');
    setEditStatus(tournament.status);
    setEditSeasonId(tournament.season_id);
    setEditErrors([]);
    setServerError(null);
    getSeasons().then((r) => { if (r.data) setSeasons(r.data); });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    setEditErrors([]);
    setServerError(null);
    const validation = validateTournament({ name: editName, season_id: editSeasonId, description: editDesc || null, event_date: editDate || null, course_id: null });
    if (!validation.isValid) { setEditErrors(validation.errors); return; }

    setIsSaving(true);
    const result = await updateTournament(id, { name: editName, description: editDesc || null, event_date: editDate || null, status: editStatus });
    setIsSaving(false);

    if (result.error) { setServerError(result.error); toast.error(result.error); return; }
    if (result.data) {
      setTournament(result.data);
      setShowEdit(false);
      toast.success('Tournament updated successfully');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    const result = await deleteTournament(id);
    setIsDeleting(false);
    if (result.error) { setError(result.error); toast.error(result.error); setShowDelete(false); return; }
    toast.success('Tournament deleted successfully');
    navigate('/tournaments');
  };

  const handleStatusChange = async (newStatus: TournamentStatus) => {
    if (!id || !tournament) return;
    const result = await updateTournament(id, { status: newStatus });
    if (result.error) { setError(result.error); toast.error(result.error); return; }
    if (result.data) {
      setTournament(result.data);
      toast.success(`Tournament status changed to ${newStatus}`);
    }
  };

  const handleFinalize = async () => {
    if (!id) return;
    setIsFinalizing(true);
    const result = await finalizeTournament(id);
    setIsFinalizing(false);
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      toast.success(result.data.message);
      load(); // Reload to show updated status
    }
  };

  const handleJoin = async () => {
    if (!id || !playerId) return;
    const result = await joinTournament(id, playerId);
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      if (result.data.registered) {
        setIsPlayerRegistered(true);
        setRegistrationCount(c => c + 1);
        toast.success(result.data.message);
      } else {
        toast.error(result.data.message);
      }
    }
  };

  const handleLeave = async () => {
    if (!id || !playerId) return;
    const result = await leaveTournament(id, playerId);
    if (result.error) {
      toast.error(result.error);
    } else if (result.data) {
      setIsPlayerRegistered(false);
      setRegistrationCount(c => Math.max(0, c - 1));
      toast.success(result.data.message);
    }
  };

  if (isLoading) return <Container size="lg" className="py-4"><LoadingState /></Container>;
  if (error || !tournament) return (
    <Container size="lg" className="py-4">
      <button onClick={() => navigate('/tournaments')} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Tournaments
      </button>
      <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><p>{error || 'Tournament not found'}</p>
      </div>
    </Container>
  );

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button onClick={() => navigate('/tournaments')} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800">
        <ArrowLeft className="w-4 h-4" /> Back to Tournaments
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-tmgl-green-800" /> {tournament.name}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-tmgl-charcoal-500 flex-wrap">
            {tournament.event_date && (
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(tournament.event_date).toLocaleDateString()}</span>
            )}
            {tournament.description && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {tournament.description}</span>}
          </div>
        </div>
        <Badge variant={STATUS_VARIANTS[tournament.status]}>{tournament.status}</Badge>
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={startEdit}><Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit</Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete</Button>
          {(tournament.status === 'live' || tournament.status === 'completed') && (
            <Button variant="primary" size="sm" onClick={handleFinalize} disabled={isFinalizing}
              className="bg-yellow-600 hover:bg-yellow-500">
              {isFinalizing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trophy className="w-3.5 h-3.5 mr-1.5" />}
              Finalize Tournament
            </Button>
          )}
          {STATUS_OPTIONS.filter((s) => s !== tournament.status).map((s) => (
            <Button key={s} variant="outline" size="sm" onClick={() => handleStatusChange(s)}
              className="capitalize">{s}</Button>
          ))}
        </div>
      )}

      {!canManage && tournament.status === 'open' && playerId && (
        <div className="flex flex-wrap gap-2">
          {isPlayerRegistered ? (
            <Button variant="danger" size="sm" onClick={handleLeave}>
              <UserMinus className="w-3.5 h-3.5 mr-1.5" /> Leave Tournament
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleJoin} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Join Tournament
            </Button>
          )}
          <span className="text-xs text-tmgl-charcoal-500 self-center">{registrationCount} registered</span>
        </div>
      )}

      {!canManage && tournament.status === 'open' && !playerId && (
        <div className="flex items-center gap-2 text-sm text-tmgl-charcoal-500">
          <Users className="w-4 h-4" /> {registrationCount} players registered
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => navigate(`/tournaments/${id}`)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${activeTab === 'rounds' ? 'bg-tmgl-green-800 text-white border-tmgl-green-800' : 'bg-white text-tmgl-charcoal-700 border-tmgl-charcoal-200 hover:border-tmgl-green-400'}`}>
          <Flag className="w-3.5 h-3.5" /> Rounds ({rounds.length})
        </button>
        <button onClick={() => setActiveTab('participants')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${activeTab === 'participants' ? 'bg-tmgl-green-800 text-white border-tmgl-green-800' : 'bg-white text-tmgl-charcoal-700 border-tmgl-charcoal-200 hover:border-tmgl-green-400'}`}>
          <Users className="w-3.5 h-3.5" /> Participants ({participants.length})
        </button>
        <button onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${activeTab === 'stats' ? 'bg-tmgl-green-800 text-white border-tmgl-green-800' : 'bg-white text-tmgl-charcoal-700 border-tmgl-charcoal-200 hover:border-tmgl-green-400'}`}>
          <BarChart3 className="w-3.5 h-3.5" /> Stats
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-tmgl-charcoal-500 font-medium self-center mr-1">Quick links:</span>
        <button onClick={() => { setActiveTab('rounds'); }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-tmgl-charcoal-200 hover:border-tmgl-green-400 transition-colors">
          <Flag className="w-3 h-3" /> Rounds
        </button>
        {rounds.length > 0 && (
          <button onClick={() => navigate(`/rounds/${rounds[0].id}`)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-tmgl-charcoal-200 hover:border-tmgl-green-400 transition-colors">
            <Swords className="w-3 h-3" /> Matches
          </button>
        )}
        <button onClick={() => navigate('/leaderboard')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-tmgl-charcoal-200 hover:border-tmgl-green-400 transition-colors">
          <Medal className="w-3 h-3" /> Leaderboard
        </button>
      </div>

      {activeTab === 'rounds' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-tmgl-charcoal-900">Rounds ({rounds.length})</h2>
            {canManage && (
              <Button variant="primary" size="sm" onClick={() => navigate(`/tournaments/${id}/rounds/new`)} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
                <Plus className="w-4 h-4 mr-1.5" /> Add Round
              </Button>
            )}
          </div>

          {rounds.length === 0 ? (
            <EmptyState icon={Flag} title="No rounds yet" description={canManage ? 'Add the first round to this tournament.' : 'Rounds will appear here once created.'}
              action={canManage ? <Button variant="primary" size="sm" onClick={() => navigate(`/tournaments/${id}/rounds/new`)} className="bg-tmgl-green-800 hover:bg-tmgl-green-700"><Plus className="w-4 h-4 mr-1.5" /> Add Round</Button> : undefined} />
          ) : (
            <div className="space-y-2">
              {rounds.map((round) => (
                <button key={round.id} onClick={() => navigate(`/rounds/${round.id}`)} className="w-full text-left">
                  <Card variant="hover" className="cursor-pointer hover:border-tmgl-green-300 transition-colors">
                    <CardHeader>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">Round {round.round_number}: {round.name}</CardTitle>
                        {round.date && <p className="text-xs text-tmgl-charcoal-500 mt-1">{new Date(round.date).toLocaleDateString()}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={round.status === 'completed' ? 'info' : round.status === 'live' ? 'danger' : 'outline'}>{round.status}</Badge>
                        <ChevronRight className="w-4 h-4 text-tmgl-charcoal-400 shrink-0" />
                      </div>
                    </CardHeader>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'stats' && (
        <>
          <h2 className="text-lg font-bold text-tmgl-charcoal-900">Tournament Statistics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Rounds', value: rounds.length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { label: 'Matches', value: tournamentMatches.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: 'Participants', value: participants.length, color: 'bg-amber-50 text-amber-700 border-amber-200' },
            ].map((stat) => (
              <div key={stat.label} className={`p-4 rounded-xl border text-center ${stat.color}`}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs font-medium mt-0.5 opacity-80">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Scheduled', value: tournamentMatches.filter((m) => m.status === 'scheduled').length, color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: 'Live', value: tournamentMatches.filter((m) => m.status === 'live').length, color: 'bg-red-50 text-red-700 border-red-200' },
              { label: 'Completed', value: tournamentMatches.filter((m) => m.status === 'completed').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            ].map((stat) => (
              <div key={stat.label} className={`p-4 rounded-xl border text-center ${stat.color}`}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs font-medium mt-0.5 opacity-80">{stat.label}</p>
              </div>
            ))}
          </div>
          {tournamentScorecards.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-tmgl-charcoal-200 text-center bg-white">
                <p className="text-2xl font-bold text-tmgl-charcoal-900">{tournamentScorecards.filter((sc) => sc.total_strokes !== null).length}</p>
                <p className="text-xs font-medium text-tmgl-charcoal-500 mt-0.5">Scorecards Submitted</p>
              </div>
              <div className="p-4 rounded-xl border border-tmgl-charcoal-200 text-center bg-white">
                <p className="text-2xl font-bold text-tmgl-charcoal-900">
                  {(() => {
                    const completed = tournamentScorecards.filter((sc) => sc.total_strokes !== null);
                    if (completed.length === 0) return '—';
                    return Math.round(completed.reduce((sum, sc) => sum + (sc.total_strokes ?? 0), 0) / completed.length);
                  })()}
                </p>
                <p className="text-xs font-medium text-tmgl-charcoal-500 mt-0.5">Avg Strokes</p>
              </div>
            </div>
          )}
          {tournamentScorecards.length === 0 && tournamentMatches.length === 0 && (
            <EmptyState icon={BarChart3} title="No data yet" description="Statistics will appear here once matches and scores are recorded." />
          )}
          <div className="flex justify-center">
            <button onClick={() => navigate('/leaderboard')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-tmgl-green-700 border border-tmgl-green-200 hover:bg-tmgl-green-50 transition-colors">
              <Medal className="w-4 h-4" /> View Leaderboard
            </button>
          </div>
        </>
      )}

      {activeTab === 'participants' && (
        <>
          <h2 className="text-lg font-bold text-tmgl-charcoal-900">Participants ({participants.length})</h2>
          {participants.length === 0 ? (
            <EmptyState icon={Users} title="No participants yet" description="Participants will appear here once matches are created." />
          ) : (
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={`${p.type}-${p.id}`} className="flex items-center justify-between p-3 rounded-lg border border-tmgl-charcoal-200">
                  <div className="flex items-center gap-3">
                    {p.type === 'team' ? (
                      <Shield className="w-4 h-4 text-tmgl-green-700" />
                    ) : (
                      <Users className="w-4 h-4 text-tmgl-green-700" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-tmgl-charcoal-900">{p.name || 'Unknown'}</p>
                      <p className="text-xs text-tmgl-charcoal-500 capitalize">{p.type}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(p.type === 'team' ? `/teams/${p.id}` : `/players/${p.id}`)}
                    className="text-xs text-tmgl-green-700 hover:underline"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {canManage && (
        <>
          {showEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-5 space-y-4">
                  <h2 className="text-lg font-bold text-tmgl-charcoal-900">Edit Tournament</h2>
                  {editErrors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{editErrors.map((e, i) => <p key={i}>{e}</p>)}</div>}
                  {serverError && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{serverError}</p></div>}
                  <div>
                    <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Season *</label>
                    <select value={editSeasonId} onChange={(e) => setEditSeasonId(e.target.value)}
                      className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
                      <option value="">Select a season</option>
                      {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Name *</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Description</label>
                    <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                      className="w-full px-3 py-2.5 rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Event Date</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as TournamentStatus)}
                      className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={handleSaveEdit} disabled={isSaving} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
                      {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <ConfirmDialog open={showDelete} title="Delete Tournament"
            message={`Are you sure you want to delete "${tournament.name}"? This will also delete all rounds, matches, and scorecards in this tournament. This action cannot be undone.`}
            confirmLabel={isDeleting ? 'Deleting...' : 'Delete'} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
        </>
      )}
    </Container>
  );
}
