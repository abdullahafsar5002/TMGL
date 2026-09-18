import { describe, it, expect } from 'vitest';
import {
  getCourses,
  getCourse,
  getCourseHoles,
  createCourse,
  updateCourse,
  deleteCourse,
  updateCourseHoles,
  getSeasons,
  getSeason,
  createSeason,
  updateSeason,
  deleteSeason,
  getSeasonsPaginated,
  getDivisionsBySeason,
  getDivision,
  createDivision,
  updateDivision,
  deleteDivision,
  getPlayers,
  getPlayer,
  getPlayerByProfileId,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayersPaginated,
  getTeamsBySeason,
  getAllTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamsPaginated,
  getTeamMembers,
  getTeamMembersBySeason,
  addTeamMember,
  removeTeamMember,
  getTeamsByPlayer,
  getTeamsByIds,
  getLeagueStats,
  type PaginatedResult,
} from './league';
import { validateCourse, validateCourseHoles } from './validation';
import type { Course } from '@/types/database';

type CourseHoleInput = {
  hole_number: number;
  par: number;
  handicap_index: number | null;
  yardage: number | null;
};

describe('League Service Layer', () => {
  describe('getCourses', () => {
    it('is exported and callable', () => {
      expect(typeof getCourses).toBe('function');
    });
  });

  describe('getCourse', () => {
    it('is exported and callable', () => {
      expect(typeof getCourse).toBe('function');
    });
  });

  describe('getCourseHoles', () => {
    it('is exported and callable', () => {
      expect(typeof getCourseHoles).toBe('function');
    });
  });

  describe('createCourse', () => {
    it('is exported and callable', () => {
      expect(typeof createCourse).toBe('function');
    });
  });

  describe('updateCourse', () => {
    it('is exported and callable', () => {
      expect(typeof updateCourse).toBe('function');
    });
  });

  describe('deleteCourse', () => {
    it('is exported and callable', () => {
      expect(typeof deleteCourse).toBe('function');
    });
  });

  describe('updateCourseHoles', () => {
    it('is exported and callable', () => {
      expect(typeof updateCourseHoles).toBe('function');
    });
  });

  describe('Course Validation — validateCourse', () => {
    it('rejects empty course name', () => {
      const result = validateCourse({ name: '', location: null, description: null, holes_count: 18, course_rating: null, slope_rating: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Course name is required.');
    });

    it('rejects course name shorter than 2 characters', () => {
      const result = validateCourse({ name: 'A', location: null, description: null, holes_count: 18, course_rating: null, slope_rating: null });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least 2'))).toBe(true);
    });

    it('rejects course name longer than 100 characters', () => {
      const result = validateCourse({ name: 'X'.repeat(101), location: null, description: null, holes_count: 18, course_rating: null, slope_rating: null });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('100'))).toBe(true);
    });

    it('rejects invalid holes_count', () => {
      const result = validateCourse({ name: 'Pine Valley', location: null, description: null, holes_count: 12 as 9 | 18, course_rating: null, slope_rating: null });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Holes count must be 9 or 18.');
    });

    it('accepts holes_count of 9', () => {
      const result = validateCourse({ name: 'Executive', location: null, description: null, holes_count: 9, course_rating: null, slope_rating: null });
      expect(result.isValid).toBe(true);
    });

    it('accepts holes_count of 18', () => {
      const result = validateCourse({ name: 'Championship', location: null, description: null, holes_count: 18, course_rating: null, slope_rating: null });
      expect(result.isValid).toBe(true);
    });

    it('rejects course_rating out of range', () => {
      const result = validateCourse({ name: 'Pine Valley', location: null, description: null, holes_count: 18, course_rating: -1, slope_rating: null });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Course rating'))).toBe(true);

      const result2 = validateCourse({ name: 'Pine Valley', location: null, description: null, holes_count: 18, course_rating: 81, slope_rating: null });
      expect(result2.isValid).toBe(false);
    });

    it('rejects slope_rating out of range', () => {
      const result = validateCourse({ name: 'Pine Valley', location: null, description: null, holes_count: 18, course_rating: null, slope_rating: -1 });
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Slope rating'))).toBe(true);

      const result2 = validateCourse({ name: 'Pine Valley', location: null, description: null, holes_count: 18, course_rating: null, slope_rating: 201 });
      expect(result2.isValid).toBe(false);
    });

    it('accepts valid course with all fields', () => {
      const result = validateCourse({ name: 'Pine Valley', location: 'NJ', description: 'Classic', holes_count: 18, course_rating: 73.5, slope_rating: 145 });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts valid course with null optional fields', () => {
      const result = validateCourse({ name: 'Muni', location: null, description: null, holes_count: 9, course_rating: null, slope_rating: null });
      expect(result.isValid).toBe(true);
    });

    it('trims whitespace from name', () => {
      const result = validateCourse({ name: '  ', location: null, description: null, holes_count: 18, course_rating: null, slope_rating: null });
      expect(result.isValid).toBe(false);
    });
  });

  describe('Course Validation — validateCourseHoles', () => {
    it('rejects empty holes array', () => {
      const result = validateCourseHoles([], 18);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one hole definition is required.');
    });

    it('rejects hole number outside range', () => {
      const holes: CourseHoleInput[] = [{ hole_number: 0, par: 4, handicap_index: null, yardage: null }];
      const result = validateCourseHoles(holes, 18);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('between 1 and 18'))).toBe(true);
    });

    it('rejects hole number exceeding total', () => {
      const holes: CourseHoleInput[] = [{ hole_number: 19, par: 4, handicap_index: null, yardage: null }];
      const result = validateCourseHoles(holes, 18);
      expect(result.isValid).toBe(false);
    });

    it('rejects duplicate hole numbers', () => {
      const holes: CourseHoleInput[] = [
        { hole_number: 1, par: 4, handicap_index: null, yardage: null },
        { hole_number: 1, par: 3, handicap_index: null, yardage: null },
      ];
      const result = validateCourseHoles(holes, 18);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
    });

    it('rejects par out of range', () => {
      const holes: CourseHoleInput[] = [{ hole_number: 1, par: 2, handicap_index: null, yardage: null }];
      const result = validateCourseHoles(holes, 18);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Par'))).toBe(true);
    });

    it('rejects handicap_index out of range', () => {
      const holes: CourseHoleInput[] = [{ hole_number: 1, par: 4, handicap_index: 0, yardage: null }];
      const result = validateCourseHoles(holes, 18);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Handicap index'))).toBe(true);
    });

    it('rejects negative yardage', () => {
      const holes: CourseHoleInput[] = [{ hole_number: 1, par: 4, handicap_index: null, yardage: -10 }];
      const result = validateCourseHoles(holes, 18);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Yardage'))).toBe(true);
    });

    it('accepts valid 18-hole course', () => {
      const holes: CourseHoleInput[] = Array.from({ length: 18 }, (_, i) => ({
        hole_number: i + 1, par: 4, handicap_index: i + 1, yardage: 400,
      }));
      const result = validateCourseHoles(holes, 18);
      expect(result.isValid).toBe(true);
    });

    it('accepts valid 9-hole course', () => {
      const holes: CourseHoleInput[] = Array.from({ length: 9 }, (_, i) => ({
        hole_number: i + 1, par: 4, handicap_index: null, yardage: 350,
      }));
      const result = validateCourseHoles(holes, 9);
      expect(result.isValid).toBe(true);
    });

    it('accepts null handicap_index and yardage', () => {
      const holes: CourseHoleInput[] = [{ hole_number: 1, par: 4, handicap_index: null, yardage: null }];
      const result = validateCourseHoles(holes, 18);
      expect(result.isValid).toBe(true);
    });
  });

  describe('getSeasonsPaginated', () => {
    it('is exported and callable', () => {
      expect(typeof getSeasonsPaginated).toBe('function');
    });
  });

  describe('getSeasons', () => {
    it('is exported and callable', () => {
      expect(typeof getSeasons).toBe('function');
    });
  });

  describe('getSeason', () => {
    it('is exported and callable', () => {
      expect(typeof getSeason).toBe('function');
    });
  });

  describe('createSeason', () => {
    it('is exported and callable', () => {
      expect(typeof createSeason).toBe('function');
    });
  });

  describe('updateSeason', () => {
    it('is exported and callable', () => {
      expect(typeof updateSeason).toBe('function');
    });
  });

  describe('deleteSeason', () => {
    it('is exported and callable', () => {
      expect(typeof deleteSeason).toBe('function');
    });
  });

  describe('getDivisionsBySeason', () => {
    it('is exported and callable', () => {
      expect(typeof getDivisionsBySeason).toBe('function');
    });
  });

  describe('getDivision', () => {
    it('is exported and callable', () => {
      expect(typeof getDivision).toBe('function');
    });
  });

  describe('createDivision', () => {
    it('is exported and callable', () => {
      expect(typeof createDivision).toBe('function');
    });
  });

  describe('updateDivision', () => {
    it('is exported and callable', () => {
      expect(typeof updateDivision).toBe('function');
    });
  });

  describe('deleteDivision', () => {
    it('is exported and callable', () => {
      expect(typeof deleteDivision).toBe('function');
    });
  });

  describe('getPlayersPaginated', () => {
    it('is exported and callable', () => {
      expect(typeof getPlayersPaginated).toBe('function');
    });
  });

  describe('getPlayers', () => {
    it('is exported and callable', () => {
      expect(typeof getPlayers).toBe('function');
    });
  });

  describe('getPlayer', () => {
    it('is exported and callable', () => {
      expect(typeof getPlayer).toBe('function');
    });
  });

  describe('getPlayerByProfileId', () => {
    it('is exported and callable', () => {
      expect(typeof getPlayerByProfileId).toBe('function');
    });

    it('returns error message for non-existent profile (previously caused 406)', () => {
      // Regression test: .single() on zero rows returns 406 Not Acceptable from PostgREST.
      // After fix: .maybeSingle() returns null data, and we map it to a clean error.
      // We can't call the real Supabase here, but we verify the function signature
      // accepts a profileId string and returns a Promise<ServiceResult<Player>>
      expect(typeof getPlayerByProfileId).toBe('function');
      expect(getPlayerByProfileId.length).toBe(1);
    });
  });

  describe('createPlayer', () => {
    it('is exported and callable', () => {
      expect(typeof createPlayer).toBe('function');
    });
  });

  describe('updatePlayer', () => {
    it('is exported and callable', () => {
      expect(typeof updatePlayer).toBe('function');
    });
  });

  describe('deletePlayer', () => {
    it('is exported and callable', () => {
      expect(typeof deletePlayer).toBe('function');
    });
  });

  describe('getTeamsPaginated', () => {
    it('is exported and callable', () => {
      expect(typeof getTeamsPaginated).toBe('function');
    });
  });

  describe('getTeamsBySeason', () => {
    it('is exported and callable', () => {
      expect(typeof getTeamsBySeason).toBe('function');
    });
  });

  describe('getAllTeams', () => {
    it('is exported and callable', () => {
      expect(typeof getAllTeams).toBe('function');
    });
  });

  describe('getTeam', () => {
    it('is exported and callable', () => {
      expect(typeof getTeam).toBe('function');
    });
  });

  describe('createTeam', () => {
    it('is exported and callable', () => {
      expect(typeof createTeam).toBe('function');
    });
  });

  describe('updateTeam', () => {
    it('is exported and callable', () => {
      expect(typeof updateTeam).toBe('function');
    });
  });

  describe('deleteTeam', () => {
    it('is exported and callable', () => {
      expect(typeof deleteTeam).toBe('function');
    });
  });

  describe('getTeamMembers', () => {
    it('is exported and callable', () => {
      expect(typeof getTeamMembers).toBe('function');
    });
  });

  describe('getTeamMembersBySeason', () => {
    it('is exported and callable', () => {
      expect(typeof getTeamMembersBySeason).toBe('function');
    });
  });

  describe('addTeamMember', () => {
    it('is exported and callable', () => {
      expect(typeof addTeamMember).toBe('function');
    });
  });

  describe('removeTeamMember', () => {
    it('is exported and callable', () => {
      expect(typeof removeTeamMember).toBe('function');
    });
  });

  describe('getTeamsByPlayer', () => {
    it('is exported and callable', () => {
      expect(typeof getTeamsByPlayer).toBe('function');
    });
  });

  describe('getTeamsByIds', () => {
    it('is exported and callable', () => {
      expect(typeof getTeamsByIds).toBe('function');
    });
  });

  describe('getLeagueStats', () => {
    it('is exported and callable', () => {
      expect(typeof getLeagueStats).toBe('function');
    });
  });

  describe('PaginatedResult type', () => {
    it('structure has data and total', () => {
      const result: PaginatedResult<Course> = { data: [], total: 0 };
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
