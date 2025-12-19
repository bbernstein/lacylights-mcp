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
    description: 'Test description',
    project: {
      id: 'project-1',
      name: 'Test Project'
    },
    defaultFadeTime: 3.0,
    gridSize: 50,
    canvasWidth: 2000,
    canvasHeight: 2000,
    buttons: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  };

  const mockButton: SceneBoardButton = {
    id: 'button-1',
    sceneBoard: {
      id: 'board-1',
      name: 'Test Board'
    },
    scene: {
      id: 'scene-1',
      name: 'Test Scene'
    },
    layoutX: 100,
    layoutY: 200,
    width: 200,
    height: 120,
    color: '#FF0000',
    label: 'Test Button',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
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

  describe('listSceneBoards', () => {
    it('should list scene boards for a project', async () => {
      mockGraphQLClient.listSceneBoards.mockResolvedValue([mockSceneBoard]);

      const result = await sceneBoardTools.listSceneBoards({ projectId: 'project-1' });

      expect(mockGraphQLClient.listSceneBoards).toHaveBeenCalledWith('project-1');
      expect(result.success).toBe(true);
      expect(result.sceneBoards).toHaveLength(1);
      expect(result.sceneBoards[0].id).toBe('board-1');
      expect(result.summary.totalBoards).toBe(1);
    });

    it('should handle empty list', async () => {
      mockGraphQLClient.listSceneBoards.mockResolvedValue([]);

      const result = await sceneBoardTools.listSceneBoards({ projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(result.sceneBoards).toHaveLength(0);
      expect(result.summary.totalBoards).toBe(0);
    });

    it('should handle errors properly', async () => {
      mockGraphQLClient.listSceneBoards.mockRejectedValue(new Error('Database error'));

      await expect(sceneBoardTools.listSceneBoards({ projectId: 'project-1' }))
        .rejects.toThrow('Failed to list scene boards: Database error');
    });
  });

  describe('getSceneBoard', () => {
    it('should get a scene board with buttons', async () => {
      const boardWithButtons = { ...mockSceneBoard, buttons: [mockButton] };
      mockGraphQLClient.getSceneBoard.mockResolvedValue(boardWithButtons);

      const result = await sceneBoardTools.getSceneBoard({ sceneBoardId: 'board-1' });

      expect(mockGraphQLClient.getSceneBoard).toHaveBeenCalledWith('board-1');
      expect(result.success).toBe(true);
      expect(result.sceneBoard.id).toBe('board-1');
      expect(result.sceneBoard.buttons).toHaveLength(1);
    });

    it('should throw error if board not found', async () => {
      mockGraphQLClient.getSceneBoard.mockResolvedValue(null);

      await expect(sceneBoardTools.getSceneBoard({ sceneBoardId: 'invalid' }))
        .rejects.toThrow('Scene board with ID invalid not found');
    });
  });

  describe('createSceneBoard', () => {
    it('should create a scene board with defaults', async () => {
      mockGraphQLClient.createSceneBoard.mockResolvedValue(mockSceneBoard);

      const result = await sceneBoardTools.createSceneBoard({
        name: 'Test Board',
        projectId: 'project-1'
      });

      expect(mockGraphQLClient.createSceneBoard).toHaveBeenCalledWith({
        name: 'Test Board',
        description: undefined,
        projectId: 'project-1',
        defaultFadeTime: 3.0,
        gridSize: 50,
        canvasWidth: 2000,
        canvasHeight: 2000
      });
      expect(result.success).toBe(true);
      expect(result.sceneBoard.name).toBe('Test Board');
    });

    it('should create a scene board with custom settings', async () => {
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
  });

  describe('updateSceneBoard', () => {
    it('should update scene board properties', async () => {
      mockGraphQLClient.updateSceneBoard.mockResolvedValue(mockSceneBoard);

      const result = await sceneBoardTools.updateSceneBoard({
        sceneBoardId: 'board-1',
        name: 'Updated Board',
        defaultFadeTime: 4.0
      });

      expect(mockGraphQLClient.updateSceneBoard).toHaveBeenCalledWith('board-1', {
        name: 'Updated Board',
        defaultFadeTime: 4.0
      });
      expect(result.success).toBe(true);
    });
  });

  describe('deleteSceneBoard', () => {
    it('should delete a scene board when confirmed', async () => {
      mockGraphQLClient.deleteSceneBoard.mockResolvedValue(true);

      const result = await sceneBoardTools.deleteSceneBoard({
        sceneBoardId: 'board-1',
        confirmDelete: true
      });

      expect(mockGraphQLClient.deleteSceneBoard).toHaveBeenCalledWith('board-1');
      expect(result.success).toBe(true);
      expect(result.deletedSceneBoardId).toBe('board-1');
    });

    it('should throw error if not confirmed', async () => {
      await expect(sceneBoardTools.deleteSceneBoard({
        sceneBoardId: 'board-1',
        confirmDelete: false
      })).rejects.toThrow('confirmDelete must be true');
    });
  });

  describe('bulkCreateSceneBoards', () => {
    it('should create multiple scene boards', async () => {
      const boards = [mockSceneBoard, { ...mockSceneBoard, id: 'board-2', name: 'Board 2' }];
      mockGraphQLClient.bulkCreateSceneBoards.mockResolvedValue(boards);

      const result = await sceneBoardTools.bulkCreateSceneBoards({
        sceneBoards: [
          { name: 'Board 1', projectId: 'project-1' },
          { name: 'Board 2', projectId: 'project-1' }
        ]
      });

      expect(mockGraphQLClient.bulkCreateSceneBoards).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.sceneBoards).toHaveLength(2);
      expect(result.summary.totalCreated).toBe(2);
    });
  });

  describe('bulkDeleteSceneBoards', () => {
    it('should delete multiple scene boards', async () => {
      mockGraphQLClient.bulkDeleteSceneBoards.mockResolvedValue({
        successCount: 2,
        failedIds: []
      });

      const result = await sceneBoardTools.bulkDeleteSceneBoards({
        sceneBoardIds: ['board-1', 'board-2'],
        confirmDelete: true
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
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
    });
  });

  describe('addSceneToBoard', () => {
    it('should add a scene to board as button', async () => {
      mockGraphQLClient.addSceneToBoard.mockResolvedValue(mockButton);

      const result = await sceneBoardTools.addSceneToBoard({
        sceneBoardId: 'board-1',
        sceneId: 'scene-1',
        layoutX: 100,
        layoutY: 200
      });

      expect(mockGraphQLClient.addSceneToBoard).toHaveBeenCalledWith({
        sceneBoardId: 'board-1',
        sceneId: 'scene-1',
        layoutX: 100,
        layoutY: 200,
        width: 200,
        height: 120,
        color: undefined,
        label: undefined
      });
      expect(result.success).toBe(true);
      expect(result.button.layoutX).toBe(100);
      expect(result.button.layoutY).toBe(200);
    });

    it('should validate negative coordinates', async () => {
      await expect(sceneBoardTools.addSceneToBoard({
        sceneBoardId: 'board-1',
        sceneId: 'scene-1',
        layoutX: -10,
        layoutY: 200
      })).rejects.toThrow();
    });

    it('should validate positive dimensions', async () => {
      await expect(sceneBoardTools.addSceneToBoard({
        sceneBoardId: 'board-1',
        sceneId: 'scene-1',
        layoutX: 100,
        layoutY: 200,
        width: -50,
        height: 120
      })).rejects.toThrow();
    });
  });

  describe('updateSceneBoardButton', () => {
    it('should update button properties', async () => {
      const updatedButton = { ...mockButton, layoutX: 150, color: '#00FF00' };
      mockGraphQLClient.updateSceneBoardButton.mockResolvedValue(updatedButton);

      const result = await sceneBoardTools.updateSceneBoardButton({
        buttonId: 'button-1',
        layoutX: 150,
        color: '#00FF00'
      });

      expect(mockGraphQLClient.updateSceneBoardButton).toHaveBeenCalledWith('button-1', {
        layoutX: 150,
        color: '#00FF00'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('removeSceneFromBoard', () => {
    it('should remove a button from board', async () => {
      mockGraphQLClient.removeSceneFromBoard.mockResolvedValue(true);

      const result = await sceneBoardTools.removeSceneFromBoard({
        buttonId: 'button-1'
      });

      expect(mockGraphQLClient.removeSceneFromBoard).toHaveBeenCalledWith('button-1');
      expect(result.success).toBe(true);
      expect(result.deletedButtonId).toBe('button-1');
    });
  });

  describe('updateSceneBoardButtonPositions', () => {
    it('should update multiple button positions', async () => {
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
  });

  describe('bulkCreateSceneBoardButtons', () => {
    it('should create multiple buttons', async () => {
      const buttons = [mockButton, { ...mockButton, id: 'button-2' }];
      mockGraphQLClient.bulkCreateSceneBoardButtons.mockResolvedValue(buttons);

      const result = await sceneBoardTools.bulkCreateSceneBoardButtons({
        buttons: [
          { sceneBoardId: 'board-1', sceneId: 'scene-1', layoutX: 100, layoutY: 100 },
          { sceneBoardId: 'board-1', sceneId: 'scene-2', layoutX: 300, layoutY: 100 }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.buttons).toHaveLength(2);
      expect(result.summary.totalCreated).toBe(2);
    });
  });

  describe('bulkDeleteSceneBoardButtons', () => {
    it('should delete multiple buttons', async () => {
      mockGraphQLClient.bulkDeleteSceneBoardButtons.mockResolvedValue({
        successCount: 2,
        failedIds: []
      });

      const result = await sceneBoardTools.bulkDeleteSceneBoardButtons({
        buttonIds: ['button-1', 'button-2'],
        confirmDelete: true
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
    });

    it('should throw error if not confirmed', async () => {
      await expect(sceneBoardTools.bulkDeleteSceneBoardButtons({
        buttonIds: ['button-1'],
        confirmDelete: false
      })).rejects.toThrow('confirmDelete must be true');
    });
  });

  describe('activateSceneFromBoard', () => {
    it('should activate scene with board default fade time', async () => {
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
    });

    it('should activate scene with custom fade time', async () => {
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
    });
  });

  describe('createSceneBoardWithButtons', () => {
    it('should create board without buttons', async () => {
      mockGraphQLClient.createSceneBoard.mockResolvedValue(mockSceneBoard);

      const result = await sceneBoardTools.createSceneBoardWithButtons({
        name: 'Test Board',
        projectId: 'project-1'
      });

      expect(mockGraphQLClient.createSceneBoard).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.sceneBoard.name).toBe('Test Board');
      expect(result.buttons).toHaveLength(0);
      expect(result.summary.buttonsCreated).toBe(0);
    });

    it('should create board with buttons', async () => {
      mockGraphQLClient.createSceneBoard.mockResolvedValue(mockSceneBoard);
      mockGraphQLClient.bulkCreateSceneBoardButtons.mockResolvedValue([mockButton]);

      const result = await sceneBoardTools.createSceneBoardWithButtons({
        name: 'Test Board',
        projectId: 'project-1',
        buttons: [
          { sceneId: 'scene-1', layoutX: 100, layoutY: 100 }
        ]
      });

      expect(mockGraphQLClient.createSceneBoard).toHaveBeenCalled();
      expect(mockGraphQLClient.bulkCreateSceneBoardButtons).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.buttons).toHaveLength(1);
      expect(result.summary.buttonsCreated).toBe(1);
    });
  });
});
