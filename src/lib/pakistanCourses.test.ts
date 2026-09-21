import { describe, it, expect } from 'vitest';

// Pakistan Golf Course seed data — integrity validation tests
// These tests verify the structure and consistency of seeded course data
// without requiring a database connection.

interface CourseSeedData {
  id: string;
  name: string;
  location: string;
  holes_count: number;
  holes: Array<{
    hole_number: number;
    par: number;
    handicap_index: number;
    yardage: number;
  }>;
}

const PAKISTAN_COURSES: CourseSeedData[] = [
  {
    id: 'a1b2c3d4-1111-4000-8000-000000000001',
    name: 'Lahore Gymkhana Golf Club',
    location: 'Lahore, Punjab',
    holes_count: 18,
    holes: [
      { hole_number: 1, par: 4, handicap_index: 2, yardage: 374 },
      { hole_number: 2, par: 4, handicap_index: 14, yardage: 364 },
      { hole_number: 3, par: 4, handicap_index: 4, yardage: 390 },
      { hole_number: 4, par: 3, handicap_index: 8, yardage: 202 },
      { hole_number: 5, par: 3, handicap_index: 18, yardage: 142 },
      { hole_number: 6, par: 4, handicap_index: 12, yardage: 199 },
      { hole_number: 7, par: 5, handicap_index: 16, yardage: 496 },
      { hole_number: 8, par: 5, handicap_index: 6, yardage: 508 },
      { hole_number: 9, par: 3, handicap_index: 10, yardage: 159 },
      { hole_number: 10, par: 4, handicap_index: 11, yardage: 265 },
      { hole_number: 11, par: 5, handicap_index: 13, yardage: 468 },
      { hole_number: 12, par: 3, handicap_index: 9, yardage: 165 },
      { hole_number: 13, par: 4, handicap_index: 3, yardage: 433 },
      { hole_number: 14, par: 4, handicap_index: 1, yardage: 419 },
      { hole_number: 15, par: 5, handicap_index: 7, yardage: 494 },
      { hole_number: 16, par: 5, handicap_index: 15, yardage: 452 },
      { hole_number: 17, par: 3, handicap_index: 17, yardage: 131 },
      { hole_number: 18, par: 4, handicap_index: 5, yardage: 382 },
    ],
  },
  {
    id: 'a1b2c3d4-1111-4000-8000-000000000002',
    name: 'Royal Palm Golf & Country Club',
    location: 'Lahore, Punjab',
    holes_count: 18,
    holes: [
      { hole_number: 1, par: 4, handicap_index: 7, yardage: 320 },
      { hole_number: 2, par: 3, handicap_index: 13, yardage: 187 },
      { hole_number: 3, par: 5, handicap_index: 15, yardage: 473 },
      { hole_number: 4, par: 3, handicap_index: 17, yardage: 137 },
      { hole_number: 5, par: 4, handicap_index: 9, yardage: 327 },
      { hole_number: 6, par: 4, handicap_index: 1, yardage: 371 },
      { hole_number: 7, par: 5, handicap_index: 3, yardage: 558 },
      { hole_number: 8, par: 4, handicap_index: 11, yardage: 362 },
      { hole_number: 9, par: 4, handicap_index: 5, yardage: 371 },
      { hole_number: 10, par: 4, handicap_index: 6, yardage: 338 },
      { hole_number: 11, par: 5, handicap_index: 14, yardage: 476 },
      { hole_number: 12, par: 3, handicap_index: 18, yardage: 162 },
      { hole_number: 13, par: 4, handicap_index: 2, yardage: 421 },
      { hole_number: 14, par: 4, handicap_index: 8, yardage: 328 },
      { hole_number: 15, par: 5, handicap_index: 12, yardage: 487 },
      { hole_number: 16, par: 3, handicap_index: 16, yardage: 189 },
      { hole_number: 17, par: 4, handicap_index: 4, yardage: 371 },
      { hole_number: 18, par: 4, handicap_index: 10, yardage: 359 },
    ],
  },
  {
    id: 'a1b2c3d4-1111-4000-8000-000000000003',
    name: 'PAF Skyview Golf & Country Club',
    location: 'Lahore, Punjab',
    holes_count: 18,
    holes: [
      { hole_number: 1, par: 4, handicap_index: 3, yardage: 426 },
      { hole_number: 2, par: 5, handicap_index: 5, yardage: 501 },
      { hole_number: 3, par: 3, handicap_index: 15, yardage: 179 },
      { hole_number: 4, par: 4, handicap_index: 11, yardage: 412 },
      { hole_number: 5, par: 4, handicap_index: 9, yardage: 353 },
      { hole_number: 6, par: 3, handicap_index: 17, yardage: 173 },
      { hole_number: 7, par: 4, handicap_index: 1, yardage: 451 },
      { hole_number: 8, par: 5, handicap_index: 13, yardage: 524 },
      { hole_number: 9, par: 4, handicap_index: 7, yardage: 439 },
      { hole_number: 10, par: 4, handicap_index: 14, yardage: 360 },
      { hole_number: 11, par: 5, handicap_index: 12, yardage: 511 },
      { hole_number: 12, par: 3, handicap_index: 10, yardage: 215 },
      { hole_number: 13, par: 5, handicap_index: 2, yardage: 545 },
      { hole_number: 14, par: 4, handicap_index: 8, yardage: 402 },
      { hole_number: 15, par: 3, handicap_index: 6, yardage: 210 },
      { hole_number: 16, par: 4, handicap_index: 4, yardage: 401 },
      { hole_number: 17, par: 4, handicap_index: 18, yardage: 310 },
      { hole_number: 18, par: 4, handicap_index: 16, yardage: 361 },
    ],
  },
  {
    id: 'a1b2c3d4-1111-4000-8000-000000000004',
    name: 'Margalla Greens Golf Club',
    location: 'Islamabad',
    holes_count: 18,
    holes: [
      { hole_number: 1, par: 4, handicap_index: 7, yardage: 372 },
      { hole_number: 2, par: 3, handicap_index: 17, yardage: 122 },
      { hole_number: 3, par: 5, handicap_index: 15, yardage: 528 },
      { hole_number: 4, par: 3, handicap_index: 13, yardage: 165 },
      { hole_number: 5, par: 4, handicap_index: 3, yardage: 440 },
      { hole_number: 6, par: 4, handicap_index: 5, yardage: 383 },
      { hole_number: 7, par: 5, handicap_index: 11, yardage: 517 },
      { hole_number: 8, par: 4, handicap_index: 1, yardage: 427 },
      { hole_number: 9, par: 4, handicap_index: 9, yardage: 342 },
      { hole_number: 10, par: 3, handicap_index: 8, yardage: 180 },
      { hole_number: 11, par: 4, handicap_index: 14, yardage: 327 },
      { hole_number: 12, par: 4, handicap_index: 10, yardage: 290 },
      { hole_number: 13, par: 3, handicap_index: 2, yardage: 172 },
      { hole_number: 14, par: 4, handicap_index: 16, yardage: 372 },
      { hole_number: 15, par: 4, handicap_index: 18, yardage: 370 },
      { hole_number: 16, par: 4, handicap_index: 12, yardage: 365 },
      { hole_number: 17, par: 4, handicap_index: 4, yardage: 415 },
      { hole_number: 18, par: 5, handicap_index: 6, yardage: 480 },
    ],
  },
  {
    id: 'a1b2c3d4-1111-4000-8000-000000000005',
    name: 'Airmen Golf Course & Recreational Park',
    location: 'Karachi, Sindh',
    holes_count: 18,
    holes: [
      { hole_number: 1, par: 4, handicap_index: 16, yardage: 368 },
      { hole_number: 2, par: 3, handicap_index: 18, yardage: 208 },
      { hole_number: 3, par: 5, handicap_index: 6, yardage: 593 },
      { hole_number: 4, par: 4, handicap_index: 12, yardage: 449 },
      { hole_number: 5, par: 4, handicap_index: 10, yardage: 404 },
      { hole_number: 6, par: 3, handicap_index: 8, yardage: 182 },
      { hole_number: 7, par: 4, handicap_index: 2, yardage: 454 },
      { hole_number: 8, par: 4, handicap_index: 14, yardage: 443 },
      { hole_number: 9, par: 5, handicap_index: 4, yardage: 615 },
      { hole_number: 10, par: 4, handicap_index: 15, yardage: 427 },
      { hole_number: 11, par: 4, handicap_index: 13, yardage: 444 },
      { hole_number: 12, par: 4, handicap_index: 1, yardage: 456 },
      { hole_number: 13, par: 3, handicap_index: 5, yardage: 202 },
      { hole_number: 14, par: 5, handicap_index: 3, yardage: 640 },
      { hole_number: 15, par: 3, handicap_index: 17, yardage: 213 },
      { hole_number: 16, par: 4, handicap_index: 11, yardage: 449 },
      { hole_number: 17, par: 4, handicap_index: 9, yardage: 454 },
      { hole_number: 18, par: 5, handicap_index: 7, yardage: 643 },
    ],
  },
  {
    id: 'a1b2c3d4-1111-4000-8000-000000000006',
    name: 'Arabian Sea Country Club',
    location: 'Bin Qasim, Karachi, Sindh',
    holes_count: 18,
    holes: [
      { hole_number: 1, par: 4, handicap_index: 11, yardage: 425 },
      { hole_number: 2, par: 3, handicap_index: 17, yardage: 202 },
      { hole_number: 3, par: 4, handicap_index: 1, yardage: 459 },
      { hole_number: 4, par: 5, handicap_index: 15, yardage: 559 },
      { hole_number: 5, par: 3, handicap_index: 13, yardage: 212 },
      { hole_number: 6, par: 4, handicap_index: 5, yardage: 459 },
      { hole_number: 7, par: 5, handicap_index: 7, yardage: 591 },
      { hole_number: 8, par: 4, handicap_index: 3, yardage: 471 },
      { hole_number: 9, par: 4, handicap_index: 9, yardage: 448 },
      { hole_number: 10, par: 4, handicap_index: 16, yardage: 414 },
      { hole_number: 11, par: 5, handicap_index: 8, yardage: 580 },
      { hole_number: 12, par: 4, handicap_index: 4, yardage: 470 },
      { hole_number: 13, par: 3, handicap_index: 14, yardage: 211 },
      { hole_number: 14, par: 5, handicap_index: 6, yardage: 600 },
      { hole_number: 15, par: 4, handicap_index: 2, yardage: 482 },
      { hole_number: 16, par: 4, handicap_index: 10, yardage: 449 },
      { hole_number: 17, par: 3, handicap_index: 18, yardage: 195 },
      { hole_number: 18, par: 4, handicap_index: 12, yardage: 425 },
    ],
  },
  {
    id: 'a1b2c3d4-1111-4000-8000-000000000007',
    name: 'Islamabad Golf Club (New)',
    location: 'Islamabad',
    holes_count: 9,
    holes: [
      { hole_number: 1, par: 4, handicap_index: 1, yardage: 375 },
      { hole_number: 2, par: 3, handicap_index: 6, yardage: 142 },
      { hole_number: 3, par: 4, handicap_index: 4, yardage: 236 },
      { hole_number: 4, par: 4, handicap_index: 5, yardage: 349 },
      { hole_number: 5, par: 4, handicap_index: 8, yardage: 494 },
      { hole_number: 6, par: 4, handicap_index: 7, yardage: 402 },
      { hole_number: 7, par: 5, handicap_index: 9, yardage: 472 },
      { hole_number: 8, par: 3, handicap_index: 2, yardage: 166 },
      { hole_number: 9, par: 4, handicap_index: 3, yardage: 338 },
    ],
  },
  {
    id: 'a1b2c3d4-1111-4000-8000-000000000008',
    name: 'Rawalpindi Golf Club',
    location: 'Rawalpindi, Punjab',
    holes_count: 18,
    holes: [
      { hole_number: 1, par: 5, handicap_index: 5, yardage: 522 },
      { hole_number: 2, par: 3, handicap_index: 7, yardage: 199 },
      { hole_number: 3, par: 4, handicap_index: 11, yardage: 402 },
      { hole_number: 4, par: 4, handicap_index: 15, yardage: 375 },
      { hole_number: 5, par: 4, handicap_index: 9, yardage: 359 },
      { hole_number: 6, par: 4, handicap_index: 17, yardage: 346 },
      { hole_number: 7, par: 4, handicap_index: 1, yardage: 450 },
      { hole_number: 8, par: 3, handicap_index: 3, yardage: 232 },
      { hole_number: 9, par: 5, handicap_index: 13, yardage: 551 },
      { hole_number: 10, par: 4, handicap_index: 4, yardage: 385 },
      { hole_number: 11, par: 4, handicap_index: 2, yardage: 365 },
      { hole_number: 12, par: 3, handicap_index: 18, yardage: 175 },
      { hole_number: 13, par: 4, handicap_index: 6, yardage: 395 },
      { hole_number: 14, par: 5, handicap_index: 10, yardage: 510 },
      { hole_number: 15, par: 5, handicap_index: 12, yardage: 495 },
      { hole_number: 16, par: 3, handicap_index: 14, yardage: 185 },
      { hole_number: 17, par: 4, handicap_index: 16, yardage: 380 },
      { hole_number: 18, par: 4, handicap_index: 8, yardage: 426 },
    ],
  },
];

