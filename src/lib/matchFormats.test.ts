import { describe, it, expect } from 'vitest';
import {
  stablefordPoints,
  calculateStrokePlay,
  calculateStableford,
  calculateMatchPlay,
  calculateBestBall,
  calculateFormatResult,
  getFormatDisplayName,
  getFormatDescription,
  isFormatAvailable,
  type HoleScore,
  type PlayerHoleScores,
} from './matchFormats';

describe('Match Formats', () => {
  describe('stablefordPoints', () => {
    it('returns 5 for double eagle (3 under par)', () => {
      expect(stablefordPoints(1, 4)).toBe(5);
    });
    it('returns 4 for eagle (2 under par)', () => {
      expect(stablefordPoints(2, 4)).toBe(4);
    });
    it('returns 3 for birdie (1 under par)', () => {
      expect(stablefordPoints(3, 4)).toBe(3);
    });
    it('returns 2 for par', () => {
      expect(stablefordPoints(4, 4)).toBe(2);
    });
    it('returns 1 for bogey (1 over par)', () => {
      expect(stablefordPoints(5, 4)).toBe(1);
    });
    it('returns 0 for double bogey or worse', () => {
      expect(stablefordPoints(6, 4)).toBe(0);
      expect(stablefordPoints(8, 4)).toBe(0);
    });
  });

  describe('calculateStrokePlay', () => {
    it('returns total strokes', () => {
      const scores: HoleScore[] = [
        { holeNumber: 1, par: 4, strokes: 5 },
        { holeNumber: 2, par: 3, strokes: 3 },
        { holeNumber: 3, par: 5, strokes: 4 },
      ];
      const result = calculateStrokePlay(scores);
      expect(result.totalScore).toBe(12);
    });
    it('returns zero points and zeros for match stats', () => {
      const result = calculateStrokePlay([]);
      expect(result.totalPoints).toBe(0);
      expect(result.holesWon).toBe(0);
    });
  });

  describe('calculateStableford', () => {
    it('calculates total points', () => {
      const scores: HoleScore[] = [
        { holeNumber: 1, par: 4, strokes: 3 }, // birdie = 3
        { holeNumber: 2, par: 3, strokes: 3 }, // par = 2
        { holeNumber: 3, par: 5, strokes: 5 }, // par = 2
      ];
      const result = calculateStableford(scores);
      expect(result.totalPoints).toBe(7);
      expect(result.totalScore).toBe(11);
    });
  });

  describe('calculateMatchPlay', () => {
    it('counts holes won, lost, and tied', () => {
      const playerA: HoleScore[] = [
        { holeNumber: 1, par: 4, strokes: 4 },
        { holeNumber: 2, par: 3, strokes: 2 },
        { holeNumber: 3, par: 5, strokes: 6 },
      ];
      const playerB: HoleScore[] = [
        { holeNumber: 1, par: 4, strokes: 4 },
        { holeNumber: 2, par: 3, strokes: 3 },
        { holeNumber: 3, par: 5, strokes: 5 },
      ];
      const result = calculateMatchPlay(playerA, playerB);
      expect(result.holesWon).toBe(1);
      expect(result.holesLost).toBe(1);
      expect(result.holesTied).toBe(1);
    });
  });

  describe('calculateFormatResult', () => {
    const scores: HoleScore[] = [
      { holeNumber: 1, par: 4, strokes: 4 },
      { holeNumber: 2, par: 3, strokes: 3 },
    ];

    it('dispatches to stroke_play', () => {
      const result = calculateFormatResult('stroke_play', scores);
      expect(result.totalScore).toBe(7);
    });
    it('dispatches to stableford', () => {
      const result = calculateFormatResult('stableford', scores);
      expect(result.totalPoints).toBe(4); // 2 + 2 = 4
    });
    it('dispatches to match_play with opponent', () => {
      const opponent: HoleScore[] = [
        { holeNumber: 1, par: 4, strokes: 5 },
        { holeNumber: 2, par: 3, strokes: 4 },
      ];
      const result = calculateFormatResult('match_play', scores, opponent);
      expect(result.holesWon).toBe(2);
    });
    it('defaults to stroke play for scramble', () => {
      const result = calculateFormatResult('scramble', scores);
      expect(result.totalScore).toBe(7);
    });
  });

  describe('getFormatDisplayName', () => {
    it('returns correct names', () => {
      expect(getFormatDisplayName('stroke_play')).toBe('Stroke Play');
      expect(getFormatDisplayName('stableford')).toBe('Stableford');
      expect(getFormatDisplayName('match_play')).toBe('Match Play');
      expect(getFormatDisplayName('best_ball')).toBe('Best Ball');
      expect(getFormatDisplayName('scramble')).toBe('Scramble');
    });
  });

  describe('getFormatDescription', () => {
    it('returns non-empty descriptions for all formats', () => {
      expect(getFormatDescription('stroke_play')).toBeTruthy();
      expect(getFormatDescription('stableford')).toBeTruthy();
      expect(getFormatDescription('match_play')).toBeTruthy();
      expect(getFormatDescription('best_ball')).toBeTruthy();
    });
  });

  describe('calculateBestBall', () => {
    it('picks the lowest score per hole from a team', () => {
      const team: PlayerHoleScores[] = [
        { playerId: 'p1', playerName: 'Alice', scores: [{ holeNumber: 1, par: 4, strokes: 5 }, { holeNumber: 2, par: 3, strokes: 4 }] },
        { playerId: 'p2', playerName: 'Bob', scores: [{ holeNumber: 1, par: 4, strokes: 3 }, { holeNumber: 2, par: 3, strokes: 3 }] },
      ];
      const result = calculateBestBall([team]);
      expect(result.teamResults[0].bestBallScores[0].strokes).toBe(3);
      expect(result.teamResults[0].bestBallScores[1].strokes).toBe(3);
      expect(result.totalScore).toBe(6);
    });
  });

  describe('isFormatAvailable', () => {
    it('returns true for available formats', () => {
      expect(isFormatAvailable('stroke_play')).toBe(true);
      expect(isFormatAvailable('stableford')).toBe(true);
      expect(isFormatAvailable('match_play')).toBe(true);
      expect(isFormatAvailable('best_ball')).toBe(true);
    });
    it('returns false for scramble', () => {
      expect(isFormatAvailable('scramble')).toBe(false);
    });
  });
});
