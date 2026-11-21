/**
 * Shared result builder for the bulk_delete_* tools.
 */

/** Result shape returned by the lacylights-go bulk delete mutations (BulkDeleteResult). */
export interface BulkDeleteBackendResult {
  deletedCount: number;
  deletedIds: string[];
}

/**
 * Build the standard bulk delete tool output.
 *
 * The backend returns only the IDs it actually deleted, so anything requested but not
 * in `deletedIds` is reported as `notDeletedIds`.
 *
 * Semantics:
 * - `notDeletedIds` preserves request order.
 * - Duplicate requested IDs are kept as-is (one entry per occurrence), so
 *   `summary.totalRequested` always equals `requestedIds.length`.
 * - IDs the backend returns that were never requested are ignored for `notDeletedIds`.
 * - `success` is true if at least one deletion succeeded (partial success is possible).
 *
 * @param requestedIds IDs the caller asked to delete
 * @param result BulkDeleteResult from the backend
 * @param noun Plural noun for the message, e.g. "fixtures" or "look boards"
 */
export function buildBulkDeleteResult(
  requestedIds: string[],
  result: BulkDeleteBackendResult,
  noun: string
) {
  const deleted = new Set(result.deletedIds);
  const notDeletedIds = requestedIds.filter(id => !deleted.has(id));

  return {
    success: result.deletedCount > 0,
    deletedCount: result.deletedCount,
    deletedIds: result.deletedIds,
    notDeletedIds,
    summary: {
      totalRequested: requestedIds.length,
      deletedCount: result.deletedCount,
      notDeletedCount: notDeletedIds.length,
    },
    message: notDeletedIds.length === 0
      ? `Successfully deleted ${result.deletedCount} ${noun}`
      : `Deleted ${result.deletedCount} ${noun}, ${notDeletedIds.length} not deleted`,
  };
}
