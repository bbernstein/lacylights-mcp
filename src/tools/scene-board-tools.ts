import { z } from 'zod';
import { LacyLightsGraphQLClient } from '../services/graphql-client-simple';
import { SceneBoardButton } from '../types/lighting';

// ============================================================================
// Scene Board Schemas
// ============================================================================

const ListSceneBoardsSchema = z.object({
  projectId: z.string().describe('Project ID to list scene boards from')
});

const GetSceneBoardSchema = z.object({
  sceneBoardId: z.string().describe('Scene board ID to retrieve')
});

const CreateSceneBoardSchema = z.object({
  name: z.string().describe('Scene board name'),
  description: z.string().optional().describe('Scene board description'),
  projectId: z.string().describe('Project ID to create scene board in'),
  defaultFadeTime: z.number().optional().default(3.0).describe('Default fade time in seconds (default: 3.0)'),
  gridSize: z.number().optional().default(50).describe('Grid size for layout alignment (default: 50 pixels)'),
  canvasWidth: z.number().optional().default(2000).describe('Canvas width in pixels (default: 2000)'),
  canvasHeight: z.number().optional().default(2000).describe('Canvas height in pixels (default: 2000)')
});

const UpdateSceneBoardSchema = z.object({
  sceneBoardId: z.string().describe('Scene board ID to update'),
  name: z.string().optional().describe('New scene board name'),
  description: z.string().optional().describe('New scene board description'),
  defaultFadeTime: z.number().optional().describe('New default fade time in seconds'),
  gridSize: z.number().optional().describe('New grid size for layout alignment'),
  canvasWidth: z.number().optional().describe('New canvas width in pixels'),
  canvasHeight: z.number().optional().describe('New canvas height in pixels')
});

const DeleteSceneBoardSchema = z.object({
  sceneBoardId: z.string().describe('Scene board ID to delete'),
  confirmDelete: z.boolean().describe('Confirm deletion of scene board and all its buttons (required to be true for safety)')
});

// Bulk Scene Board Schemas
const BulkCreateSceneBoardsSchema = z.object({
  sceneBoards: z.array(z.object({
    name: z.string().describe('Scene board name'),
    description: z.string().optional().describe('Scene board description'),
    projectId: z.string().describe('Project ID to create scene board in'),
    defaultFadeTime: z.number().optional().default(3.0).describe('Default fade time in seconds'),
    gridSize: z.number().optional().default(50).describe('Grid size for layout alignment'),
    canvasWidth: z.number().optional().default(2000).describe('Canvas width in pixels'),
    canvasHeight: z.number().optional().default(2000).describe('Canvas height in pixels')
  })).describe('Array of scene boards to create')
});

const BulkUpdateSceneBoardsSchema = z.object({
  sceneBoards: z.array(z.object({
    sceneBoardId: z.string().describe('Scene board ID to update'),
    name: z.string().optional().describe('New scene board name'),
    description: z.string().optional().describe('New scene board description'),
    defaultFadeTime: z.number().optional().describe('New default fade time in seconds'),
    gridSize: z.number().optional().describe('New grid size for layout alignment'),
    canvasWidth: z.number().optional().describe('New canvas width in pixels'),
    canvasHeight: z.number().optional().describe('New canvas height in pixels')
  })).describe('Array of scene board updates to apply')
});

const BulkDeleteSceneBoardsSchema = z.object({
  sceneBoardIds: z.array(z.string()).describe('Array of scene board IDs to delete'),
  confirmDelete: z.boolean().describe('Confirm deletion (required to be true for safety)')
});

// ============================================================================
// Scene Board Button Schemas
// ============================================================================

const AddSceneToBoardSchema = z.object({
  sceneBoardId: z.string().describe('Scene board ID to add button to'),
  sceneId: z.string().describe('Scene ID for this button'),
  layoutX: z.number().min(0).describe('X position in pixels (0-canvasWidth)'),
  layoutY: z.number().min(0).describe('Y position in pixels (0-canvasHeight)'),
  width: z.number().positive().optional().default(200).describe('Button width in pixels (default: 200)'),
  height: z.number().positive().optional().default(120).describe('Button height in pixels (default: 120)'),
  color: z.string().optional().describe('Button color (hex or CSS color value)'),
  label: z.string().optional().describe('Button label/text override')
});

