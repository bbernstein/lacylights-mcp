/**
 * Unit tests for pagination utility functions
 */

import {
  normalizePaginationParams,
  formatPaginationInfo,
} from '../../src/utils/pagination';

describe('Pagination Utils', () => {
  describe('normalizePaginationParams', () => {
    describe('with default values', () => {
      it('should return defaults when no parameters provided', () => {
        const result = normalizePaginationParams();
        expect(result).toEqual({ page: 1, perPage: 50 });
      });

      it('should return defaults when undefined parameters provided', () => {
        const result = normalizePaginationParams(undefined, undefined);
        expect(result).toEqual({ page: 1, perPage: 50 });
      });
    });

    describe('page parameter validation', () => {
      it('should accept valid page numbers', () => {
        expect(normalizePaginationParams(1, 50)).toEqual({
          page: 1,
          perPage: 50,
        });
        expect(normalizePaginationParams(5, 50)).toEqual({
          page: 5,
          perPage: 50,
        });
        expect(normalizePaginationParams(100, 50)).toEqual({
          page: 100,
          perPage: 50,
        });
      });

      it('should enforce minimum page of 1', () => {
        expect(normalizePaginationParams(0, 50)).toEqual({
          page: 1,
          perPage: 50,
        });
        expect(normalizePaginationParams(-1, 50)).toEqual({
          page: 1,
          perPage: 50,
        });
        expect(normalizePaginationParams(-100, 50)).toEqual({
          page: 1,
          perPage: 50,
        });
      });

      it('should handle decimal page numbers by flooring to minimum', () => {
        // Math.max will handle this correctly
        expect(normalizePaginationParams(0.5, 50)).toEqual({
          page: 1,
          perPage: 50,
        });
        expect(normalizePaginationParams(1.9, 50)).toEqual({
          page: 1.9,
          perPage: 50,
        });
      });
    });

    describe('perPage parameter validation', () => {
      it('should accept valid perPage values', () => {
        expect(normalizePaginationParams(1, 1)).toEqual({ page: 1, perPage: 1 });
        expect(normalizePaginationParams(1, 25)).toEqual({
          page: 1,
          perPage: 25,
        });
        expect(normalizePaginationParams(1, 50)).toEqual({
          page: 1,
          perPage: 50,
        });
        expect(normalizePaginationParams(1, 100)).toEqual({
          page: 1,
          perPage: 100,
        });
      });

      it('should enforce minimum perPage of 1', () => {
        expect(normalizePaginationParams(1, 0)).toEqual({ page: 1, perPage: 1 });
        expect(normalizePaginationParams(1, -1)).toEqual({
          page: 1,
          perPage: 1,
        });
        expect(normalizePaginationParams(1, -100)).toEqual({
          page: 1,
          perPage: 1,
        });
      });

      it('should enforce maximum perPage of 100', () => {
        expect(normalizePaginationParams(1, 101)).toEqual({
          page: 1,
          perPage: 100,
        });
        expect(normalizePaginationParams(1, 200)).toEqual({
          page: 1,
          perPage: 100,
        });
        expect(normalizePaginationParams(1, 1000)).toEqual({
          page: 1,
          perPage: 100,
        });
      });

      it('should handle decimal perPage values', () => {
        expect(normalizePaginationParams(1, 25.5)).toEqual({
          page: 1,
          perPage: 25.5,
        });
        expect(normalizePaginationParams(1, 99.9)).toEqual({
          page: 1,
          perPage: 99.9,
        });
      });
    });

    describe('edge cases', () => {
      it('should handle both parameters being invalid', () => {
        expect(normalizePaginationParams(-5, -10)).toEqual({
          page: 1,
          perPage: 1,
        });
        expect(normalizePaginationParams(0, 200)).toEqual({
          page: 1,
          perPage: 100,
        });
      });

      it('should handle very large numbers', () => {
        expect(normalizePaginationParams(999999, 999999)).toEqual({
          page: 999999,
          perPage: 100,
        });
      });

      it('should handle zero for both parameters', () => {
        expect(normalizePaginationParams(0, 0)).toEqual({
          page: 1,
          perPage: 1,
        });
      });

      it('should use defaults when only page is provided', () => {
        expect(normalizePaginationParams(2)).toEqual({ page: 2, perPage: 50 });
        expect(normalizePaginationParams(5)).toEqual({ page: 5, perPage: 50 });
      });

      it('should use defaults when only perPage is provided', () => {
        expect(normalizePaginationParams(undefined, 25)).toEqual({
          page: 1,
          perPage: 25,
        });
      });
    });
  });

  describe('formatPaginationInfo', () => {
    describe('basic pagination calculations', () => {
      it('should calculate correct pagination for first page', () => {
        const result = formatPaginationInfo(100, 1, 50);
        expect(result).toEqual({
          total: 100,
          page: 1,
          perPage: 50,
          totalPages: 2,
          hasMore: true,
        });
      });

      it('should calculate correct pagination for middle page', () => {
        const result = formatPaginationInfo(150, 2, 50);
        expect(result).toEqual({
          total: 150,
          page: 2,
          perPage: 50,
          totalPages: 3,
          hasMore: true,
        });
      });

      it('should calculate correct pagination for last page', () => {
        const result = formatPaginationInfo(100, 2, 50);
        expect(result).toEqual({
          total: 100,
          page: 2,
          perPage: 50,
          totalPages: 2,
          hasMore: false,
        });
      });

      it('should handle single page of results', () => {
        const result = formatPaginationInfo(25, 1, 50);
        expect(result).toEqual({
          total: 25,
          page: 1,
          perPage: 50,
          totalPages: 1,
          hasMore: false,
        });
      });
    });

    describe('edge cases with total items', () => {
      it('should handle empty result set', () => {
        const result = formatPaginationInfo(0, 1, 50);
        expect(result).toEqual({
          total: 0,
          page: 1,
          perPage: 50,
          totalPages: 0,
          hasMore: false,
        });
      });

      it('should handle exactly one item', () => {
        const result = formatPaginationInfo(1, 1, 50);
        expect(result).toEqual({
          total: 1,
          page: 1,
          perPage: 50,
          totalPages: 1,
          hasMore: false,
        });
      });

      it('should handle total equal to perPage', () => {
        const result = formatPaginationInfo(50, 1, 50);
        expect(result).toEqual({
          total: 50,
          page: 1,
          perPage: 50,
          totalPages: 1,
          hasMore: false,
        });
      });

      it('should handle total one more than perPage', () => {
        const result = formatPaginationInfo(51, 1, 50);
        expect(result).toEqual({
          total: 51,
          page: 1,
          perPage: 50,
          totalPages: 2,
          hasMore: true,
        });
      });
    });

    describe('partial last page scenarios', () => {
      it('should handle partial last page correctly', () => {
        const result = formatPaginationInfo(75, 2, 50);
        expect(result).toEqual({
          total: 75,
          page: 2,
          perPage: 50,
          totalPages: 2,
          hasMore: false,
        });
      });

      it('should calculate hasMore correctly for partial pages', () => {
        // 125 items with 50 per page = 3 pages
        // Page 1: items 1-50 (hasMore: true)
        expect(formatPaginationInfo(125, 1, 50)).toEqual({
          total: 125,
          page: 1,
          perPage: 50,
          totalPages: 3,
          hasMore: true,
        });

        // Page 2: items 51-100 (hasMore: true)
        expect(formatPaginationInfo(125, 2, 50)).toEqual({
          total: 125,
          page: 2,
          perPage: 50,
          totalPages: 3,
          hasMore: true,
        });

        // Page 3: items 101-125 (hasMore: false)
        expect(formatPaginationInfo(125, 3, 50)).toEqual({
          total: 125,
          page: 3,
          perPage: 50,
          totalPages: 3,
          hasMore: false,
        });
      });
    });

    describe('various page sizes', () => {
      it('should work with perPage of 1', () => {
        const result = formatPaginationInfo(5, 3, 1);
        expect(result).toEqual({
          total: 5,
          page: 3,
          perPage: 1,
          totalPages: 5,
          hasMore: true,
        });
      });

      it('should work with perPage of 10', () => {
        const result = formatPaginationInfo(45, 2, 10);
        expect(result).toEqual({
          total: 45,
          page: 2,
          perPage: 10,
          totalPages: 5,
          hasMore: true,
        });
      });

      it('should work with perPage of 100', () => {
        const result = formatPaginationInfo(250, 2, 100);
        expect(result).toEqual({
          total: 250,
          page: 2,
          perPage: 100,
          totalPages: 3,
          hasMore: true,
        });
      });
    });

    describe('large dataset scenarios', () => {
      it('should handle large total counts', () => {
        const result = formatPaginationInfo(10000, 50, 100);
        expect(result).toEqual({
          total: 10000,
          page: 50,
          perPage: 100,
          totalPages: 100,
          hasMore: true,
        });
      });

      it('should correctly identify last page of large dataset', () => {
        const result = formatPaginationInfo(10000, 100, 100);
        expect(result).toEqual({
          total: 10000,
          page: 100,
          perPage: 100,
          totalPages: 100,
          hasMore: false,
        });
      });

      it('should handle page beyond total pages', () => {
        // Page 200 when there are only 100 pages
        const result = formatPaginationInfo(10000, 200, 100);
        expect(result).toEqual({
          total: 10000,
          page: 200,
          perPage: 100,
          totalPages: 100,
          hasMore: false,
        });
      });
    });

    describe('real-world usage scenarios', () => {
      it('should handle typical fixtures list pagination (500 fixtures, 50 per page)', () => {
        // First page
        expect(formatPaginationInfo(500, 1, 50)).toEqual({
          total: 500,
          page: 1,
          perPage: 50,
          totalPages: 10,
          hasMore: true,
        });

        // Middle page
        expect(formatPaginationInfo(500, 5, 50)).toEqual({
          total: 500,
          page: 5,
          perPage: 50,
          totalPages: 10,
          hasMore: true,
        });

        // Last page
        expect(formatPaginationInfo(500, 10, 50)).toEqual({
          total: 500,
          page: 10,
          perPage: 50,
          totalPages: 10,
          hasMore: false,
        });
      });

      it('should handle typical scenes list pagination (100 scenes, 50 per page)', () => {
        expect(formatPaginationInfo(100, 1, 50)).toEqual({
          total: 100,
          page: 1,
          perPage: 50,
          totalPages: 2,
          hasMore: true,
        });

        expect(formatPaginationInfo(100, 2, 50)).toEqual({
          total: 100,
          page: 2,
          perPage: 50,
          totalPages: 2,
          hasMore: false,
        });
      });

      it('should handle typical cue list pagination (75 cues, 50 per page)', () => {
        expect(formatPaginationInfo(75, 1, 50)).toEqual({
          total: 75,
          page: 1,
          perPage: 50,
          totalPages: 2,
          hasMore: true,
        });

        expect(formatPaginationInfo(75, 2, 50)).toEqual({
          total: 75,
          page: 2,
          perPage: 50,
          totalPages: 2,
          hasMore: false,
        });
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work together for typical pagination flow', () => {
      // Normalize user input
      const params = normalizePaginationParams(2, 25);
      expect(params).toEqual({ page: 2, perPage: 25 });

      // Format response with actual data
      const info = formatPaginationInfo(100, params.page, params.perPage);
      expect(info).toEqual({
        total: 100,
        page: 2,
        perPage: 25,
        totalPages: 4,
        hasMore: true,
      });
    });

    it('should handle invalid input then format correctly', () => {
      // User provides invalid values
      const params = normalizePaginationParams(-5, 200);
      expect(params).toEqual({ page: 1, perPage: 100 });

      // Format with normalized values
      const info = formatPaginationInfo(1000, params.page, params.perPage);
      expect(info).toEqual({
        total: 1000,
        page: 1,
        perPage: 100,
        totalPages: 10,
        hasMore: true,
      });
    });

    it('should handle undefined input then format correctly', () => {
      // User provides no pagination params
      const params = normalizePaginationParams();
      expect(params).toEqual({ page: 1, perPage: 50 });

      // Format with defaults
      const info = formatPaginationInfo(150, params.page, params.perPage);
      expect(info).toEqual({
        total: 150,
        page: 1,
        perPage: 50,
        totalPages: 3,
        hasMore: true,
      });
    });
  });
});
