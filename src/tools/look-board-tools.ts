import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';
import { LookBoardButton } from '../types/lighting';

// ============================================================================
// Look Board Schemas
// ============================================================================

const ListLookBoardsSchema = z.object({
  projectId: z.string().describe('Project ID to list look boards from')
});

const GetLookBoardSchema = z.object({
  lookBoardId: z.string().describe('Look board ID to retrieve')
});

const CreateLookBoardSchema = z.object({
  name: z.string().describe('Look board name'),
  description: z.string().optional().describe('Look board description'),
  projectId: z.string().describe('Project ID to create look board in'),
  defaultFadeTime: z.number().optional().default(3.0).describe('Default fade time in seconds (default: 3.0)'),
  gridSize: z.number().optional().default(50).describe('Grid size for layout alignment (default: 50 pixels)'),
  canvasWidth: z.number().optional().default(2000).describe('Canvas width in pixels (default: 2000)'),
  canvasHeight: z.number().optional().default(2000).describe('Canvas height in pixels (default: 2000)')
});

const UpdateLookBoardSchema = z.object({
  lookBoardId: z.string().describe('Look board ID to update'),
  name: z.string().optional().describe('New look board name'),
  description: z.string().optional().describe('New look board description'),
  defaultFadeTime: z.number().optional().describe('New default fade time in seconds'),
  gridSize: z.number().optional().describe('New grid size for layout alignment'),
  canvasWidth: z.number().optional().describe('New canvas width in pixels'),
  canvasHeight: z.number().optional().describe('New canvas height in pixels')
});

const DeleteLookBoardSchema = z.object({
  lookBoardId: z.string().describe('Look board ID to delete'),
  confirmDelete: z.boolean().describe('Confirm deletion of look board and all its buttons (required to be true for safety)')
});

// Bulk Look Board Schemas
const BulkCreateLookBoardsSchema = z.object({
  lookBoards: z.array(z.object({
    name: z.string().describe('Look board name'),
    description: z.string().optional().describe('Look board description'),
    projectId: z.string().describe('Project ID to create look board in'),
    defaultFadeTime: z.number().optional().default(3.0).describe('Default fade time in seconds'),
    gridSize: z.number().optional().default(50).describe('Grid size for layout alignment'),
    canvasWidth: z.number().optional().default(2000).describe('Canvas width in pixels'),
    canvasHeight: z.number().optional().default(2000).describe('Canvas height in pixels')
  })).describe('Array of look boards to create')
});

const BulkUpdateLookBoardsSchema = z.object({
  lookBoards: z.array(z.object({
    lookBoardId: z.string().describe('Look board ID to update'),
    name: z.string().optional().describe('New look board name'),
    description: z.string().optional().describe('New look board description'),
    defaultFadeTime: z.number().optional().describe('New default fade time in seconds'),
    gridSize: z.number().optional().describe('New grid size for layout alignment'),
    canvasWidth: z.number().optional().describe('New canvas width in pixels'),
    canvasHeight: z.number().optional().describe('New canvas height in pixels')
  })).describe('Array of look board updates to apply')
});

const BulkDeleteLookBoardsSchema = z.object({
  lookBoardIds: z.array(z.string()).describe('Array of look board IDs to delete'),
  confirmDelete: z.boolean().describe('Confirm deletion (required to be true for safety)')
});

// ============================================================================
// Look Board Button Schemas
// ============================================================================

const AddLookToBoardSchema = z.object({
  lookBoardId: z.string().describe('Look board ID to add button to'),
  lookId: z.string().describe('Look ID for this button'),
  layoutX: z.number().min(0).describe('X position in pixels (0-canvasWidth)'),
  layoutY: z.number().min(0).describe('Y position in pixels (0-canvasHeight)'),
  width: z.number().positive().optional().default(200).describe('Button width in pixels (default: 200)'),
  height: z.number().positive().optional().default(120).describe('Button height in pixels (default: 120)'),
  color: z.string().optional().describe('Button color (hex or CSS color value)'),
  label: z.string().optional().describe('Button label/text override')
});