const UpdateSceneBoardButtonSchema = z.object({
  buttonId: z.string().describe('Button ID to update'),
  layoutX: z.number().min(0).optional().describe('New X position in pixels'),
  layoutY: z.number().min(0).optional().describe('New Y position in pixels'),
  width: z.number().positive().optional().describe('New button width in pixels'),
  height: z.number().positive().optional().describe('New button height in pixels'),
  color: z.string().optional().describe('New button color'),
  label: z.string().optional().describe('New button label/text')
});

const RemoveSceneFromBoardSchema = z.object({
  buttonId: z.string().describe('Button ID to remove')
});

const UpdateSceneBoardButtonPositionsSchema = z.object({
  positions: z.array(z.object({
    buttonId: z.string().describe('Button ID to update'),
    layoutX: z.number().min(0).describe('New X position in pixels'),
    layoutY: z.number().min(0).describe('New Y position in pixels')
  })).describe('Array of button position updates')
});

// Bulk Button Schemas
const BulkCreateSceneBoardButtonsSchema = z.object({
  buttons: z.array(z.object({
    sceneBoardId: z.string().describe('Scene board ID to add button to'),
    sceneId: z.string().describe('Scene ID for this button'),
    layoutX: z.number().min(0).describe('X position in pixels'),
    layoutY: z.number().min(0).describe('Y position in pixels'),
    width: z.number().positive().optional().default(200).describe('Button width in pixels'),
    height: z.number().positive().optional().default(120).describe('Button height in pixels'),
    color: z.string().optional().describe('Button color'),
    label: z.string().optional().describe('Button label/text')
  })).describe('Array of buttons to create')
});

