/**
 * Pagination types for MCP API
 *
 * These types provide a consistent pagination interface across all MCP tools.
 */

/**
 * Parameters for pagination
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  perPage?: number;
}

/**
 * Pagination information returned in responses
 */
export interface PaginationInfo {
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  perPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages after this one */
  hasMore: boolean;
}

/**
 * Generic paginated response structure
 */
export interface PaginatedResponse<T> {
  /** Items for the current page */
  items: T[];
  /** Pagination metadata */
  pagination: PaginationInfo;
}
