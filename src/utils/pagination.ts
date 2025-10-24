/**
 * Pagination utility functions for MCP API
 *
 * These utilities help ensure consistent pagination behavior across all MCP tools.
 */

import { PaginationInfo } from '../types/pagination';

/**
 * Normalizes pagination parameters to safe, valid values.
 *
 * Enforces the following constraints:
 * - page: Minimum 1 (defaults to 1 if not provided)
 * - perPage: Between 1 and 100 (defaults to 50 if not provided)
 *
 * @param page - The requested page number (1-indexed)
 * @param perPage - The requested items per page
 * @returns Normalized pagination parameters with safe values
 *
 * @example
 * ```typescript
 * // Basic usage
 * normalizePaginationParams(2, 25); // { page: 2, perPage: 25 }
 *
 * // With undefined values
 * normalizePaginationParams(); // { page: 1, perPage: 50 }
 *
 * // Edge cases
 * normalizePaginationParams(0, 200); // { page: 1, perPage: 100 }
 * normalizePaginationParams(-5, -10); // { page: 1, perPage: 1 }
 * ```
 */
export function normalizePaginationParams(
  page?: number,
  perPage?: number
): { page: number; perPage: number } {
  return {
    page: Math.max(1, page ?? 1),
    perPage: Math.min(100, Math.max(1, perPage ?? 50))
  };
}

/**
 * Formats pagination information for responses.
 *
 * Calculates totalPages and hasMore based on the total count and page size.
 *
 * @param total - Total number of items across all pages
 * @param page - Current page number (1-indexed)
 * @param perPage - Number of items per page
 * @returns Complete pagination information object
 *
 * @example
 * ```typescript
 * // First page of many
 * formatPaginationInfo(100, 1, 50);
 * // { total: 100, page: 1, perPage: 50, totalPages: 2, hasMore: true }
 *
 * // Last page
 * formatPaginationInfo(100, 2, 50);
 * // { total: 100, page: 2, perPage: 50, totalPages: 2, hasMore: false }
 *
 * // Partial last page
 * formatPaginationInfo(75, 2, 50);
 * // { total: 75, page: 2, perPage: 50, totalPages: 2, hasMore: false }
 *
 * // Empty result set
 * formatPaginationInfo(0, 1, 50);
 * // { total: 0, page: 1, perPage: 50, totalPages: 0, hasMore: false }
 * ```
 */
export function formatPaginationInfo(
  total: number,
  page: number,
  perPage: number
): PaginationInfo {
  const totalPages = Math.ceil(total / perPage);
  return {
    total,
    page,
    perPage,
    totalPages,
    hasMore: page < totalPages
  };
}