function validateCourseStructure(course: CourseSeedData): string[] {
  const errors: string[] = [];

  if (!course.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(course.id)) {
    errors.push(`${course.name}: Invalid UUID format`);
  }

  if (!course.name || course.name.length < 2) {
    errors.push(`${course.name}: Name too short`);
  }

  if (course.holes_count !== 9 && course.holes_count !== 18) {
    errors.push(`${course.name}: Invalid holes_count ${course.holes_count}`);
  }

  if (course.holes.length !== course.holes_count) {
    errors.push(`${course.name}: Expected ${course.holes_count} holes, got ${course.holes.length}`);
  }

  const holeNumbers = course.holes.map(h => h.hole_number);
  const uniqueHoles = new Set(holeNumbers);
  if (uniqueHoles.size !== holeNumbers.length) {
    errors.push(`${course.name}: Duplicate hole numbers`);
  }

  for (const hole of course.holes) {
    if (hole.hole_number < 1 || hole.hole_number > 18) {
      errors.push(`${course.name} Hole ${hole.hole_number}: Invalid hole number`);
    }
    if (hole.par < 3 || hole.par > 6) {
      errors.push(`${course.name} Hole ${hole.hole_number}: Invalid par ${hole.par}`);
    }
    if (hole.handicap_index < 1 || hole.handicap_index > 18) {
      errors.push(`${course.name} Hole ${hole.hole_number}: Invalid handicap_index ${hole.handicap_index}`);
    }
    if (hole.yardage < 0) {
      errors.push(`${course.name} Hole ${hole.hole_number}: Negative yardage`);
    }
    if (hole.yardage > 0 && hole.yardage < 50) {
      errors.push(`${course.name} Hole ${hole.hole_number}: Suspiciously short yardage ${hole.yardage}`);
    }
    if (hole.yardage > 800) {
      errors.push(`${course.name} Hole ${hole.hole_number}: Suspiciously long yardage ${hole.yardage}`);
    }
  }

  return errors;
}