const UpdateLookBoardButtonSchema = z.object({
  buttonId: z.string().describe('Button ID to update'),
  layoutX: z.number().min(0).optional().describe('New X position in pixels'),
  layoutY: z.number().min(0).optional().describe('New Y position in pixels'),
  width: z.number().positive().optional().describe('New button width in pixels'),
  height: z.number().positive().optional().describe('New button height in pixels'),
  color: z.string().optional().describe('New button color'),
  label: z.string().optional().describe('New button label/text')
});

const RemoveLookFromBoardSchema = z.object({
  buttonId: z.string().describe('Button ID to remove')
});

const UpdateLookBoardButtonPositionsSchema = z.object({
  positions: z.array(z.object({
    buttonId: z.string().describe('Button ID to update'),
    layoutX: z.number().min(0).describe('New X position in pixels'),
    layoutY: z.number().min(0).describe('New Y position in pixels')
  })).describe('Array of button position updates')
});

// Bulk Button Schemas
const BulkCreateLookBoardButtonsSchema = z.object({
  buttons: z.array(z.object({
    lookBoardId: z.string().describe('Look board ID to add button to'),
    lookId: z.string().describe('Look ID for this button'),
    layoutX: z.number().min(0).describe('X position in pixels'),
    layoutY: z.number().min(0).describe('Y position in pixels'),
    width: z.number().positive().optional().default(200).describe('Button width in pixels'),
    height: z.number().positive().optional().default(120).describe('Button height in pixels'),
    color: z.string().optional().describe('Button color'),
    label: z.string().optional().describe('Button label/text')
  })).describe('Array of buttons to create')
});

const BulkUpdateLookBoardButtonsSchema = z.object({
  buttons: z.array(z.object({
    buttonId: z.string().describe('Button ID to update'),
    layoutX: z.number().min(0).optional().describe('New X position in pixels'),
    layoutY: z.number().min(0).optional().describe('New Y position in pixels'),
    width: z.number().positive().optional().describe('New button width in pixels'),
    height: z.number().positive().optional().describe('New button height in pixels'),
    color: z.string().optional().describe('New button color'),
    label: z.string().optional().describe('New button label/text')
  })).describe('Array of button updates to apply')
});

const BulkDeleteLookBoardButtonsSchema = z.object({
  buttonIds: z.array(z.string()).describe('Array of button IDs to delete'),
  confirmDelete: z.boolean().describe('Confirm deletion (required to be true for safety)')
});

// ============================================================================
// Look Board Playback Schema
// ============================================================================

const ActivateLookFromBoardSchema = z.object({
  lookBoardId: z.string().describe('Look board ID'),
  lookId: z.string().describe('Look ID to activate'),
  fadeTimeOverride: z.number().optional().describe('Optional fade time override in seconds (uses board default if not provided)')
});

// ============================================================================
// Look Board with Buttons Schema (Define entire board in one command)
// ============================================================================

const CreateLookBoardWithButtonsSchema = z.object({
  name: z.string().describe('Look board name'),
  description: z.string().optional().describe('Look board description'),
  projectId: z.string().describe('Project ID to create look board in'),
  defaultFadeTime: z.number().optional().default(3.0).describe('Default fade time in seconds'),
  gridSize: z.number().optional().default(50).describe('Grid size for layout alignment'),
  canvasWidth: z.number().optional().default(2000).describe('Canvas width in pixels'),
  canvasHeight: z.number().optional().default(2000).describe('Canvas height in pixels'),
  buttons: z.array(z.object({
    lookId: z.string().describe('Look ID for this button'),
    layoutX: z.number().min(0).describe('X position in pixels'),
    layoutY: z.number().min(0).describe('Y position in pixels'),
    width: z.number().positive().optional().default(200).describe('Button width in pixels'),
    height: z.number().positive().optional().default(120).describe('Button height in pixels'),
    color: z.string().optional().describe('Button color'),
    label: z.string().optional().describe('Button label/text')
  })).optional().describe('Optional array of buttons to create with the board')
});

