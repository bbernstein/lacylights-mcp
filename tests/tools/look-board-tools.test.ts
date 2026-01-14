import { LookBoardTools } from '../../src/tools/look-board-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { LookBoard, LookBoardButton } from '../../src/types/lighting';

// Mock the GraphQL client
jest.mock('../../src/services/graphql-client-simple');
const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;

describe('LookBoardTools', () => {
  let lookBoardTools: LookBoardTools;
  let mockGraphQLClient: jest.Mocked<LacyLightsGraphQLClient>;

  const mockLookBoard: LookBoard = {
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

  const mockButton: LookBoardButton = {
    id: 'button-1',
    lookBoard: {
      id: 'board-1',
      name: 'Test Board'
    },
    look: {
      id: 'look-1',
      name: 'Test Look'
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
      listLookBoards: jest.fn(),
      getLookBoard: jest.fn(),
      createLookBoard: jest.fn(),
      updateLookBoard: jest.fn(),
      deleteLookBoard: jest.fn(),
      bulkCreateLookBoards: jest.fn(),
      bulkUpdateLookBoards: jest.fn(),
      bulkDeleteLookBoards: jest.fn(),
      addLookToBoard: jest.fn(),
      updateLookBoardButton: jest.fn(),
      removeLookFromBoard: jest.fn(),
      updateLookBoardButtonPositions: jest.fn(),
      bulkCreateLookBoardButtons: jest.fn(),
      bulkUpdateLookBoardButtons: jest.fn(),
      bulkDeleteLookBoardButtons: jest.fn(),
      activateLookFromBoard: jest.fn(),
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    lookBoardTools = new LookBoardTools(mockGraphQLClient);
  });

  describe('listLookBoards', () => {
    it('should list look boards for a project', async () => {
      mockGraphQLClient.listLookBoards.mockResolvedValue([mockLookBoard]);

      const result = await lookBoardTools.listLookBoards({ projectId: 'project-1' });

      expect(mockGraphQLClient.listLookBoards).toHaveBeenCalledWith('project-1');
      expect(result.success).toBe(true);
      expect(result.lookBoards).toHaveLength(1);
      expect(result.lookBoards[0].id).toBe('board-1');
      expect(result.summary.totalBoards).toBe(1);
    });

    it('should handle empty list', async () => {
      mockGraphQLClient.listLookBoards.mockResolvedValue([]);

      const result = await lookBoardTools.listLookBoards({ projectId: 'project-1' });

      expect(result.success).toBe(true);
      expect(result.lookBoards).toHaveLength(0);
      expect(result.summary.totalBoards).toBe(0);
    });

    it('should handle errors properly', async () => {
      mockGraphQLClient.listLookBoards.mockRejectedValue(new Error('Database error'));

      await expect(lookBoardTools.listLookBoards({ projectId: 'project-1' }))
        .rejects.toThrow('Failed to list look boards: Database error');
    });
  });

  describe('getLookBoard', () => {
    it('should get a look board with buttons', async () => {
      const boardWithButtons = { ...mockLookBoard, buttons: [mockButton] };
      mockGraphQLClient.getLookBoard.mockResolvedValue(boardWithButtons);

      const result = await lookBoardTools.getLookBoard({ lookBoardId: 'board-1' });

      expect(mockGraphQLClient.getLookBoard).toHaveBeenCalledWith('board-1');
      expect(result.success).toBe(true);
      expect(result.lookBoard.id).toBe('board-1');
      expect(result.lookBoard.buttons).toHaveLength(1);
    });

    it('should throw error if board not found', async () => {
      mockGraphQLClient.getLookBoard.mockResolvedValue(null);

      await expect(lookBoardTools.getLookBoard({ lookBoardId: 'invalid' }))
        .rejects.toThrow('Look board with ID invalid not found');
    });
  });

  describe('createLookBoard', () => {
    it('should create a look board with defaults', async () => {
      mockGraphQLClient.createLookBoard.mockResolvedValue(mockLookBoard);

      const result = await lookBoardTools.createLookBoard({
        name: 'Test Board',
        projectId: 'project-1'
      });

      expect(mockGraphQLClient.createLookBoard).toHaveBeenCalledWith({
        name: 'Test Board',
        description: undefined,
        projectId: 'project-1',
        defaultFadeTime: 3.0,
        gridSize: 50,
        canvasWidth: 2000,
        canvasHeight: 2000
      });
      expect(result.success).toBe(true);
      expect(result.lookBoard.name).toBe('Test Board');
    });

    it('should create a look board with custom settings', async () => {
      mockGraphQLClient.createLookBoard.mockResolvedValue(mockLookBoard);

      const result = await lookBoardTools.createLookBoard({
        name: 'Custom Board',
        description: 'Custom description',
        projectId: 'project-1',
        defaultFadeTime: 5.0,
        gridSize: 100,
        canvasWidth: 3000,
        canvasHeight: 3000
      });

      expect(mockGraphQLClient.createLookBoard).toHaveBeenCalledWith({
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

  describe('updateLookBoard', () => {
    it('should update look board properties', async () => {
      mockGraphQLClient.updateLookBoard.mockResolvedValue(mockLookBoard);

      const result = await lookBoardTools.updateLookBoard({
        lookBoardId: 'board-1',
        name: 'Updated Board',
        defaultFadeTime: 4.0
      });

      expect(mockGraphQLClient.updateLookBoard).toHaveBeenCalledWith('board-1', {
        name: 'Updated Board',
        defaultFadeTime: 4.0
      });
      expect(result.success).toBe(true);
    });
  });

  describe('deleteLookBoard', () => {
    it('should delete a look board when confirmed', async () => {
      mockGraphQLClient.deleteLookBoard.mockResolvedValue(true);

      const result = await lookBoardTools.deleteLookBoard({
        lookBoardId: 'board-1',
        confirmDelete: true
      });

      expect(mockGraphQLClient.deleteLookBoard).toHaveBeenCalledWith('board-1');
      expect(result.success).toBe(true);
      expect(result.deletedLookBoardId).toBe('board-1');
    });

    it('should throw error if not confirmed', async () => {
      await expect(lookBoardTools.deleteLookBoard({
        lookBoardId: 'board-1',
        confirmDelete: false
      })).rejects.toThrow('confirmDelete must be true');
    });
  });

  describe('bulkCreateLookBoards', () => {
    it('should create multiple look boards', async () => {
      const boards = [mockLookBoard, { ...mockLookBoard, id: 'board-2', name: 'Board 2' }];
      mockGraphQLClient.bulkCreateLookBoards.mockResolvedValue(boards);

      const result = await lookBoardTools.bulkCreateLookBoards({
        lookBoards: [
          { name: 'Board 1', projectId: 'project-1' },
          { name: 'Board 2', projectId: 'project-1' }
        ]
      });

      expect(mockGraphQLClient.bulkCreateLookBoards).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.lookBoards).toHaveLength(2);
      expect(result.summary.totalCreated).toBe(2);
    });
  });

  describe('bulkDeleteLookBoards', () => {
    it('should delete multiple look boards', async () => {
      mockGraphQLClient.bulkDeleteLookBoards.mockResolvedValue({
        successCount: 2,
        failedIds: []
      });

      const result = await lookBoardTools.bulkDeleteLookBoards({
        lookBoardIds: ['board-1', 'board-2'],
        confirmDelete: true
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toHaveLength(0);
    });

    it('should handle partial failures', async () => {
      mockGraphQLClient.bulkDeleteLookBoards.mockResolvedValue({
        successCount: 1,
        failedIds: ['board-2']
      });

      const result = await lookBoardTools.bulkDeleteLookBoards({
        lookBoardIds: ['board-1', 'board-2'],
        confirmDelete: true
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.failedIds).toEqual(['board-2']);
    });
  });

  describe('addLookToBoard', () => {
    it('should add a look to board as button', async () => {
      mockGraphQLClient.addLookToBoard.mockResolvedValue(mockButton);

      const result = await lookBoardTools.addLookToBoard({
        lookBoardId: 'board-1',
        lookId: 'look-1',
        layoutX: 100,
        layoutY: 200
      });

      expect(mockGraphQLClient.addLookToBoard).toHaveBeenCalledWith({
        lookBoardId: 'board-1',
        lookId: 'look-1',
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
      await expect(lookBoardTools.addLookToBoard({
        lookBoardId: 'board-1',
        lookId: 'look-1',
        layoutX: -10,
        layoutY: 200
      })).rejects.toThrow();
    });

    it('should validate positive dimensions', async () => {
      await expect(lookBoardTools.addLookToBoard({
        lookBoardId: 'board-1',
        lookId: 'look-1',
        layoutX: 100,
        layoutY: 200,
        width: -50,
        height: 120
      })).rejects.toThrow();
    });
  });

  describe('updateLookBoardButton', () => {
    it('should update button properties', async () => {
      const updatedButton = { ...mockButton, layoutX: 150, color: '#00FF00' };
      mockGraphQLClient.updateLookBoardButton.mockResolvedValue(updatedButton);

      const result = await lookBoardTools.updateLookBoardButton({
        buttonId: 'button-1',
        layoutX: 150,
        color: '#00FF00'
      });

      expect(mockGraphQLClient.updateLookBoardButton).toHaveBeenCalledWith('button-1', {
        layoutX: 150,
        color: '#00FF00'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('removeLookFromBoard', () => {
    it('should remove a button from board', async () => {
      mockGraphQLClient.removeLookFromBoard.mockResolvedValue(true);

      const result = await lookBoardTools.removeLookFromBoard({
        buttonId: 'button-1'
      });

      expect(mockGraphQLClient.removeLookFromBoard).toHaveBeenCalledWith('button-1');
      expect(result.success).toBe(true);
      expect(result.deletedButtonId).toBe('button-1');
    });
  });

  describe('updateLookBoardButtonPositions', () => {
    it('should update multiple button positions', async () => {
      mockGraphQLClient.updateLookBoardButtonPositions.mockResolvedValue(true);

      const result = await lookBoardTools.updateLookBoardButtonPositions({
        positions: [
          { buttonId: 'button-1', layoutX: 100, layoutY: 100 },
          { buttonId: 'button-2', layoutX: 300, layoutY: 100 }
        ]
      });

      expect(mockGraphQLClient.updateLookBoardButtonPositions).toHaveBeenCalledWith([
        { buttonId: 'button-1', layoutX: 100, layoutY: 100 },
        { buttonId: 'button-2', layoutX: 300, layoutY: 100 }
      ]);
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
    });
  });

  describe('bulkCreateLookBoardButtons', () => {
    it('should create multiple buttons', async () => {
      const buttons = [mockButton, { ...mockButton, id: 'button-2' }];
      mockGraphQLClient.bulkCreateLookBoardButtons.mockResolvedValue(buttons);

      const result = await lookBoardTools.bulkCreateLookBoardButtons({
        buttons: [
          { lookBoardId: 'board-1', lookId: 'look-1', layoutX: 100, layoutY: 100 },
          { lookBoardId: 'board-1', lookId: 'look-2', layoutX: 300, layoutY: 100 }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.buttons).toHaveLength(2);
      expect(result.summary.totalCreated).toBe(2);
    });
  });

  describe('bulkDeleteLookBoardButtons', () => {
    it('should delete multiple buttons', async () => {
      mockGraphQLClient.bulkDeleteLookBoardButtons.mockResolvedValue({
        successCount: 2,
        failedIds: []
      });

      const result = await lookBoardTools.bulkDeleteLookBoardButtons({
        buttonIds: ['button-1', 'button-2'],
        confirmDelete: true
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
    });

    it('should throw error if not confirmed', async () => {
      await expect(lookBoardTools.bulkDeleteLookBoardButtons({
        buttonIds: ['button-1'],
        confirmDelete: false
      })).rejects.toThrow('confirmDelete must be true');
    });
  });

  describe('activateLookFromBoard', () => {
    it('should activate look with board default fade time', async () => {
      mockGraphQLClient.activateLookFromBoard.mockResolvedValue(true);

      const result = await lookBoardTools.activateLookFromBoard({
        lookBoardId: 'board-1',
        lookId: 'look-1'
      });

      expect(mockGraphQLClient.activateLookFromBoard).toHaveBeenCalledWith(
        'board-1',
        'look-1',
        undefined
      );
      expect(result.success).toBe(true);
    });

    it('should activate look with custom fade time', async () => {
      mockGraphQLClient.activateLookFromBoard.mockResolvedValue(true);

      const result = await lookBoardTools.activateLookFromBoard({
        lookBoardId: 'board-1',
        lookId: 'look-1',
        fadeTimeOverride: 5.0
      });

      expect(mockGraphQLClient.activateLookFromBoard).toHaveBeenCalledWith(
        'board-1',
        'look-1',
        5.0
      );
      expect(result.success).toBe(true);
    });
  });

  describe('createLookBoardWithButtons', () => {
    it('should create board without buttons', async () => {
      mockGraphQLClient.createLookBoard.mockResolvedValue(mockLookBoard);

      const result = await lookBoardTools.createLookBoardWithButtons({
        name: 'Test Board',
        projectId: 'project-1'
      });

      expect(mockGraphQLClient.createLookBoard).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.lookBoard.name).toBe('Test Board');
      expect(result.buttons).toHaveLength(0);
      expect(result.summary.buttonsCreated).toBe(0);
    });

    it('should create board with buttons', async () => {
      mockGraphQLClient.createLookBoard.mockResolvedValue(mockLookBoard);
      mockGraphQLClient.bulkCreateLookBoardButtons.mockResolvedValue([mockButton]);

      const result = await lookBoardTools.createLookBoardWithButtons({
        name: 'Test Board',
        projectId: 'project-1',
        buttons: [
          { lookId: 'look-1', layoutX: 100, layoutY: 100 }
        ]
      });

      expect(mockGraphQLClient.createLookBoard).toHaveBeenCalled();
      expect(mockGraphQLClient.bulkCreateLookBoardButtons).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.buttons).toHaveLength(1);
      expect(result.summary.buttonsCreated).toBe(1);
    });
  });
});
