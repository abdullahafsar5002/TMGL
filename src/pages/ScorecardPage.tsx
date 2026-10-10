import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Edit3, BookOpen, Save, X, Loader2 } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Badge, type BadgeVariant } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { RoundSummaryExport } from '@/components/scorecard/RoundSummaryExport';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getScorecard, getScorecardHoles, getRound, getTournament } from '@/lib/competition';
import { getCourse, getPlayerByAuthUserId } from '@/lib/league';
import { supabase } from '@/lib/supabase';
import { computeScorecardSummary } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import { formatToPar } from '@/utils/golf';
import type { Scorecard, ScorecardHole, ScorecardStatus } from '@/types/database';

const STATUS_VARIANTS: Record<ScorecardStatus, BadgeVariant> = {
  draft: 'outline', in_progress: 'warning', submitted: 'info', verified: 'success', rejected: 'danger', amended: 'warning',
};

const HOLE_GRID_CLASS = 'grid grid-cols-4 gap-2';

function toParClassName(toPar: number): string {
  if (toPar < 0) return 'text-tmgl-green-700';
  if (toPar > 0) return 'text-red-600';
  return 'text-tmgl-charcoal-600';
}

interface HoleNineTableProps {
  title: string;
  holes: ScorecardHole[];
  activeHole: number | null;
  onHoleClick: (holeNumber: number) => void;
}

function HoleNineTable({ title, holes, activeHole, onHoleClick }: HoleNineTableProps) {
  const parTotal = holes.reduce((sum, hole) => sum + hole.par, 0);
  const strokeTotal = holes.reduce((sum, hole) => sum + hole.strokes, 0);
  const toParTotal = strokeTotal - parTotal;

  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold text-tmgl-green-950">{title}</h2>
      <div className="overflow-hidden rounded-card border border-tmgl-charcoal-200 bg-white shadow-card">
        <div className={cn(HOLE_GRID_CLASS, 'bg-tmgl-green-800 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-white')}>
          <span>Hole</span>
          <span className="text-center">Par</span>
          <span className="text-center">Strokes</span>
          <span className="text-right">To par</span>
        </div>
        {holes.map((hole) => (
          <button
            type="button"
            key={hole.id}
            onClick={() => onHoleClick(hole.hole_number)}
            className={cn(
              HOLE_GRID_CLASS,
              'w-full border-b border-tmgl-charcoal-100 px-3 py-2.5 text-left text-sm transition-colors last-of-type:border-b-0',
              activeHole === hole.hole_number
                ? 'bg-tmgl-gold-50 ring-1 ring-inset ring-tmgl-gold-400'
                : 'hover:bg-tmgl-green-50'
            )}
          >
            <span className="font-semibold tabular text-tmgl-green-950">{hole.hole_number}</span>
            <span className="text-center tabular text-tmgl-charcoal-500">{hole.par}</span>
            <span className="text-center font-bold tabular text-tmgl-charcoal-950">{hole.strokes}</span>
            <span className={cn('text-right font-bold tabular', toParClassName(hole.score_to_par))}>
              {formatToPar(hole.score_to_par)}
            </span>
          </button>
        ))}
        <div className={cn(HOLE_GRID_CLASS, 'border-t-2 border-tmgl-charcoal-200 bg-tmgl-charcoal-50 px-3 py-2.5 text-sm font-bold tabular')}>
          <span className="self-center text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">Total</span>
          <span className="text-center text-tmgl-charcoal-600">{parTotal}</span>
          <span className="text-center text-tmgl-green-950">{strokeTotal}</span>
          <span className={cn('text-right', toParClassName(toParTotal))}>{formatToPar(toParTotal)}</span>
        </div>
      </div>
    </section>
  );
}