const BulkUpdateSceneBoardButtonsSchema = z.object({
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

const BulkDeleteSceneBoardButtonsSchema = z.object({
  buttonIds: z.array(z.string()).describe('Array of button IDs to delete'),
  confirmDelete: z.boolean().describe('Confirm deletion (required to be true for safety)')
});

// ============================================================================
// Scene Board Playback Schema
// ============================================================================

const ActivateSceneFromBoardSchema = z.object({
  sceneBoardId: z.string().describe('Scene board ID'),
  sceneId: z.string().describe('Scene ID to activate'),
  fadeTimeOverride: z.number().optional().describe('Optional fade time override in seconds (uses board default if not provided)')
});

// ============================================================================
// Scene Board with Buttons Schema (Define entire board in one command)
// ============================================================================

const CreateSceneBoardWithButtonsSchema = z.object({
  name: z.string().describe('Scene board name'),
  description: z.string().optional().describe('Scene board description'),
  projectId: z.string().describe('Project ID to create scene board in'),
  defaultFadeTime: z.number().optional().default(3.0).describe('Default fade time in seconds'),
  gridSize: z.number().optional().default(50).describe('Grid size for layout alignment'),
  canvasWidth: z.number().optional().default(2000).describe('Canvas width in pixels'),
  canvasHeight: z.number().optional().default(2000).describe('Canvas height in pixels'),
  buttons: z.array(z.object({
    sceneId: z.string().describe('Scene ID for this button'),
    layoutX: z.number().min(0).describe('X position in pixels'),
    layoutY: z.number().min(0).describe('Y position in pixels'),
    width: z.number().positive().optional().default(200).describe('Button width in pixels'),
    height: z.number().positive().optional().default(120).describe('Button height in pixels'),
    color: z.string().optional().describe('Button color'),
    label: z.string().optional().describe('Button label/text')
  })).optional().describe('Optional array of buttons to create with the board')
});

// ============================================================================
// Scene Board Tools Class
// ============================================================================

export class SceneBoardTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  // ------------------------------------------------------------------------
  // Scene Board CRUD Operations
  // ------------------------------------------------------------------------

  async listSceneBoards(args: z.infer<typeof ListSceneBoardsSchema>) {
    const { projectId } = ListSceneBoardsSchema.parse(args);

    try {
      const sceneBoards = await this.graphqlClient.listSceneBoards(projectId);

      return {
        success: true,
        sceneBoards: sceneBoards.map(board => ({
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
          totalBoards: sceneBoards.length,
          projectId
        },
        message: `Found ${sceneBoards.length} scene boards in project`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list scene boards: ${message}`);
    }
  }

  async getSceneBoard(args: z.infer<typeof GetSceneBoardSchema>) {
    const { sceneBoardId } = GetSceneBoardSchema.parse(args);

    try {
      const board = await this.graphqlClient.getSceneBoard(sceneBoardId);

      if (!board) {
        throw new Error(`Scene board with ID ${sceneBoardId} not found`);
      }

      return {
        success: true,
        sceneBoard: {
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
            sceneId: button.scene.id,
            sceneName: button.scene.name,
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
        message: `Retrieved scene board "${board.name}" with ${board.buttons.length} buttons`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get scene board: ${message}`);
    }
  }

  async createSceneBoard(args: z.input<typeof CreateSceneBoardSchema>) {
    const { name, description, projectId, defaultFadeTime, gridSize, canvasWidth, canvasHeight } =
      CreateSceneBoardSchema.parse(args);

    try {
      const board = await this.graphqlClient.createSceneBoard({
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
        sceneBoard: {
          id: board.id,
          name: board.name,
          description: board.description,
          defaultFadeTime: board.defaultFadeTime,
          gridSize: board.gridSize,
          canvasWidth: board.canvasWidth,
          canvasHeight: board.canvasHeight,
          createdAt: board.createdAt
        },
        message: `Successfully created scene board "${name}"`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create scene board: ${message}`);
    }
  }

  async updateSceneBoard(args: z.infer<typeof UpdateSceneBoardSchema>) {
    const { sceneBoardId, ...updates } = UpdateSceneBoardSchema.parse(args);

    try {
      const board = await this.graphqlClient.updateSceneBoard(sceneBoardId, updates);

      return {
        success: true,
        sceneBoard: {
          id: board.id,
          name: board.name,
          description: board.description,
          defaultFadeTime: board.defaultFadeTime,
          gridSize: board.gridSize,
          canvasWidth: board.canvasWidth,
          canvasHeight: board.canvasHeight,
          updatedAt: board.updatedAt
        },
        message: `Successfully updated scene board "${board.name}"`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update scene board: ${message}`);
    }
  }

  async deleteSceneBoard(args: z.infer<typeof DeleteSceneBoardSchema>) {
    const { sceneBoardId, confirmDelete } = DeleteSceneBoardSchema.parse(args);

    if (!confirmDelete) {
      throw new Error('confirmDelete must be true to delete a scene board');
    }

    try {
      await this.graphqlClient.deleteSceneBoard(sceneBoardId);

      return {
        success: true,
        deletedSceneBoardId: sceneBoardId,
        message: 'Successfully deleted scene board and all its buttons'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete scene board: ${message}`);
    }
  }

  // ------------------------------------------------------------------------
  // Bulk Scene Board Operations
  // ------------------------------------------------------------------------

  async bulkCreateSceneBoards(args: z.input<typeof BulkCreateSceneBoardsSchema>) {
    const { sceneBoards } = BulkCreateSceneBoardsSchema.parse(args);

    if (sceneBoards.length === 0) {
      throw new Error('No scene boards provided for bulk creation');
    }

    try {
      const createdBoards = await this.graphqlClient.bulkCreateSceneBoards(sceneBoards);

      return {
        success: true,
        sceneBoards: createdBoards.map(board => ({
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
        message: `Successfully created ${createdBoards.length} scene boards`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bulk create scene boards: ${message}`);
    }
  }

  async bulkUpdateSceneBoards(args: z.infer<typeof BulkUpdateSceneBoardsSchema>) {
    const { sceneBoards } = BulkUpdateSceneBoardsSchema.parse(args);

    if (sceneBoards.length === 0) {
      throw new Error('No scene boards provided for bulk update');
    }

    try {
      const updatedBoards = await this.graphqlClient.bulkUpdateSceneBoards(sceneBoards);

      return {
        success: true,
        sceneBoards: updatedBoards.map(board => ({
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
        message: `Successfully updated ${updatedBoards.length} scene boards`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bulk update scene boards: ${message}`);
    }
  }

  async bulkDeleteSceneBoards(args: z.infer<typeof BulkDeleteSceneBoardsSchema>) {
    const { sceneBoardIds, confirmDelete } = BulkDeleteSceneBoardsSchema.parse(args);

    if (sceneBoardIds.length === 0) {
      throw new Error('No scene board IDs provided for bulk deletion');
    }

    if (!confirmDelete) {
      throw new Error('confirmDelete must be true to delete scene boards');
    }

    try {
      const result = await this.graphqlClient.bulkDeleteSceneBoards(sceneBoardIds);

      // Note: 'success' is true if at least one deletion succeeded, even if some deletions failed.
      // Partial successes are possible; see 'deletedCount' and 'failedIds' for details.
      return {
        success: result.successCount > 0,
        deletedCount: result.successCount,
        failedIds: result.failedIds,
        summary: {
          totalRequested: sceneBoardIds.length,
          successCount: result.successCount,
          failureCount: result.failedIds.length
        },
        message: `Successfully deleted ${result.successCount} scene boards${result.failedIds.length > 0 ? `, ${result.failedIds.length} failed` : ''}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bulk delete scene boards: ${message}`);
    }
  }

  // ------------------------------------------------------------------------
  // Scene Board Button Operations
  // ------------------------------------------------------------------------

  async addSceneToBoard(args: z.input<typeof AddSceneToBoardSchema>) {
    const { sceneBoardId, sceneId, layoutX, layoutY, width, height, color, label } =
      AddSceneToBoardSchema.parse(args);

    try {
      const button = await this.graphqlClient.addSceneToBoard({
        sceneBoardId,
        sceneId,
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
          sceneId: button.scene.id,
          sceneName: button.scene.name,
          layoutX: button.layoutX,
          layoutY: button.layoutY,
          width: button.width,
          height: button.height,
          color: button.color,
          label: button.label,
          createdAt: button.createdAt
        },
        message: `Successfully added scene "${button.scene.name}" to board at position (${layoutX}, ${layoutY})`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to add scene to board: ${message}`);
    }
  }

  async updateSceneBoardButton(args: z.infer<typeof UpdateSceneBoardButtonSchema>) {
    const { buttonId, ...updates } = UpdateSceneBoardButtonSchema.parse(args);

    try {
      const button = await this.graphqlClient.updateSceneBoardButton(buttonId, updates);

      return {
        success: true,
        button: {
          id: button.id,
          sceneId: button.scene.id,
          sceneName: button.scene.name,
          layoutX: button.layoutX,
          layoutY: button.layoutY,
          width: button.width,
          height: button.height,
          color: button.color,
          label: button.label,
          updatedAt: button.updatedAt
        },
        message: `Successfully updated button for scene "${button.scene.name}"`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update scene board button: ${message}`);
    }
  }

  async removeSceneFromBoard(args: z.infer<typeof RemoveSceneFromBoardSchema>) {
    const { buttonId } = RemoveSceneFromBoardSchema.parse(args);

    try {
      await this.graphqlClient.removeSceneFromBoard(buttonId);

      return {
        success: true,
        deletedButtonId: buttonId,
        message: 'Successfully removed button from board'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to remove scene from board: ${message}`);
    }
  }

  async updateSceneBoardButtonPositions(args: z.infer<typeof UpdateSceneBoardButtonPositionsSchema>) {
    const { positions } = UpdateSceneBoardButtonPositionsSchema.parse(args);

    if (positions.length === 0) {
      throw new Error('No button positions provided for update');
    }

    try {
      await this.graphqlClient.updateSceneBoardButtonPositions(positions);

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

  async bulkCreateSceneBoardButtons(args: z.input<typeof BulkCreateSceneBoardButtonsSchema>) {
    const { buttons } = BulkCreateSceneBoardButtonsSchema.parse(args);

    if (buttons.length === 0) {
      throw new Error('No buttons provided for bulk creation');
    }

    try {
      const createdButtons = await this.graphqlClient.bulkCreateSceneBoardButtons(buttons);

      return {
        success: true,
        buttons: createdButtons.map(button => ({
          id: button.id,
          sceneBoardId: button.sceneBoard.id,
          sceneId: button.scene.id,
          sceneName: button.scene.name,
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
          boardIds: [...new Set(createdButtons.map(b => b.sceneBoard.id))]
        },
        message: `Successfully created ${createdButtons.length} buttons`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bulk create buttons: ${message}`);
    }
  }

  async bulkUpdateSceneBoardButtons(args: z.infer<typeof BulkUpdateSceneBoardButtonsSchema>) {
    const { buttons } = BulkUpdateSceneBoardButtonsSchema.parse(args);

    if (buttons.length === 0) {
      throw new Error('No buttons provided for bulk update');
    }

    try {
      const updatedButtons = await this.graphqlClient.bulkUpdateSceneBoardButtons(buttons);

      return {
        success: true,
        buttons: updatedButtons.map(button => ({
          id: button.id,
          sceneId: button.scene.id,
          sceneName: button.scene.name,
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

  async bulkDeleteSceneBoardButtons(args: z.infer<typeof BulkDeleteSceneBoardButtonsSchema>) {
    const { buttonIds, confirmDelete } = BulkDeleteSceneBoardButtonsSchema.parse(args);

    if (buttonIds.length === 0) {
      throw new Error('No button IDs provided for bulk deletion');
    }

    if (!confirmDelete) {
      throw new Error('confirmDelete must be true to delete buttons');
    }

    try {
      const result = await this.graphqlClient.bulkDeleteSceneBoardButtons(buttonIds);

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
  // Scene Board Playback
  // ------------------------------------------------------------------------

  async activateSceneFromBoard(args: z.infer<typeof ActivateSceneFromBoardSchema>) {
    const { sceneBoardId, sceneId, fadeTimeOverride } = ActivateSceneFromBoardSchema.parse(args);

    try {
      await this.graphqlClient.activateSceneFromBoard(sceneBoardId, sceneId, fadeTimeOverride);

      return {
        success: true,
        message: `Successfully activated scene from board${fadeTimeOverride ? ` with ${fadeTimeOverride}s fade` : ' with board default fade time'}`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to activate scene from board: ${message}`);
    }
  }

  // ------------------------------------------------------------------------
  // Composite Operation: Create Board with Buttons
  // ------------------------------------------------------------------------

  async createSceneBoardWithButtons(args: z.input<typeof CreateSceneBoardWithButtonsSchema>) {
    const { name, description, projectId, defaultFadeTime, gridSize, canvasWidth, canvasHeight, buttons } =
      CreateSceneBoardWithButtonsSchema.parse(args);

    try {
      // First create the board
      const board = await this.graphqlClient.createSceneBoard({
        name,
        description,
        projectId,
        defaultFadeTime,
        gridSize,
        canvasWidth,
        canvasHeight
      });

      let createdButtons: SceneBoardButton[] = [];

      // Then create buttons if provided
      if (buttons && buttons.length > 0) {
        const buttonInputs = buttons.map(btn => ({
          sceneBoardId: board.id,
          sceneId: btn.sceneId,
          layoutX: btn.layoutX,
          layoutY: btn.layoutY,
          width: btn.width,
          height: btn.height,
          color: btn.color,
          label: btn.label
        }));

        createdButtons = await this.graphqlClient.bulkCreateSceneBoardButtons(buttonInputs);
      }

      return {
        success: true,
        sceneBoard: {
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
          sceneId: button.scene.id,
          sceneName: button.scene.name,
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
        message: `Successfully created scene board "${name}" with ${createdButtons.length} buttons`
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create scene board with buttons: ${message}`);
    }
  }
}
