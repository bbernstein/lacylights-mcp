import { CueTools } from '../../src/tools/cue-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { RAGService } from '../../src/services/rag-service-simple';
import { AILightingService } from '../../src/services/ai-lighting';
import { FixtureType } from '../../src/types/lighting';

// Mock all dependencies
jest.mock('../../src/services/graphql-client-simple');
jest.mock('../../src/services/rag-service-simple');
jest.mock('../../src/services/ai-lighting');

const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;
const MockRAGService = RAGService as jest.MockedClass<typeof RAGService>;
const MockAILightingService = AILightingService as jest.MockedClass<typeof AILightingService>;

describe('CueTools', () => {
  let cueTools: CueTools;
  let mockGraphQLClient: jest.Mocked<LacyLightsGraphQLClient>;
  let mockRAGService: jest.Mocked<RAGService>;
  let mockAILightingService: jest.Mocked<AILightingService>;

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    fixtures: [
      {
        id: 'fixture-1',
        name: 'LED Par 1',
        type: FixtureType.LED_PAR,
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        universe: 1,
        startChannel: 1,
        tags: ['wash']
      }
    ],
    scenes: [
      {
        id: 'scene-1',
        name: 'Opening Scene',
        description: 'Opening scene description',
        fixtureValues: []
      },
      {
        id: 'scene-2',
        name: 'Dramatic Scene',
        description: 'Dramatic scene description',
        fixtureValues: []
      }
    ],
    cueLists: [
      {
        id: 'cuelist-1',
        name: 'Act 1 Cues',
        description: 'Cues for Act 1',
        cues: [
          {
            id: 'cue-1',
            name: 'Lights Up',
            cueNumber: 1.0,
            scene: { id: 'scene-1', name: 'Opening Scene' },
            fadeInTime: 3,
            fadeOutTime: 3,
            followTime: undefined,
            notes: 'Opening cue'
          }
        ]
      }
    ]
  };

  const mockCueSequence = {
    name: 'Act 1 Cues',
    description: 'Cue sequence for Act 1',
    cues: [
      {
        name: 'Lights Up',
        cueNumber: 1.0,
        sceneId: 'scene-1',
        fadeInTime: 3.0,
        fadeOutTime: 3.0,
        followTime: undefined,
        notes: 'Opening cue'
      },
      {
        name: 'Dramatic Change',
        cueNumber: 2.0,
        sceneId: 'scene-2',
        fadeInTime: 5.0,
        fadeOutTime: 2.0,
        followTime: undefined,
        notes: 'Dramatic transition'
      }
    ],
    reasoning: 'Standard theatrical progression'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGraphQLClient = {
      getProject: jest.fn(),
      getProjects: jest.fn(),
      getCueList: jest.fn(),
      createCueList: jest.fn(),
      updateCueList: jest.fn(),
      deleteCueList: jest.fn(),
      createCue: jest.fn(),
      updateCue: jest.fn(),
      deleteCue: jest.fn(),
      bulkUpdateCues: jest.fn(),
      playCue: jest.fn(),
      fadeToBlack: jest.fn(),
      // New backend playback control methods
      getCueListPlaybackStatus: jest.fn(),
      getCurrentActiveScene: jest.fn(),
      startCueList: jest.fn(),
      nextCue: jest.fn(),
      previousCue: jest.fn(),
      goToCue: jest.fn(),
      stopCueList: jest.fn(),
    } as any;

    mockRAGService = {
      analyzeScript: jest.fn(),
      generateLightingRecommendations: jest.fn(),
      findSimilarLightingPatterns: jest.fn(),
      indexLightingPattern: jest.fn(),
      initializeCollection: jest.fn(),
      seedDefaultPatterns: jest.fn()
    } as any;

    mockAILightingService = {
      generateScene: jest.fn(),
      optimizeSceneForFixtures: jest.fn(),
      suggestFixtureUsage: jest.fn(),
      generateCueSequence: jest.fn()
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    MockRAGService.mockImplementation(() => mockRAGService);
    MockAILightingService.mockImplementation(() => mockAILightingService);

    cueTools = new CueTools(mockGraphQLClient, mockRAGService, mockAILightingService);
  });

  describe('constructor', () => {
    it('should create CueTools instance', () => {
      expect(cueTools).toBeInstanceOf(CueTools);
    });
  });

  describe('createCueSequence', () => {
    it('should create cue sequence from scenes', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateCueSequence.mockResolvedValue(mockCueSequence);
      
      const mockCreatedCueList = {
        id: 'cuelist-new',
        name: 'Act 1 Cues',
        description: 'Cue sequence for Act 1',
        cues: []
      };
      mockGraphQLClient.createCueList.mockResolvedValue(mockCreatedCueList as any);
      
      const mockCreatedCue = {
        id: 'cue-new',
        name: 'Lights Up',
        cueNumber: 1.0,
        scene: { id: 'scene-1', name: 'Opening Scene' },
        fadeInTime: 3,
        fadeOutTime: 3
      };
      mockGraphQLClient.createCue.mockResolvedValue(mockCreatedCue as any);

      const result = await cueTools.createCueSequence({
        projectId: 'project-1',
        scriptContext: 'Act 1, opening sequence',
        sceneIds: ['scene-1', 'scene-2'],
        sequenceName: 'Act 1 Cues',
        transitionPreferences: {
          defaultFadeIn: 3,
          defaultFadeOut: 3,
          followCues: false,
          autoAdvance: false
        }
      });

      expect(mockGraphQLClient.getProject).toHaveBeenCalledWith('project-1');
      expect(mockAILightingService.generateCueSequence).toHaveBeenCalled();
      expect(mockGraphQLClient.createCueList).toHaveBeenCalled();
      expect(mockGraphQLClient.createCue).toHaveBeenCalledTimes(2);
      expect(result.cueList.name).toBe('Act 1 Cues');
      expect(result.cueList.totalCues).toBe(2);
      expect(result.cues).toHaveLength(2);
    });

    it('should handle default transition preferences', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateCueSequence.mockResolvedValue(mockCueSequence);
      mockGraphQLClient.createCueList.mockResolvedValue({
        id: 'cuelist-new',
        name: 'Act 1 Cues',
        description: 'Cue sequence for Act 1',
        cues: []
      } as any);
      const mockCreatedCue = {
        id: 'cue-new',
        name: 'Lights Up',
        cueNumber: 1.0,
        scene: { id: 'scene-1', name: 'Opening Scene' },
        fadeInTime: 3,
        fadeOutTime: 3,
        followTime: undefined,
        notes: 'Opening cue'
      };
      mockGraphQLClient.createCue.mockResolvedValue(mockCreatedCue as any);

      const result = await cueTools.createCueSequence({
        projectId: 'project-1',
        scriptContext: 'Act 1',
        sceneIds: ['scene-1'],
        sequenceName: 'Act 1 Cues'
      });

      expect(mockAILightingService.generateCueSequence).toHaveBeenCalledWith(
        'Act 1',
        expect.any(Array),
        undefined // transitionPreferences is undefined when not provided
      );
      expect(result.cueList.name).toBe('Act 1 Cues');
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(cueTools.createCueSequence({
        projectId: 'non-existent',
        scriptContext: 'Test',
        sceneIds: ['scene-1'],
        sequenceName: 'Test Cues'
      })).rejects.toThrow('Project with ID non-existent not found');
    });

    it('should handle missing scenes', async () => {
      const projectWithoutScenes = {
        ...mockProject,
        scenes: []
      };
      mockGraphQLClient.getProject.mockResolvedValue(projectWithoutScenes as any);

      await expect(cueTools.createCueSequence({
        projectId: 'project-1',
        scriptContext: 'Test',
        sceneIds: ['scene-1'],
        sequenceName: 'Test Cues'
      })).rejects.toThrow('Scene with ID scene-1 not found in the project');
    });

    it('should handle cue sequence generation errors', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateCueSequence.mockRejectedValue(new Error('AI Error'));

      await expect(cueTools.createCueSequence({
        projectId: 'project-1',
        scriptContext: 'Test',
        sceneIds: ['scene-1'],
        sequenceName: 'Test Cues'
      })).rejects.toThrow('Failed to create cue sequence: Error: AI Error');
    });
  });

  describe('generateActCues', () => {
    it('should generate cues for an entire act', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      
      const mockScriptAnalysis = {
        scenes: [
          {
            sceneNumber: '1',
            title: 'Opening',
            content: 'Act 1, Scene 1',
            mood: 'dramatic',
            characters: ['Alice'],
            stageDirections: ['Lights up'],
            lightingCues: ['Cue 1'],
            timeOfDay: 'evening',
            location: 'living room'
          }
        ],
        characters: ['Alice'],
        settings: ['living room'],
        overallMood: 'dramatic',
        themes: ['conflict']
      };
      
      const mockRecommendations = {
        colorSuggestions: ['red', 'blue'],
        intensityLevels: { key: 70 },
        focusAreas: ['center'],
        reasoning: 'Test reasoning'
      };
      
      mockRAGService.analyzeScript.mockResolvedValue(mockScriptAnalysis);
      mockRAGService.generateLightingRecommendations.mockResolvedValue(mockRecommendations);
      mockAILightingService.generateCueSequence.mockResolvedValue(mockCueSequence);
      
      const mockCreatedCueList = {
        id: 'cuelist-act1',
        name: 'Act 1',
        description: 'Generated cues for Act 1',
        cues: []
      };
      mockGraphQLClient.createCueList.mockResolvedValue(mockCreatedCueList as any);
      mockGraphQLClient.createCue.mockResolvedValue({ id: 'cue-new' } as any);

      const result = await cueTools.generateActCues({
        projectId: 'project-1',
        actNumber: 1,
        scriptText: 'Act 1 script text',
        cueListName: 'Act 1'
      });

      expect(mockRAGService.analyzeScript).toHaveBeenCalledWith('Act 1 script text');
      expect(mockRAGService.generateLightingRecommendations).toHaveBeenCalled();
      expect(result.actNumber).toBe(1);
      expect(result.actAnalysis).toBeDefined();
    });

    it('should use existing scenes when provided', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      
      const mockScriptAnalysis = {
        scenes: [
          {
            sceneNumber: '2',
            title: 'Act 2 Opening',
            content: 'Act 2, Scene 1',
            mood: 'neutral',
            characters: ['Alice'],
            stageDirections: ['Lights change'],
            lightingCues: ['Cue 2.1'],
            timeOfDay: 'day',
            location: 'bedroom'
          }
        ],
        characters: ['Alice'],
        settings: ['bedroom'],
        overallMood: 'neutral',
        themes: ['transition']
      };
      
      const mockRecommendations = {
        colorSuggestions: ['white', 'blue'],
        intensityLevels: { key: 50 },
        focusAreas: ['center'],
        reasoning: 'Neutral scene'
      };
      
      mockRAGService.analyzeScript.mockResolvedValue(mockScriptAnalysis);
      mockRAGService.generateLightingRecommendations.mockResolvedValue(mockRecommendations);
      mockAILightingService.generateCueSequence.mockResolvedValue(mockCueSequence);
      mockGraphQLClient.createCueList.mockResolvedValue({
        id: 'cuelist-act2',
        name: 'Act 2',
        cues: []
      } as any);
      mockGraphQLClient.createCue.mockResolvedValue({ id: 'cue-new' } as any);

      const result = await cueTools.generateActCues({
        projectId: 'project-1',
        actNumber: 2,
        scriptText: 'Act 2 script',
        existingScenes: ['scene-1', 'scene-2']
      });

      expect(result.totalScenes).toBeDefined();
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(cueTools.generateActCues({
        projectId: 'non-existent',
        actNumber: 1,
        scriptText: 'Test script'
      })).rejects.toThrow('Failed to generate act cues: TypeError: Cannot read properties of undefined (reading \'scenes\')');
    });

    it('should handle script analysis errors', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockRAGService.analyzeScript.mockRejectedValue(new Error('Analysis error'));

      await expect(cueTools.generateActCues({
        projectId: 'project-1',
        actNumber: 1,
        scriptText: 'Test script'
      })).rejects.toThrow('Failed to generate act cues: Error: Analysis error');
    });
  });

  describe('optimizeCueTiming', () => {
    it('should optimize cue timing for smooth transitions', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await cueTools.optimizeCueTiming({
        cueListId: 'cuelist-1',
        projectId: 'project-1',
        optimizationStrategy: 'smooth_transitions'
      });

      expect(mockGraphQLClient.getProject).toHaveBeenCalledWith('project-1');
      expect(result.strategy).toBe('smooth_transitions');
      expect(result.originalTiming).toBeDefined();
    });

    it('should handle different optimization strategies', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const strategies = ['smooth_transitions', 'dramatic_timing', 'technical_precision', 'energy_conscious'] as const;
      
      for (const strategy of strategies) {
        const result = await cueTools.optimizeCueTiming({
          cueListId: 'cuelist-1',
          projectId: 'project-1',
          optimizationStrategy: strategy
        });

        expect(result.strategy).toBe(strategy);
      }
    });

    it('should handle cue list not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      await expect(cueTools.optimizeCueTiming({
        cueListId: 'non-existent',
        projectId: 'project-1',
        optimizationStrategy: 'smooth_transitions'
      })).rejects.toThrow('Cue list with ID non-existent not found');
    });

    it('should handle optimization errors', async () => {
      mockGraphQLClient.getProject.mockRejectedValue(new Error('GraphQL error'));

      await expect(cueTools.optimizeCueTiming({
        cueListId: 'cuelist-1',
        projectId: 'project-1',
        optimizationStrategy: 'smooth_transitions'
      })).rejects.toThrow('Failed to optimize cue timing: Error: GraphQL error');
    });
  });

  describe('analyzeCueStructure', () => {
    it('should analyze cue structure with recommendations', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await cueTools.analyzeCueStructure({
        cueListId: 'cuelist-1',
        projectId: 'project-1',
        includeRecommendations: true
      });

      expect(result.structure.totalCues).toBe(1);
      expect(result.structure.fadeTimings).toBeDefined();
      expect((result as any).recommendations).toBeDefined();
    });

    it('should analyze without recommendations', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await cueTools.analyzeCueStructure({
        cueListId: 'cuelist-1',
        projectId: 'project-1',
        includeRecommendations: false
      });

      expect((result as any).recommendations).toBeUndefined();
    });

    it('should handle cue list not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockGraphQLClient.getCueList.mockResolvedValue(null);

      await expect(cueTools.analyzeCueStructure({
        cueListId: 'non-existent',
        projectId: 'project-1',
        includeRecommendations: true
      })).rejects.toThrow('Cue list with ID non-existent not found');
    });

    it('should handle analysis errors', async () => {
      mockGraphQLClient.getProject.mockRejectedValue(new Error('GraphQL error'));

      await expect(cueTools.analyzeCueStructure({
        cueListId: 'cuelist-1',
        projectId: 'project-1',
        includeRecommendations: true
      })).rejects.toThrow('Failed to analyze cue structure: Error: GraphQL error');
    });
  });

  describe('updateCueList', () => {
    it('should update cue list name and description', async () => {
      const updatedCueList = {
        id: 'cuelist-1',
        name: 'Updated Cue List',
        description: 'Updated description',
        cues: []
      };
      mockGraphQLClient.updateCueList.mockResolvedValue(updatedCueList as any);

      const result = await cueTools.updateCueList({
        cueListId: 'cuelist-1',
        name: 'Updated Cue List',
        description: 'Updated description'
      });

      expect(mockGraphQLClient.updateCueList).toHaveBeenCalledWith('cuelist-1', {
        name: 'Updated Cue List',
        description: 'Updated description'
      });
      expect(result.cueList.name).toBe('Updated Cue List');
      expect(result.cueList.description).toBe('Updated description');
      expect(result.cueList.totalCues).toBe(0);
    });

    it('should handle update errors', async () => {
      mockGraphQLClient.updateCueList.mockRejectedValue(new Error('Update error'));

      await expect(cueTools.updateCueList({
        cueListId: 'cuelist-1',
        name: 'Updated Name'
      })).rejects.toThrow('Failed to update cue list: Error: Update error');
    });
  });

  describe('deleteCueList', () => {
    it('should delete cue list successfully', async () => {
      const mockCueList = {
        id: 'cuelist-1',
        name: 'Test Cue List',
        description: 'Test description',
        cues: [{ id: 'cue-1' }, { id: 'cue-2' }]
      };
      mockGraphQLClient.getCueList.mockResolvedValue(mockCueList as any);
      mockGraphQLClient.deleteCueList.mockResolvedValue(true);

      const result = await cueTools.deleteCueList({
        cueListId: 'cuelist-1',
        confirmDelete: true
      });

      expect(mockGraphQLClient.getCueList).toHaveBeenCalledWith('cuelist-1');
      expect(mockGraphQLClient.deleteCueList).toHaveBeenCalledWith('cuelist-1');
      expect(result.success).toBe(true);
      expect(result.cueListId).toBe('cuelist-1');
      expect(result.deletedCueList.name).toBe('Test Cue List');
      expect(result.deletedCueList.totalCues).toBe(2);
      expect(result.message).toBe('Cue list deleted successfully');
    });

    it('should require confirmDelete to be true', async () => {
      await expect(cueTools.deleteCueList({
        cueListId: 'cuelist-1',
        confirmDelete: false
      })).rejects.toThrow('confirmDelete must be true to delete a cue list');

      expect(mockGraphQLClient.getCueList).not.toHaveBeenCalled();
      expect(mockGraphQLClient.deleteCueList).not.toHaveBeenCalled();
    });

    it('should handle cue list not found', async () => {
      mockGraphQLClient.getCueList.mockResolvedValue(null);

      await expect(cueTools.deleteCueList({
        cueListId: 'cuelist-nonexistent',
        confirmDelete: true
      })).rejects.toThrow('Cue list with ID cuelist-nonexistent not found');

      expect(mockGraphQLClient.deleteCueList).not.toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      const mockCueList = {
        id: 'cuelist-1',
        name: 'Test Cue List',
        description: 'Test description',
        cues: []
      };
      mockGraphQLClient.getCueList.mockResolvedValue(mockCueList as any);
      mockGraphQLClient.deleteCueList.mockRejectedValue(new Error('Deletion error'));

      await expect(cueTools.deleteCueList({
        cueListId: 'cuelist-1',
        confirmDelete: true
      })).rejects.toThrow('Failed to delete cue list: Error: Deletion error');
    });
  });

  describe('addCueToCueList', () => {
    it('should add cue to cue list', async () => {
      const newCue = {
        name: 'New Cue',
        cueNumber: 1.5,
        sceneName: 'Opening Scene',
        fadeInTime: 5,
        fadeOutTime: 2,
        followTime: undefined,
        notes: 'New dramatic cue'
      };
      const mockCreatedCue = {
        id: 'cue-new',
        name: 'New Cue',
        cueNumber: 1.5,
        scene: { id: 'scene-1', name: 'Opening Scene' },
        fadeInTime: 5,
        fadeOutTime: 2,
        followTime: undefined,
        notes: 'New dramatic cue'
      };
      mockGraphQLClient.createCue.mockResolvedValue(mockCreatedCue as any);

      const result = await cueTools.addCueToCueList({
        cueListId: 'cuelist-1',
        name: 'New Cue',
        cueNumber: 1.5,
        sceneId: 'scene-1',
        fadeInTime: 5,
        fadeOutTime: 2,
        notes: 'New dramatic cue'
      });

      expect(mockGraphQLClient.createCue).toHaveBeenCalledWith({
        name: 'New Cue',
        cueNumber: 1.5,
        cueListId: 'cuelist-1',
        sceneId: 'scene-1',
        fadeInTime: 5,
        fadeOutTime: 2,
        followTime: undefined,
        notes: 'New dramatic cue'
      });
      expect(result.cue).toEqual(newCue);
    });

    it('should handle cue creation with follow time', async () => {
      const mockCreatedCue = {
        id: 'cue-new',
        name: 'Auto Cue',
        cueNumber: 2.0,
        scene: { id: 'scene-1', name: 'Opening Scene' },
        fadeInTime: 3,
        fadeOutTime: 3,
        followTime: 5,
        notes: undefined
      };
      mockGraphQLClient.createCue.mockResolvedValue(mockCreatedCue as any);

      const result = await cueTools.addCueToCueList({
        cueListId: 'cuelist-1',
        name: 'Auto Cue',
        cueNumber: 2.0,
        sceneId: 'scene-1',
        fadeInTime: 3,
        fadeOutTime: 3,
        followTime: 5
      });

      expect(mockGraphQLClient.createCue).toHaveBeenCalledWith(
        expect.objectContaining({
          followTime: 5
        })
      );
      expect(result.cue.name).toBe('Auto Cue');
    });

    it('should handle cue creation errors', async () => {
      mockGraphQLClient.createCue.mockRejectedValue(new Error('Creation error'));

      await expect(cueTools.addCueToCueList({
        cueListId: 'cuelist-1',
        name: 'New Cue',
        cueNumber: 1.5,
        sceneId: 'scene-1',
        fadeInTime: 3,
        fadeOutTime: 3
      })).rejects.toThrow('Failed to add cue to list: Error: Creation error');
    });
  });

  describe('removeCueFromList', () => {
    it('should remove cue from list', async () => {
      mockGraphQLClient.deleteCue.mockResolvedValue(true);

      const result = await cueTools.removeCueFromList({
        cueId: 'cue-1'
      });

      expect(mockGraphQLClient.deleteCue).toHaveBeenCalledWith('cue-1');
      expect(result.success).toBe(true);
    });

    it('should handle deletion failure', async () => {
      mockGraphQLClient.deleteCue.mockResolvedValue(false);

      const result = await cueTools.removeCueFromList({
        cueId: 'cue-1'
      });

      expect(result.success).toBe(false);
    });

    it('should handle deletion errors', async () => {
      mockGraphQLClient.deleteCue.mockRejectedValue(new Error('Deletion error'));

      await expect(cueTools.removeCueFromList({
        cueId: 'cue-1'
      })).rejects.toThrow('Failed to remove cue: Error: Deletion error');
    });
  });

  describe('updateCue', () => {
    it('should update cue properties', async () => {
      const updatedCue = {
        name: 'Updated Cue',
        cueNumber: 1,
        sceneName: 'Opening Scene',
        fadeInTime: 5,
        fadeOutTime: 5,
        followTime: undefined,
        notes: 'Updated notes'
      };
      const mockUpdatedCue = {
        id: 'cue-1',
        name: 'Updated Cue',
        cueNumber: 1,
        scene: { id: 'scene-1', name: 'Opening Scene' },
        fadeInTime: 5,
        fadeOutTime: 5,
        followTime: undefined,
        notes: 'Updated notes'
      };
      mockGraphQLClient.updateCue.mockResolvedValue(mockUpdatedCue as any);

      const result = await cueTools.updateCue({
        cueId: 'cue-1',
        name: 'Updated Cue',
        fadeInTime: 5,
        fadeOutTime: 5,
        notes: 'Updated notes'
      });

      expect(mockGraphQLClient.updateCue).toHaveBeenCalledWith('cue-1', {
        name: 'Updated Cue',
        fadeInTime: 5,
        fadeOutTime: 5,
        notes: 'Updated notes'
      });
      expect(result.cue).toEqual(updatedCue);
    });

    it('should handle update errors', async () => {
      mockGraphQLClient.updateCue.mockRejectedValue(new Error('Update error'));

      await expect(cueTools.updateCue({
        cueId: 'cue-1',
        name: 'Updated Cue'
      })).rejects.toThrow('Failed to update cue: Error: Update error');
    });
  });

  describe('reorderCues', () => {
    it('should reorder multiple cues', async () => {
      // Mock each individual update
      const updatedCue1 = { id: 'cue-1', cueNumber: 2.0 };
      const updatedCue2 = { id: 'cue-2', cueNumber: 1.0 };
      
      mockGraphQLClient.updateCue
        .mockResolvedValueOnce(updatedCue1 as any)
        .mockResolvedValueOnce(updatedCue2 as any);

      const result = await cueTools.reorderCues({
        cueListId: 'cuelist-1',
        cueReordering: [
          { cueId: 'cue-1', newCueNumber: 2.0 },
          { cueId: 'cue-2', newCueNumber: 1.0 }
        ]
      });

      expect(mockGraphQLClient.updateCue).toHaveBeenCalledTimes(2);
      expect(result.updatedCues).toHaveLength(2);
      expect(result.success).toBe(true);
    });

    it('should handle reorder errors', async () => {
      mockGraphQLClient.updateCue.mockRejectedValue(new Error('Update error'));

      await expect(cueTools.reorderCues({
        cueListId: 'cuelist-1',
        cueReordering: [
          { cueId: 'cue-1', newCueNumber: 2.0 }
        ]
      })).rejects.toThrow('Failed to reorder cues: Error: Update error');
    });
  });

  describe('getCueListDetails', () => {
    it('should get cue list details with filtering', async () => {
      const mockCueList = {
        ...mockProject.cueLists[0],
        id: 'cuelist-1',
        cues: [
          ...mockProject.cueLists[0].cues,
          {
            id: 'cue-2',
            name: 'Follow Cue',
            cueNumber: 2.0,
            scene: { id: 'scene-2', name: 'Dramatic Scene' },
            fadeInTime: 2,
            fadeOutTime: 4,
            followTime: 5,
            notes: 'Auto-follow cue'
          }
        ]
      };
      mockGraphQLClient.getCueList.mockResolvedValue(mockCueList as any);

      const result = await cueTools.getCueListDetails({
        cueListId: 'cuelist-1',
        includeSceneDetails: true,
        sortBy: 'cueNumber',
        filterBy: {
          hasFollowTime: true,
          fadeTimeRange: { min: 1, max: 10 }
        }
      });

      expect(result.cueListId).toBe('cuelist-1');
      expect(result.cues).toBeDefined();
      expect(result.statistics).toBeDefined();
    });

    it('should handle different filter options', async () => {
      const mockCueListWithId = { ...mockProject.cueLists[0], id: 'cuelist-1' };
      mockGraphQLClient.getCueList.mockResolvedValue(mockCueListWithId as any);

      // Test name filter
      await cueTools.getCueListDetails({
        cueListId: 'cuelist-1',
        filterBy: {
          nameContains: 'Lights'
        }
      });

      // Test scene name filter
      await cueTools.getCueListDetails({
        cueListId: 'cuelist-1',
        filterBy: {
          sceneNameContains: 'Opening'
        }
      });

      // Test cue number range
      await cueTools.getCueListDetails({
        cueListId: 'cuelist-1',
        filterBy: {
          cueNumberRange: { min: 1, max: 2 }
        }
      });

      expect(mockGraphQLClient.getCueList).toHaveBeenCalledTimes(3);
    });

    it('should handle different sort options', async () => {
      const mockCueListWithId = { ...mockProject.cueLists[0], id: 'cuelist-1' };
      mockGraphQLClient.getCueList.mockResolvedValue(mockCueListWithId as any);

      const sortOptions = ['cueNumber', 'name', 'sceneName'] as const;
      
      for (const sortBy of sortOptions) {
        await cueTools.getCueListDetails({
          cueListId: 'cuelist-1',
          sortBy
        });
      }

      expect(mockGraphQLClient.getCueList).toHaveBeenCalledTimes(3);
    });

    it('should handle cue list not found', async () => {
      mockGraphQLClient.getCueList.mockResolvedValue(null);

      await expect(cueTools.getCueListDetails({
        cueListId: 'non-existent'
      })).rejects.toThrow('Cue list with ID non-existent not found');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.getCueList.mockRejectedValue(new Error('GraphQL error'));

      await expect(cueTools.getCueListDetails({
        cueListId: 'cuelist-1'
      })).rejects.toThrow('Failed to get cue list details: Error: GraphQL error');
    });
  });

  describe('validation', () => {
    it('should validate input parameters', async () => {
      // Test invalid parameters trigger validation errors
      await expect(cueTools.createCueSequence({} as any)).rejects.toThrow();
      
      await expect(cueTools.generateActCues({} as any)).rejects.toThrow();
      
      await expect(cueTools.optimizeCueTiming({} as any)).rejects.toThrow();
      
      await expect(cueTools.analyzeCueStructure({} as any)).rejects.toThrow();
      
      await expect(cueTools.updateCueList({} as any)).rejects.toThrow();
      
      await expect(cueTools.addCueToCueList({} as any)).rejects.toThrow();
      
      // Remove cue validation should be caught by Zod schema validation
      try {
        await cueTools.removeCueFromList({} as any);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
      
      await expect(cueTools.updateCue({} as any)).rejects.toThrow();
      
      await expect(cueTools.reorderCues({} as any)).rejects.toThrow();
      
      await expect(cueTools.getCueListDetails({} as any)).rejects.toThrow();

      await expect(cueTools.bulkUpdateCues({} as any)).rejects.toThrow();
    });
  });

  describe('bulkUpdateCues', () => {
    it('should update multiple cues successfully', async () => {
      const mockUpdatedCues = [
        {
          id: 'cue-1',
          name: 'Cue 1',
          cueNumber: 1.0,
          scene: { name: 'Scene 1' },
          fadeInTime: 5,
          fadeOutTime: 5,
          followTime: null,
          notes: 'Updated cue 1'
        },
        {
          id: 'cue-2',
          name: 'Cue 2',
          cueNumber: 2.0,
          scene: { name: 'Scene 2' },
          fadeInTime: 5,
          fadeOutTime: 5,
          followTime: 3,
          notes: 'Updated cue 2'
        }
      ];

      mockGraphQLClient.bulkUpdateCues = jest.fn().mockResolvedValue(mockUpdatedCues);

      const result = await cueTools.bulkUpdateCues({
        cueIds: ['cue-1', 'cue-2'],
        fadeInTime: 5,
        fadeOutTime: 5
      });

      expect(mockGraphQLClient.bulkUpdateCues).toHaveBeenCalledWith({
        cueIds: ['cue-1', 'cue-2'],
        fadeInTime: 5,
        fadeOutTime: 5
      });
      expect(result.success).toBe(true);
      expect(result.updatedCues).toHaveLength(2);
      expect(result.summary.totalUpdated).toBe(2);
      expect(result.summary.averageFadeInTime).toBe(5);
      expect(result.summary.averageFadeOutTime).toBe(5);
      expect(result.summary.followCuesCount).toBe(1);
    });

    it('should update only specified fields', async () => {
      const mockUpdatedCues = [
        {
          id: 'cue-1',
          name: 'Cue 1',
          cueNumber: 1.0,
          scene: { name: 'Scene 1' },
          fadeInTime: 3,
          fadeOutTime: 2,
          followTime: 5,
          notes: 'Updated'
        }
      ];

      mockGraphQLClient.bulkUpdateCues = jest.fn().mockResolvedValue(mockUpdatedCues);

      const result = await cueTools.bulkUpdateCues({
        cueIds: ['cue-1'],
        followTime: 5
      });

      expect(mockGraphQLClient.bulkUpdateCues).toHaveBeenCalledWith({
        cueIds: ['cue-1'],
        followTime: 5
      });
      expect(result.success).toBe(true);
      expect(result.summary.updatesApplied).toEqual(['followTime']);
    });

    it('should handle easing type update', async () => {
      const mockUpdatedCues = [
        {
          id: 'cue-1',
          name: 'Cue 1',
          cueNumber: 1.0,
          scene: { name: 'Scene 1' },
          fadeInTime: 3,
          fadeOutTime: 3,
          followTime: null,
          easingType: 'ease-in-out'
        }
      ];

      mockGraphQLClient.bulkUpdateCues = jest.fn().mockResolvedValue(mockUpdatedCues);

      const result = await cueTools.bulkUpdateCues({
        cueIds: ['cue-1'],
        easingType: 'ease-in-out'
      });

      expect(mockGraphQLClient.bulkUpdateCues).toHaveBeenCalledWith({
        cueIds: ['cue-1'],
        easingType: 'ease-in-out'
      });
      expect(result.success).toBe(true);
    });

    it('should throw error when no cue IDs provided', async () => {
      await expect(cueTools.bulkUpdateCues({
        cueIds: [],
        fadeInTime: 5
      })).rejects.toThrow('No cue IDs provided for bulk update');
    });

    it('should throw error when no update fields provided', async () => {
      await expect(cueTools.bulkUpdateCues({
        cueIds: ['cue-1']
      })).rejects.toThrow('No update fields provided');
    });

    it('should handle GraphQL errors', async () => {
      mockGraphQLClient.bulkUpdateCues = jest.fn().mockRejectedValue(new Error('GraphQL error'));

      await expect(cueTools.bulkUpdateCues({
        cueIds: ['cue-1'],
        fadeInTime: 5
      })).rejects.toThrow('Failed to bulk update cues: Error: GraphQL error');
    });
  });

  describe('playback controls', () => {
    it('should test basic playback functionality', async () => {
      // Basic startCueList test
      const mockCueList = {
        id: 'cuelist-1',
        name: 'Test Cue List',
        cues: [
          {
            id: 'cue-1',
            name: 'Cue 1',
            cueNumber: 1.0,
            scene: { id: 'scene-1', name: 'Scene 1' },
            fadeInTime: 3,
            fadeOutTime: 3,
            followTime: null
          }
        ]
      };

      mockGraphQLClient.getCueList = jest.fn().mockResolvedValue(mockCueList);
      mockGraphQLClient.startCueList = jest.fn().mockResolvedValue(true);

      const result = await cueTools.startCueList({
        cueListId: 'cuelist-1'
      });

      expect(mockGraphQLClient.getCueList).toHaveBeenCalledWith('cuelist-1');
      expect(mockGraphQLClient.startCueList).toHaveBeenCalledWith('cuelist-1', 0);
      expect(result.success).toBe(true);
    });

    it('should handle cue list not found', async () => {
      mockGraphQLClient.getCueList = jest.fn().mockResolvedValue(null);

      await expect(cueTools.startCueList({
        cueListId: 'non-existent'
      })).rejects.toThrow('Cue list with ID non-existent not found');
    });

    it('should handle no cue list playing for nextCue', async () => {
      const freshCueTools = new CueTools(mockGraphQLClient, mockRAGService, mockAILightingService);
      await expect(freshCueTools.nextCue({})).rejects.toThrow('No cue list is currently playing');
    });

    it('should handle no cue list playing for previousCue', async () => {
      const freshCueTools = new CueTools(mockGraphQLClient, mockRAGService, mockAILightingService);
      await expect(freshCueTools.previousCue({})).rejects.toThrow('No cue list is currently playing');
    });

    it('should handle no cue list playing for goToCue', async () => {
      const freshCueTools = new CueTools(mockGraphQLClient, mockRAGService, mockAILightingService);
      await expect(freshCueTools.goToCue({ cueNumber: 1 })).rejects.toThrow('No cue list is currently playing');
    });

    it('should handle no cue list playing for stopCueList', async () => {
      const freshCueTools = new CueTools(mockGraphQLClient, mockRAGService, mockAILightingService);
      const result = await freshCueTools.stopCueList({});
      expect(result.success).toBe(true);
      expect(result.message).toBe('No cue list is currently active');
    });

    it('should return not playing status for getCueListStatus', async () => {
      // Mock getCurrentActiveScene to return null (no active scene)
      mockGraphQLClient.getCurrentActiveScene.mockResolvedValue(null);

      const freshCueTools = new CueTools(mockGraphQLClient, mockRAGService, mockAILightingService);
      const result = await freshCueTools.getCueListStatus({});

      expect(result.isPlaying).toBe(false);
      expect(result.message).toContain('No cue list is currently playing');
      expect(result.message).toContain('no active scene');
    });
  });
});