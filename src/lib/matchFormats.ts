/**
 * Match Format Scoring Logic
 * 
 * Implements scoring rules for different golf match formats:
 * - Stroke Play: total strokes (default)
 * - Stableford: points-based scoring
 * - Match Play: hole-by-hole comparison
 * - Best Ball: team's best score per hole
 * - Scramble: team selects best shot each hole
 */

// Interfaces
export interface HoleScore {
  holeNumber: number;
  par: number;
  strokes: number;
}

export interface PlayerHoleScores {
  playerId: string;
  playerName: string;
  scores: HoleScore[];
}

export interface FormatResult {
  totalScore: number;
  totalPoints: number;
  holesWon: number;
  holesLost: number;
  holesTied: number;
}

// Stableford points calculation
export function stablefordPoints(strokes: number, par: number): number {
  const diff = strokes - par;
  if (diff <= -3) return 5;  // Double eagle or better
  if (diff === -2) return 4; // Eagle
  if (diff === -1) return 3; // Birdie
  if (diff === 0) return 2;  // Par
  if (diff === 1) return 1;  // Bogey
  return 0;                   // Double bogey or worse
}

// Stroke play result - just returns total strokes
export function calculateStrokePlay(scores: HoleScore[]): FormatResult {
  const totalScore = scores.reduce((sum, s) => sum + s.strokes, 0);
  return { totalScore, totalPoints: 0, holesWon: 0, holesLost: 0, holesTied: 0 };
}

// Stableford result for a single player
export function calculateStableford(scores: HoleScore[]): FormatResult {
  const totalScore = scores.reduce((sum, s) => sum + s.strokes, 0);
  const totalPoints = scores.reduce((sum, s) => sum + stablefordPoints(s.strokes, s.par), 0);
  return { totalScore, totalPoints, holesWon: 0, holesLost: 0, holesTied: 0 };
}

// Match play between two players - returns head-to-head result for player A
export function calculateMatchPlay(
  playerAScores: HoleScore[],
  playerBScores: HoleScore[]
): FormatResult {
  let holesWon = 0;
  let holesLost = 0;
  let holesTied = 0;

  const len = Math.min(playerAScores.length, playerBScores.length);
  for (let i = 0; i < len; i++) {
    const a = playerAScores[i];
    const b = playerBScores[i];
    if (a.strokes < b.strokes) holesWon++;
    else if (a.strokes > b.strokes) holesLost++;
    else holesTied++;
  }

  const totalScore = playerAScores.reduce((sum, s) => sum + s.strokes, 0);
  return { totalScore, totalPoints: 0, holesWon, holesLost, holesTied };
}

// Best ball for a team - takes the lowest score per hole from multiple players
export function calculateBestBall(teams: PlayerHoleScores[][]): { 
  teamResults: { teamIndex: number; bestBallScores: HoleScore[] }[];
  totalScore: number;
} {
  // Find max holes across all players
  const maxHoles = Math.max(...teams.flat().map(p => p.scores.length));
  
  const teamResults = teams.map((team, teamIndex) => {
    const bestBallScores: HoleScore[] = [];
    for (let h = 0; h < maxHoles; h++) {
      let bestStrokes = Infinity;
      let par = 4;
      for (const player of team) {
        if (player.scores[h] && player.scores[h].strokes < bestStrokes) {
          bestStrokes = player.scores[h].strokes;
          par = player.scores[h].par;
        }
      }
      if (bestStrokes !== Infinity) {
        bestBallScores.push({ holeNumber: h + 1, par, strokes: bestStrokes });
      }
    }
    return { teamIndex, bestBallScores };
  });

  const totalScore = teamResults[0]?.bestBallScores.reduce((sum, s) => sum + s.strokes, 0) ?? 0;
  return { teamResults, totalScore };
}

// Scramble: team picks best shot, all play from there
export function calculateScramble(teams: PlayerHoleScores[][]): {
  teamResults: { teamIndex: number; scrambleScores: HoleScore[] }[];
  totalScore: number;
} {
  const maxHoles = Math.max(...teams.flat().map(p => p.scores.length));

  const teamResults = teams.map((team, teamIndex) => {
    const scrambleScores: HoleScore[] = [];
    for (let h = 0; h < maxHoles; h++) {
      let bestStrokes = Infinity;
      let par = 4;
      for (const player of team) {
        const hole = player.scores[h];
        if (hole && hole.strokes < bestStrokes) {
          bestStrokes = hole.strokes;
          par = hole.par;
        }
      }
      if (bestStrokes !== Infinity) {
        scrambleScores.push({ holeNumber: h + 1, par, strokes: bestStrokes });
      }
    }
    return { teamIndex, scrambleScores };
  });

  const totalScore = teamResults[0]?.scrambleScores.reduce((sum, s) => sum + s.strokes, 0) ?? 0;
  return { teamResults, totalScore };
}

// Main dispatcher function
export function calculateFormatResult(
  format: string,
  playerScores: HoleScore[],
  opponentScores?: HoleScore[]
): FormatResult {
  switch (format) {
    case 'stroke_play':
      return calculateStrokePlay(playerScores);
    case 'stableford':
      return calculateStableford(playerScores);
    case 'match_play':
      if (!opponentScores) return calculateStrokePlay(playerScores);
      return calculateMatchPlay(playerScores, opponentScores);
    case 'best_ball':
      // Simplified: just return stroke play for single player
      return calculateStrokePlay(playerScores);
    case 'scramble':
      return calculateStrokePlay(playerScores);
    default:
      return calculateStrokePlay(playerScores);
  }
}

// Format display name helper
export function getFormatDisplayName(format: string): string {
  switch (format) {
    case 'stroke_play': return 'Stroke Play';
    case 'stableford': return 'Stableford';
    case 'match_play': return 'Match Play';
    case 'best_ball': return 'Best Ball';
    case 'scramble': return 'Scramble';
    default: return format;
  }
}

// Format description helper
export function getFormatDescription(format: string): string {
  switch (format) {
    case 'stroke_play': return 'Lowest total strokes wins';
    case 'stableford': return 'Points based on score vs par';
    case 'match_play': return 'Win the most holes';
    case 'best_ball': return 'Team\'s best score counts per hole';
    case 'scramble': return 'Team selects best shot each hole';
    default: return '';
  }
}

// Check if format is available
export function isFormatAvailable(_format: string): boolean {
  return true;
}
