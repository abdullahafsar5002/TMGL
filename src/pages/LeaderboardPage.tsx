import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Medal, AlertCircle, RefreshCw, FileText, Inbox } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { getTournaments, getRoundsByTournament, getLeaderboard, getTournamentLeaderboard } from '@/lib/competition';
import { formatToPar } from '@/utils/golf';
import type { Tournament, Round, LeaderboardEntry, ScorecardStatus } from '@/types/database';

const STATUS_VARIANTS: Record<ScorecardStatus, BadgeVariant> = {
  draft: 'outline', in_progress: 'warning', submitted: 'info', verified: 'success', rejected: 'danger', amended: 'warning',
};

export function LeaderboardPage() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getTournaments().then((r) => { if (r.data) setTournaments(r.data); }); }, []);

  useEffect(() => {
    if (selectedTournamentId) {
      getRoundsByTournament(selectedTournamentId).then((r) => { if (r.data) setRounds(r.data); });
    } else {
      setRounds([]);
    }
    setSelectedRoundId('');
  }, [selectedTournamentId]);

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let result;
    if (selectedRoundId) {
      result = await getLeaderboard(selectedRoundId);
    } else if (selectedTournamentId) {
      result = await getTournamentLeaderboard(selectedTournamentId);
    } else {
      setLeaderboard([]);
      setIsLoading(false);
      return;
    }
    if (result.error) setError(result.error);
    else if (result.data) setLeaderboard(result.data);
    setIsLoading(false);
  }, [selectedTournamentId, selectedRoundId]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  return (
    <Container size="lg" className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
          <Medal className="w-5 h-5 text-tmgl-green-800" /> Leaderboard
        </h1>
        <Button variant="outline" size="sm" onClick={loadLeaderboard} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Tournament</label>
          <select value={selectedTournamentId} onChange={(e) => setSelectedTournamentId(e.target.value)}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
            <option value="">All tournaments</option>
            {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {selectedTournamentId && (
          <div>
            <label className="block text-sm font-medium text-tmgl-charcoal-700 mb-1">Round</label>
            <select value={selectedRoundId} onChange={(e) => setSelectedRoundId(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] rounded-lg border border-tmgl-charcoal-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-tmgl-green-700">
              <option value="">Tournament total</option>
              {rounds.map((r) => <option key={r.id} value={r.id}>Round {r.round_number}: {r.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {isLoading && <LoadingState message="Loading leaderboard..." />}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{error}</p>
        </div>
      )}

      {!isLoading && !error && leaderboard.length === 0 && (selectedTournamentId || selectedRoundId) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-tmgl-charcoal-100 flex items-center justify-center mb-3">
            <Inbox className="w-7 h-7 text-tmgl-charcoal-400" />
          </div>
          <p className="text-base font-semibold text-tmgl-charcoal-700">No leaderboard data</p>
          <p className="text-sm text-tmgl-charcoal-500 mt-1">No scorecards have been submitted for this selection yet.</p>
        </div>
      )}

      {!isLoading && !error && leaderboard.length === 0 && !selectedTournamentId && !selectedRoundId && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-tmgl-charcoal-100 flex items-center justify-center mb-3">
            <Medal className="w-7 h-7 text-tmgl-charcoal-400" />
          </div>
          <p className="text-base font-semibold text-tmgl-charcoal-700">Select a tournament</p>
          <p className="text-sm text-tmgl-charcoal-500 mt-1">Choose a tournament and round to view the leaderboard.</p>
        </div>
      )}

      {!isLoading && leaderboard.length > 0 && (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <Card key={entry.player_id} className="flex items-center gap-3">
              <div className="w-10 text-center shrink-0">
                <p className="text-lg font-bold text-tmgl-charcoal-900">
                  {entry.position <= 3 ? ['\u{1F947}', '\u{1F948}', '\u{1F949}'][entry.position - 1] : `#${entry.position}`}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-tmgl-charcoal-900 truncate">{entry.player_name}</p>
                {entry.team_name && <p className="text-xs text-tmgl-charcoal-500">{entry.team_name}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-tmgl-charcoal-900">{entry.total_strokes}</p>
                <p className={`text-xs font-semibold ${entry.total_score_to_par <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatToPar(entry.total_score_to_par)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {entry.scorecard_status && (
                  <Badge variant={STATUS_VARIANTS[entry.scorecard_status] ?? 'outline'}>
                    {entry.scorecard_status?.replace('_', ' ')}
                  </Badge>
                )}
                {entry.scorecard_id && (
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/scorecards/${entry.scorecard_id}`); }}
                    className="text-xs text-tmgl-green-800 hover:underline flex items-center gap-0.5">
                    <FileText className="w-3 h-3" /> Scorecard
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
