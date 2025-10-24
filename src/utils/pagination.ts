/**
 * Pagination utility functions for MCP API
 * Part of MCP API Refactor - Task 2.1
 */

import { PaginationInfo } from '../types/pagination';

/**
 * Pagination constants - exported for use in tests and other modules
 */
export const PAGINATION_DEFAULTS = {
  /** Default number of items per page */
  DEFAULT_PER_PAGE: 50,
  /** Minimum number of items per page */
  MIN_PER_PAGE: 1,
  /** Maximum number of items per page */
  MAX_PER_PAGE: 100,
  /** Minimum page number */
  MIN_PAGE: 1
} as const;

/**
 * Normalize and validate pagination parameters
 * @param page - Requested page number (1-based)
 * @param perPage - Items per page
 * @returns Normalized pagination params with defaults and bounds enforced
 */
export function normalizePaginationParams(
  page?: number,
  perPage?: number
): { page: number; perPage: number } {
  return {
    page: Math.max(PAGINATION_DEFAULTS.MIN_PAGE, page || PAGINATION_DEFAULTS.MIN_PAGE),
    perPage: Math.min(
      PAGINATION_DEFAULTS.MAX_PER_PAGE,
      Math.max(PAGINATION_DEFAULTS.MIN_PER_PAGE, perPage || PAGINATION_DEFAULTS.DEFAULT_PER_PAGE)
    )
  };
}

/**
 * Format pagination information for response
 * @param total - Total number of items
 * @param page - Current page number
 * @param perPage - Items per page
 * @returns Formatted pagination info
 * @throws Error if perPage is not positive (prevents division by zero)
 */
export function formatPaginationInfo(
  total: number,
  page: number,
  perPage: number
): PaginationInfo {
  if (perPage <= 0) {
    throw new Error('perPage must be positive');
  }
  const totalPages = Math.ceil(total / perPage);
  return {
    total,
    page,
    perPage,
    totalPages,
    hasMore: page < totalPages
  };
}