// ============================================================================
// Look Board Tools Class
// ============================================================================

export class LookBoardTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  // ------------------------------------------------------------------------
  // Look Board CRUD Operations
  // ------------------------------------------------------------------------

  async listLookBoards(args: z.infer<typeof ListLookBoardsSchema>) {
    const { projectId } = ListLookBoardsSchema.parse(args);

    try {
      const lookBoards = await this.graphqlClient.listLookBoards(projectId);

      return {
        success: true,
        lookBoards: lookBoards.map(board => ({
          id: board.id,
          name: board.name,
          description: board.description,
          defaultFadeTime: board.defaultFadeTime,
          gridSize: board.gridSize,
          canvasWidth: board.canvasWidth,
          canvasHeight: board.canvasHeight,
          buttonCount: board.buttons?.length || 0,
          createdAt: board.createdAt,
          updatedAt: board.updatedAt
        })),
        summary: {
          totalBoards: lookBoards.length,
          projectId
        },
        message: `Found ${lookBoards.length} look boards in project`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list look boards: ${message}`);
    }
  }

  async getLookBoard(args: z.infer<typeof GetLookBoardSchema>) {
    const { lookBoardId } = GetLookBoardSchema.parse(args);

    try {
      const board = await this.graphqlClient.getLookBoard(lookBoardId);

      if (!board) {
        throw new Error(`Look board with ID ${lookBoardId} not found`);
      }

      return {
        success: true,
        lookBoard: {
          id: board.id,
          name: board.name,
          description: board.description,
          defaultFadeTime: board.defaultFadeTime,
          gridSize: board.gridSize,
          canvasWidth: board.canvasWidth,
          canvasHeight: board.canvasHeight,
          createdAt: board.createdAt,
          updatedAt: board.updatedAt,
          buttons: board.buttons.map(button => ({
            id: button.id,
            lookId: button.look.id,
            lookName: button.look.name,
            layoutX: button.layoutX,
            layoutY: button.layoutY,
            width: button.width,
            height: button.height,
            color: button.color,
            label: button.label,
            createdAt: button.createdAt,
            updatedAt: button.updatedAt
          }))
        },
        message: `Retrieved look board "${board.name}" with ${board.buttons.length} buttons`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get look board: ${message}`);
    }
  }

  async createLookBoard(args: z.input<typeof CreateLookBoardSchema>) {
    const { name, description, projectId, defaultFadeTime, gridSize, canvasWidth, canvasHeight } =
      CreateLookBoardSchema.parse(args);

    try {
      const board = await this.graphqlClient.createLookBoard({
        name,
        description,
        projectId,
        defaultFadeTime,
        gridSize,
        canvasWidth,
        canvasHeight
      });

      return {
        success: true,
        lookBoard: {
          id: board.id,
          name: board.name,
          description: board.description,
          defaultFadeTime: board.defaultFadeTime,
          gridSize: board.gridSize,
          canvasWidth: board.canvasWidth,
          canvasHeight: board.canvasHeight,
          createdAt: board.createdAt
        },
        message: `Successfully created look board "${name}"`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create look board: ${message}`);
    }
  }

  async updateLookBoard(args: z.infer<typeof UpdateLookBoardSchema>) {
    const { lookBoardId, ...updates } = UpdateLookBoardSchema.parse(args);

    try {
      const board = await this.graphqlClient.updateLookBoard(lookBoardId, updates);

      return {
        success: true,
        lookBoard: {
          id: board.id,
          name: board.name,
          description: board.description,
          defaultFadeTime: board.defaultFadeTime,
          gridSize: board.gridSize,
          canvasWidth: board.canvasWidth,
          canvasHeight: board.canvasHeight,
          updatedAt: board.updatedAt
        },
        message: `Successfully updated look board "${board.name}"`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update look board: ${message}`);
    }
  }

  async deleteLookBoard(args: z.infer<typeof DeleteLookBoardSchema>) {
    const { lookBoardId, confirmDelete } = DeleteLookBoardSchema.parse(args);

    if (!confirmDelete) {
      throw new Error('confirmDelete must be true to delete a look board');
    }

    try {
      await this.graphqlClient.deleteLookBoard(lookBoardId);

      return {
        success: true,
        deletedLookBoardId: lookBoardId,
        message: 'Successfully deleted look board and all its buttons'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete look board: ${message}`);
    }
  }

  // ------------------------------------------------------------------------
  // Bulk Look Board Operations
  // ------------------------------------------------------------------------

  async bulkCreateLookBoards(args: z.input<typeof BulkCreateLookBoardsSchema>) {
    const { lookBoards } = BulkCreateLookBoardsSchema.parse(args);

    if (lookBoards.length === 0) {
      throw new Error('No look boards provided for bulk creation');
    }

    try {
      const createdBoards = await this.graphqlClient.bulkCreateLookBoards(lookBoards);

      return {
        success: true,
        lookBoards: createdBoards.map(board => ({
          id: board.id,
          name: board.name,
          description: board.description,
          projectId: board.project.id,
          defaultFadeTime: board.defaultFadeTime,
          canvasWidth: board.canvasWidth,
          canvasHeight: board.canvasHeight,
          createdAt: board.createdAt
        })),
        summary: {
          totalCreated: createdBoards.length,
          projectIds: [...new Set(createdBoards.map(b => b.project.id))]
        },
        message: `Successfully created ${createdBoards.length} look boards`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bulk create look boards: ${message}`);
    }
  }

  async bulkUpdateLookBoards(args: z.infer<typeof BulkUpdateLookBoardsSchema>) {
    const { lookBoards } = BulkUpdateLookBoardsSchema.parse(args);

    if (lookBoards.length === 0) {
      throw new Error('No look boards provided for bulk update');
    }

    try {
      const updatedBoards = await this.graphqlClient.bulkUpdateLookBoards(lookBoards);

      return {
        success: true,
        lookBoards: updatedBoards.map(board => ({
          id: board.id,
          name: board.name,
          description: board.description,
          defaultFadeTime: board.defaultFadeTime,
          canvasWidth: board.canvasWidth,
          canvasHeight: board.canvasHeight,
          updatedAt: board.updatedAt
        })),
        summary: {
          totalUpdated: updatedBoards.length
        },
        message: `Successfully updated ${updatedBoards.length} look boards`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bulk update look boards: ${message}`);
    }
  }

  async bulkDeleteLookBoards(args: z.infer<typeof BulkDeleteLookBoardsSchema>) {
    const { lookBoardIds, confirmDelete } = BulkDeleteLookBoardsSchema.parse(args);

    if (lookBoardIds.length === 0) {
      throw new Error('No look board IDs provided for bulk deletion');
    }

    if (!confirmDelete) {
      throw new Error('confirmDelete must be true to delete look boards');
    }

    try {
      const result = await this.graphqlClient.bulkDeleteLookBoards(lookBoardIds);

      // Note: 'success' is true if at least one deletion succeeded, even if some deletions failed.
      // Partial successes are possible; see 'deletedCount' and 'failedIds' for details.
      return {
        success: result.successCount > 0,
        deletedCount: result.successCount,
        failedIds: result.failedIds,
        summary: {
          totalRequested: lookBoardIds.length,
          successCount: result.successCount,
          failureCount: result.failedIds.length
        },
        message: `Successfully deleted ${result.successCount} look boards${result.failedIds.length > 0 ? `, ${result.failedIds.length} failed` : ''}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bulk delete look boards: ${message}`);
    }
  }

  // ------------------------------------------------------------------------
  // Look Board Button Operations
  // ------------------------------------------------------------------------

  async addLookToBoard(args: z.input<typeof AddLookToBoardSchema>) {
    const { lookBoardId, lookId, layoutX, layoutY, width, height, color, label } =
      AddLookToBoardSchema.parse(args);

    try {
      const button = await this.graphqlClient.addLookToBoard({
        lookBoardId,
        lookId,
        layoutX,
        layoutY,
        width,
        height,
        color,
        label
      });

      return {
        success: true,
        button: {
          id: button.id,
          lookId: button.look.id,
          lookName: button.look.name,
          layoutX: button.layoutX,
          layoutY: button.layoutY,
          width: button.width,
          height: button.height,
          color: button.color,
          label: button.label,
          createdAt: button.createdAt
        },
        message: `Successfully added look "${button.look.name}" to board at position (${layoutX}, ${layoutY})`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to add look to board: ${message}`);
    }
  }

  async updateLookBoardButton(args: z.infer<typeof UpdateLookBoardButtonSchema>) {
    const { buttonId, ...updates } = UpdateLookBoardButtonSchema.parse(args);

    try {
      const button = await this.graphqlClient.updateLookBoardButton(buttonId, updates);

      return {
        success: true,
        button: {
          id: button.id,
          lookId: button.look.id,
          lookName: button.look.name,
          layoutX: button.layoutX,
          layoutY: button.layoutY,
          width: button.width,
          height: button.height,
          color: button.color,
          label: button.label,
          updatedAt: button.updatedAt
        },
        message: `Successfully updated button for look "${button.look.name}"`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update look board button: ${message}`);
    }
  }

  async removeLookFromBoard(args: z.infer<typeof RemoveLookFromBoardSchema>) {
    const { buttonId } = RemoveLookFromBoardSchema.parse(args);

    try {
      await this.graphqlClient.removeLookFromBoard(buttonId);

      return {
        success: true,
        deletedButtonId: buttonId,
        message: 'Successfully removed button from board'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to remove look from board: ${message}`);
    }
  }

  async updateLookBoardButtonPositions(args: z.infer<typeof UpdateLookBoardButtonPositionsSchema>) {
    const { positions } = UpdateLookBoardButtonPositionsSchema.parse(args);

    if (positions.length === 0) {
      throw new Error('No button positions provided for update');
    }

    try {
      await this.graphqlClient.updateLookBoardButtonPositions(positions);

      return {
        success: true,
        updatedCount: positions.length,
        message: `Successfully updated positions for ${positions.length} buttons`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update button positions: ${message}`);
    }
  }

  // ------------------------------------------------------------------------
  // Bulk Button Operations
  // ------------------------------------------------------------------------

  async bulkCreateLookBoardButtons(args: z.input<typeof BulkCreateLookBoardButtonsSchema>) {
    const { buttons } = BulkCreateLookBoardButtonsSchema.parse(args);

    if (buttons.length === 0) {
      throw new Error('No buttons provided for bulk creation');
    }

    try {
      const createdButtons = await this.graphqlClient.bulkCreateLookBoardButtons(buttons);

      return {
        success: true,
        buttons: createdButtons.map(button => ({
          id: button.id,
          lookBoardId: button.lookBoard.id,
          lookId: button.look.id,
          lookName: button.look.name,
          layoutX: button.layoutX,
          layoutY: button.layoutY,
          width: button.width,
          height: button.height,
          color: button.color,
          label: button.label,
          createdAt: button.createdAt
        })),
        summary: {
          totalCreated: createdButtons.length,
          boardIds: [...new Set(createdButtons.map(b => b.lookBoard.id))]
        },
        message: `Successfully created ${createdButtons.length} buttons`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bulk create buttons: ${message}`);
    }
  }

  async bulkUpdateLookBoardButtons(args: z.infer<typeof BulkUpdateLookBoardButtonsSchema>) {
    const { buttons } = BulkUpdateLookBoardButtonsSchema.parse(args);

    if (buttons.length === 0) {
      throw new Error('No buttons provided for bulk update');
    }

    try {
      const updatedButtons = await this.graphqlClient.bulkUpdateLookBoardButtons(buttons);

      return {
        success: true,
        buttons: updatedButtons.map(button => ({
          id: button.id,
          lookId: button.look.id,
          lookName: button.look.name,
          layoutX: button.layoutX,
          layoutY: button.layoutY,
          width: button.width,
          height: button.height,
          color: button.color,
          label: button.label,
          updatedAt: button.updatedAt
        })),
        summary: {
          totalUpdated: updatedButtons.length
        },
        message: `Successfully updated ${updatedButtons.length} buttons`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bulk update buttons: ${message}`);
    }
  }

  async bulkDeleteLookBoardButtons(args: z.infer<typeof BulkDeleteLookBoardButtonsSchema>) {
    const { buttonIds, confirmDelete } = BulkDeleteLookBoardButtonsSchema.parse(args);

    if (buttonIds.length === 0) {
      throw new Error('No button IDs provided for bulk deletion');
    }

    if (!confirmDelete) {
      throw new Error('confirmDelete must be true to delete buttons');
    }

    try {
      const result = await this.graphqlClient.bulkDeleteLookBoardButtons(buttonIds);

      // Note: 'success' is true if at least one deletion succeeded, even if some deletions failed.
      // Partial successes are possible; see 'deletedCount' and 'failedIds' for details.
      return {
        success: result.successCount > 0,
        deletedCount: result.successCount,
        failedIds: result.failedIds,
        summary: {
          totalRequested: buttonIds.length,
          successCount: result.successCount,
          failureCount: result.failedIds.length
        },
        message: `Successfully deleted ${result.successCount} buttons${result.failedIds.length > 0 ? `, ${result.failedIds.length} failed` : ''}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bulk delete buttons: ${message}`);
    }
  }

  // ------------------------------------------------------------------------
  // Look Board Playback
  // ------------------------------------------------------------------------

  async activateLookFromBoard(args: z.infer<typeof ActivateLookFromBoardSchema>) {
    const { lookBoardId, lookId, fadeTimeOverride } = ActivateLookFromBoardSchema.parse(args);

    try {
      await this.graphqlClient.activateLookFromBoard(lookBoardId, lookId, fadeTimeOverride);

      return {
        success: true,
        message: `Successfully activated look from board${fadeTimeOverride ? ` with ${fadeTimeOverride}s fade` : ' with board default fade time'}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to activate look from board: ${message}`);
    }
  }

  // ------------------------------------------------------------------------
  // Composite Operation: Create Board with Buttons
  // ------------------------------------------------------------------------

  async createLookBoardWithButtons(args: z.input<typeof CreateLookBoardWithButtonsSchema>) {
    const { name, description, projectId, defaultFadeTime, gridSize, canvasWidth, canvasHeight, buttons } =
      CreateLookBoardWithButtonsSchema.parse(args);

    try {
      // First create the board
      const board = await this.graphqlClient.createLookBoard({
        name,
        description,
        projectId,
        defaultFadeTime,
        gridSize,
        canvasWidth,
        canvasHeight
      });

      let createdButtons: LookBoardButton[] = [];

      // Then create buttons if provided
      if (buttons && buttons.length > 0) {
        const buttonInputs = buttons.map(btn => ({
          lookBoardId: board.id,
          lookId: btn.lookId,
          layoutX: btn.layoutX,
          layoutY: btn.layoutY,
          width: btn.width,
          height: btn.height,
          color: btn.color,
          label: btn.label
        }));

        createdButtons = await this.graphqlClient.bulkCreateLookBoardButtons(buttonInputs);
      }

      return {
        success: true,
        lookBoard: {
          id: board.id,
          name: board.name,
          description: board.description,
          defaultFadeTime: board.defaultFadeTime,
          gridSize: board.gridSize,
          canvasWidth: board.canvasWidth,
          canvasHeight: board.canvasHeight,
          createdAt: board.createdAt,
          buttonCount: createdButtons.length
        },
        buttons: createdButtons.map(button => ({
          id: button.id,
          lookId: button.look.id,
          lookName: button.look.name,
          layoutX: button.layoutX,
          layoutY: button.layoutY,
          width: button.width,
          height: button.height,
          color: button.color,
          label: button.label
        })),
        summary: {
          boardCreated: true,
          buttonsCreated: createdButtons.length
        },
        message: `Successfully created look board "${name}" with ${createdButtons.length} buttons`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create look board with buttons: ${message}`);
    }
  }
}
