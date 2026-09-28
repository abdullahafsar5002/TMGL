/**
 * Virtual Caddie AI
 *
 * Uses OpenAI to analyze a player's last N rounds and provide
 * pre-round tips, club recommendations, and course strategy.
 */

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, TrendingUp, Target, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { supabase } from '@/lib/supabase';
import type { PracticeScore } from '@/types/database';

interface CaddieTip {
  category: 'approach' | 'tee' | 'putting' | 'course_management' | 'mental';
  title: string;
  advice: string;
  confidence: 'high' | 'medium' | 'low';
}

interface CaddieResponse {
  summary: string;
  tips: CaddieTip[];
  overallRating: string;
  keyImprovement: string;
}

const CATEGORY_ICONS = {
  approach: Target,
  tee: TrendingUp,
  putting: Shield,
  course_management: Shield,
  mental: Sparkles,
};

const CATEGORY_COLORS = {
  approach: 'text-blue-600',
  tee: 'text-emerald-600',
  putting: 'text-amber-600',
  course_management: 'text-violet-600',
  mental: 'text-pink-600',
};

const CONFIDENCE_STYLES = {
  high: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-tmgl-charcoal-100 text-tmgl-charcoal-700',
};

const TIP_CATEGORIES: ReadonlyArray<CaddieTip['category']> = [
  'approach',
  'tee',
  'putting',
  'course_management',
  'mental',
];

function readTip(value: unknown): CaddieTip | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const advice = typeof record.advice === 'string' ? record.advice.trim() : '';
  if (!title || !advice) return null;
  const category = TIP_CATEGORIES.includes(record.category as CaddieTip['category'])
    ? (record.category as CaddieTip['category'])
    : 'course_management';
  const confidence = record.confidence === 'high' || record.confidence === 'low'
    ? record.confidence
    : 'medium';
  return { category, title, advice, confidence };
}

export function normalizeCaddieResponse(value: unknown): CaddieResponse {
  const record = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const tips = Array.isArray(record.tips)
    ? record.tips.map(readTip).filter((tip): tip is CaddieTip => tip !== null).slice(0, 5)
    : [];
  const summary = typeof record.summary === 'string' && record.summary.trim()
    ? record.summary.trim()
    : 'Review your recent rounds to find the next stroke to save.';
  const rating = typeof record.overallRating === 'string' && record.overallRating.trim()
    ? record.overallRating.trim()
    : 'In progress';
  const keyImprovement = typeof record.keyImprovement === 'string' && record.keyImprovement.trim()
    ? record.keyImprovement.trim()
    : tips[0]?.title ?? 'Consistency';
  return { summary, overallRating: rating, keyImprovement, tips };
}

interface VirtualCaddieProps {
  playerId: string;
}

