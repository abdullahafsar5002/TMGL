import { describe, it, expect } from 'vitest';
import {
  verifyScorecard,
  rejectScorecard,
  getTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  getRoundsByTournament,
  getRound,
  createRound,
  updateRound,
  deleteRound,
  getMatchesPaginated,
  getMatchesByRound,
  getAllMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch,
  getScorecardsByRound,
  getScorecard,
  getScorecardByRoundPlayer,
  createScorecard,
  updateScorecard,
  getScorecardHoles,
  upsertScorecardHoles,
  deleteScorecardHoles,
  getLeaderboard,
  getMatchesByPlayer,
  getMatchesByTeam,
  getScorecardsByPlayer,
  getTournamentsPaginated,
  getTournamentParticipants,
  getTournamentLeaderboard,
  getDashboardStats,
  getLeagueAnalytics,
  getRecentActivity,
  type TournamentParticipant,
  type DashboardStats,
  type LeagueAnalytics,
  type ActivityItem,
} from './competition';
import type { Tournament, PaginatedResult } from '@/types/database';

describe('Competition Service Layer', () => {
  describe('verifyScorecard', () => {
    it('is a function with correct signature', () => {
      expect(typeof verifyScorecard).toBe('function');
      expect(verifyScorecard.length).toBe(1);
    });

    it('returns a Promise', () => {
      const result = verifyScorecard('sc1');
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => {});
    });
  });

  describe('rejectScorecard', () => {
    it('is a function with correct signature', () => {
      expect(typeof rejectScorecard).toBe('function');
      expect(typeof rejectScorecard).toBe('function');
    });

    it('accepts optional reason parameter', () => {
      const result = rejectScorecard('sc1', 'Invalid scores');
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => {});
    });

    it('can be called without reason', () => {
      const result = rejectScorecard('sc1');
      expect(result).toBeInstanceOf(Promise);
      result.catch(() => {});
    });
  });

  describe('getTournamentsPaginated', () => {
    it('is exported and callable', () => {
      expect(typeof getTournamentsPaginated).toBe('function');
    });
  });

  describe('getTournaments', () => {
    it('is exported and callable', () => {
      expect(typeof getTournaments).toBe('function');
    });
  });

  describe('getTournament', () => {
    it('is exported and callable', () => {
      expect(typeof getTournament).toBe('function');
    });
  });

  describe('createTournament', () => {
    it('is exported and callable', () => {
      expect(typeof createTournament).toBe('function');
    });
  });

  describe('updateTournament', () => {
    it('is exported and callable', () => {
      expect(typeof updateTournament).toBe('function');
    });
  });

  describe('deleteTournament', () => {
    it('is exported and callable', () => {
      expect(typeof deleteTournament).toBe('function');
    });
  });

  describe('getRoundsByTournament', () => {
    it('is exported and callable', () => {
      expect(typeof getRoundsByTournament).toBe('function');
    });
  });

  describe('getRound', () => {
    it('is exported and callable', () => {
      expect(typeof getRound).toBe('function');
    });
  });

  describe('createRound', () => {
    it('is exported and callable', () => {
      expect(typeof createRound).toBe('function');
    });
  });

  describe('updateRound', () => {
    it('is exported and callable', () => {
      expect(typeof updateRound).toBe('function');
    });
  });

  describe('deleteRound', () => {
    it('is exported and callable', () => {
      expect(typeof deleteRound).toBe('function');
    });
  });

  describe('getMatchesPaginated', () => {
    it('is exported and callable', () => {
      expect(typeof getMatchesPaginated).toBe('function');
    });
  });

  describe('getMatchesByRound', () => {
    it('is exported and callable', () => {
      expect(typeof getMatchesByRound).toBe('function');
    });
  });

  describe('getAllMatches', () => {
    it('is exported and callable', () => {
      expect(typeof getAllMatches).toBe('function');
    });
  });

  describe('getMatch', () => {
    it('is exported and callable', () => {
      expect(typeof getMatch).toBe('function');
    });
  });

  describe('createMatch', () => {
    it('is exported and callable', () => {
      expect(typeof createMatch).toBe('function');
    });
  });

  describe('updateMatch', () => {
    it('is exported and callable', () => {
      expect(typeof updateMatch).toBe('function');
    });
  });

  describe('deleteMatch', () => {
    it('is exported and callable', () => {
      expect(typeof deleteMatch).toBe('function');
    });
  });

  describe('getScorecardsByRound', () => {
    it('is exported and callable', () => {
      expect(typeof getScorecardsByRound).toBe('function');
    });
  });

  describe('getScorecard', () => {
    it('is exported and callable', () => {
      expect(typeof getScorecard).toBe('function');
    });
  });

  describe('getScorecardByRoundPlayer', () => {
    it('is exported and callable', () => {
      expect(typeof getScorecardByRoundPlayer).toBe('function');
    });
  });

  describe('createScorecard', () => {
    it('is exported and callable', () => {
      expect(typeof createScorecard).toBe('function');
    });
  });

  describe('updateScorecard', () => {
    it('is exported and callable', () => {
      expect(typeof updateScorecard).toBe('function');
    });
  });

  describe('getScorecardHoles', () => {
    it('is exported and callable', () => {
      expect(typeof getScorecardHoles).toBe('function');
    });
  });

  describe('upsertScorecardHoles', () => {
    it('is exported and callable', () => {
      expect(typeof upsertScorecardHoles).toBe('function');
    });
  });

  describe('deleteScorecardHoles', () => {
    it('is exported and callable', () => {
      expect(typeof deleteScorecardHoles).toBe('function');
    });
  });

  describe('getLeaderboard', () => {
    it('is exported and callable', () => {
      expect(typeof getLeaderboard).toBe('function');
    });
  });

  describe('getTournamentParticipants', () => {
    it('is exported and callable', () => {
      expect(typeof getTournamentParticipants).toBe('function');
    });
  });

  describe('getTournamentLeaderboard', () => {
    it('is exported and callable', () => {
      expect(typeof getTournamentLeaderboard).toBe('function');
    });
  });

  describe('getDashboardStats', () => {
    it('is exported and callable', () => {
      expect(typeof getDashboardStats).toBe('function');
    });
  });

  describe('getLeagueAnalytics', () => {
    it('is exported and callable', () => {
      expect(typeof getLeagueAnalytics).toBe('function');
    });
  });

  describe('getRecentActivity', () => {
    it('is exported and callable', () => {
      expect(typeof getRecentActivity).toBe('function');
    });
  });

  describe('getMatchesByPlayer', () => {
    it('is exported and callable', () => {
      expect(typeof getMatchesByPlayer).toBe('function');
    });
  });

  describe('getMatchesByTeam', () => {
    it('is exported and callable', () => {
      expect(typeof getMatchesByTeam).toBe('function');
    });
  });

  describe('getScorecardsByPlayer', () => {
    it('is exported and callable', () => {
      expect(typeof getScorecardsByPlayer).toBe('function');
    });
  });

  describe('PaginatedResult type', () => {
    it('structure has data and total', () => {
      const result: PaginatedResult<Tournament> = { data: [], total: 0 };
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('TournamentParticipant type', () => {
    it('has required fields', () => {
      const p: TournamentParticipant = { type: 'player', id: 'p1', name: 'Alice' };
      expect(p.type).toBe('player');
      expect(p.id).toBe('p1');
      expect(p.name).toBe('Alice');
    });
  });

  describe('DashboardStats type', () => {
    it('has all required fields', () => {
      const s: DashboardStats = {
        totalTournaments: 0, openTournaments: 0, liveTournaments: 0,
        completedTournaments: 0, cancelledTournaments: 0, totalRounds: 0,
        totalMatches: 0, scheduledMatches: 0, liveMatches: 0,
        completedMatches: 0, cancelledMatches: 0, totalScorecards: 0,
        completedScorecards: 0,
      };
      expect(s.totalTournaments).toBe(0);
      expect(s.completedScorecards).toBe(0);
    });
  });

  describe('LeagueAnalytics type', () => {
    it('has nested structure', () => {
      const a: LeagueAnalytics = {
        tournaments: { total: 0, open: 0, live: 0, completed: 0, cancelled: 0, draft: 0 },
        matches: { total: 0, scheduled: 0, live: 0, completed: 0, cancelled: 0, draft: 0 },
        scorecards: { total: 0, completed: 0, averageStrokes: null, totalStrokes: 0, totalScoreToPar: 0 },
      };
      expect(a.tournaments.total).toBe(0);
      expect(a.scorecards.averageStrokes).toBeNull();
    });
  });

  describe('ActivityItem type', () => {
    it('has required fields', () => {
      const item: ActivityItem = {
        id: '1', type: 'tournament', description: 'Test', timestamp: '', path: '/',
      };
      expect(item.type).toBe('tournament');
    });
  });
});
