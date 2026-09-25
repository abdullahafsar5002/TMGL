import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, ArrowLeft, AlertCircle, Edit3, BookOpen, Save, X, Loader2 } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { RoundSummaryExport } from '@/components/scorecard/RoundSummaryExport';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getScorecard, getScorecardHoles, getRound, getTournament } from '@/lib/competition';
import { supabase } from '@/lib/supabase';
import { computeScorecardSummary } from '@/lib/scoring';
import { formatToPar } from '@/utils/golf';
import type { Scorecard, ScorecardHole, ScorecardStatus } from '@/types/database';

const STATUS_VARIANTS: Record<ScorecardStatus, BadgeVariant> = {
  draft: 'outline', in_progress: 'warning', submitted: 'info', verified: 'success', rejected: 'danger', amended: 'warning',
};

export function ScorecardPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [holes, setHoles] = useState<ScorecardHole[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [roundName, setRoundName] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Yardage Note State
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const [scRes, holesRes] = await Promise.all([getScorecard(id), getScorecardHoles(id)]);
    if (scRes.error || !scRes.data) { setError(scRes.error || 'Scorecard not found'); setIsLoading(false); return; }
    setScorecard(scRes.data);
    if (holesRes.data) {
      setHoles(holesRes.data);
    }

    const rRes = await getRound(scRes.data.round_id);
    if (rRes.data) {
      setRoundName(`Round ${rRes.data.round_number}: ${rRes.data.name}`);
      const tRes = await getTournament(rRes.data.tournament_id);
      if (tRes.data) {
        setTournamentId(tRes.data.id);
        setCourseId(tRes.data.course_id ?? null);
      }
    }

    const { data: player } = await supabase.from('players').select('full_name').eq('id', scRes.data!.player_id).single();
    if (player) setPlayerName(player.full_name);

    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleHoleClick = async (holeNumber: number) => {
    if (activeHole === holeNumber) {
      setActiveHole(null);
      return;
    }
    
    setActiveHole(holeNumber);
    setNoteText('');

    if (!courseId || !scorecard) return;

    const { data } = await supabase
      .from('course_notes')
      .select('note_text')
      .eq('player_id', scorecard.player_id)
      .eq('course_id', courseId)
      .eq('hole_number', holeNumber)
      .single();

    if (data) setNoteText(data.note_text);
  };

  const saveNote = async () => {
    if (!activeHole || !courseId || !scorecard) return;
    setIsSavingNote(true);
    
    const { error } = await supabase
      .from('course_notes')
      .upsert({
        player_id: scorecard.player_id,
        course_id: courseId,
        hole_number: activeHole,
        note_text: noteText,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving note:', error);
    }
    setIsSavingNote(false);
  };

  if (isLoading) return <Container size="lg" className="py-4"><LoadingState /></Container>;
  if (error || !scorecard) return (
    <Container size="lg" className="py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /><p>{error || 'Scorecard not found'}</p>
      </div>
    </Container>
  );

  const summary = computeScorecardSummary(holes);

  return (
    <Container size="lg" className="space-y-4 py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-tmgl-charcoal-500 hover:text-tmgl-green-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-tmgl-charcoal-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-tmgl-green-800" /> Scorecard
          </h1>
          {playerName && <p className="text-sm text-tmgl-charcoal-500 mt-0.5">{playerName}</p>}
          {roundName && <p className="text-xs text-tmgl-charcoal-400 mt-0.5">{roundName}</p>}
        </div>
        <Badge variant={STATUS_VARIANTS[scorecard.status]}>{scorecard.status?.replace('_', ' ')}</Badge>
      </div>

      <Card>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-tmgl-charcoal-900">{summary.totalStrokes || '-'}</p>
            <p className="text-xs text-tmgl-charcoal-500">Total Strokes</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${summary.totalToPar <= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {summary.totalStrokes > 0 ? formatToPar(summary.totalToPar) : '-'}
            </p>
            <p className="text-xs text-tmgl-charcoal-500">To Par</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-tmgl-charcoal-900">{summary.holesCompleted}</p>
            <p className="text-xs text-tmgl-charcoal-500">Holes</p>
          </div>
        </div>
      </Card>

      {summary.holesCompleted > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <p className="text-xs font-semibold text-tmgl-charcoal-500 uppercase tracking-wide mb-1">Front 9</p>
            <p className="text-xl font-bold text-tmgl-charcoal-900">{summary.front9Strokes || '-'}</p>
            <p className={`text-sm font-semibold ${summary.front9ToPar <= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {summary.front9Strokes > 0 ? formatToPar(summary.front9ToPar) : '-'}
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-xs font-semibold text-tmgl-charcoal-500 uppercase tracking-wide mb-1">Back 9</p>
            <p className="text-xl font-bold text-tmgl-charcoal-900">{summary.back9Strokes || '-'}</p>
            <p className={`text-sm font-semibold ${summary.back9ToPar <= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {summary.back9Strokes > 0 ? formatToPar(summary.back9ToPar) : '-'}
            </p>
          </Card>
        </div>
      )}

      {holes.length > 0 && (
        <RoundSummaryExport
          data={{
            playerName: playerName || 'Player',
            courseName: roundName || 'Course',
            roundDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            holes,
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {holes.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-tmgl-charcoal-700">Front 9</h2>
              <div className="space-y-1">
                <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs font-semibold text-tmgl-charcoal-500">
                  <span>Hole</span><span className="text-center">Par</span><span className="text-center">Strokes</span><span className="text-right">To Par</span>
                </div>
                {holes.filter((h) => h.hole_number <= 9).map((h) => (
                  <div key={h.id} 
                    onClick={() => handleHoleClick(h.hole_number)}
                    className={`grid grid-cols-4 gap-2 px-3 py-2 bg-white rounded-lg border transition-colors cursor-pointer ${activeHole === h.hole_number ? 'border-tmgl-green-500 bg-green-50' : 'border-tmgl-charcoal-100'} text-sm`}
                  >
                    <span className="font-medium">{h.hole_number}</span>
                    <span className="text-center text-tmgl-charcoal-500">{h.par}</span>
                    <span className="text-center font-semibold">{h.strokes}</span>
                    <span className={`text-right font-bold ${h.score_to_par <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatToPar(h.score_to_par)}
                    </span>
                  </div>
                ))}
              </div>

              {holes.some((h) => h.hole_number > 9) && (
                <>
                  <h2 className="text-sm font-semibold text-tmgl-charcoal-700">Back 9</h2>
                  <div className="space-y-1">
                    <div className="grid grid-cols-4 gap-2 px-3 py-2 text-xs font-semibold text-tmgl-charcoal-500">
                      <span>Hole</span><span className="text-center">Par</span><span className="text-center">Strokes</span><span className="text-right">To Par</span>
                    </div>
                    {holes.filter((h) => h.hole_number > 9).map((h) => (
                      <div key={h.id} 
                        onClick={() => handleHoleClick(h.hole_number)}
                        className={`grid grid-cols-4 gap-2 px-3 py-2 bg-white rounded-lg border transition-colors cursor-pointer ${activeHole === h.hole_number ? 'border-tmgl-green-500 bg-green-50' : 'border-tmgl-charcoal-100'} text-sm`}
                      >
                        <span className="font-medium">{h.hole_number}</span>
                        <span className="text-center text-tmgl-charcoal-500">{h.par}</span>
                        <span className="text-center font-semibold">{h.strokes}</span>
                        <span className={`text-right font-bold ${h.score_to_par <= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatToPar(h.score_to_par)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {activeHole && (
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-tmgl-green-800" />
                    Hole {activeHole} Strategy
                  </CardTitle>
                  <button onClick={() => setActiveHole(null)} className="p-1 rounded-full hover:bg-tmgl-charcoal-100">
                    <X className="w-4 h-4 text-tmgl-charcoal-400" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea 
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Example: Aim left of the bunker, 140 yards to pin..."
                  className="w-full p-3 text-sm rounded-lg border border-tmgl-charcoal-200 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-tmgl-green-700"
                />
                <Button 
                  onClick={saveNote} 
                  disabled={isSavingNote}
                  className="w-full bg-tmgl-green-800 hover:bg-tmgl-green-700 text-white"
                >
                  {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Note
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        {canManage && scorecard.status !== 'verified' && (
          <Button variant="primary" size="sm" onClick={() => navigate(`/scoring?round_id=${scorecard.round_id}&player_id=${scorecard.player_id}`)} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            <Edit3 className="w-4 h-4 mr-1.5" /> Edit Scorecard
          </Button>
        )}
        {tournamentId && (
          <Button variant="outline" size="sm" onClick={() => navigate(`/tournaments/${tournamentId}`)}>
            View Tournament
          </Button>
        )}
      </div>
    </Container>
  );
}
