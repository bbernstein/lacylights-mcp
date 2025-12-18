import { SceneBoardTools } from '../../src/tools/scene-board-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { SceneBoard, SceneBoardButton } from '../../src/types/lighting';

// Mock the GraphQL client
jest.mock('../../src/services/graphql-client-simple');
const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;

describe('SceneBoardTools', () => {
  let sceneBoardTools: SceneBoardTools;
  let mockGraphQLClient: jest.Mocked<LacyLightsGraphQLClient>;

  const mockSceneBoard: SceneBoard = {
    id: 'board-1',
    name: 'Test Board',
    description: 'Test board description',
    project: { id: 'project-1', name: 'Test Project' },
    defaultFadeTime: 3.0,
    gridSize: 50,
    canvasWidth: 2000,
    canvasHeight: 2000,
    buttons: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const mockButton: SceneBoardButton = {
    id: 'button-1',
    sceneBoard: { id: 'board-1', name: 'Test Board' },
    scene: { id: 'scene-1', name: 'Test Scene' },
    layoutX: 100,
    layoutY: 100,
    width: 200,
    height: 120,
    color: '#FF0000',
    label: 'Test Button',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphQLClient = {
      listSceneBoards: jest.fn(),
      getSceneBoard: jest.fn(),
      createSceneBoard: jest.fn(),
      updateSceneBoard: jest.fn(),
      deleteSceneBoard: jest.fn(),
      bulkCreateSceneBoards: jest.fn(),
      bulkUpdateSceneBoards: jest.fn(),
      bulkDeleteSceneBoards: jest.fn(),
      addSceneToBoard: jest.fn(),
      updateSceneBoardButton: jest.fn(),
      removeSceneFromBoard: jest.fn(),
      updateSceneBoardButtonPositions: jest.fn(),
      bulkCreateSceneBoardButtons: jest.fn(),
      bulkUpdateSceneBoardButtons: jest.fn(),
      bulkDeleteSceneBoardButtons: jest.fn(),
      activateSceneFromBoard: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    sceneBoardTools = new SceneBoardTools(mockGraphQLClient);
  });

  // ========================================================================
  // Scene Board CRUD Operations
  // ========================================================================

  describe('listSceneBoards', () => {
    it('should list all scene boards in a project', async () => {
      const boards = [mockSceneBoard, { ...mockSceneBoard, id: 'board-2', name: 'Board 2' }];
      mockGraphQLClient.listSceneBoards.mockResolvedValue(boards);

      const result = await sceneBoardTools.listSceneBoards({ projectId: 'project-1' });

      expect(mockGraphQLClient.listSceneBoards).toHaveBeenCalledWith('project-1');
      expect(result.success).toBe(true);
      expect(result.sceneBoards).toHaveLength(2);
      expect(result.summary.totalBoards).toBe(2);
      expect(result.summary.projectId).toBe('project-1');
    });

    it('should handle empty scene board list', async () => {
      mockGraphQLClient.listSceneBoards.mockResolvedValue([]);

      const result = await sceneBoardTools.listSceneBoards({ projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(result.sceneBoards).toHaveLength(0);
      expect(result.message).toContain('Found 0 scene boards');
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.listSceneBoards.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.listSceneBoards({ projectId: 'project-1' })
      ).rejects.toThrow('Failed to list scene boards');
    });
  });

  describe('getSceneBoard', () => {
    it('should get a specific scene board with buttons', async () => {
      const boardWithButtons = { ...mockSceneBoard, buttons: [mockButton] };
      mockGraphQLClient.getSceneBoard.mockResolvedValue(boardWithButtons);

      const result = await sceneBoardTools.getSceneBoard({ sceneBoardId: 'board-1' });

      expect(mockGraphQLClient.getSceneBoard).toHaveBeenCalledWith('board-1');
      expect(result.success).toBe(true);
      expect(result.sceneBoard.id).toBe('board-1');
      expect(result.sceneBoard.buttons).toHaveLength(1);
      expect(result.sceneBoard.buttons[0].sceneName).toBe('Test Scene');
    });

    it('should throw error if scene board not found', async () => {
      mockGraphQLClient.getSceneBoard.mockResolvedValue(null);

      await expect(
        sceneBoardTools.getSceneBoard({ sceneBoardId: 'non-existent' })
      ).rejects.toThrow('Scene board with ID non-existent not found');
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.getSceneBoard.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.getSceneBoard({ sceneBoardId: 'board-1' })
      ).rejects.toThrow('Failed to get scene board');
    });
  });

  describe('createSceneBoard', () => {
    it('should create a new scene board with default values', async () => {
      mockGraphQLClient.createSceneBoard.mockResolvedValue(mockSceneBoard);

      const result = await sceneBoardTools.createSceneBoard({
        name: 'Test Board',
        description: 'Test board description',
        projectId: 'project-1',
        defaultFadeTime: 3.0,
        gridSize: 50,
        canvasWidth: 2000,
        canvasHeight: 2000
      });

      expect(mockGraphQLClient.createSceneBoard).toHaveBeenCalledWith({
        name: 'Test Board',
        description: 'Test board description',
        projectId: 'project-1',
        defaultFadeTime: 3.0,
        gridSize: 50,
        canvasWidth: 2000,
        canvasHeight: 2000
      });
      expect(result.success).toBe(true);
      expect(result.sceneBoard.name).toBe('Test Board');
      expect(result.message).toContain('Successfully created scene board');
    });

    it('should create a scene board with custom values', async () => {
      mockGraphQLClient.createSceneBoard.mockResolvedValue(mockSceneBoard);

      const result = await sceneBoardTools.createSceneBoard({
        name: 'Custom Board',
        description: 'Custom description',
        projectId: 'project-1',
        defaultFadeTime: 5.0,
        gridSize: 100,
        canvasWidth: 3000,
        canvasHeight: 3000
      });

      expect(mockGraphQLClient.createSceneBoard).toHaveBeenCalledWith({
        name: 'Custom Board',
        description: 'Custom description',
        projectId: 'project-1',
        defaultFadeTime: 5.0,
        gridSize: 100,
        canvasWidth: 3000,
        canvasHeight: 3000
      });
      expect(result.success).toBe(true);
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.createSceneBoard.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.createSceneBoard({
          name: 'Test Board',
          projectId: 'project-1',
          defaultFadeTime: 3.0,
          gridSize: 50,
          canvasWidth: 2000,
          canvasHeight: 2000
        })
      ).rejects.toThrow('Failed to create scene board');
    });
  });

  describe('updateSceneBoard', () => {
    it('should update scene board properties', async () => {
      const updatedBoard = { ...mockSceneBoard, name: 'Updated Board' };
      mockGraphQLClient.updateSceneBoard.mockResolvedValue(updatedBoard);

      const result = await sceneBoardTools.updateSceneBoard({
        sceneBoardId: 'board-1',
        name: 'Updated Board',
        defaultFadeTime: 5.0
      });

      expect(mockGraphQLClient.updateSceneBoard).toHaveBeenCalledWith('board-1', {
        name: 'Updated Board',
        defaultFadeTime: 5.0
      });
      expect(result.success).toBe(true);
      expect(result.sceneBoard.name).toBe('Updated Board');
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.updateSceneBoard.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.updateSceneBoard({
          sceneBoardId: 'board-1',
          name: 'Updated'
        })
      ).rejects.toThrow('Failed to update scene board');
    });
  });

  describe('deleteSceneBoard', () => {
    it('should delete a scene board with confirmation', async () => {
      mockGraphQLClient.deleteSceneBoard.mockResolvedValue(true);

      const result = await sceneBoardTools.deleteSceneBoard({
        sceneBoardId: 'board-1',
        confirmDelete: true
      });

      expect(mockGraphQLClient.deleteSceneBoard).toHaveBeenCalledWith('board-1');
      expect(result.success).toBe(true);
      expect(result.deletedSceneBoardId).toBe('board-1');
      expect(result.message).toContain('Successfully deleted scene board');
    });

    it('should throw error if confirmation is false', async () => {
      await expect(
        sceneBoardTools.deleteSceneBoard({
          sceneBoardId: 'board-1',
          confirmDelete: false
        })
      ).rejects.toThrow('confirmDelete must be true');
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.deleteSceneBoard.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.deleteSceneBoard({
          sceneBoardId: 'board-1',
          confirmDelete: true
        })
      ).rejects.toThrow('Failed to delete scene board');
    });
  });

  // ========================================================================
  // Bulk Scene Board Operations
  // ========================================================================

  describe('bulkCreateSceneBoards', () => {
    it('should create multiple scene boards', async () => {
      const boards = [mockSceneBoard, { ...mockSceneBoard, id: 'board-2' }];
      mockGraphQLClient.bulkCreateSceneBoards.mockResolvedValue(boards);

      const result = await sceneBoardTools.bulkCreateSceneBoards({
        sceneBoards: [
          { name: 'Board 1', projectId: 'project-1', defaultFadeTime: 3.0, gridSize: 50, canvasWidth: 2000, canvasHeight: 2000 },
          { name: 'Board 2', projectId: 'project-1', defaultFadeTime: 3.0, gridSize: 50, canvasWidth: 2000, canvasHeight: 2000 }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.sceneBoards).toHaveLength(2);
      expect(result.summary.totalCreated).toBe(2);
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.bulkCreateSceneBoards.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.bulkCreateSceneBoards({
          sceneBoards: [{ name: 'Board 1', projectId: 'project-1', defaultFadeTime: 3.0, gridSize: 50, canvasWidth: 2000, canvasHeight: 2000 }]
        })
      ).rejects.toThrow('Failed to bulk create scene boards');
    });
  });

  describe('bulkUpdateSceneBoards', () => {
    it('should update multiple scene boards', async () => {
      const boards = [mockSceneBoard, { ...mockSceneBoard, id: 'board-2' }];
      mockGraphQLClient.bulkUpdateSceneBoards.mockResolvedValue(boards);

      const result = await sceneBoardTools.bulkUpdateSceneBoards({
        sceneBoards: [
          { sceneBoardId: 'board-1', name: 'Updated 1' },
          { sceneBoardId: 'board-2', name: 'Updated 2' }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.sceneBoards).toHaveLength(2);
      expect(result.summary.totalUpdated).toBe(2);
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.bulkUpdateSceneBoards.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.bulkUpdateSceneBoards({
          sceneBoards: [{ sceneBoardId: 'board-1', name: 'Updated' }]
        })
      ).rejects.toThrow('Failed to bulk update scene boards');
    });
  });

  describe('bulkDeleteSceneBoards', () => {
    it('should delete multiple scene boards with confirmation', async () => {
      mockGraphQLClient.bulkDeleteSceneBoards.mockResolvedValue({
        successCount: 2,
        failedIds: []
      });

      const result = await sceneBoardTools.bulkDeleteSceneBoards({
        sceneBoardIds: ['board-1', 'board-2'],
        confirmDelete: true
      });

      expect(mockGraphQLClient.bulkDeleteSceneBoards).toHaveBeenCalledWith(['board-1', 'board-2']);
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toHaveLength(0);
    });

    it('should report partial failures', async () => {
      mockGraphQLClient.bulkDeleteSceneBoards.mockResolvedValue({
        successCount: 1,
        failedIds: ['board-2']
      });

      const result = await sceneBoardTools.bulkDeleteSceneBoards({
        sceneBoardIds: ['board-1', 'board-2'],
        confirmDelete: true
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.failedIds).toEqual(['board-2']);
      expect(result.message).toContain('1 failed');
    });

    it('should throw error if confirmation is false', async () => {
      await expect(
        sceneBoardTools.bulkDeleteSceneBoards({
          sceneBoardIds: ['board-1'],
          confirmDelete: false
        })
      ).rejects.toThrow('confirmDelete must be true');
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.bulkDeleteSceneBoards.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.bulkDeleteSceneBoards({
          sceneBoardIds: ['board-1'],
          confirmDelete: true
        })
      ).rejects.toThrow('Failed to bulk delete scene boards');
    });
  });

  // ========================================================================
  // Scene Board Button Operations
  // ========================================================================

  describe('addSceneToBoard', () => {
    it('should add a scene as a button to a board', async () => {
      mockGraphQLClient.addSceneToBoard.mockResolvedValue(mockButton);

      const result = await sceneBoardTools.addSceneToBoard({
        sceneBoardId: 'board-1',
        sceneId: 'scene-1',
        layoutX: 100,
        layoutY: 100,
        width: 200,
        height: 120,
        color: '#FF0000',
        label: 'Test Button'
      });

      expect(mockGraphQLClient.addSceneToBoard).toHaveBeenCalledWith({
        sceneBoardId: 'board-1',
        sceneId: 'scene-1',
        layoutX: 100,
        layoutY: 100,
        width: 200,
        height: 120,
        color: '#FF0000',
        label: 'Test Button'
      });
      expect(result.success).toBe(true);
      expect(result.button.sceneName).toBe('Test Scene');
      expect(result.message).toContain('Successfully added scene');
    });

    it('should add a button with default dimensions', async () => {
      mockGraphQLClient.addSceneToBoard.mockResolvedValue(mockButton);

      const result = await sceneBoardTools.addSceneToBoard({
        sceneBoardId: 'board-1',
        sceneId: 'scene-1',
        layoutX: 100,
        layoutY: 100,
        width: 200,
        height: 120
      });

      expect(result.success).toBe(true);
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.addSceneToBoard.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.addSceneToBoard({
          sceneBoardId: 'board-1',
          sceneId: 'scene-1',
          layoutX: 100,
          layoutY: 100,
          width: 200,
          height: 120
        })
      ).rejects.toThrow('Failed to add scene to board');
    });
  });

  describe('updateSceneBoardButton', () => {
    it('should update button properties', async () => {
      const updatedButton = { ...mockButton, layoutX: 200, label: 'Updated' };
      mockGraphQLClient.updateSceneBoardButton.mockResolvedValue(updatedButton);

      const result = await sceneBoardTools.updateSceneBoardButton({
        buttonId: 'button-1',
        layoutX: 200,
        label: 'Updated'
      });

      expect(mockGraphQLClient.updateSceneBoardButton).toHaveBeenCalledWith('button-1', {
        layoutX: 200,
        label: 'Updated'
      });
      expect(result.success).toBe(true);
      expect(result.button.layoutX).toBe(200);
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.updateSceneBoardButton.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.updateSceneBoardButton({
          buttonId: 'button-1',
          layoutX: 200
        })
      ).rejects.toThrow('Failed to update scene board button');
    });
  });

  describe('removeSceneFromBoard', () => {
    it('should remove a button from a board', async () => {
      mockGraphQLClient.removeSceneFromBoard.mockResolvedValue(true);

      const result = await sceneBoardTools.removeSceneFromBoard({
        buttonId: 'button-1'
      });

      expect(mockGraphQLClient.removeSceneFromBoard).toHaveBeenCalledWith('button-1');
      expect(result.success).toBe(true);
      expect(result.deletedButtonId).toBe('button-1');
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.removeSceneFromBoard.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.removeSceneFromBoard({ buttonId: 'button-1' })
      ).rejects.toThrow('Failed to remove scene from board');
    });
  });

  describe('updateSceneBoardButtonPositions', () => {
    it('should update positions for multiple buttons', async () => {
      mockGraphQLClient.updateSceneBoardButtonPositions.mockResolvedValue(true);

      const result = await sceneBoardTools.updateSceneBoardButtonPositions({
        positions: [
          { buttonId: 'button-1', layoutX: 100, layoutY: 100 },
          { buttonId: 'button-2', layoutX: 300, layoutY: 100 }
        ]
      });

      expect(mockGraphQLClient.updateSceneBoardButtonPositions).toHaveBeenCalledWith([
        { buttonId: 'button-1', layoutX: 100, layoutY: 100 },
        { buttonId: 'button-2', layoutX: 300, layoutY: 100 }
      ]);
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.updateSceneBoardButtonPositions.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.updateSceneBoardButtonPositions({
          positions: [{ buttonId: 'button-1', layoutX: 100, layoutY: 100 }]
        })
      ).rejects.toThrow('Failed to update button positions');
    });
  });

  // ========================================================================
  // Bulk Button Operations
  // ========================================================================

  describe('bulkCreateSceneBoardButtons', () => {
    it('should create multiple buttons', async () => {
      const buttons = [mockButton, { ...mockButton, id: 'button-2' }];
      mockGraphQLClient.bulkCreateSceneBoardButtons.mockResolvedValue(buttons);

      const result = await sceneBoardTools.bulkCreateSceneBoardButtons({
        buttons: [
          {
            sceneBoardId: 'board-1',
            sceneId: 'scene-1',
            layoutX: 100,
            layoutY: 100,
            width: 200,
            height: 120
          },
          {
            sceneBoardId: 'board-1',
            sceneId: 'scene-2',
            layoutX: 300,
            layoutY: 100,
            width: 200,
            height: 120
          }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.buttons).toHaveLength(2);
      expect(result.summary.totalCreated).toBe(2);
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.bulkCreateSceneBoardButtons.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.bulkCreateSceneBoardButtons({
          buttons: [{
            sceneBoardId: 'board-1',
            sceneId: 'scene-1',
            layoutX: 100,
            layoutY: 100,
            width: 200,
            height: 120
          }]
        })
      ).rejects.toThrow('Failed to bulk create buttons');
    });
  });

  describe('bulkUpdateSceneBoardButtons', () => {
    it('should update multiple buttons', async () => {
      const buttons = [mockButton, { ...mockButton, id: 'button-2' }];
      mockGraphQLClient.bulkUpdateSceneBoardButtons.mockResolvedValue(buttons);

      const result = await sceneBoardTools.bulkUpdateSceneBoardButtons({
        buttons: [
          { buttonId: 'button-1', layoutX: 150 },
          { buttonId: 'button-2', layoutX: 350 }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.buttons).toHaveLength(2);
      expect(result.summary.totalUpdated).toBe(2);
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.bulkUpdateSceneBoardButtons.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.bulkUpdateSceneBoardButtons({
          buttons: [{ buttonId: 'button-1', layoutX: 150 }]
        })
      ).rejects.toThrow('Failed to bulk update buttons');
    });
  });

  describe('bulkDeleteSceneBoardButtons', () => {
    it('should delete multiple buttons with confirmation', async () => {
      mockGraphQLClient.bulkDeleteSceneBoardButtons.mockResolvedValue({
        successCount: 2,
        failedIds: []
      });

      const result = await sceneBoardTools.bulkDeleteSceneBoardButtons({
        buttonIds: ['button-1', 'button-2'],
        confirmDelete: true
      });

      expect(mockGraphQLClient.bulkDeleteSceneBoardButtons).toHaveBeenCalledWith(['button-1', 'button-2']);
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toHaveLength(0);
    });

    it('should report partial failures', async () => {
      mockGraphQLClient.bulkDeleteSceneBoardButtons.mockResolvedValue({
        successCount: 1,
        failedIds: ['button-2']
      });

      const result = await sceneBoardTools.bulkDeleteSceneBoardButtons({
        buttonIds: ['button-1', 'button-2'],
        confirmDelete: true
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.failedIds).toEqual(['button-2']);
    });

    it('should throw error if confirmation is false', async () => {
      await expect(
        sceneBoardTools.bulkDeleteSceneBoardButtons({
          buttonIds: ['button-1'],
          confirmDelete: false
        })
      ).rejects.toThrow('confirmDelete must be true');
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.bulkDeleteSceneBoardButtons.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.bulkDeleteSceneBoardButtons({
          buttonIds: ['button-1'],
          confirmDelete: true
        })
      ).rejects.toThrow('Failed to bulk delete buttons');
    });
  });

  // ========================================================================
  // Scene Board Playback
  // ========================================================================

  describe('activateSceneFromBoard', () => {
    it('should activate a scene with board default fade time', async () => {
      mockGraphQLClient.activateSceneFromBoard.mockResolvedValue(true);

      const result = await sceneBoardTools.activateSceneFromBoard({
        sceneBoardId: 'board-1',
        sceneId: 'scene-1'
      });

      expect(mockGraphQLClient.activateSceneFromBoard).toHaveBeenCalledWith(
        'board-1',
        'scene-1',
        undefined
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('board default fade time');
    });

    it('should activate a scene with custom fade time', async () => {
      mockGraphQLClient.activateSceneFromBoard.mockResolvedValue(true);

      const result = await sceneBoardTools.activateSceneFromBoard({
        sceneBoardId: 'board-1',
        sceneId: 'scene-1',
        fadeTimeOverride: 5.0
      });

      expect(mockGraphQLClient.activateSceneFromBoard).toHaveBeenCalledWith(
        'board-1',
        'scene-1',
        5.0
      );
      expect(result.success).toBe(true);
      expect(result.message).toContain('5s fade');
    });

    it('should throw error on failure', async () => {
      mockGraphQLClient.activateSceneFromBoard.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.activateSceneFromBoard({
          sceneBoardId: 'board-1',
          sceneId: 'scene-1'
        })
      ).rejects.toThrow('Failed to activate scene from board');
    });
  });

  // ========================================================================
  // Composite Operation: Create Board with Buttons
  // ========================================================================

  describe('createSceneBoardWithButtons', () => {
    it('should create a board with buttons in one operation', async () => {
      mockGraphQLClient.createSceneBoard.mockResolvedValue(mockSceneBoard);
      const buttons = [mockButton, { ...mockButton, id: 'button-2' }];
      mockGraphQLClient.bulkCreateSceneBoardButtons.mockResolvedValue(buttons);

      const result = await sceneBoardTools.createSceneBoardWithButtons({
        name: 'Complete Board',
        projectId: 'project-1',
        defaultFadeTime: 3.0,
        gridSize: 50,
        canvasWidth: 2000,
        canvasHeight: 2000,
        buttons: [
          {
            sceneId: 'scene-1',
            layoutX: 100,
            layoutY: 100,
            width: 200,
            height: 120
          },
          {
            sceneId: 'scene-2',
            layoutX: 300,
            layoutY: 100,
            width: 200,
            height: 120
          }
        ]
      });

      expect(mockGraphQLClient.createSceneBoard).toHaveBeenCalled();
      expect(mockGraphQLClient.bulkCreateSceneBoardButtons).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.sceneBoard.id).toBe('board-1');
      expect(result.buttons).toHaveLength(2);
      expect(result.summary.buttonsCreated).toBe(2);
      expect(result.message).toContain('with 2 buttons');
    });

    it('should create a board without buttons', async () => {
      mockGraphQLClient.createSceneBoard.mockResolvedValue(mockSceneBoard);

      const result = await sceneBoardTools.createSceneBoardWithButtons({
        name: 'Empty Board',
        projectId: 'project-1',
        defaultFadeTime: 3.0,
        gridSize: 50,
        canvasWidth: 2000,
        canvasHeight: 2000
      });

      expect(mockGraphQLClient.createSceneBoard).toHaveBeenCalled();
      expect(mockGraphQLClient.bulkCreateSceneBoardButtons).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.buttons).toHaveLength(0);
      expect(result.summary.buttonsCreated).toBe(0);
    });

    it('should throw error if board creation fails', async () => {
      mockGraphQLClient.createSceneBoard.mockRejectedValue(new Error('GraphQL error'));

      await expect(
        sceneBoardTools.createSceneBoardWithButtons({
          name: 'Test Board',
          projectId: 'project-1',
          defaultFadeTime: 3.0,
          gridSize: 50,
          canvasWidth: 2000,
          canvasHeight: 2000
        })
      ).rejects.toThrow('Failed to create scene board with buttons');
    });

    it('should throw error if button creation fails', async () => {
      mockGraphQLClient.createSceneBoard.mockResolvedValue(mockSceneBoard);
      mockGraphQLClient.bulkCreateSceneBoardButtons.mockRejectedValue(new Error('Button error'));

      await expect(
        sceneBoardTools.createSceneBoardWithButtons({
          name: 'Test Board',
          projectId: 'project-1',
          defaultFadeTime: 3.0,
          gridSize: 50,
          canvasWidth: 2000,
          canvasHeight: 2000,
          buttons: [{
            sceneId: 'scene-1',
            layoutX: 100,
            layoutY: 100,
            width: 200,
            height: 120
          }]
        })
      ).rejects.toThrow('Failed to create scene board with buttons');
    });
  });
});
