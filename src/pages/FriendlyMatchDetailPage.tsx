import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Play, Trash2, UserPlus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/common/Badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/context/ToastContext';
import { getPlayerByProfileId, getPlayers } from '@/lib/league';
import {
  getFriendlyMatch,
  getFriendlyMatchPlayers,
  updateFriendlyMatch,
  deleteFriendlyMatch,
  invitePlayer,
  updateInvitation,
  removePlayer,
  getMatchFormatLabel,
} from '@/lib/friendly';
import type { FriendlyMatch, FriendlyMatchPlayer, Player } from '@/types/database';

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  pending: 'info',
  active: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

const INVITATION_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  cancelled: 'danger',
};

export default function FriendlyMatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<FriendlyMatch | null>(null);
  const [players, setPlayers] = useState<FriendlyMatchPlayer[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isCreator = match?.creator_id === currentPlayerId;
  const myInvitation = players.find(p => p.player_id === currentPlayerId);
  const isParticipant = !!myInvitation;
  const allAccepted = players.length > 0 && players.every(p => p.invitation_status === 'accepted');

  const loadData = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);

    try {
      const playerResult = await getPlayerByProfileId(user.id);
      if (playerResult.error || !playerResult.data) {
        setError('Player profile not found.');
        return;
      }
      setCurrentPlayerId(playerResult.data.id);

      const matchResult = await getFriendlyMatch(id);
      if (matchResult.error || !matchResult.data) {
        setError('Match not found.');
        return;
      }
      setMatch(matchResult.data);

      const playersResult = await getFriendlyMatchPlayers(id);
      if (playersResult.error) setError(playersResult.error);
      else setPlayers(playersResult.data ?? []);

      const allPlayersResult = await getPlayers();
      if (allPlayersResult.data) setAllPlayers(allPlayersResult.data);
    } catch {
      setError('Failed to load match details.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleStartMatch() {
    if (!id) return;
    setActionLoading(true);
    try {
      const result = await updateFriendlyMatch(id, { status: 'active', started_at: new Date().toISOString() });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMatch(result.data);
      toast.success('Match started!');
    } catch {
      setError('Failed to start match.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelMatch() {
    if (!id) return;
    setActionLoading(true);
    try {
      const result = await updateFriendlyMatch(id, { status: 'cancelled' });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMatch(result.data);
      toast.success('Match cancelled.');
    } catch {
      setError('Failed to cancel match.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteMatch() {
    if (!id) return;
    const result = await deleteFriendlyMatch(id);
    if (result.error) {
      setError(result.error);
    } else {
      toast.success('Match deleted.');
      navigate('/friendly');
    }
  }

  async function handleAcceptInvitation() {
    if (!myInvitation) return;
    setActionLoading(true);
    try {
      const result = await updateInvitation(myInvitation.id, 'accepted');
      if (result.error) {
        setError(result.error);
        return;
      }
      setPlayers(prev => prev.map(p => p.id === myInvitation.id ? { ...p, invitation_status: 'accepted' as const, joined_at: new Date().toISOString() } : p));
      toast.success('You accepted the invitation!');
    } catch {
      setError('Failed to accept invitation.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectInvitation() {
    if (!myInvitation) return;
    setActionLoading(true);
    try {
      const result = await updateInvitation(myInvitation.id, 'rejected');
      if (result.error) {
        setError(result.error);
        return;
      }
      setPlayers(prev => prev.map(p => p.id === myInvitation.id ? { ...p, invitation_status: 'rejected' as const } : p));
      toast.info('Invitation declined.');
    } catch {
      setError('Failed to reject invitation.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleInvitePlayer(playerId: string) {
    if (!id) return;
    try {
      const result = await invitePlayer(id, playerId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setPlayers(prev => [...prev, result.data!]);
      }
      setShowInviteDialog(false);
      setInviteSearch('');
      toast.success('Player invited!');
    } catch {
      setError('Failed to invite player.');
    }
  }

  async function handleRemovePlayer(playerId: string) {
    if (!id) return;
    const result = await removePlayer(id, playerId);
    if (result.error) {
      setError(result.error);
    } else {
      setPlayers(prev => prev.filter(p => p.player_id !== playerId) as FriendlyMatchPlayer[]);
      toast.info('Player removed.');
    }
  }

  if (loading) return <LoadingState message="Loading match details..." />;

  if (!match) {
    return (
      <Container className="py-8">
        <div className="text-center text-gray-500">Match not found.</div>
      </Container>
    );
  }

  const filteredPlayers = allPlayers.filter(p =>
    p.full_name.toLowerCase().includes(inviteSearch.toLowerCase()) &&
    !players.some(mp => mp.player_id === p.id)
  );

  return (
    <Container className="py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{match.title}</h1>
          <p className="text-gray-500 text-sm">
            {getMatchFormatLabel(match.match_format)} · {match.round_type}-hole
            {match.scheduled_at && ` · Scheduled ${new Date(match.scheduled_at).toLocaleDateString()}`}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[match.status] ?? 'default'}>
          {match.status}
        </Badge>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {match.description && (
        <Card variant="bordered" className="mb-6">
          <CardContent className="p-4">
            <p className="text-gray-700">{match.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <Card variant="bordered">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Participants ({players.length})</CardTitle>
                {isCreator && match.status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Invite
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <p className="text-gray-500 text-sm">No players invited yet.</p>
              ) : (
                <div className="space-y-3">
                  {players.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-green-700">
                            {(p as unknown as { players?: { full_name?: string } }).players?.full_name?.charAt(0) ?? '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {(p as unknown as { players?: { full_name?: string } }).players?.full_name ?? 'Unknown Player'}
                          </p>
                          {p.joined_at && (
                            <p className="text-xs text-gray-500">Joined {new Date(p.joined_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={INVITATION_VARIANTS[p.invitation_status] ?? 'default'}>
                          {p.invitation_status}
                        </Badge>
                        {p.score !== null && (
                          <span className="font-bold text-gray-900">{p.score}</span>
                        )}
                        {isCreator && match.status === 'pending' && p.invitation_status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => handleRemovePlayer(p.player_id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card variant="bordered">
            <CardHeader>
              <CardTitle className="text-lg">Match Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Format</span>
                <span className="font-medium">{getMatchFormatLabel(match.match_format)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Holes</span>
                <span className="font-medium">{match.round_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <Badge variant={STATUS_VARIANTS[match.status] ?? 'default'}>{match.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created</span>
                <span className="font-medium text-sm">{new Date(match.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {match.status === 'pending' && isCreator && allAccepted && players.length > 0 && (
              <Button variant="primary" fullWidth onClick={handleStartMatch} disabled={actionLoading}>
                <Play className="h-4 w-4 mr-2" />
                {actionLoading ? 'Starting...' : 'Start Match'}
              </Button>
            )}

            {match.status === 'pending' && isParticipant && myInvitation?.invitation_status === 'pending' && (
              <>
                <Button variant="primary" fullWidth onClick={handleAcceptInvitation} disabled={actionLoading}>
                  Accept Invitation
                </Button>
                <Button variant="outline" fullWidth onClick={handleRejectInvitation} disabled={actionLoading}>
                  Decline
                </Button>
              </>
            )}

            {(match.status === 'active' || match.status === 'completed') && isParticipant && myInvitation && (
              <Link to={`/friendly/${match.id}/score`}>
                <Button variant="primary" fullWidth>
                  {match.status === 'active' ? 'Enter Scores' : 'View Scorecard'}
                </Button>
              </Link>
            )}

            {match.status === 'pending' && isCreator && (
              <>
                <Button variant="outline" fullWidth onClick={handleCancelMatch} disabled={actionLoading}>
                  Cancel Match
                </Button>
                <Button variant="danger" fullWidth onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Match
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteMatch}
        title="Delete Match?"
        message="This will permanently delete this friendly match and all associated data."
      />

      {showInviteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Invite Player</h2>
            <input
              type="text"
              placeholder="Search players..."
              value={inviteSearch}
              onChange={e => setInviteSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-green-500"
            />
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredPlayers.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No players found.</p>
              ) : (
                filteredPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleInvitePlayer(p.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-green-700">{p.full_name.charAt(0)}</span>
                    </div>
                    <span className="font-medium text-gray-900">{p.full_name}</span>
                  </button>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowInviteDialog(false); setInviteSearch(''); }}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
