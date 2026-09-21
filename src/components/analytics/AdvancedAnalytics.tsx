/**
 * Advanced Analytics Card — Consistency + Weakness + Hole Difficulty
 */

import { useEffect, useState } from 'react';
import { TrendingUp, Target, AlertTriangle, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { LoadingState } from '@/components/common/LoadingState';
import {
  calculateConsistency,
  analyzeParTypes,
  analyzeHoleDifficulty,
  getPlayerScoresForAnalytics,
  type ConsistencyResult,
  type ParTypeAnalysis,
  type HoleDifficulty,
} from '@/lib/analytics';
import type { PracticeScore } from '@/types/database';

interface AdvancedAnalyticsProps {
  playerId: string;
}

const RATING_COLORS = {
  excellent: 'text-emerald-400',
  good: 'text-green-400',
  average: 'text-yellow-400',
  weak: 'text-orange-400',
  struggle: 'text-red-400',
};

const RATING_BG = {
  excellent: 'bg-emerald-400/10',
  good: 'bg-green-400/10',
  average: 'bg-yellow-400/10',
  weak: 'bg-orange-400/10',
  struggle: 'bg-red-400/10',
};

export function AdvancedAnalytics({ playerId }: AdvancedAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<PracticeScore[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyResult | null>(null);
  const [parAnalysis, setParAnalysis] = useState<ParTypeAnalysis | null>(null);
  const [holeDiff, setHoleDiff] = useState<HoleDifficulty[]>([]);

  useEffect(() => {
    async function load() {
      const result = await getPlayerScoresForAnalytics(playerId);
      if (result.data) {
        setScores(result.data);
        const grossScores = result.data.reduce<Map<string, number>>((map, s) => {
          const existing = map.get(s.practice_round_id) ?? 0;
          map.set(s.practice_round_id, existing + s.score);
          return map;
        }, new Map());
        const totals = [...grossScores.values()];
        setConsistency(calculateConsistency(totals));
        setParAnalysis(analyzeParTypes(result.data));
        setHoleDiff(analyzeHoleDifficulty(result.data));
      }
      setLoading(false);
    }
    load();
  }, [playerId]);

  if (loading) return <LoadingState message="Analyzing your game..." />;
  if (scores.length < 5) return null;

  return (
    <div className="space-y-6">
      {/* Consistency Score */}
      {consistency && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-tmgl-green" />
              Stability Index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-tmgl-silver">{consistency.stabilityLabel}</p>
              <p className="text-sm text-tmgl-silver/60 mt-1">{consistency.stabilityDescription}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-tmgl-silver">{consistency.standardDeviation}</p>
                <p className="text-xs text-tmgl-silver/50">Std Deviation</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-tmgl-silver">{consistency.coefficientOfVariation}%</p>
                <p className="text-xs text-tmgl-silver/50">CV%</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-tmgl-silver">{consistency.roundsAnalyzed}</p>
                <p className="text-xs text-tmgl-silver/50">Rounds</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-tmgl-silver/40">
                Score Range: {consistency.scoreRange.min} – {consistency.scoreRange.max}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weakness Identification */}
      {parAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-tmgl-green" />
              Par Type Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(['par3', 'par4', 'par5'] as const).map(key => {
                const data = parAnalysis[key];
                const label = key === 'par3' ? 'Par 3' : key === 'par4' ? 'Par 4' : 'Par 5';
                return (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-tmgl-charcoal-800/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-tmgl-silver">{label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${RATING_COLORS[data.rating]} ${RATING_BG[data.rating]}`}>
                          {data.rating}
                        </span>
                      </div>
                      <p className="text-xs text-tmgl-silver/50 mt-0.5">{data.count} holes analyzed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-tmgl-silver">{data.avgScore.toFixed(1)}</p>
                      <p className={`text-xs font-medium ${data.toPar > 0 ? 'text-red-400' : data.toPar < 0 ? 'text-green-400' : 'text-tmgl-silver/50'}`}>
                        {data.toPar === 0 ? 'E' : data.toPar > 0 ? `+${data.toPar.toFixed(1)}` : data.toPar.toFixed(1)} avg
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-tmgl-green/5 border border-tmgl-green/20">
              <p className="text-sm text-tmgl-silver/80">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-tmgl-green" />
                {parAnalysis.insight}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hole Difficulty */}
      {holeDiff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-tmgl-green" />
              Hole Difficulty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {holeDiff.map(hole => {
                const maxToPar = Math.max(...holeDiff.map(h => Math.abs(h.avgToPar)), 1);
                const barWidth = Math.abs(hole.avgToPar) / maxToPar * 100;
                return (
                  <div key={hole.holeNumber} className="flex items-center gap-3">
                    <span className="text-xs text-tmgl-silver/50 w-8 text-right">#{hole.holeNumber}</span>
                    <div className="flex-1 h-5 bg-tmgl-charcoal-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          hole.avgToPar < 0 ? 'bg-green-500/60' :
                          hole.avgToPar > 0.5 ? 'bg-red-500/60' :
                          'bg-yellow-500/40'
                        }`}
                        style={{ width: `${Math.max(barWidth, 5)}%` }}
                      />
                    </div>
                    <span className={`text-xs w-12 text-right font-mono ${
                      hole.avgToPar < 0 ? 'text-green-400' :
                      hole.avgToPar > 0.5 ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {hole.avgToPar === 0 ? 'E' : hole.avgToPar > 0 ? `+${hole.avgToPar.toFixed(1)}` : hole.avgToPar.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
