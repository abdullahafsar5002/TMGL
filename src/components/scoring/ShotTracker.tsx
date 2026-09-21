/**
 * Shot Tracker
 *
 * Records each shot during a hole: club, distance, result, and lie.
 * Aggregates data for analysis and caddie recommendations.
 */

import { useState } from 'react';
import { Target, Trash2, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

export interface ShotEntry {
  shot_number: number;
  club: string;
  distance_yards: number | null;
  result: 'fairway' | 'green' | 'rough' | 'bunker' | 'water' | 'out_of_bounds' | 'hole_out';
  lie: 'tee' | 'fairway' | 'rough' | 'bunker' | 'green' | 'penalty';
  notes: string;
}

const CLUBS = [
  'Driver', '3 Wood', '5 Wood', '7 Wood',
  '3 Iron', '4 Iron', '5 Iron', '6 Iron', '7 Iron', '8 Iron', '9 Iron',
  'PW', 'GW', 'SW', 'LW', 'Putter',
  'Hybrid 3', 'Hybrid 4', 'Hybrid 5',
];

const RESULTS = [
  { value: 'fairway', label: 'Fairway', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'green', label: 'Green', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'rough', label: 'Rough', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'bunker', label: 'Bunker', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'water', label: 'Water', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'out_of_bounds', label: 'OB', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'hole_out', label: 'Hole Out', color: 'bg-purple-100 text-purple-700 border-purple-200' },
] as const;

interface ShotTrackerProps {
  holeNumber: number;
  shots: ShotEntry[];
  onShotsChange: (shots: ShotEntry[]) => void;
  par?: number;
  disabled?: boolean;
}

export function ShotTracker({ holeNumber, shots, onShotsChange, par, disabled = false }: ShotTrackerProps) {
  const [selectedClub, setSelectedClub] = useState('Driver');
  const [distance, setDistance] = useState('');
  const [result, setResult] = useState<ShotEntry['result']>('fairway');
  const [lie, setLie] = useState<ShotEntry['lie']>('tee');
  const [notes, setNotes] = useState('');

  const addShot = () => {
    if (disabled) return;
    const newShot: ShotEntry = {
      shot_number: shots.length + 1,
      club: selectedClub,
      distance_yards: distance ? Number(distance) : null,
      result,
      lie,
      notes,
    };
    onShotsChange([...shots, newShot]);
    setDistance('');
    setNotes('');
    // Auto-advance lie based on result
    if (result === 'green') setLie('green');
    else if (result === 'fairway') setLie('fairway');
    else if (result === 'rough') setLie('rough');
    else if (result === 'bunker') setLie('bunker');
  };

  const removeShot = (index: number) => {
    if (disabled) return;
    const updated = shots.filter((_, i) => i !== index).map((s, i) => ({ ...s, shot_number: i + 1 }));
    onShotsChange(updated);
  };

  const totalDistance = shots.reduce((sum, s) => sum + (s.distance_yards ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Target className="w-4 h-4 text-tmgl-green-700" />
            Hole {holeNumber} Shot Tracker
          </span>
          {par && <span className="text-xs font-normal text-tmgl-charcoal-500">Par {par}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {shots.length > 0 && (
          <div className="space-y-1.5">
            {shots.map((shot, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-tmgl-charcoal-50 rounded-lg text-xs">
                <span className="w-5 h-5 rounded-full bg-tmgl-green-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {shot.shot_number}
                </span>
                <span className="font-medium text-tmgl-charcoal-800 min-w-[60px]">{shot.club}</span>
                {shot.distance_yards && <span className="text-tmgl-charcoal-500">{shot.distance_yards}y</span>}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${RESULTS.find(r => r.value === shot.result)?.color ?? ''}`}>
                  {RESULTS.find(r => r.value === shot.result)?.label}
                </span>
                {shot.notes && <span className="text-tmgl-charcoal-400 italic truncate">{shot.notes}</span>}
                {!disabled && (
                  <button onClick={() => removeShot(i)} className="ml-auto text-red-400 hover:text-red-600 shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <div className="text-[10px] text-tmgl-charcoal-400 text-right">
              Total: {shots.length} shots · {totalDistance} yards
            </div>
          </div>
        )}

        {!disabled && (
          <div className="space-y-2 pt-2 border-t border-tmgl-charcoal-100">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-tmgl-charcoal-500 mb-1">Club</label>
                <select value={selectedClub} onChange={(e) => setSelectedClub(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-tmgl-charcoal-200 text-xs bg-white">
                  {CLUBS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-tmgl-charcoal-500 mb-1">Distance (yds)</label>
                <input type="number" value={distance} onChange={(e) => setDistance(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-tmgl-charcoal-200 text-xs" placeholder="e.g. 150" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-tmgl-charcoal-500 mb-1">Lie</label>
                <select value={lie} onChange={(e) => setLie(e.target.value as ShotEntry['lie'])}
                  className="w-full px-2 py-1.5 rounded border border-tmgl-charcoal-200 text-xs bg-white">
                  <option value="tee">Tee</option>
                  <option value="fairway">Fairway</option>
                  <option value="rough">Rough</option>
                  <option value="bunker">Bunker</option>
                  <option value="green">Green</option>
                  <option value="penalty">Penalty</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-tmgl-charcoal-500 mb-1">Result</label>
              <div className="flex flex-wrap gap-1">
                {RESULTS.map(r => (
                  <button key={r.value} onClick={() => setResult(r.value)}
                    className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                      result === r.value ? r.color : 'bg-white text-tmgl-charcoal-600 border-tmgl-charcoal-200 hover:border-tmgl-charcoal-300'
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-tmgl-charcoal-500 mb-1">Notes (optional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-tmgl-charcoal-200 text-xs"
                placeholder="e.g. Slight draw, pin high" />
            </div>
            <Button size="sm" onClick={addShot} className="bg-tmgl-green-800 hover:bg-tmgl-green-700 w-full">
              <Plus className="w-3 h-3 mr-1" /> Record Shot
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Analyze shot data for a round to provide insights.
 */
export function analyzeShots(shots: ShotEntry[]): {
  clubFrequency: Record<string, number>;
  avgDistanceByClub: Record<string, number>;
  resultDistribution: Record<string, number>;
  fairwaysHit: number;
  fairwaysTotal: number;
  gir: number;
  girTotal: number;
} {
  const clubFrequency: Record<string, number> = {};
  const distanceSum: Record<string, number> = {};
  const distanceCount: Record<string, number> = {};
  const resultDistribution: Record<string, number> = {};
  let fairwaysHit = 0;
  let fairwaysTotal = 0;
  let gir = 0;
  let girTotal = 0;

  for (const shot of shots) {
    clubFrequency[shot.club] = (clubFrequency[shot.club] ?? 0) + 1;
    if (shot.distance_yards) {
      distanceSum[shot.club] = (distanceSum[shot.club] ?? 0) + shot.distance_yards;
      distanceCount[shot.club] = (distanceCount[shot.club] ?? 0) + 1;
    }
    resultDistribution[shot.result] = (resultDistribution[shot.result] ?? 0) + 1;

    if (shot.shot_number === 2 && shot.lie === 'tee') {
      // Second shot from tee = approach
      fairwaysTotal++;
      if (shot.result === 'fairway') fairwaysHit++;
    }
    if (shot.result === 'green') {
      gir++;
      girTotal++;
    } else if (shot.shot_number > 1 && shot.result !== 'hole_out') {
      girTotal++;
    }
  }

  const avgDistanceByClub: Record<string, number> = {};
  for (const club of Object.keys(distanceSum)) {
    avgDistanceByClub[club] = Math.round(distanceSum[club] / (distanceCount[club] ?? 1));
  }

  return { clubFrequency, avgDistanceByClub, resultDistribution, fairwaysHit, fairwaysTotal, gir, girTotal };
}
