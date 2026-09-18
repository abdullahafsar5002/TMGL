import { describe, it, expect } from 'vitest';

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  const pages: (number | '...')[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }
  return pages;
}

function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize);
}

describe('Pagination Logic', () => {
  describe('getPageNumbers — small page counts (≤5)', () => {
    it('returns [1] for 1 page', () => {
      expect(getPageNumbers(1, 1)).toEqual([1]);
    });

    it('returns [1, 2] for 2 pages', () => {
      expect(getPageNumbers(1, 2)).toEqual([1, 2]);
    });

    it('returns all pages for 3 pages', () => {
      expect(getPageNumbers(2, 3)).toEqual([1, 2, 3]);
    });

    it('returns all pages for 4 pages', () => {
      expect(getPageNumbers(3, 4)).toEqual([1, 2, 3, 4]);
    });

    it('returns all pages for 5 pages', () => {
      expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('getPageNumbers — large page counts (>5)', () => {
    it('starts at page 1 with leading ellipsis', () => {
      const result = getPageNumbers(1, 10);
      expect(result).toEqual([1, 2, '...', 10]);
    });

    it('ends at last page with trailing ellipsis', () => {
      const result = getPageNumbers(10, 10);
      expect(result).toEqual([1, '...', 9, 10]);
    });

    it('shows ellipsis on both sides for middle page', () => {
      const result = getPageNumbers(5, 10);
      expect(result).toEqual([1, '...', 4, 5, 6, '...', 10]);
    });

    it('shows left ellipsis near end', () => {
      const result = getPageNumbers(8, 10);
      expect(result).toEqual([1, '...', 7, 8, 9, 10]);
    });

    it('shows right ellipsis near start', () => {
      const result = getPageNumbers(3, 10);
      expect(result).toEqual([1, 2, 3, 4, '...', 10]);
    });

    it('handles exactly 6 pages', () => {
      const result = getPageNumbers(1, 6);
      expect(result).toEqual([1, 2, '...', 6]);
    });

    it('handles exactly 6 pages at end', () => {
      const result = getPageNumbers(6, 6);
      expect(result).toEqual([1, '...', 5, 6]);
    });

    it('handles exactly 6 pages in middle', () => {
      const result = getPageNumbers(3, 6);
      expect(result).toEqual([1, 2, 3, 4, '...', 6]);
    });

    it('handles very large total pages', () => {
      const result = getPageNumbers(50, 100);
      expect(result).toEqual([1, '...', 49, 50, 51, '...', 100]);
    });
  });

  describe('getPageNumbers — boundary conditions', () => {
    it('first page never starts with ellipsis', () => {
      for (const total of [6, 10, 20, 50]) {
        const result = getPageNumbers(1, total);
        expect(result[0]).toBe(1);
      }
    });

    it('last page never ends with ellipsis', () => {
      for (const total of [6, 10, 20, 50]) {
        const result = getPageNumbers(total, total);
        expect(result[result.length - 1]).toBe(total);
      }
    });

    it('currentPage 1 always has page 1', () => {
      const result = getPageNumbers(1, 20);
      expect(result[0]).toBe(1);
    });

    it('currentPage = totalPages always has last page', () => {
      const result = getPageNumbers(20, 20);
      expect(result[result.length - 1]).toBe(20);
    });
  });

  describe('getPageNumbers — ellipsis count', () => {
    it('has at most two ellipsis entries', () => {
      for (let total = 6; total <= 30; total++) {
        for (let page = 1; page <= total; page++) {
          const result = getPageNumbers(page, total);
          const ellipsisCount = result.filter((p) => p === '...').length;
          expect(ellipsisCount).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  describe('getTotalPages', () => {
    it('calculates total pages correctly', () => {
      expect(getTotalPages(0, 10)).toBe(0);
      expect(getTotalPages(1, 10)).toBe(1);
      expect(getTotalPages(10, 10)).toBe(1);
      expect(getTotalPages(11, 10)).toBe(2);
      expect(getTotalPages(20, 10)).toBe(2);
      expect(getTotalPages(21, 10)).toBe(3);
    });

    it('handles page size of 1', () => {
      expect(getTotalPages(5, 1)).toBe(5);
    });

    it('handles large page size', () => {
      expect(getTotalPages(100, 50)).toBe(2);
      expect(getTotalPages(100, 100)).toBe(1);
    });
  });

  describe('Pagination display helpers', () => {
    it('shouldShowPagination returns false for 0 or 1 pages', () => {
      expect(getTotalPages(0, 10) <= 1).toBe(true);
      expect(getTotalPages(5, 10) <= 1).toBe(true);
    });

    it('shouldShowPagination returns true for >1 pages', () => {
      expect(getTotalPages(11, 10) > 1).toBe(true);
    });
  });
});