describe('Pakistan Golf Course Seed Data', () => {
  describe('Course count', () => {
    it('has 8 seeded courses', () => {
      expect(PAKISTAN_COURSES.length).toBe(8);
    });
  });

  describe('Unique IDs', () => {
    it('has no duplicate course IDs', () => {
      const ids = PAKISTAN_COURSES.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('Course structure validation', () => {
    for (const course of PAKISTAN_COURSES) {
      describe(course.name, () => {
        const errors = validateCourseStructure(course);

        it('passes all validation checks', () => {
          expect(errors).toEqual([]);
        });

        it(`has correct hole count (${course.holes_count})`, () => {
          expect(course.holes.length).toBe(course.holes_count);
        });

        it('has consecutive hole numbers starting from 1', () => {
          const sorted = [...course.holes].sort((a, b) => a.hole_number - b.hole_number);
          for (let i = 0; i < sorted.length; i++) {
            expect(sorted[i].hole_number).toBe(i + 1);
          }
        });

        it('has valid par values (3-6)', () => {
          for (const hole of course.holes) {
            expect(hole.par).toBeGreaterThanOrEqual(3);
            expect(hole.par).toBeLessThanOrEqual(6);
          }
        });

        it('has unique handicap indices (1-18)', () => {
          const indices = course.holes.map(h => h.handicap_index);
          expect(new Set(indices).size).toBe(indices.length);
          for (const idx of indices) {
            expect(idx).toBeGreaterThanOrEqual(1);
            expect(idx).toBeLessThanOrEqual(18);
          }
        });

        it('has positive yardages', () => {
          for (const hole of course.holes) {
            expect(hole.yardage).toBeGreaterThan(0);
          }
        });

        it('has reasonable par total', () => {
          const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);
          if (course.holes_count === 18) {
            expect(totalPar).toBeGreaterThanOrEqual(70);
            expect(totalPar).toBeLessThanOrEqual(74);
          } else {
            expect(totalPar).toBeGreaterThanOrEqual(33);
            expect(totalPar).toBeLessThanOrEqual(38);
          }
        });

        it('has reasonable total yardage', () => {
          const totalYardage = course.holes.reduce((sum, h) => sum + h.yardage, 0);
          if (course.holes_count === 18) {
            expect(totalYardage).toBeGreaterThanOrEqual(5000);
            expect(totalYardage).toBeLessThanOrEqual(8000);
          } else {
            expect(totalYardage).toBeGreaterThanOrEqual(2500);
            expect(totalYardage).toBeLessThanOrEqual(4000);
          }
        });
      });
    }
  });

  describe('Cross-course validation', () => {
    it('all 18-hole courses have par 70-74', () => {
      const courses18 = PAKISTAN_COURSES.filter(c => c.holes_count === 18);
      for (const course of courses18) {
        const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);
        expect(totalPar).toBeGreaterThanOrEqual(70);
        expect(totalPar).toBeLessThanOrEqual(74);
      }
    });

    it('9-hole course has par 33-38', () => {
      const course9 = PAKISTAN_COURSES.find(c => c.holes_count === 9)!;
      const totalPar = course9.holes.reduce((sum, h) => sum + h.par, 0);
      expect(totalPar).toBeGreaterThanOrEqual(33);
      expect(totalPar).toBeLessThanOrEqual(38);
    });

    it('no two courses share the same ID', () => {
      const ids = PAKISTAN_COURSES.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('courses span all major Pakistan cities', () => {
      const locations = PAKISTAN_COURSES.map(c => c.location);
      const hasLahore = locations.some(l => l.includes('Lahore'));
      const hasKarachi = locations.some(l => l.includes('Karachi'));
      const hasIslamabad = locations.some(l => l.includes('Islamabad'));
      const hasRawalpindi = locations.some(l => l.includes('Rawalpindi'));
      expect(hasLahore).toBe(true);
      expect(hasKarachi).toBe(true);
      expect(hasIslamabad).toBe(true);
      expect(hasRawalpindi).toBe(true);
    });
  });
});
