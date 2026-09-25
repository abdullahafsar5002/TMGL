import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, Plus, Loader2, AlertCircle, ArrowLeft, Edit3, Trash2, ChevronRight, Swords } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getRound, getMatchesByRound, getTournament, updateRound, deleteRound } from '@/lib/competition';
import { validateRound } from '@/lib/validation';
import type { Round, Match, MatchStatus } from '@/types/database';
import { ROUTES } from '@/router/routes';

const STATUS_VARIANTS: Record<MatchStatus, BadgeVariant> = {
  scheduled: 'warning', live: 'danger', completed: 'info', cancelled: 'outline',
};

const STATUS_OPTIONS: MatchStatus[] = ['scheduled', 'live', 'completed', 'cancelled'];

export function RoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [round, setRound] = useState<Round | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState<MatchStatus>('scheduled');
  const [isSaving, setIsSaving] = useState(false);
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const [rRes, mRes] = await Promise.all([getRound(id), getMatchesByRound(id)]);
    if (rRes.error) setError(rRes.error);
    else {
      setRound(rRes.data);
      if (rRes.data) {
        const tRes = await getTournament(rRes.data.tournament_id);
        if (tRes.data) setTournamentName(tRes.data.name);
      }
      if (mRes.data) setMatches(mRes.data);
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const startEdit = () => {
    if (!round) return;
    setEditName(round.name);
    setEditDate(round.date || '');
    setEditStatus(round.status);
    setEditErrors([]);
    setServerError(null);
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!id || !round) return;
    setEditErrors([]);
    setServerError(null);
    const validation = validateRound({ tournament_id: round.tournament_id, round_number: round.round_number, name: editName, date: editDate || null });
    if (!validation.isValid) { setEditErrors(validation.errors); return; }

    setIsSaving(true);
    const result = await updateRound(id, { name: editName, date: editDate || null, status: editStatus });
    setIsSaving(false);

    if (result.error) { setServerError(result.error); return; }
    if (result.data) {
      setRound(result.data);
      setShowEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !round) return;
    setIsDeleting(true);
    const result = await deleteRound(id);
    setIsDeleting(false);
    if (result.error) { setError(result.error); setShowDelete(false); return; }
    navigate(`/tournaments/${round.tournament_id}`);
  };

  const handleStatusChange = async (newStatus: MatchStatus) => {
    if (!id || !round) return;
    const result = await updateRound(id, { status: newStatus });
    if (result.error) { setError(result.error); return; }
    if (result.data) setRound(result.data);
  };

  if (isLoading) return <Container size="lg" className="py-4"><LoadingState /></Container>;
  if (error || !round) return (
    <Container size="lg" className="py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><p>{error || 'Round not found'}</p>
      </div>
    </Container>
  );

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button onClick={() => navigate(`/tournaments/${round.tournament_id}`)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800">
        <ArrowLeft className="w-4 h-4" /> {tournamentName || 'Back to Tournament'}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <Flag className="w-5 h-5 text-tmgl-green-800" /> Round {round.round_number}: {round.name}
          </h1>
          {round.date && <p className="text-sm text-tmgl-charcoal-500 mt-1">{new Date(round.date).toLocaleDateString()}</p>}
        </div>
        <Badge variant={STATUS_VARIANTS[round.status]}>{round.status}</Badge>
      </div>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={startEdit}><Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit</Button>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete</Button>
          {STATUS_OPTIONS.filter((s) => s !== round.status).map((s) => (
            <Button key={s} variant="outline" size="sm" onClick={() => handleStatusChange(s)}
              className="capitalize">{s}</Button>
          ))}
          <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.roundMatchCreate(id!))} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            <Plus className="w-4 h-4 mr-1.5" /> Add Match
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-tmgl-charcoal-900">Matches ({matches.length})</h2>
      </div>

      {matches.length === 0 ? (
        <EmptyState icon={Swords} title="No matches yet" description={canManage ? 'Add the first match to this round.' : 'Matches will appear here once created.'}
          action={canManage ? <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.roundMatchCreate(id!))} className="bg-tmgl-green-800 hover:bg-tmgl-green-700"><Plus className="w-4 h-4 mr-1.5" /> Add Match</Button> : undefined} />
      ) : (
        <div className="space-y-2">
          {matches.map((match) => (
            <button key={match.id} onClick={() => navigate(`/matches/${match.id}`)} className="w-full text-left">
              <Card variant="hover" className="cursor-pointer hover:border-tmgl-green-300 transition-colors">
                <CardHeader>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base capitalize">{match.match_type} Match</CardTitle>
                    {match.scheduled_at && <p className="text-xs text-tmgl-charcoal-500 mt-1">{new Date(match.scheduled_at).toLocaleString()}</p>}
                    {match.result && <p className="text-xs text-tmgl-charcoal-600 mt-1">Result: {match.result}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[match.status]}>{match.status}</Badge>
                    <ChevronRight className="w-4 h-4 text-tmgl-charcoal-400 shrink-0" />
                  </div>
                </CardHeader>
              </Card>
            </button>
          ))}
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-tmgl-charcoal-900">Edit Round</h2>
              {editErrors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{editErrors.map((e, i) => <p key={i}>{e}</p>)}</div>}
              {serverError && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{serverError}</p></div>}
              <div>
                <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Name *</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Date</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as MatchStatus)}
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
      <ConfirmDialog open={showDelete} title="Delete Round"
        message={`Are you sure you want to delete Round ${round.round_number}: "${round.name}"? This will also delete all matches and scorecards in this round. This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} />
    </Container>
  );
}
