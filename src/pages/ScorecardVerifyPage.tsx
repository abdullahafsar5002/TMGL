import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck, ArrowLeft, AlertCircle, CheckCircle, XCircle, Loader2, ChevronRight } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getScorecardsByRound, getRound, getTournament, verifyScorecard, rejectScorecard, getScorecardsCompletionByRound, type ScorecardCompletion } from '@/lib/competition';
import { supabase } from '@/lib/supabase';
import { formatToPar } from '@/utils/golf';
import type { Scorecard, ScorecardStatus } from '@/types/database';

const STATUS_VARIANTS: Record<ScorecardStatus, BadgeVariant> = {
  draft: 'outline',
  in_progress: 'warning',
  submitted: 'warning',
  verified: 'success',
  rejected: 'danger',
  amended: 'warning',
};

export function ScorecardVerifyPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [completion, setCompletion] = useState<Record<string, ScorecardCompletion>>({});
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [round, setRound] = useState<{ tournament_id: string; round_number: number; name: string } | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Scorecard | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    const [scRes, roundRes] = await Promise.all([
      getScorecardsByRound(id),
      getRound(id),
    ]);

    if (scRes.error) {
      setError(scRes.error);
      setIsLoading(false);
      return;
    }

    const cards = scRes.data ?? [];
    setScorecards(cards);

    const completionRes = await getScorecardsCompletionByRound(id);
    if (completionRes.data) {
      const map: Record<string, ScorecardCompletion> = {};
      completionRes.data.forEach((c) => { map[c.scorecard_id] = c; });
      setCompletion(map);
    }

    if (roundRes.data) {
      setRound({
        tournament_id: roundRes.data.tournament_id,
        round_number: roundRes.data.round_number,
        name: roundRes.data.name,
      });
      const tRes = await getTournament(roundRes.data.tournament_id);
      if (tRes.data) setTournamentName(tRes.data.name);
    }

    const playerIds = [...new Set(cards.map((c) => c.player_id))];
    if (playerIds.length > 0) {
      const { data: players } = await supabase
        .from('players')
        .select('id, full_name')
        .in('id', playerIds);

      if (players) {
        const map: Record<string, string> = {};
        players.forEach((p) => { map[p.id] = p.full_name; });
        setPlayerNames(map);
      }
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (scId: string) => {
    const card = completion[scId];
    if (card && !card.is_complete) {
      toast.error(`Cannot verify an incomplete scorecard (${card.holes_completed}/${card.total_holes} holes scored).`);
      return;
    }

    setActionLoading(scId);
    const result = await verifyScorecard(scId);
    setActionLoading(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success('Scorecard verified');
    setScorecards((prev) =>
      prev.map((sc) => (sc.id === scId ? { ...sc, status: 'verified' as ScorecardStatus } : sc))
    );
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    const result = await rejectScorecard(rejectTarget.id, rejectReason || undefined);
    setActionLoading(null);

    if (result.error) {
      toast.error(result.error);
      setRejectTarget(null);
      setRejectReason('');
      return;
    }

    toast.success('Scorecard rejected');
    setScorecards((prev) =>
      prev.map((sc) => (sc.id === rejectTarget.id ? { ...sc, status: 'rejected' as ScorecardStatus } : sc))
    );
    setRejectTarget(null);
    setRejectReason('');
  };

  if (isLoading) {
    return (
      <Container size="lg" className="py-4">
        <LoadingState />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="lg" className="py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      </Container>
    );
  }

  const submittedCount = scorecards.filter((sc) => sc.status === 'submitted').length;
  const verifiedCount = scorecards.filter((sc) => sc.status === 'verified').length;
  const rejectedCount = scorecards.filter((sc) => sc.status === 'rejected').length;

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button
        onClick={() => { if (round) navigate(`/rounds/${id}`); else navigate(-1); }}
        className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800"
      >
        <ArrowLeft className="w-4 h-4" /> {tournamentName || 'Back to Round'}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-tmgl-green-800" /> Verify Scorecards
          </h1>
          {round && (
            <p className="text-sm text-tmgl-charcoal-500 mt-1">
              Round {round.round_number}: {round.name}
            </p>
          )}
        </div>
      </div>

      {scorecards.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-2xl font-bold text-amber-700">{submittedCount}</p>
            <p className="text-xs text-tmgl-charcoal-500">Submitted</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-green-700">{verifiedCount}</p>
            <p className="text-xs text-tmgl-charcoal-500">Verified</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-red-700">{rejectedCount}</p>
            <p className="text-xs text-tmgl-charcoal-500">Rejected</p>
          </Card>
        </div>
      )}

      {scorecards.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No scorecards"
          description="No scorecards have been submitted for this round yet."
        />
      ) : (
        <div className="space-y-2">
          {scorecards.map((sc) => {
            const card = completion[sc.id];
            const isComplete = card ? card.is_complete : true;

            return (
            <Card key={sc.id}>
              <CardHeader>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">
                    {playerNames[sc.player_id] ?? 'Unknown Player'}
                  </CardTitle>
                  <div className="flex items-center gap-3 mt-1 text-sm text-tmgl-charcoal-500">
                    {sc.total_strokes != null && <span>{sc.total_strokes} strokes</span>}
                    {sc.total_score_to_par != null && (
                      <span className={sc.total_score_to_par <= 0 ? 'text-green-700' : 'text-red-700'}>
                        {formatToPar(sc.total_score_to_par)}
                      </span>
                    )}
                    {card && (
                      <span className={isComplete ? 'text-tmgl-charcoal-500' : 'text-amber-700 font-semibold'}>
                        {card.holes_completed}/{card.total_holes} holes
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isComplete && <Badge variant="warning">incomplete</Badge>}
                  <Badge variant={STATUS_VARIANTS[sc.status]}>
                    {sc.status?.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>

              {canManage && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-tmgl-charcoal-100">
                  {sc.status !== 'verified' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleVerify(sc.id)}
                      disabled={actionLoading === sc.id || !isComplete}
                      title={isComplete ? undefined : 'Scorecard is incomplete and cannot be verified'}
                      className="bg-tmgl-green-800 hover:bg-tmgl-green-700"
                    >
                      {actionLoading === sc.id ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                      )}
                      Verify
                    </Button>
                  )}
                  {sc.status !== 'rejected' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setRejectTarget(sc)}
                      disabled={actionLoading === sc.id}
                    >
                      <XCircle className="w-4 h-4 mr-1.5" /> Reject
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/scorecard/${sc.id}`)}
                    className="ml-auto"
                  >
                    View <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </Card>
            );
          })}
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-5 space-y-4">
              <h2 className="text-lg font-bold text-tmgl-charcoal-900">Reject Scorecard</h2>
              <p className="text-sm text-tmgl-charcoal-600">
                Are you sure you want to reject the scorecard for{' '}
                <strong>{playerNames[rejectTarget.player_id] ?? 'Unknown Player'}</strong>?
              </p>
              <div>
                <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason"
                  className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleReject}
                  disabled={actionLoading === rejectTarget.id}
                >
                  {actionLoading === rejectTarget.id ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Rejecting...</>
                  ) : (
                    <><XCircle className="w-4 h-4 mr-1.5" /> Reject</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
