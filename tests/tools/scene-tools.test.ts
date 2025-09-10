import { SceneTools } from '../../src/tools/scene-tools';
import { LacyLightsGraphQLClient } from '../../src/services/graphql-client-simple';
import { RAGService } from '../../src/services/rag-service-simple';
import { AILightingService } from '../../src/services/ai-lighting';
import { FixtureType, ChannelType } from '../../src/types/lighting';

// Mock all dependencies
jest.mock('../../src/services/graphql-client-simple');
jest.mock('../../src/services/rag-service-simple');
jest.mock('../../src/services/ai-lighting');

const MockGraphQLClient = LacyLightsGraphQLClient as jest.MockedClass<typeof LacyLightsGraphQLClient>;
const MockRAGService = RAGService as jest.MockedClass<typeof RAGService>;
const MockAILightingService = AILightingService as jest.MockedClass<typeof AILightingService>;

describe('SceneTools', () => {
  let sceneTools: SceneTools;
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
        modeName: 'Standard',
        channelCount: 3,
        channels: [
          { id: 'ch1', offset: 0, name: 'Red', type: ChannelType.RED, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch2', offset: 1, name: 'Green', type: ChannelType.GREEN, minValue: 0, maxValue: 255, defaultValue: 0 },
          { id: 'ch3', offset: 2, name: 'Blue', type: ChannelType.BLUE, minValue: 0, maxValue: 255, defaultValue: 0 }
        ],
        universe: 1,
        startChannel: 1,
        tags: ['wash'],
        definitionId: 'def-1',
        description: 'Test fixture'
      }
    ],
    scenes: [
      {
        id: 'scene-1',
        name: 'Test Scene',
        description: 'Test scene description',
        fixtureValues: []
      }
    ],
    cueLists: []
  };

  const mockGeneratedScene = {
    name: 'Romantic Scene',
    description: 'A romantic lighting scene',
    fixtureValues: [
      {
        fixtureId: 'fixture-1',
        channelValues: [255, 128, 64]
      }
    ],
    reasoning: 'Warm colors for romantic atmosphere'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGraphQLClient = {
      getProject: jest.fn(),
      createScene: jest.fn(),
      updateScene: jest.fn(),
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

    sceneTools = new SceneTools(mockGraphQLClient, mockRAGService, mockAILightingService);
  });

  describe('constructor', () => {
    it('should create SceneTools instance', () => {
      expect(sceneTools).toBeInstanceOf(SceneTools);
    });
  });

  describe('generateScene', () => {
    it('should generate a full scene', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockResolvedValue(mockGeneratedScene);
      mockAILightingService.optimizeSceneForFixtures.mockResolvedValue(mockGeneratedScene);
      
      const mockCreatedScene = {
        id: 'scene-id',
        name: 'Romantic Scene',
        description: 'A romantic lighting scene',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channelValues: [255, 128, 64]
        }]
      };
      mockGraphQLClient.createScene.mockResolvedValue(mockCreatedScene as any);

      const result = await sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Romantic dinner scene',
        sceneType: 'full',
        designPreferences: {
          mood: 'romantic',
          intensity: 'moderate'
        }
      });

      expect(mockGraphQLClient.getProject).toHaveBeenCalledWith('project-1');
      expect(mockAILightingService.generateScene).toHaveBeenCalled();
      expect(mockGraphQLClient.createScene).toHaveBeenCalled();
      expect(result.sceneId).toBe('scene-id');
      expect(result.scene?.name).toBe('Romantic Scene');
    });

    it('should generate an additive scene', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockResolvedValue(mockGeneratedScene);
      mockAILightingService.optimizeSceneForFixtures.mockResolvedValue(mockGeneratedScene);
      
      const mockCreatedScene = {
        id: 'scene-id',
        name: 'Romantic Scene',
        description: 'A romantic lighting scene',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channelValues: [255, 128, 64]
        }]
      };
      mockGraphQLClient.createScene.mockResolvedValue(mockCreatedScene as any);

      const result = await sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Romantic dinner scene',
        sceneType: 'additive',
        fixtureFilter: {
          includeTags: ['wash']
        }
      });

      expect(result.sceneId).toBe('scene-id');
      expect(result.scene?.name).toBe('Romantic Scene');
    });

    it('should filter fixtures by include types', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockResolvedValue(mockGeneratedScene);
      mockAILightingService.optimizeSceneForFixtures.mockResolvedValue(mockGeneratedScene);
      const mockCreatedScene = {
        id: 'scene-id',
        name: 'Romantic Scene',
        description: 'A romantic lighting scene',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channelValues: [255, 128, 64]
        }]
      };
      mockGraphQLClient.createScene.mockResolvedValue(mockCreatedScene as any);

      const result = await sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Test scene',
        sceneType: 'full',
        fixtureFilter: {
          includeTypes: ['LED_PAR']
        }
      });

      expect(mockAILightingService.generateScene).toHaveBeenCalled();
      expect(result.sceneId).toBe('scene-id');
    });

    it('should filter fixtures by exclude types', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockResolvedValue(mockGeneratedScene);
      mockAILightingService.optimizeSceneForFixtures.mockResolvedValue(mockGeneratedScene);
      const mockCreatedScene = {
        id: 'scene-id',
        name: 'Romantic Scene',
        description: 'A romantic lighting scene',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channelValues: [255, 128, 64]
        }]
      };
      mockGraphQLClient.createScene.mockResolvedValue(mockCreatedScene as any);

      const result = await sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Test scene',
        sceneType: 'full',
        fixtureFilter: {
          excludeTypes: ['STROBE']
        }
      });

      expect(mockAILightingService.generateScene).toHaveBeenCalled();
      expect(result.sceneId).toBe('scene-id');
    });

    it('should handle script context', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockResolvedValue(mockGeneratedScene);
      mockAILightingService.optimizeSceneForFixtures.mockResolvedValue(mockGeneratedScene);
      const mockCreatedScene = {
        id: 'scene-id',
        name: 'Romantic Scene',
        description: 'A romantic lighting scene',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channelValues: [255, 128, 64]
        }]
      };
      mockGraphQLClient.createScene.mockResolvedValue(mockCreatedScene as any);

      const result = await sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Test scene',
        sceneType: 'full',
        scriptContext: 'Act 1, Scene 2'
      });

      expect(mockAILightingService.generateScene).toHaveBeenCalledWith(
        expect.objectContaining({
          scriptContext: 'Act 1, Scene 2'
        })
      );
      expect(result.sceneId).toBe('scene-id');
    });

    it('should handle design preferences', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockResolvedValue(mockGeneratedScene);
      mockAILightingService.optimizeSceneForFixtures.mockResolvedValue(mockGeneratedScene);
      const mockCreatedScene = {
        id: 'scene-id',
        name: 'Romantic Scene',
        description: 'A romantic lighting scene',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channelValues: [255, 128, 64]
        }]
      };
      mockGraphQLClient.createScene.mockResolvedValue(mockCreatedScene as any);

      const result = await sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Test scene',
        sceneType: 'full',
        designPreferences: {
          colorPalette: ['red', 'blue'],
          mood: 'dramatic',
          intensity: 'dramatic',
          focusAreas: ['center stage']
        }
      });

      expect(mockAILightingService.generateScene).toHaveBeenCalledWith(
        expect.objectContaining({
          designPreferences: {
            colorPalette: ['red', 'blue'],
            mood: 'dramatic',
            intensity: 'dramatic',
            focusAreas: ['center stage']
          }
        })
      );
      expect(result.sceneId).toBe('scene-id');
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(sceneTools.generateScene({
        projectId: 'non-existent',
        sceneDescription: 'Test scene',
        sceneType: 'full'
      })).rejects.toThrow('Project with ID non-existent not found');
    });

    it('should handle scene generation errors', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockRejectedValue(new Error('AI Error'));

      await expect(sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Test scene',
        sceneType: 'full'
      })).rejects.toThrow('Failed to generate scene: Error: AI Error');
    });
  });

  describe('analyzeScript', () => {
    it('should analyze script with default options', async () => {
      const mockAnalysis = {
        scenes: [
          {
            sceneNumber: '1',
            title: 'Opening',
            content: 'Act 1, Scene 1',
            mood: 'dramatic',
            characters: ['Alice', 'Bob'],
            stageDirections: ['Lights up'],
            lightingCues: ['Cue 1'],
            timeOfDay: 'evening',
            location: 'living room'
          }
        ],
        characters: ['Alice', 'Bob'],
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

      mockRAGService.analyzeScript.mockResolvedValue(mockAnalysis);
      mockRAGService.generateLightingRecommendations.mockResolvedValue(mockRecommendations);

      const result = await sceneTools.analyzeScript({
        scriptText: 'Test script text',
        extractLightingCues: true,
        suggestScenes: true
      });

      expect(mockRAGService.analyzeScript).toHaveBeenCalledWith('Test script text');
      expect(result.analysis).toEqual(mockAnalysis);
      expect(result.lightingCues).toBeDefined();
      expect(result.sceneTemplates).toBeDefined();
    });

    it('should analyze script without extracting cues', async () => {
      const mockAnalysis = {
        scenes: [],
        characters: [],
        settings: [],
        overallMood: 'neutral',
        themes: []
      };

      mockRAGService.analyzeScript.mockResolvedValue(mockAnalysis);

      const result = await sceneTools.analyzeScript({
        scriptText: 'Test script text',
        extractLightingCues: false,
        suggestScenes: false
      });

      expect(result.lightingCues).toBeUndefined();
      expect(result.sceneTemplates).toBeUndefined();
    });

    it('should handle script analysis errors', async () => {
      mockRAGService.analyzeScript.mockRejectedValue(new Error('Analysis error'));

      await expect(sceneTools.analyzeScript({
        scriptText: 'Test script',
        extractLightingCues: true,
        suggestScenes: true
      })).rejects.toThrow('Failed to analyze script: Error: Analysis error');
    });
  });

  describe('optimizeScene', () => {
    it('should optimize scene for dramatic impact', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await sceneTools.optimizeScene({
        sceneId: 'scene-1',
        projectId: 'project-1',
        optimizationGoals: ['dramatic_impact']
      });

      expect(mockGraphQLClient.getProject).toHaveBeenCalledWith('project-1');
      expect(result.sceneId).toBe('scene-1');
      expect(result.optimizations).toBeDefined();
    });

    it('should handle multiple optimization goals', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await sceneTools.optimizeScene({
        sceneId: 'scene-1',
        projectId: 'project-1',
        optimizationGoals: ['energy_efficiency', 'color_accuracy']
      });

      expect(result.optimizations).toHaveLength(2);
    });

    it('should handle scene not found', async () => {
      const projectWithoutScene = {
        ...mockProject,
        scenes: []
      };
      mockGraphQLClient.getProject.mockResolvedValue(projectWithoutScene as any);

      await expect(sceneTools.optimizeScene({
        sceneId: 'non-existent',
        projectId: 'project-1',
        optimizationGoals: ['dramatic_impact']
      })).rejects.toThrow('Scene with ID non-existent not found');
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(sceneTools.optimizeScene({
        sceneId: 'scene-1',
        projectId: 'non-existent',
        optimizationGoals: ['dramatic_impact']
      })).rejects.toThrow('Project with ID non-existent not found');
    });

    it('should handle optimization errors', async () => {
      mockGraphQLClient.getProject.mockRejectedValue(new Error('Optimization error'));

      await expect(sceneTools.optimizeScene({
        sceneId: 'scene-1',
        projectId: 'project-1',
        optimizationGoals: ['dramatic_impact']
      })).rejects.toThrow('Failed to optimize scene: Error: Optimization error');
    });
  });

  describe('updateScene', () => {
    it('should update scene with new name and fixture values', async () => {
      const updatedScene = {
        id: 'scene-1',
        name: 'Updated Scene',
        description: 'Updated description',
        updatedAt: '2023-01-01T00:00:00Z',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1' },
          channelValues: [255, 0, 0]
        }]
      };

      mockGraphQLClient.updateScene.mockResolvedValue(updatedScene as any);

      const result = await sceneTools.updateScene({
        sceneId: 'scene-1',
        name: 'Updated Scene',
        description: 'Updated description',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channelValues: [255, 0, 0]
          }
        ]
      });

      expect(mockGraphQLClient.updateScene).toHaveBeenCalledWith('scene-1', {
        name: 'Updated Scene',
        description: 'Updated description',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channelValues: [255, 0, 0]
          }
        ]
      });
      expect(result.sceneId).toBe('scene-1');
      expect(result.scene.name).toBe('Updated Scene');
    });

    it('should update scene with minimal data', async () => {
      const updatedScene = {
        id: 'scene-1',
        name: 'Scene 1',
        description: 'Test description',
        updatedAt: '2023-01-01T00:00:00Z',
        fixtureValues: []
      };

      mockGraphQLClient.updateScene.mockResolvedValue(updatedScene as any);

      const result = await sceneTools.updateScene({
        sceneId: 'scene-1'
      });

      expect(mockGraphQLClient.updateScene).toHaveBeenCalledWith('scene-1', {});
      expect(result.sceneId).toBe('scene-1');
      expect(result.scene.name).toBe('Scene 1');
    });

    it('should handle update errors', async () => {
      mockGraphQLClient.updateScene.mockRejectedValue(new Error('Update error'));

      await expect(sceneTools.updateScene({
        sceneId: 'scene-1',
        name: 'Updated Scene'
      })).rejects.toThrow('Failed to update scene: Error: Update error');
    });
  });

  describe('validation', () => {
    it('should validate input parameters', async () => {
      // Test invalid parameters trigger validation errors
      await expect(sceneTools.generateScene({} as any)).rejects.toThrow();
      
      await expect(sceneTools.analyzeScript({} as any)).rejects.toThrow();
      
      await expect(sceneTools.optimizeScene({} as any)).rejects.toThrow();
      
      await expect(sceneTools.updateScene({} as any)).rejects.toThrow();
    });

    it('should validate channel values range in updateScene', async () => {
      await expect(sceneTools.updateScene({
        sceneId: 'scene-1',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channelValues: [300] // Out of range
          }
        ]
      })).rejects.toThrow();
    });

    it('should validate channel values minimum in updateScene', async () => {
      await expect(sceneTools.updateScene({
        sceneId: 'scene-1',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channelValues: [-10] // Below minimum
          }
        ]
      })).rejects.toThrow();
    });
  });
});