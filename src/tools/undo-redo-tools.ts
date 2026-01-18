import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';

// Input schemas
const UndoSchema = z.object({
  projectId: z.string().describe('Project ID to undo operation in'),
});

const RedoSchema = z.object({
  projectId: z.string().describe('Project ID to redo operation in'),
});

const GetUndoRedoStatusSchema = z.object({
  projectId: z.string().describe('Project ID to get status for'),
});

const GetOperationHistorySchema = z.object({
  projectId: z.string().describe('Project ID to get history for'),
  page: z.number().int().min(1).default(1).describe('Page number (1-based)'),
  perPage: z.number().int().min(1).max(100).default(50).describe('Number of operations per page'),
});

const JumpToOperationSchema = z.object({
  projectId: z.string().describe('Project ID'),
  operationId: z.string().describe('Operation ID to jump to'),
});

const ClearOperationHistorySchema = z.object({
  projectId: z.string().describe('Project ID to clear history for'),
  confirmClear: z.boolean().describe('Must be true to confirm clearing history'),
});

/**
 * UndoRedoTools provides MCP tools for managing undo/redo operations.
 *
 * These tools allow AI assistants to:
 * - Undo the last operation in a project
 * - Redo a previously undone operation
 * - View the operation history
 * - Jump to a specific point in history
 * - Clear the operation history
 */
export class UndoRedoTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  /**
   * Undo the last operation for a project.
   */
  async undo(args: z.infer<typeof UndoSchema>) {
    const { projectId } = UndoSchema.parse(args);

    try {
      const result = await this.graphqlClient.undo(projectId);

      if (result.success) {
        return {
          success: true,
          message: result.message || 'Operation undone successfully',
          operation: result.operation,
          restoredEntityId: result.restoredEntityId,
          hint: 'Use get_undo_redo_status to see if more operations can be undone.',
        };
      } else {
        return {
          success: false,
          message: result.message || 'Nothing to undo',
          hint: 'There may be no operations to undo in this project.',
        };
      }
    } catch (error) {
      throw new Error(`Failed to undo operation: ${error}`);
    }
  }

  /**
   * Redo the last undone operation for a project.
   */
  async redo(args: z.infer<typeof RedoSchema>) {
    const { projectId } = RedoSchema.parse(args);

    try {
      const result = await this.graphqlClient.redo(projectId);

      if (result.success) {
        return {
          success: true,
          message: result.message || 'Operation redone successfully',
          operation: result.operation,
          restoredEntityId: result.restoredEntityId,
          hint: 'Use get_undo_redo_status to see if more operations can be redone.',
        };
      } else {
        return {
          success: false,
          message: result.message || 'Nothing to redo',
          hint: 'There may be no undone operations to redo in this project.',
        };
      }
    } catch (error) {
      throw new Error(`Failed to redo operation: ${error}`);
    }
  }

  /**
   * Get the current undo/redo status for a project.
   */
  async getUndoRedoStatus(args: z.infer<typeof GetUndoRedoStatusSchema>) {
    const { projectId } = GetUndoRedoStatusSchema.parse(args);

    try {
      const status = await this.graphqlClient.getUndoRedoStatus(projectId);

      return {
        projectId: status.projectId,
        canUndo: status.canUndo,
        canRedo: status.canRedo,
        currentSequence: status.currentSequence,
        totalOperations: status.totalOperations,
        undoDescription: status.undoDescription,
        redoDescription: status.redoDescription,
        hint: status.canUndo
          ? `You can undo: "${status.undoDescription}"`
          : 'No operations to undo.',
      };
    } catch (error) {
      throw new Error(`Failed to get undo/redo status: ${error}`);
    }
  }

  /**
   * Get the operation history for a project with pagination.
   */
  async getOperationHistory(args: z.infer<typeof GetOperationHistorySchema>) {
    const { projectId, page, perPage } = GetOperationHistorySchema.parse(args);

    try {
      const history = await this.graphqlClient.getOperationHistory(projectId, page, perPage);

      return {
        operations: history.operations.map((op) => ({
          id: op.id,
          description: op.description,
          operationType: op.operationType,
          entityType: op.entityType,
          sequence: op.sequence,
          createdAt: op.createdAt,
          isCurrent: op.isCurrent,
        })),
        pagination: history.pagination,
        currentSequence: history.currentSequence,
        hint: history.operations.length > 0
          ? `Showing ${history.operations.length} operations. Current state is at sequence ${history.currentSequence}.`
          : 'No operations in history.',
      };
    } catch (error) {
      throw new Error(`Failed to get operation history: ${error}`);
    }
  }

  /**
   * Jump to a specific operation in the history.
   * This will undo or redo multiple operations to reach the target state.
   */
  async jumpToOperation(args: z.infer<typeof JumpToOperationSchema>) {
    const { projectId, operationId } = JumpToOperationSchema.parse(args);

    try {
      const result = await this.graphqlClient.jumpToOperation(projectId, operationId);

      if (result.success) {
        return {
          success: true,
          message: result.message || 'Jumped to operation successfully',
          operation: result.operation,
          restoredEntityId: result.restoredEntityId,
          hint: 'The project state has been restored to this point in history.',
        };
      } else {
        return {
          success: false,
          message: result.message || 'Failed to jump to operation',
          hint: 'The operation may not exist or the jump failed.',
        };
      }
    } catch (error) {
      throw new Error(`Failed to jump to operation: ${error}`);
    }
  }

  /**
   * Clear the operation history for a project.
   * This is a destructive operation and cannot be undone.
   */
  async clearOperationHistory(args: z.infer<typeof ClearOperationHistorySchema>) {
    const { projectId, confirmClear } = ClearOperationHistorySchema.parse(args);

    if (!confirmClear) {
      throw new Error('Confirmation required to clear operation history. Set confirmClear to true to proceed.');
    }

    try {
      const success = await this.graphqlClient.clearOperationHistory(projectId, confirmClear);

      return {
        success,
        message: success
          ? 'Operation history cleared successfully'
          : 'Failed to clear operation history',
        hint: success
          ? 'All undo/redo history for this project has been removed.'
          : 'The clear operation failed.',
      };
    } catch (error) {
      throw new Error(`Failed to clear operation history: ${error}`);
    }
  }
}