export function ScorecardPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [holes, setHoles] = useState<ScorecardHole[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [roundName, setRoundName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Yardage Note State
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  const canManage = canManageLeague(profile?.role);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const [scRes, holesRes, ownPlayerRes] = await Promise.all([
      getScorecard(id),
      getScorecardHoles(id),
      profile ? getPlayerByAuthUserId(profile.id) : Promise.resolve({ data: null, error: null } as const),
    ]);
    if (scRes.error || !scRes.data) {
      setError(scRes.error || 'Scorecard not found');
      setIsLoading(false);
      return;
    }
    setScorecard(scRes.data);
    if (holesRes.error) setError(holesRes.error);
    else setHoles(holesRes.data ?? []);
    if (ownPlayerRes.data) setCurrentPlayerId(ownPlayerRes.data.id);

    const roundResult = await getRound(scRes.data.round_id);
    if (roundResult.error) setError(roundResult.error);
    if (roundResult.data) {
      setRoundName(`Round ${roundResult.data.round_number}: ${roundResult.data.name}`);
      const tournamentResult = await getTournament(roundResult.data.tournament_id);
      if (tournamentResult.error) setError(tournamentResult.error);
      if (tournamentResult.data) setTournamentId(tournamentResult.data.id);
    }

    const courseIdFromScorecard = scRes.data.course_id;
    setCourseId(courseIdFromScorecard);
    if (courseIdFromScorecard) {
      const courseResult = await getCourse(courseIdFromScorecard);
      if (courseResult.error) setError(courseResult.error);
      if (courseResult.data) setCourseName(courseResult.data.name);
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('full_name')
      .eq('id', scRes.data.player_id)
      .single();
    if (playerError) setError(playerError.message);
    if (player) setPlayerName(player.full_name);

    setIsLoading(false);
  }, [id, profile]);

  useEffect(() => { load(); }, [load]);

  const handleHoleClick = async (holeNumber: number) => {
    if (activeHole === holeNumber) {
      setActiveHole(null);
      return;
    }
    
    setActiveHole(holeNumber);
    setNoteText('');
    setNoteError(null);

    if (!courseId || !scorecard) return;

    const { data, error } = await supabase
      .from('course_notes')
      .select('note_text')
      .eq('player_id', scorecard.player_id)
      .eq('course_id', courseId)
      .eq('hole_number', holeNumber)
      .maybeSingle();

    if (error) setNoteError(error.message);
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
      setNoteError(error.message);
    } else {
      setNoteError(null);
    }
    setIsSavingNote(false);
  };

  if (isLoading) return <Container size="lg" className="py-6"><LoadingState /></Container>;
  if (error || !scorecard) return (
    <Container size="lg" className="space-y-6 py-6 sm:py-8">
      <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-tmgl-charcoal-500 transition-colors hover:text-tmgl-green-800">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <div role="alert" className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{error || 'Scorecard not found'}</p>
      </div>
    </Container>
  );

  const summary = computeScorecardSummary(holes);
  const canEdit = canManage || currentPlayerId === scorecard.player_id;

  return (
    <Container size="lg" className="space-y-6 py-6 sm:py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-tmgl-charcoal-500 transition-colors hover:text-tmgl-green-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header className="animate-fade-up flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-green-700">
            Round scorecard
          </p>
          <h1 className="mt-1 font-display text-display-lg text-tmgl-green-950">Scorecard</h1>
          <div className="mt-2 space-y-0.5">
            {playerName && <p className="text-base font-semibold text-tmgl-charcoal-800">{playerName}</p>}
            {roundName && <p className="text-sm text-tmgl-charcoal-600">{roundName}</p>}
            {courseName && <p className="text-sm text-tmgl-charcoal-400">{courseName}</p>}
          </div>
        </div>
        <Badge variant={STATUS_VARIANTS[scorecard.status]}>{scorecard.status?.replace('_', ' ')}</Badge>
      </header>

      <Card className="border-tmgl-charcoal-200">
        <div className="grid grid-cols-3 divide-x divide-tmgl-charcoal-200 text-center">
          <div className="px-2">
            <p className="font-display text-display-md tabular text-tmgl-green-950">{summary.totalStrokes || '-'}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">Total Strokes</p>
          </div>
          <div className="px-2">
            <p className={`font-display text-display-md tabular ${toParClassName(summary.totalToPar)}`}>
              {summary.totalStrokes > 0 ? formatToPar(summary.totalToPar) : '-'}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">To Par</p>
          </div>
          <div className="px-2">
            <p className="font-display text-display-md tabular text-tmgl-green-950">{summary.holesCompleted}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">Holes</p>
          </div>
        </div>
      </Card>

      {summary.holesCompleted > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-tmgl-charcoal-200 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">Front 9</p>
            <p className="mt-1 font-display text-display-md tabular text-tmgl-green-950">{summary.front9Strokes || '-'}</p>
            <p className={`mt-0.5 text-sm font-semibold tabular ${toParClassName(summary.front9ToPar)}`}>
              {summary.front9Strokes > 0 ? formatToPar(summary.front9ToPar) : '-'}
            </p>
          </Card>
          <Card className="border-tmgl-charcoal-200 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-tmgl-charcoal-500">Back 9</p>
            <p className="mt-1 font-display text-display-md tabular text-tmgl-green-950">{summary.back9Strokes || '-'}</p>
            <p className={`mt-0.5 text-sm font-semibold tabular ${toParClassName(summary.back9ToPar)}`}>
              {summary.back9Strokes > 0 ? formatToPar(summary.back9ToPar) : '-'}
            </p>
          </Card>
        </div>
      )}

      {holes.length > 0 && (
        <RoundSummaryExport
          data={{
            playerName: playerName || 'Player',
             courseName: courseName || 'Course',
            roundDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            holes,
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {holes.length > 0 && (
            <>
              <HoleNineTable
                title="Front 9"
                holes={holes.filter((h) => h.hole_number <= 9)}
                activeHole={activeHole}
                onHoleClick={handleHoleClick}
              />
              {holes.some((h) => h.hole_number > 9) && (
                <HoleNineTable
                  title="Back 9"
                  holes={holes.filter((h) => h.hole_number > 9)}
                  activeHole={activeHole}
                  onHoleClick={handleHoleClick}
                />
              )}
            </>
          )}
        </div>

        {activeHole && (
          <div className="lg:col-span-1">
            <Card className="sticky top-4 border-tmgl-charcoal-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-display text-tmgl-green-950">
                    <BookOpen className="h-4 w-4 text-tmgl-green-800" />
                    Hole {activeHole} Strategy
                  </CardTitle>
                  <button
                    type="button"
                    onClick={() => setActiveHole(null)}
                    aria-label="Close strategy notes"
                    className="rounded-full p-1.5 text-tmgl-charcoal-400 transition-colors hover:bg-tmgl-charcoal-100 hover:text-tmgl-charcoal-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea 
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Example: Aim left of the bunker, 140 yards to pin..."
                  className="min-h-[120px] w-full rounded-lg border border-tmgl-charcoal-300 bg-white p-3 text-sm text-tmgl-charcoal-800 placeholder-tmgl-charcoal-400 focus:border-tmgl-green-500 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700/25"
                />
                 {noteError && <p role="alert" className="text-sm text-red-700">{noteError}</p>}
                 <Button onClick={saveNote} disabled={isSavingNote} className="w-full">
                  {isSavingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Note
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {canEdit && !['verified', 'rejected'].includes(scorecard.status) && (
          <Button variant="primary" onClick={() => navigate(`/scoring?round_id=${scorecard.round_id}&player_id=${scorecard.player_id}`)}>
            <Edit3 className="mr-1.5 h-4 w-4" /> Edit Scorecard
          </Button>
        )}
        {tournamentId && (
          <Button variant="outline" onClick={() => navigate(`/tournaments/${tournamentId}`)}>
            View Tournament
          </Button>
        )}
      </div>
    </Container>
  );
}
