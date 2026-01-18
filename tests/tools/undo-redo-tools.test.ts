import { UndoRedoTools } from '../../src/tools/undo-redo-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';

// Mock the GraphQL client
jest.mock('../../src/services/graphql-client-simple');
const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;

describe('UndoRedoTools', () => {
  let undoRedoTools: UndoRedoTools;
  let mockGraphQLClient: jest.Mocked<LacyLightsGraphQLClient>;

  const mockOperation = {
    id: 'op-123',
    projectId: 'project-1',
    operationType: 'UPDATE',
    entityType: 'Look',
    entityId: 'look-1',
    description: 'Update look "Warm Wash"',
    sequence: 5,
    createdAt: '2025-01-17T10:00:00Z',
    isCurrent: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphQLClient = {
      undo: jest.fn(),
      redo: jest.fn(),
      getUndoRedoStatus: jest.fn(),
      getOperationHistory: jest.fn(),
      jumpToOperation: jest.fn(),
      clearOperationHistory: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    undoRedoTools = new UndoRedoTools(mockGraphQLClient);
  });

  describe('undo', () => {
    it('should successfully undo an operation', async () => {
      mockGraphQLClient.undo.mockResolvedValue({
        success: true,
        message: 'Undone: Update look "Warm Wash"',
        operation: mockOperation,
        restoredEntityId: 'look-1',
      });

      const result = await undoRedoTools.undo({ projectId: 'project-1' });

      expect(mockGraphQLClient.undo).toHaveBeenCalledWith('project-1');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Undone: Update look "Warm Wash"');
      expect(result.operation).toEqual(mockOperation);
      expect(result.restoredEntityId).toBe('look-1');
    });

    it('should return failure when nothing to undo', async () => {
      mockGraphQLClient.undo.mockResolvedValue({
        success: false,
        message: 'Nothing to undo',
        restoredEntityId: null,
        operation: null,
      });

      const result = await undoRedoTools.undo({ projectId: 'project-1' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nothing to undo');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.undo.mockRejectedValue(new Error('GraphQL error'));

      await expect(undoRedoTools.undo({ projectId: 'project-1' }))
        .rejects.toThrow('Failed to undo operation: Error: GraphQL error');
    });

    it('should require projectId', async () => {
      await expect(undoRedoTools.undo({} as any))
        .rejects.toThrow();
    });
  });

  describe('redo', () => {
    it('should successfully redo an operation', async () => {
      mockGraphQLClient.redo.mockResolvedValue({
        success: true,
        message: 'Redone: Update look "Warm Wash"',
        operation: mockOperation,
        restoredEntityId: 'look-1',
      });

      const result = await undoRedoTools.redo({ projectId: 'project-1' });

      expect(mockGraphQLClient.redo).toHaveBeenCalledWith('project-1');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Redone: Update look "Warm Wash"');
      expect(result.operation).toEqual(mockOperation);
    });

    it('should return failure when nothing to redo', async () => {
      mockGraphQLClient.redo.mockResolvedValue({
        success: false,
        message: 'Nothing to redo',
        restoredEntityId: null,
        operation: null,
      });

      const result = await undoRedoTools.redo({ projectId: 'project-1' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nothing to redo');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.redo.mockRejectedValue(new Error('GraphQL error'));

      await expect(undoRedoTools.redo({ projectId: 'project-1' }))
        .rejects.toThrow('Failed to redo operation: Error: GraphQL error');
    });

    it('should require projectId', async () => {
      await expect(undoRedoTools.redo({} as any))
        .rejects.toThrow();
    });
  });

  describe('getUndoRedoStatus', () => {
    it('should get undo/redo status', async () => {
      mockGraphQLClient.getUndoRedoStatus.mockResolvedValue({
        projectId: 'project-1',
        canUndo: true,
        canRedo: false,
        currentSequence: 5,
        totalOperations: 10,
        undoDescription: 'Update look "Warm Wash"',
        redoDescription: null,
      });

      const result = await undoRedoTools.getUndoRedoStatus({ projectId: 'project-1' });

      expect(mockGraphQLClient.getUndoRedoStatus).toHaveBeenCalledWith('project-1');
      expect(result.canUndo).toBe(true);
      expect(result.canRedo).toBe(false);
      expect(result.currentSequence).toBe(5);
      expect(result.totalOperations).toBe(10);
      expect(result.undoDescription).toBe('Update look "Warm Wash"');
      expect(result.hint).toContain('Update look "Warm Wash"');
    });

    it('should show hint when no undo available', async () => {
      mockGraphQLClient.getUndoRedoStatus.mockResolvedValue({
        projectId: 'project-1',
        canUndo: false,
        canRedo: false,
        currentSequence: 0,
        totalOperations: 0,
        undoDescription: null,
        redoDescription: null,
      });

      const result = await undoRedoTools.getUndoRedoStatus({ projectId: 'project-1' });

      expect(result.canUndo).toBe(false);
      expect(result.hint).toBe('No operations to undo.');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.getUndoRedoStatus.mockRejectedValue(new Error('GraphQL error'));

      await expect(undoRedoTools.getUndoRedoStatus({ projectId: 'project-1' }))
        .rejects.toThrow('Failed to get undo/redo status: Error: GraphQL error');
    });
  });

  describe('getOperationHistory', () => {
    const mockOperations = [
      { ...mockOperation, sequence: 1, isCurrent: false },
      { ...mockOperation, id: 'op-124', sequence: 2, isCurrent: true },
    ];

    it('should get operation history with default pagination', async () => {
      mockGraphQLClient.getOperationHistory.mockResolvedValue({
        operations: mockOperations,
        pagination: {
          total: 2,
          page: 1,
          perPage: 50,
          totalPages: 1,
          hasMore: false,
        },
        currentSequence: 2,
      });

      const result = await undoRedoTools.getOperationHistory({ projectId: 'project-1', page: 1, perPage: 50 });

      expect(mockGraphQLClient.getOperationHistory).toHaveBeenCalledWith('project-1', 1, 50);
      expect(result.operations).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.currentSequence).toBe(2);
    });

    it('should support custom pagination', async () => {
      mockGraphQLClient.getOperationHistory.mockResolvedValue({
        operations: [mockOperation],
        pagination: {
          total: 100,
          page: 2,
          perPage: 10,
          totalPages: 10,
          hasMore: true,
        },
        currentSequence: 50,
      });

      const result = await undoRedoTools.getOperationHistory({
        projectId: 'project-1',
        page: 2,
        perPage: 10,
      });

      expect(mockGraphQLClient.getOperationHistory).toHaveBeenCalledWith('project-1', 2, 10);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.perPage).toBe(10);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should show hint for empty history', async () => {
      mockGraphQLClient.getOperationHistory.mockResolvedValue({
        operations: [],
        pagination: {
          total: 0,
          page: 1,
          perPage: 50,
          totalPages: 0,
          hasMore: false,
        },
        currentSequence: 0,
      });

      const result = await undoRedoTools.getOperationHistory({ projectId: 'project-1', page: 1, perPage: 50 });

      expect(result.hint).toBe('No operations in history.');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.getOperationHistory.mockRejectedValue(new Error('GraphQL error'));

      await expect(undoRedoTools.getOperationHistory({ projectId: 'project-1', page: 1, perPage: 50 }))
        .rejects.toThrow('Failed to get operation history: Error: GraphQL error');
    });
  });

  describe('jumpToOperation', () => {
    it('should successfully jump to an operation', async () => {
      mockGraphQLClient.jumpToOperation.mockResolvedValue({
        success: true,
        message: 'Jumped to operation',
        operation: mockOperation,
        restoredEntityId: 'look-1',
      });

      const result = await undoRedoTools.jumpToOperation({
        projectId: 'project-1',
        operationId: 'op-123',
      });

      expect(mockGraphQLClient.jumpToOperation).toHaveBeenCalledWith('project-1', 'op-123');
      expect(result.success).toBe(true);
      expect(result.operation).toEqual(mockOperation);
    });

    it('should return failure for invalid operation', async () => {
      mockGraphQLClient.jumpToOperation.mockResolvedValue({
        success: false,
        message: 'Operation not found',
        restoredEntityId: null,
        operation: null,
      });

      const result = await undoRedoTools.jumpToOperation({
        projectId: 'project-1',
        operationId: 'invalid-op',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Operation not found');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.jumpToOperation.mockRejectedValue(new Error('GraphQL error'));

      await expect(undoRedoTools.jumpToOperation({
        projectId: 'project-1',
        operationId: 'op-123',
      })).rejects.toThrow('Failed to jump to operation: Error: GraphQL error');
    });

    it('should require both projectId and operationId', async () => {
      await expect(undoRedoTools.jumpToOperation({ projectId: 'project-1' } as any))
        .rejects.toThrow();
    });
  });

  describe('clearOperationHistory', () => {
    it('should successfully clear history when confirmed', async () => {
      mockGraphQLClient.clearOperationHistory.mockResolvedValue(true);

      const result = await undoRedoTools.clearOperationHistory({
        projectId: 'project-1',
        confirmClear: true,
      });

      expect(mockGraphQLClient.clearOperationHistory).toHaveBeenCalledWith('project-1', true);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Operation history cleared successfully');
    });

    it('should not clear history when not confirmed', async () => {
      const result = await undoRedoTools.clearOperationHistory({
        projectId: 'project-1',
        confirmClear: false,
      });

      expect(mockGraphQLClient.clearOperationHistory).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.message).toBe('Confirmation required');
    });

    it('should handle clear failure', async () => {
      mockGraphQLClient.clearOperationHistory.mockResolvedValue(false);

      const result = await undoRedoTools.clearOperationHistory({
        projectId: 'project-1',
        confirmClear: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to clear operation history');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.clearOperationHistory.mockRejectedValue(new Error('GraphQL error'));

      await expect(undoRedoTools.clearOperationHistory({
        projectId: 'project-1',
        confirmClear: true,
      })).rejects.toThrow('Failed to clear operation history: Error: GraphQL error');
    });
  });
});
