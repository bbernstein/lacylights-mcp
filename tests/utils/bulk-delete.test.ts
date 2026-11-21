import { buildBulkDeleteResult } from '../../src/utils/bulk-delete';

describe('buildBulkDeleteResult', () => {
  it('reports full success', () => {
    const r = buildBulkDeleteResult(['a', 'b'], { deletedCount: 2, deletedIds: ['a', 'b'] }, 'looks');
    expect(r).toEqual({
      success: true,
      deletedCount: 2,
      deletedIds: ['a', 'b'],
      notDeletedIds: [],
      summary: { totalRequested: 2, deletedCount: 2, notDeletedCount: 0 },
      message: 'Successfully deleted 2 looks',
    });
  });

  it('reports partial success with notDeletedIds in request order', () => {
    const r = buildBulkDeleteResult(['c', 'a', 'b'], { deletedCount: 1, deletedIds: ['a'] }, 'cues');
    expect(r.success).toBe(true);
    expect(r.notDeletedIds).toEqual(['c', 'b']);
    expect(r.summary).toEqual({ totalRequested: 3, deletedCount: 1, notDeletedCount: 2 });
    expect(r.message).toBe('Deleted 1 cues, 2 not deleted');
  });

  it('reports failure when nothing was deleted', () => {
    const r = buildBulkDeleteResult(['a'], { deletedCount: 0, deletedIds: [] }, 'fixtures');
    expect(r.success).toBe(false);
    expect(r.notDeletedIds).toEqual(['a']);
  });

  it('keeps duplicate requested IDs, one entry per occurrence', () => {
    const r = buildBulkDeleteResult(['a', 'b', 'a', 'b'], { deletedCount: 1, deletedIds: ['a'] }, 'looks');
    expect(r.notDeletedIds).toEqual(['b', 'b']);
    expect(r.summary.totalRequested).toBe(4);
    expect(r.summary.notDeletedCount).toBe(2);
  });

  it('ignores IDs returned by the backend that were not requested', () => {
    const r = buildBulkDeleteResult(['a', 'b'], { deletedCount: 2, deletedIds: ['a', 'zzz'] }, 'projects');
    expect(r.deletedIds).toEqual(['a', 'zzz']);
    expect(r.notDeletedIds).toEqual(['b']);
  });
});
