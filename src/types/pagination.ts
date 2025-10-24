/**
 * Pagination types for MCP API
 * Part of MCP API Refactor - Task 2.1
 */

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginationInfo {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}