export function VirtualCaddie({ playerId }: VirtualCaddieProps) {
  const [loading, setLoading] = useState(false);
  const [tips, setTips] = useState<CaddieResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCall, setLastCall] = useState(0);

  const generateTips = async () => {
    // Rate limit: max 1 request per 30 seconds
    const now = Date.now();
    if (now - lastCall < 30000) {
      setError('Please wait a moment before requesting new tips.');
      return;
    }
    setLastCall(now);
    setLoading(true);
    setError(null);

    try {
      // Fetch last 10 rounds with scores
      const { data: rounds } = await supabase
        .from('practice_rounds')
        .select('id, gross_score, total_to_par, course_id, completed_at')
        .eq('player_id', playerId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);

      if (!rounds || rounds.length === 0) {
        setError('Complete at least 1 practice round to get AI caddie tips.');
        setLoading(false);
        return;
      }

      const roundIds = rounds.map(r => r.id);
      const { data: scores } = await supabase
        .from('practice_scores')
        .select('*')
        .in('practice_round_id', roundIds);

      if (!scores || scores.length === 0) {
        setError('No hole scores found for your recent rounds.');
        setLoading(false);
        return;
      }

      // Build analysis summary
      const scoreGroups = new Map<string, PracticeScore[]>();
      (scores as PracticeScore[]).forEach(s => {
        const existing = scoreGroups.get(s.practice_round_id) ?? [];
        existing.push(s);
        scoreGroups.set(s.practice_round_id, existing);
      });

      const roundSummaries = [...scoreGroups.entries()].map(([rid, hs]) => {
        const total = hs.reduce((a, s) => a + s.score, 0);
        const par = hs.reduce((a, s) => a + s.par, 0);
        const par3s = hs.filter(s => s.par === 3);
        const par4s = hs.filter(s => s.par === 4);
        const par5s = hs.filter(s => s.par === 5);
        const round = rounds.find(r => r.id === rid);
        return {
          date: round?.completed_at ?? '',
          total,
          toPar: total - par,
          par3Avg: par3s.length > 0 ? par3s.reduce((a, s) => a + s.score, 0) / par3s.length : 0,
          par4Avg: par4s.length > 0 ? par4s.reduce((a, s) => a + s.score, 0) / par4s.length : 0,
          par5Avg: par5s.length > 0 ? par5s.reduce((a, s) => a + s.score, 0) / par5s.length : 0,
          birdies: hs.filter(s => s.score - s.par === -1).length,
          bogeys: hs.filter(s => s.score - s.par === 1).length,
          doubles: hs.filter(s => s.score - s.par >= 2).length,
          avgPutts: hs.filter(s => s.putts != null).reduce((a, s) => a + (s.putts ?? 0), 0) / (hs.filter(s => s.putts != null).length || 1),
          fairways: hs.filter(s => s.fairway_hit === true).length,
          fairwaysTotal: hs.filter(s => s.fairway_hit !== null).length,
          gir: hs.filter(s => s.green_in_regulation === true).length,
          girTotal: hs.filter(s => s.green_in_regulation !== null).length,
        };
      });

      // Call the edge function with only the player id: the prompt is built
      // server-side from the player's own rows so the client cannot inject prompts
      // or read another player's scores. A null content means the service is not
      // configured or the provider failed, in which case local tips are used.
      const { data: edgeData } = await supabase.functions.invoke('openai-caddie', {
        body: { playerId },
      });

      const content = edgeData && typeof edgeData.content === 'string' ? edgeData.content : null;
      if (!content) {
        setTips(generateLocalTips(roundSummaries));
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(content) as CaddieResponse;
      setTips(normalizeCaddieResponse(parsed));
    } catch {
      try {
        const fallback = await buildLocalTips(playerId);
        setTips(fallback);
      } catch {
        setError('Could not generate tips. Try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-tmgl-charcoal-900">
          <Sparkles className="w-4 h-4 text-tmgl-gold-600" />
          Virtual Caddie AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!tips && !loading && (
          <div className="text-center py-4">
            <p className="text-sm text-tmgl-charcoal-600 mb-4">
              Get personalized tips based on your last rounds.
              Your caddie analyzes your scores, tendencies, and weaknesses.
            </p>
            <Button onClick={generateTips} variant="gold">
              <Sparkles className="w-4 h-4 mr-2" />
              Get Pre-Round Tips
            </Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-tmgl-gold-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-tmgl-charcoal-600">Analyzing your game...</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {tips && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-tmgl-gold-50 border border-tmgl-gold-500/40 rounded-xl">
              <p className="text-lg font-bold text-tmgl-charcoal-900">{tips.overallRating}</p>
              <p className="text-sm text-tmgl-charcoal-700 mt-1">{tips.summary}</p>
              <p className="text-xs font-semibold text-tmgl-gold-700 mt-2">Key Focus: {tips.keyImprovement}</p>
            </div>

            <div className="space-y-3">
              {tips.tips.map((tip, i) => {
                const Icon = CATEGORY_ICONS[tip.category];
                return (
                  <div key={`${tip.category}-${i}`} className="p-3 bg-white border border-tmgl-charcoal-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className={`w-4 h-4 shrink-0 ${CATEGORY_COLORS[tip.category]}`} />
                      <span className="font-semibold text-sm text-tmgl-charcoal-900">{tip.title}</span>
                      <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CONFIDENCE_STYLES[tip.confidence]}`}>
                        {tip.confidence}
                      </span>
                    </div>
                    <p className="text-xs text-tmgl-charcoal-600 leading-relaxed">{tip.advice}</p>
                  </div>
                );
              })}
            </div>

            <Button onClick={generateTips} variant="outline" className="w-full" size="sm">
              Refresh Tips
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function buildLocalTips(playerId: string): Promise<CaddieResponse> {
  const { data: rounds } = await supabase
    .from('practice_rounds')
    .select('id, completed_at')
    .eq('player_id', playerId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10);

  const roundRows = (rounds ?? []) as Array<{ id: string; completed_at: string | null }>;
  if (roundRows.length === 0) {
    return normalizeCaddieResponse({ tips: [] });
  }

  const { data: scores } = await supabase
    .from('practice_scores')
    .select('practice_round_id, par, score, putts, fairway_hit, green_in_regulation')
    .in('practice_round_id', roundRows.map((round) => round.id));

  const grouped = new Map<string, PracticeScore[]>();
  for (const row of (scores ?? []) as PracticeScore[]) {
    const list = grouped.get(row.practice_round_id) ?? [];
    list.push(row);
    grouped.set(row.practice_round_id, list);
  }

  const summaries = roundRows.map((round) => {
    const holes = grouped.get(round.id) ?? [];
    const par = holes.reduce((sum, hole) => sum + hole.par, 0);
    const total = holes.reduce((sum, hole) => sum + hole.score, 0);
    return {
      par3Avg: averageOf(holes.filter((hole) => hole.par === 3).map((hole) => hole.score)),
      par4Avg: averageOf(holes.filter((hole) => hole.par === 4).map((hole) => hole.score)),
      par5Avg: averageOf(holes.filter((hole) => hole.par === 5).map((hole) => hole.score)),
      birdies: holes.filter((hole) => hole.score - hole.par === -1).length,
      bogeys: holes.filter((hole) => hole.score - hole.par === 1).length,
      doubles: holes.filter((hole) => hole.score - hole.par >= 2).length,
      avgPutts: averageOf(holes.filter((hole) => typeof hole.putts === 'number').map((hole) => hole.putts as number)),
      fairways: holes.filter((hole) => hole.fairway_hit === true).length,
      fairwaysTotal: holes.filter((hole) => typeof hole.fairway_hit === 'boolean').length,
      gir: holes.filter((hole) => hole.green_in_regulation === true).length,
      girTotal: holes.filter((hole) => typeof hole.green_in_regulation === 'boolean').length,
      toPar: total - par,
    };
  });

  return normalizeCaddieResponse(generateLocalTips(summaries));
}

function averageOf(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function generateLocalTips(rounds: Array<{
  par3Avg: number;
  par4Avg: number;
  par5Avg: number;
  birdies: number;
  bogeys: number;
  doubles: number;
  avgPutts: number;
  fairways: number;
  fairwaysTotal: number;
  gir: number;
  girTotal: number;
  toPar: number;
}>): CaddieResponse {
  const tips: CaddieTip[] = [];
  const avg = rounds.reduce((a, r) => a + r.toPar, 0) / rounds.length;

  if (rounds[0]?.par3Avg > 3.3) {
    tips.push({
      category: 'approach',
      title: 'Par 3 Accuracy',
      advice: `Your Par 3 average is ${rounds[0].par3Avg.toFixed(1)}. Focus on club selection — take one more club and swing smooth. Aim for the center of the green.`,
      confidence: 'high',
    });
  }

  if (rounds[0]?.par5Avg > 5.2) {
    tips.push({
      category: 'course_management',
      title: 'Par 5 Strategy',
      advice: `Par 5s are costing you strokes (avg ${rounds[0].par5Avg.toFixed(1)}). Consider laying up to your favorite wedge distance instead of going for the green in two.`,
      confidence: 'high',
    });
  }

  if (rounds[0]?.avgPutts > 33) {
    tips.push({
      category: 'putting',
      title: 'Putting Improvement',
      advice: `You're averaging ${rounds[0].avgPutts.toFixed(1)} putts per round. Spend 10 minutes on speed drills before your round. Lag putting is the quickest way to shave strokes.`,
      confidence: 'high',
    });
  }

  const fwPct = rounds[0]?.fairwaysTotal > 0 ? (rounds[0].fairways / rounds[0].fairwaysTotal) * 100 : 0;
  if (fwPct < 50) {
    tips.push({
      category: 'tee',
      title: 'Fairway Accuracy',
      advice: `Only ${fwPct.toFixed(0)}% fairways hit. Tee the ball lower with your driver and focus on a smooth tempo. Hitting fairways is more important than distance.`,
      confidence: 'medium',
    });
  }

  const girPct = rounds[0]?.girTotal > 0 ? (rounds[0].gir / rounds[0].girTotal) * 100 : 0;
  if (girPct < 40) {
    tips.push({
      category: 'approach',
      title: 'Greens in Regulation',
      advice: `Your GIR is ${girPct.toFixed(0)}%. Focus on distance control with your irons. Take dead aim at the fat part of the green — 3-putting from the center is better than chipping from the rough.`,
      confidence: 'medium',
    });
  }

  if (rounds[0]?.doubles > 2) {
    tips.push({
      category: 'mental',
      title: 'Eliminate Big Numbers',
      advice: `You had ${rounds[0].doubles} double bogeys or worse last round. After a bad shot, take your medicine — punch out sideways and save bogey. Bogies don't kill rounds, doubles do.`,
      confidence: 'high',
    });
  }

  if (tips.length < 3) {
    tips.push({
      category: 'course_management',
      title: 'Pre-Shot Routine',
      advice: 'Develop a consistent pre-shot routine: pick a specific target, take one practice swing, visualize the shot, then commit. This builds confidence and consistency.',
      confidence: 'medium',
    });
  }

  const rating = avg <= -2 ? 'Excellent' : avg <= 0 ? 'Solid' : avg <= 2 ? 'Good' : 'Improving';

  return {
    summary: `Based on your last ${rounds.length} rounds, you're trending ${rating.toLowerCase()}. Focus on the tips below to keep improving.`,
    overallRating: rating,
    keyImprovement: tips[0]?.title ?? 'Keep playing',
    tips: tips.slice(0, 5),
  };
}
