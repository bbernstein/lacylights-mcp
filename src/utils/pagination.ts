/**
 * Pagination utility functions for MCP API
 * Part of MCP API Refactor - Task 2.1
 */

import { PaginationInfo } from '../types/pagination';

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
    page: Math.max(1, page || 1),
    perPage: Math.min(100, Math.max(1, perPage || 50))
  };
}

/**
 * Format pagination information for response
 * @param total - Total number of items
 * @param page - Current page number
 * @param perPage - Items per page
 * @returns Formatted pagination info
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
