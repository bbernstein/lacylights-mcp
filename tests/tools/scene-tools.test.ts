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
      expect(result.status).toBe('not_implemented');
      expect(result.recommendations).toBeDefined();
      expect(result.requestedGoals).toContain('dramatic_impact');
    });

    it('should handle multiple optimization goals', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await sceneTools.optimizeScene({
        sceneId: 'scene-1',
        projectId: 'project-1',
        optimizationGoals: ['energy_efficiency', 'color_accuracy']
      });

      expect(result.requestedGoals).toHaveLength(2);
      expect(result.requestedGoals).toContain('energy_efficiency');
      expect(result.requestedGoals).toContain('color_accuracy');
      expect(result.recommendations.length).toBeGreaterThan(0);
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

  // ✨ SAFE SCENE MANAGEMENT TESTS
  describe('Safe Scene Management Functions', () => {
    const mockScene = {
      id: 'scene-1',
      name: 'Test Scene',
      description: 'Test scene description',
      updatedAt: '2023-01-01T00:00:00Z',
      fixtureValues: [
        {
          fixture: { id: 'fixture-1', name: 'LED Par 1' },
          channelValues: [255, 128, 64],
          sceneOrder: 1
        },
        {
          fixture: { id: 'fixture-2', name: 'LED Par 2' },
          channelValues: [128, 255, 32],
          sceneOrder: 2
        }
      ]
    };

    beforeEach(() => {
      // Add new methods to mock GraphQL client
      mockGraphQLClient.addFixturesToScene = jest.fn();
      mockGraphQLClient.removeFixturesFromScene = jest.fn();
      mockGraphQLClient.updateScenePartial = jest.fn();
      mockGraphQLClient.getScene = jest.fn();
    });

    describe('addFixturesToScene', () => {
      it('should add fixtures to scene with overwrite disabled', async () => {
        mockGraphQLClient.addFixturesToScene.mockResolvedValue(mockScene as any);

        const result = await sceneTools.addFixturesToScene({
          sceneId: 'scene-1',
          fixtureValues: [
            {
              fixtureId: 'fixture-3',
              channelValues: [200, 100, 50],
              sceneOrder: 3
            }
          ],
          overwriteExisting: false
        });

        expect(mockGraphQLClient.addFixturesToScene).toHaveBeenCalledWith(
          'scene-1',
          [{ fixtureId: 'fixture-3', channelValues: [200, 100, 50], sceneOrder: 3 }],
          false
        );
        expect(result.sceneId).toBe('scene-1');
        expect(result.scene.name).toBe('Test Scene');
        expect(result.fixturesAdded).toBe(1);
        expect(result.overwriteMode).toBe(false);
        expect(result.scene.fixtureValues).toHaveLength(2);
        expect(result.scene.fixtureValues[0].sceneOrder).toBe(1);
        expect(result.message).toContain('(preserving existing)');
      });

      it('should add fixtures to scene with overwrite enabled', async () => {
        mockGraphQLClient.addFixturesToScene.mockResolvedValue(mockScene as any);

        const result = await sceneTools.addFixturesToScene({
          sceneId: 'scene-1',
          fixtureValues: [
            {
              fixtureId: 'fixture-1',
              channelValues: [100, 200, 150]
            }
          ],
          overwriteExisting: true
        });

        expect(mockGraphQLClient.addFixturesToScene).toHaveBeenCalledWith(
          'scene-1',
          [{ fixtureId: 'fixture-1', channelValues: [100, 200, 150] }],
          true
        );
        expect(result.overwriteMode).toBe(true);
        expect(result.message).toContain('(overwriting existing)');
      });

      it('should add multiple fixtures to scene', async () => {
        mockGraphQLClient.addFixturesToScene.mockResolvedValue(mockScene as any);

        const result = await sceneTools.addFixturesToScene({
          sceneId: 'scene-1',
          fixtureValues: [
            { fixtureId: 'fixture-3', channelValues: [200, 100, 50] },
            { fixtureId: 'fixture-4', channelValues: [150, 200, 100] }
          ],
          overwriteExisting: false
        });

        expect(result.fixturesAdded).toBe(2);
        expect(result.scene.totalFixtures).toBe(2);
      });

      it('should handle addFixturesToScene errors', async () => {
        mockGraphQLClient.addFixturesToScene.mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.addFixturesToScene({
          sceneId: 'scene-1',
          fixtureValues: [{ fixtureId: 'fixture-1', channelValues: [255, 0, 0] }],
          overwriteExisting: false
        })).rejects.toThrow('Failed to add fixtures to scene: Error: GraphQL error');
      });

      it('should validate channel values in addFixturesToScene', async () => {
        await expect(sceneTools.addFixturesToScene({
          sceneId: 'scene-1',
          fixtureValues: [
            { fixtureId: 'fixture-1', channelValues: [300] }
          ],
          overwriteExisting: false
        })).rejects.toThrow();
      });

      it('should validate required parameters in addFixturesToScene', async () => {
        await expect(sceneTools.addFixturesToScene({} as any)).rejects.toThrow();
        
        await expect(sceneTools.addFixturesToScene({
          sceneId: 'scene-1'
        } as any)).rejects.toThrow();
      });
    });

    describe('removeFixturesFromScene', () => {
      it('should remove fixtures from scene', async () => {
        const sceneAfterRemoval = {
          ...mockScene,
          fixtureValues: [mockScene.fixtureValues[0]] // Only first fixture remains
        };
        mockGraphQLClient.removeFixturesFromScene.mockResolvedValue(sceneAfterRemoval as any);

        const result = await sceneTools.removeFixturesFromScene({
          sceneId: 'scene-1',
          fixtureIds: ['fixture-2']
        });

        expect(mockGraphQLClient.removeFixturesFromScene).toHaveBeenCalledWith('scene-1', ['fixture-2']);
        expect(result.sceneId).toBe('scene-1');
        expect(result.fixturesRemoved).toBe(1);
        expect(result.scene.totalFixtures).toBe(1);
        expect(result.scene.fixtureValues[0].sceneOrder).toBe(1);
        expect(result.message).toContain('Successfully removed 1 fixtures');
      });

      it('should remove multiple fixtures from scene', async () => {
        const sceneAfterRemoval = {
          ...mockScene,
          fixtureValues: [] // All fixtures removed
        };
        mockGraphQLClient.removeFixturesFromScene.mockResolvedValue(sceneAfterRemoval as any);

        const result = await sceneTools.removeFixturesFromScene({
          sceneId: 'scene-1',
          fixtureIds: ['fixture-1', 'fixture-2']
        });

        expect(result.fixturesRemoved).toBe(2);
        expect(result.scene.totalFixtures).toBe(0);
      });

      it('should handle removeFixturesFromScene errors', async () => {
        mockGraphQLClient.removeFixturesFromScene.mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.removeFixturesFromScene({
          sceneId: 'scene-1',
          fixtureIds: ['fixture-1']
        })).rejects.toThrow('Failed to remove fixtures from scene: Error: GraphQL error');
      });

      it('should validate required parameters in removeFixturesFromScene', async () => {
        await expect(sceneTools.removeFixturesFromScene({} as any)).rejects.toThrow();
        
        await expect(sceneTools.removeFixturesFromScene({
          sceneId: 'scene-1'
        } as any)).rejects.toThrow();
      });
    });

    describe('getSceneFixtureValues', () => {
      it('should get scene fixture values with details', async () => {
        mockGraphQLClient.getScene.mockResolvedValue(mockScene as any);

        const result = await sceneTools.getSceneFixtureValues({
          sceneId: 'scene-1',
          includeFixtureDetails: true
        });

        expect(mockGraphQLClient.getScene).toHaveBeenCalledWith('scene-1');
        expect(result.sceneId).toBe('scene-1');
        expect(result.scene.name).toBe('Test Scene');
        expect(result.scene.totalFixtures).toBe(2);
        expect(result.fixtureValues).toHaveLength(2);
        expect(result.fixtureValues[0].fixtureId).toBe('fixture-1');
        expect(result.fixtureValues[0].fixtureName).toBe('LED Par 1');
        expect(result.fixtureValues[0].channelValues).toEqual([255, 128, 64]);
        expect(result.fixtureValues[0].sceneOrder).toBe(1);
        expect(result.fixtureValues[0].channelCount).toBe(3);
      });

      it('should get scene fixture values without details', async () => {
        mockGraphQLClient.getScene.mockResolvedValue(mockScene as any);

        const result = await sceneTools.getSceneFixtureValues({
          sceneId: 'scene-1',
          includeFixtureDetails: false
        });

        expect(result.fixtureValues[0].fixtureName).toBeUndefined();
      });

      it('should handle scene not found in getSceneFixtureValues', async () => {
        mockGraphQLClient.getScene.mockResolvedValue(null);

        await expect(sceneTools.getSceneFixtureValues({
          sceneId: 'non-existent',
          includeFixtureDetails: true
        })).rejects.toThrow('Scene with ID non-existent not found');
      });

      it('should handle getSceneFixtureValues errors', async () => {
        mockGraphQLClient.getScene.mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.getSceneFixtureValues({
          sceneId: 'scene-1',
          includeFixtureDetails: true
        })).rejects.toThrow('Failed to get scene fixture values: Error: GraphQL error');
      });

      it('should validate required parameters in getSceneFixtureValues', async () => {
        await expect(sceneTools.getSceneFixtureValues({} as any)).rejects.toThrow();
      });
    });

    describe('ensureFixturesInScene', () => {
      it('should ensure fixtures exist in scene (safe add)', async () => {
        mockGraphQLClient.addFixturesToScene.mockResolvedValue(mockScene as any);

        const result = await sceneTools.ensureFixturesInScene({
          sceneId: 'scene-1',
          fixtureValues: [
            { fixtureId: 'fixture-3', channelValues: [200, 100, 50] }
          ]
        });

        expect(mockGraphQLClient.addFixturesToScene).toHaveBeenCalledWith(
          'scene-1',
          [{ fixtureId: 'fixture-3', channelValues: [200, 100, 50] }],
          false // Always safe mode
        );
        expect(result.sceneId).toBe('scene-1');
        expect(result.fixturesAdded).toBe(1);
        expect(result.message).toContain('(only if missing)');
      });

      it('should handle ensureFixturesInScene errors', async () => {
        mockGraphQLClient.addFixturesToScene.mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.ensureFixturesInScene({
          sceneId: 'scene-1',
          fixtureValues: [{ fixtureId: 'fixture-1', channelValues: [255, 0, 0] }]
        })).rejects.toThrow('Failed to ensure fixtures in scene: Error: GraphQL error');
      });

      it('should validate required parameters in ensureFixturesInScene', async () => {
        await expect(sceneTools.ensureFixturesInScene({} as any)).rejects.toThrow();
      });
    });

    describe('updateScenePartial', () => {
      it('should update scene metadata only', async () => {
        const updatedScene = {
          ...mockScene,
          name: 'Updated Scene Name',
          description: 'Updated description'
        };
        mockGraphQLClient.updateScenePartial.mockResolvedValue(updatedScene as any);

        const result = await sceneTools.updateScenePartial({
          sceneId: 'scene-1',
          name: 'Updated Scene Name',
          description: 'Updated description',
          mergeFixtures: true
        });

        expect(mockGraphQLClient.updateScenePartial).toHaveBeenCalledWith('scene-1', {
          name: 'Updated Scene Name',
          description: 'Updated description',
          fixtureValues: undefined,
          mergeFixtures: true
        });
        expect(result.sceneId).toBe('scene-1');
        expect(result.scene.name).toBe('Updated Scene Name');
        expect(result.updateType).toBe('merged');
        expect(result.fixturesUpdated).toBe(0);
        expect(result.message).toContain('(safe merge)');
      });

      it('should update scene with fixture values (merge mode)', async () => {
        mockGraphQLClient.updateScenePartial.mockResolvedValue(mockScene as any);

        const result = await sceneTools.updateScenePartial({
          sceneId: 'scene-1',
          name: 'Updated Scene',
          fixtureValues: [
            { fixtureId: 'fixture-3', channelValues: [200, 100, 50] }
          ],
          mergeFixtures: true
        });

        expect(mockGraphQLClient.updateScenePartial).toHaveBeenCalledWith('scene-1', {
          name: 'Updated Scene',
          description: undefined,
          fixtureValues: [{ fixtureId: 'fixture-3', channelValues: [200, 100, 50] }],
          mergeFixtures: true
        });
        expect(result.updateType).toBe('merged');
        expect(result.fixturesUpdated).toBe(1);
        expect(result.message).toContain('(safe merge)');
      });

      it('should update scene with fixture values (replace mode)', async () => {
        mockGraphQLClient.updateScenePartial.mockResolvedValue(mockScene as any);

        const result = await sceneTools.updateScenePartial({
          sceneId: 'scene-1',
          fixtureValues: [
            { fixtureId: 'fixture-1', channelValues: [100, 200, 150] }
          ],
          mergeFixtures: false
        });

        expect(result.updateType).toBe('replaced');
        expect(result.message).toContain('(full replace)');
      });

      it('should update scene with sceneOrder values', async () => {
        mockGraphQLClient.updateScenePartial.mockResolvedValue(mockScene as any);

        const result = await sceneTools.updateScenePartial({
          sceneId: 'scene-1',
          fixtureValues: [
            { 
              fixtureId: 'fixture-1', 
              channelValues: [255, 128, 64], 
              sceneOrder: 10 
            }
          ],
          mergeFixtures: true
        });

        expect(result.scene.fixtureValues[0].sceneOrder).toBe(1); // From mock response
      });

      it('should handle updateScenePartial errors', async () => {
        mockGraphQLClient.updateScenePartial.mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.updateScenePartial({
          sceneId: 'scene-1',
          name: 'Updated Scene',
          mergeFixtures: true
        })).rejects.toThrow('Failed to update scene partially: Error: GraphQL error');
      });

      it('should validate required parameters in updateScenePartial', async () => {
        await expect(sceneTools.updateScenePartial({} as any)).rejects.toThrow();
      });

      it('should validate channel values in updateScenePartial', async () => {
        await expect(sceneTools.updateScenePartial({
          sceneId: 'scene-1',
          fixtureValues: [
            { fixtureId: 'fixture-1', channelValues: [500] }
          ],
          mergeFixtures: true
        })).rejects.toThrow();
      });
    });

    describe('API Consistency', () => {
      it('should return consistent fixture value structure across all methods', async () => {
        mockGraphQLClient.addFixturesToScene.mockResolvedValue(mockScene as any);
        mockGraphQLClient.removeFixturesFromScene.mockResolvedValue(mockScene as any);
        mockGraphQLClient.updateScenePartial.mockResolvedValue(mockScene as any);
        mockGraphQLClient.getScene.mockResolvedValue(mockScene as any);

        const addResult = await sceneTools.addFixturesToScene({
          sceneId: 'scene-1',
          fixtureValues: [{ fixtureId: 'fixture-1', channelValues: [255, 0, 0] }],
          overwriteExisting: false
        });

        const removeResult = await sceneTools.removeFixturesFromScene({
          sceneId: 'scene-1',
          fixtureIds: ['fixture-1']
        });

        const updateResult = await sceneTools.updateScenePartial({
          sceneId: 'scene-1',
          name: 'Updated',
          mergeFixtures: true
        });

        // Verify all methods return sceneOrder field
        expect(addResult.scene.fixtureValues[0]).toHaveProperty('sceneOrder');
        expect(removeResult.scene.fixtureValues[0]).toHaveProperty('sceneOrder');
        expect(updateResult.scene.fixtureValues[0]).toHaveProperty('sceneOrder');

        // Verify consistent structure
        const expectedFixtureStructure = {
          fixture: expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String)
          }),
          channelValues: expect.any(Array),
          sceneOrder: expect.any(Number)
        };

        expect(addResult.scene.fixtureValues[0]).toMatchObject(expectedFixtureStructure);
        expect(removeResult.scene.fixtureValues[0]).toMatchObject(expectedFixtureStructure);
        expect(updateResult.scene.fixtureValues[0]).toMatchObject(expectedFixtureStructure);
      });
    });

    describe('Data Safety', () => {
      it('should prevent accidental data loss with safe defaults', async () => {
        mockGraphQLClient.addFixturesToScene.mockResolvedValue(mockScene as any);

        // Test that default is safe (non-overwriting)
        const result = await sceneTools.addFixturesToScene({
          sceneId: 'scene-1',
          fixtureValues: [{ fixtureId: 'fixture-1', channelValues: [255, 0, 0] }],
          overwriteExisting: false
        });

        expect(mockGraphQLClient.addFixturesToScene).toHaveBeenCalledWith(
          'scene-1',
          [{ fixtureId: 'fixture-1', channelValues: [255, 0, 0] }],
          false
        );
        expect(result.overwriteMode).toBe(false);
      });

      it('should use safe merge mode by default in updateScenePartial', async () => {
        mockGraphQLClient.updateScenePartial.mockResolvedValue(mockScene as any);

        const result = await sceneTools.updateScenePartial({
          sceneId: 'scene-1',
          name: 'Updated',
          mergeFixtures: true
        });

        expect(mockGraphQLClient.updateScenePartial).toHaveBeenCalledWith('scene-1', {
          name: 'Updated',
          description: undefined,
          fixtureValues: undefined,
          mergeFixtures: true
        });
        expect(result.updateType).toBe('merged');
      });

      it('should always use safe mode in ensureFixturesInScene', async () => {
        mockGraphQLClient.addFixturesToScene.mockResolvedValue(mockScene as any);

        await sceneTools.ensureFixturesInScene({
          sceneId: 'scene-1',
          fixtureValues: [{ fixtureId: 'fixture-1', channelValues: [255, 0, 0] }]
        });

        expect(mockGraphQLClient.addFixturesToScene).toHaveBeenCalledWith(
          'scene-1',
          [{ fixtureId: 'fixture-1', channelValues: [255, 0, 0] }],
          false // Always safe mode, cannot be overridden
        );
      });
    });
  });

  describe('generateScene - edge cases and error handling', () => {
    it('should require fixtureFilter for additive scenes', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      await expect(sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Test additive scene',
        sceneType: 'additive'
        // Missing fixtureFilter
      })).rejects.toThrow('Additive scenes require fixtureFilter to specify which fixtures to modify');
    });

    it('should throw error when no fixtures match filter criteria', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      await expect(sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Test scene',
        sceneType: 'full',
        fixtureFilter: {
          includeTypes: [FixtureType.STROBE] // No STROBE fixtures in mockProject
        }
      })).rejects.toThrow('No fixtures available matching the specified criteria');
    });

    it('should filter fixtures by includeTags', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockResolvedValue(mockGeneratedScene);
      mockAILightingService.optimizeSceneForFixtures.mockResolvedValue(mockGeneratedScene);
      const mockCreatedScene = {
        id: 'scene-id',
        name: 'Tagged Scene',
        description: 'Scene using tagged fixtures',
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
          includeTags: ['wash']
        }
      });

      expect(result.sceneId).toBe('scene-id');
      expect(mockAILightingService.generateScene).toHaveBeenCalledWith(
        expect.objectContaining({
          availableFixtures: expect.arrayContaining([
            expect.objectContaining({ tags: expect.arrayContaining(['wash']) })
          ])
        })
      );
    });

    it('should handle scene activation success', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockResolvedValue(mockGeneratedScene);
      mockAILightingService.optimizeSceneForFixtures.mockResolvedValue(mockGeneratedScene);
      const mockCreatedScene = {
        id: 'scene-id',
        name: 'Activated Scene',
        description: 'Scene that will be activated',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channelValues: [255, 128, 64]
        }]
      };
      mockGraphQLClient.createScene.mockResolvedValue(mockCreatedScene as any);
      mockGraphQLClient.setSceneLive = jest.fn().mockResolvedValue(true);

      const result = await sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Test scene',
        sceneType: 'full',
        activate: true
      });

      expect(mockGraphQLClient.setSceneLive).toHaveBeenCalledWith('scene-id');
      expect(result.activation).toEqual({
        success: true,
        message: 'Scene "Activated Scene" is now active'
      });
    });

    it('should handle scene activation failure', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockResolvedValue(mockGeneratedScene);
      mockAILightingService.optimizeSceneForFixtures.mockResolvedValue(mockGeneratedScene);
      const mockCreatedScene = {
        id: 'scene-id',
        name: 'Failed Activation Scene',
        description: 'Scene with failed activation',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channelValues: [255, 128, 64]
        }]
      };
      mockGraphQLClient.createScene.mockResolvedValue(mockCreatedScene as any);
      mockGraphQLClient.setSceneLive = jest.fn().mockResolvedValue(false);

      const result = await sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Test scene',
        sceneType: 'full',
        activate: true
      });

      expect(result.activation).toEqual({
        success: false,
        message: 'Scene created but activation failed'
      });
    });

    it('should handle scene activation error exception', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateScene.mockResolvedValue(mockGeneratedScene);
      mockAILightingService.optimizeSceneForFixtures.mockResolvedValue(mockGeneratedScene);
      const mockCreatedScene = {
        id: 'scene-id',
        name: 'Error Activation Scene',
        description: 'Scene with activation error',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channelValues: [255, 128, 64]
        }]
      };
      mockGraphQLClient.createScene.mockResolvedValue(mockCreatedScene as any);
      mockGraphQLClient.setSceneLive = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await sceneTools.generateScene({
        projectId: 'project-1',
        sceneDescription: 'Test scene',
        sceneType: 'full',
        activate: true
      });

      expect(result.activation).toEqual({
        success: false,
        error: 'Scene created but activation failed: Error: Connection failed'
      });
    });
  });

  describe('analyzeScript', () => {
    it('should analyze script and return lighting cues', async () => {
      const mockScriptAnalysis = {
        scenes: [
          {
            sceneNumber: '1',
            title: 'Opening',
            content: 'The stage is dark',
            mood: 'mysterious',
            timeOfDay: 'night',
            location: 'stage',
            characters: ['Actor 1'],
            lightingCues: ['Fade to black', 'Spotlight on center'],
            stageDirections: ['Enter stage left']
          }
        ],
        lightingCues: ['Fade to black', 'Spotlight on center'],
        characters: ['Actor 1'],
        settings: ['stage'],
        overallMood: 'mysterious',
        themes: ['mystery']
      };

      mockRAGService.analyzeScript.mockResolvedValue(mockScriptAnalysis);
      mockRAGService.generateLightingRecommendations.mockResolvedValue({
        colorSuggestions: ['blue', 'dark'],
        intensityLevels: { key: 30 },
        focusAreas: ['center'],
        reasoning: 'Mysterious mood'
      });

      const result = await sceneTools.analyzeScript({
        scriptText: 'Act 1, Scene 1. The stage is dark.',
        extractLightingCues: true,
        suggestScenes: true
      });

      expect(mockRAGService.analyzeScript).toHaveBeenCalledWith('Act 1, Scene 1. The stage is dark.');
      expect(result.analysis).toBeDefined();
      expect(result.lightingCues).toBeDefined();
      expect(result.sceneTemplates).toBeDefined();
    });

    it('should handle script without extracting cues', async () => {
      const mockScriptAnalysis = {
        scenes: [],
        lightingCues: [],
        characters: [],
        settings: [],
        overallMood: 'neutral',
        themes: []
      };

      mockRAGService.analyzeScript.mockResolvedValue(mockScriptAnalysis);

      const result = await sceneTools.analyzeScript({
        scriptText: 'Simple script',
        extractLightingCues: false,
        suggestScenes: false
      });

      expect(result.analysis).toBeDefined();
      expect(result.lightingCues).toBeUndefined();
      expect(result.sceneTemplates).toBeUndefined();
    });

    it('should handle blackout and snap cues with different timings', async () => {
      const mockScriptAnalysis = {
        scenes: [
          {
            sceneNumber: '1',
            title: 'Action Scene',
            content: 'Sudden action',
            mood: 'tense',
            timeOfDay: 'day',
            location: 'stage',
            characters: [],
            lightingCues: ['Blackout', 'Snap to full', 'Flash effect', 'Lights out', 'Fade slowly', 'Dim lights'],
            stageDirections: []
          }
        ],
        lightingCues: [],
        characters: [],
        settings: [],
        overallMood: 'tense',
        themes: []
      };

      mockRAGService.analyzeScript.mockResolvedValue(mockScriptAnalysis);
      mockRAGService.generateLightingRecommendations.mockResolvedValue({
        colorSuggestions: ['red', 'orange', 'yellow', 'blue'],
        intensityLevels: { main: 85, key: 90 },
        focusAreas: ['left', 'right', 'center'],
        reasoning: 'High energy scene'
      });

      const result = await sceneTools.analyzeScript({
        scriptText: 'Action packed scene.',
        extractLightingCues: true,
        suggestScenes: true
      });

      expect(result.lightingCues).toBeDefined();
      // Should have called suggestCueTiming with different cue types
      expect(result.sceneTemplates).toBeDefined();
    });

    it('should estimate fixture needs based on recommendations', async () => {
      const mockScriptAnalysis = {
        scenes: [
          {
            sceneNumber: '1',
            title: 'Complex Scene',
            content: 'Complex lighting',
            mood: 'dramatic',
            timeOfDay: 'night',
            location: 'stage',
            characters: [],
            lightingCues: [],
            stageDirections: []
          }
        ],
        lightingCues: [],
        characters: [],
        settings: [],
        overallMood: 'dramatic',
        themes: []
      };

      mockRAGService.analyzeScript.mockResolvedValue(mockScriptAnalysis);
      mockRAGService.generateLightingRecommendations.mockResolvedValue({
        colorSuggestions: ['red', 'blue', 'green', 'amber'],
        intensityLevels: { main: 25, key: 20 },
        focusAreas: ['left', 'center', 'right'],
        reasoning: 'Complex scene'
      });

      const result = await sceneTools.analyzeScript({
        scriptText: 'Complex scene.',
        extractLightingCues: false,
        suggestScenes: true
      });

      expect(result.sceneTemplates).toBeDefined();
      // Should estimate fixture needs based on focus areas and colors
    });
  });

  describe('activateScene', () => {
    it('should activate scene by sceneId', async () => {
      const mockScene = {
        id: 'scene-1',
        name: 'Test Scene',
        description: 'Test description',
        fixtureValues: [{ fixture: mockProject.fixtures[0], channelValues: [255, 0, 0] }]
      };

      mockGraphQLClient.setSceneLive = jest.fn().mockResolvedValue(true);
      mockGraphQLClient.getScene = jest.fn().mockResolvedValue(mockScene as any);

      const result = await sceneTools.activateScene({
        sceneId: 'scene-1'
      });

      expect(mockGraphQLClient.setSceneLive).toHaveBeenCalledWith('scene-1');
      expect(result.success).toBe(true);
      expect(result.scene.id).toBe('scene-1');
      expect(result.message).toContain('Test Scene');
    });

    it('should activate scene by sceneName with projectId', async () => {
      const mockScene = {
        id: 'scene-1',
        name: 'Test Scene',
        description: 'Test description',
        fixtureValues: [{ fixture: mockProject.fixtures[0], channelValues: [255, 0, 0] }]
      };

      mockGraphQLClient.getProject.mockResolvedValue({
        ...mockProject,
        scenes: [mockScene]
      } as any);
      mockGraphQLClient.setSceneLive = jest.fn().mockResolvedValue(true);
      mockGraphQLClient.getScene = jest.fn().mockResolvedValue(mockScene as any);

      const result = await sceneTools.activateScene({
        projectId: 'project-1',
        sceneName: 'Test Scene'
      });

      expect(result.success).toBe(true);
      expect(result.scene.name).toBe('Test Scene');
    });

    it('should activate scene by sceneName across all projects', async () => {
      const mockScene = {
        id: 'scene-1',
        name: 'Test Scene',
        description: 'Test description',
        fixtureValues: [{ fixture: mockProject.fixtures[0], channelValues: [255, 0, 0] }]
      };

      mockGraphQLClient.getProjects = jest.fn().mockResolvedValue([{
        ...mockProject,
        scenes: [mockScene]
      }] as any);
      mockGraphQLClient.setSceneLive = jest.fn().mockResolvedValue(true);
      mockGraphQLClient.getScene = jest.fn().mockResolvedValue(mockScene as any);

      const result = await sceneTools.activateScene({
        sceneName: 'Test Scene'
      });

      expect(result.success).toBe(true);
      expect(result.scene.name).toBe('Test Scene');
    });

    it('should handle partial scene name match', async () => {
      const mockScene = {
        id: 'scene-1',
        name: 'Opening Scene',
        description: 'Test description',
        fixtureValues: [{ fixture: mockProject.fixtures[0], channelValues: [255, 0, 0] }]
      };

      mockGraphQLClient.getProject.mockResolvedValue({
        ...mockProject,
        scenes: [mockScene]
      } as any);
      mockGraphQLClient.setSceneLive = jest.fn().mockResolvedValue(true);
      mockGraphQLClient.getScene = jest.fn().mockResolvedValue(mockScene as any);

      const result = await sceneTools.activateScene({
        projectId: 'project-1',
        sceneName: 'opening'
      });

      expect(result.success).toBe(true);
      expect(result.scene.name).toBe('Opening Scene');
    });

    it('should throw error when neither sceneId nor sceneName provided', async () => {
      await expect(sceneTools.activateScene({})).rejects.toThrow('Either sceneId or sceneName must be provided');
    });

    it('should throw error when scene not found by name in project', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      await expect(sceneTools.activateScene({
        projectId: 'project-1',
        sceneName: 'NonExistent Scene'
      })).rejects.toThrow('Scene with name "NonExistent Scene" not found');
    });

    it('should throw error when scene not found across all projects', async () => {
      mockGraphQLClient.getProjects = jest.fn().mockResolvedValue([mockProject] as any);

      await expect(sceneTools.activateScene({
        sceneName: 'NonExistent Scene'
      })).rejects.toThrow('Scene with name "NonExistent Scene" not found in any project');
    });

    it('should throw error when project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(sceneTools.activateScene({
        projectId: 'invalid-project',
        sceneName: 'Test Scene'
      })).rejects.toThrow('Project with ID invalid-project not found');
    });

    it('should throw error when activation fails', async () => {
      mockGraphQLClient.setSceneLive = jest.fn().mockResolvedValue(false);

      await expect(sceneTools.activateScene({
        sceneId: 'scene-1'
      })).rejects.toThrow('Failed to activate scene');
    });

    it('should throw error when scene cannot be retrieved after activation', async () => {
      mockGraphQLClient.setSceneLive = jest.fn().mockResolvedValue(true);
      mockGraphQLClient.getScene = jest.fn().mockResolvedValue(null);

      await expect(sceneTools.activateScene({
        sceneId: 'scene-1'
      })).rejects.toThrow('Scene could not be retrieved after activation');
    });
  });

  describe('fadeToBlack', () => {
    it('should fade to black successfully', async () => {
      mockGraphQLClient.fadeToBlack = jest.fn().mockResolvedValue(true);

      const result = await sceneTools.fadeToBlack({
        fadeOutTime: 3
      });

      expect(mockGraphQLClient.fadeToBlack).toHaveBeenCalledWith(3);
      expect(result.success).toBe(true);
      expect(result.message).toContain('faded to black');
      expect(result.fadeOutTime).toBe(3);
    });

    it('should handle fade to black failure', async () => {
      mockGraphQLClient.fadeToBlack = jest.fn().mockResolvedValue(false);

      const result = await sceneTools.fadeToBlack({
        fadeOutTime: 2
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed');
    });

    it('should use default fade out time', async () => {
      mockGraphQLClient.fadeToBlack = jest.fn().mockResolvedValue(true);

      await sceneTools.fadeToBlack({ fadeOutTime: 3 });

      expect(mockGraphQLClient.fadeToBlack).toHaveBeenCalledWith(3);
    });
  });

  describe('getCurrentActiveScene', () => {
    it('should return active scene with project info', async () => {
      const mockActiveScene = {
        id: 'scene-1',
        name: 'Active Scene',
        description: 'Currently active',
        fixtureValues: [{ fixture: mockProject.fixtures[0], channelValues: [255, 0, 0] }],
        project: {
          id: 'project-1',
          name: 'Test Project'
        }
      };

      mockGraphQLClient.getCurrentActiveScene = jest.fn().mockResolvedValue(mockActiveScene);

      const result = await sceneTools.getCurrentActiveScene();

      expect(result.hasActiveScene).toBe(true);
      expect(result.scene?.name).toBe('Active Scene');
      expect(result.scene?.project?.name).toBe('Test Project');
      expect(result.fixturesActive).toBe(1);
    });

    it('should handle no active scene', async () => {
      mockGraphQLClient.getCurrentActiveScene = jest.fn().mockResolvedValue(null);

      const result = await sceneTools.getCurrentActiveScene();

      expect(result.hasActiveScene).toBe(false);
      expect(result.message).toContain('No scene is currently active');
    });

    it('should handle active scene without project info', async () => {
      const mockActiveScene = {
        id: 'scene-1',
        name: 'Active Scene',
        description: 'Currently active',
        fixtureValues: [],
        project: null
      };

      mockGraphQLClient.getCurrentActiveScene = jest.fn().mockResolvedValue(mockActiveScene);

      const result = await sceneTools.getCurrentActiveScene();

      expect(result.hasActiveScene).toBe(true);
      expect(result.scene?.project).toBeNull();
    });
  });

  // MCP API Refactor - Task 2.4: Scene Query Tools Tests
  describe('Scene Query Tools', () => {
    beforeEach(() => {
      // Add new query methods to mock GraphQL client
      mockGraphQLClient.listScenes = jest.fn();
      mockGraphQLClient.getSceneWithOptions = jest.fn();
      mockGraphQLClient.getSceneFixtures = jest.fn();
    });

    describe('listScenes', () => {
      it('should list scenes with pagination', async () => {
        const mockSceneList = {
          items: [
            {
              id: 'scene-1',
              name: 'Scene 1',
              description: 'First scene',
              fixtureCount: 3,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z'
            },
            {
              id: 'scene-2',
              name: 'Scene 2',
              description: 'Second scene',
              fixtureCount: 5,
              createdAt: '2023-01-02T00:00:00Z',
              updatedAt: '2023-01-02T00:00:00Z'
            }
          ],
          pagination: {
            total: 10,
            page: 1,
            perPage: 50,
            totalPages: 1,
            hasMore: false
          }
        };

        mockGraphQLClient.listScenes = jest.fn().mockResolvedValue(mockSceneList);

        const result = await sceneTools.listScenes({
          projectId: 'project-1',
          page: 1,
          perPage: 50
        });

        expect(mockGraphQLClient.listScenes).toHaveBeenCalledWith({
          projectId: 'project-1',
          page: 1,
          perPage: 50,
          nameContains: undefined,
          usesFixture: undefined,
          sortBy: undefined
        });
        expect(result.scenes).toHaveLength(2);
        expect(result.pagination.total).toBe(10);
        expect(result.message).toContain('Found 10 scenes');
      });

      it('should list scenes with filtering by name', async () => {
        const mockSceneList = {
          items: [{
            id: 'scene-1',
            name: 'Romantic Scene',
            description: null,
            fixtureCount: 3,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z'
          }],
          pagination: {
            total: 1,
            page: 1,
            perPage: 50,
            totalPages: 1,
            hasMore: false
          }
        };

        mockGraphQLClient.listScenes = jest.fn().mockResolvedValue(mockSceneList);

        const result = await sceneTools.listScenes({
          projectId: 'project-1',
          nameContains: 'romantic'
        });

        expect(mockGraphQLClient.listScenes).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: 'project-1',
            nameContains: 'romantic'
          })
        );
        expect(result.scenes).toHaveLength(1);
        expect(result.scenes[0].name).toBe('Romantic Scene');
      });

      it('should list scenes with sorting', async () => {
        const mockSceneList = {
          items: [],
          pagination: {
            total: 0,
            page: 1,
            perPage: 50,
            totalPages: 0,
            hasMore: false
          }
        };

        mockGraphQLClient.listScenes = jest.fn().mockResolvedValue(mockSceneList);

        await sceneTools.listScenes({
          projectId: 'project-1',
          sortBy: 'NAME' as any
        });

        expect(mockGraphQLClient.listScenes).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'NAME'
          })
        );
      });

      it('should handle list scenes errors', async () => {
        mockGraphQLClient.listScenes = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.listScenes({
          projectId: 'project-1'
        })).rejects.toThrow('Failed to list scenes: Error: GraphQL error');
      });
    });

    describe('getSceneDetails', () => {
      it('should get scene with fixture values', async () => {
        const mockScene = {
          id: 'scene-1',
          name: 'Test Scene',
          description: 'Test description',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          fixtureValues: [
            {
              fixture: { id: 'fixture-1', name: 'LED Par 1' },
              channelValues: [255, 128, 64],
              sceneOrder: 1
            }
          ]
        };

        mockGraphQLClient.getSceneWithOptions = jest.fn().mockResolvedValue(mockScene);

        const result = await sceneTools.getSceneDetails({
          sceneId: 'scene-1',
          includeFixtureValues: true
        });

        expect(mockGraphQLClient.getSceneWithOptions).toHaveBeenCalledWith('scene-1', true);
        expect(result.scene.id).toBe('scene-1');
        expect(result.scene.fixtureValues).toHaveLength(1);
        expect(result.fixtureCount).toBe(1);
        expect(result.message).toContain('with 1 fixtures');
      });

      it('should get scene without fixture values', async () => {
        const mockScene = {
          id: 'scene-1',
          name: 'Test Scene',
          description: 'Test description',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          fixtureValues: []
        };

        mockGraphQLClient.getSceneWithOptions = jest.fn().mockResolvedValue(mockScene);

        const result = await sceneTools.getSceneDetails({
          sceneId: 'scene-1',
          includeFixtureValues: false
        });

        expect(mockGraphQLClient.getSceneWithOptions).toHaveBeenCalledWith('scene-1', false);
        expect(result.scene.fixtureValues).toBeUndefined();
        expect(result.fixtureCount).toBeUndefined();
        expect(result.message).toContain('fixture values excluded for performance');
      });

      it('should handle scene not found', async () => {
        mockGraphQLClient.getSceneWithOptions = jest.fn().mockResolvedValue(null);

        await expect(sceneTools.getSceneDetails({
          sceneId: 'non-existent',
          includeFixtureValues: true
        })).rejects.toThrow('Scene with ID non-existent not found');
      });

      it('should handle get scene errors', async () => {
        mockGraphQLClient.getSceneWithOptions = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.getSceneDetails({
          sceneId: 'scene-1',
          includeFixtureValues: true
        })).rejects.toThrow('Failed to get scene details: Error: GraphQL error');
      });
    });

    describe('getSceneFixtures', () => {
      it('should get scene fixtures', async () => {
        const mockFixtures = [
          {
            fixtureId: 'fixture-1',
            fixtureName: 'LED Par 1',
            fixtureType: 'LED_PAR' as any
          },
          {
            fixtureId: 'fixture-2',
            fixtureName: 'Moving Head 1',
            fixtureType: 'MOVING_HEAD' as any
          }
        ];

        mockGraphQLClient.getSceneFixtures = jest.fn().mockResolvedValue(mockFixtures);

        const result = await sceneTools.getSceneFixtures({
          sceneId: 'scene-1'
        });

        expect(mockGraphQLClient.getSceneFixtures).toHaveBeenCalledWith('scene-1');
        expect(result.fixtures).toHaveLength(2);
        expect(result.fixtures[0].fixtureId).toBe('fixture-1');
        expect(result.fixtures[0].fixtureName).toBe('LED Par 1');
        expect(result.fixtures[0].fixtureType).toBe('LED_PAR');
        expect(result.fixtureCount).toBe(2);
        expect(result.message).toContain('Scene uses 2 fixtures');
      });

      it('should handle empty scene fixtures', async () => {
        mockGraphQLClient.getSceneFixtures = jest.fn().mockResolvedValue([]);

        const result = await sceneTools.getSceneFixtures({
          sceneId: 'scene-1'
        });

        expect(result.fixtures).toHaveLength(0);
        expect(result.fixtureCount).toBe(0);
        expect(result.message).toContain('Scene uses 0 fixtures');
      });

      it('should handle get scene fixtures errors', async () => {
        mockGraphQLClient.getSceneFixtures = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.getSceneFixtures({
          sceneId: 'scene-1'
        })).rejects.toThrow('Failed to get scene fixtures: Error: GraphQL error');
      });
    });
  });

  describe('Bulk Scene Operations', () => {
    describe('bulkCreateScenes', () => {
      it('should successfully bulk create scenes', async () => {
        const mockCreatedScenes = [
          {
            id: 'scene-1',
            name: 'Scene 1',
            description: 'First scene',
            fixtureValues: [
              { fixture: { id: 'fixture-1', name: 'LED 1' }, channelValues: [255, 0, 0] }
            ]
          },
          {
            id: 'scene-2',
            name: 'Scene 2',
            description: 'Second scene',
            fixtureValues: [
              { fixture: { id: 'fixture-2', name: 'LED 2' }, channelValues: [0, 255, 0] }
            ]
          }
        ];

        mockGraphQLClient.bulkCreateScenes = jest.fn().mockResolvedValue(mockCreatedScenes);

        const result = await sceneTools.bulkCreateScenes({
          scenes: [
            {
              name: 'Scene 1',
              description: 'First scene',
              projectId: 'project-1',
              fixtureValues: [{ fixtureId: 'fixture-1', channelValues: [255, 0, 0] }]
            },
            {
              name: 'Scene 2',
              description: 'Second scene',
              projectId: 'project-1',
              fixtureValues: [{ fixtureId: 'fixture-2', channelValues: [0, 255, 0] }]
            }
          ]
        });

        expect(result.success).toBe(true);
        expect(result.createdScenes).toHaveLength(2);
        expect(result.summary.totalCreated).toBe(2);
        expect(result.message).toBe('Successfully created 2 scenes');
      });

      it('should reject empty scenes array', async () => {
        await expect(sceneTools.bulkCreateScenes({
          scenes: []
        })).rejects.toThrow('No scenes provided for bulk creation');
      });

      it('should handle GraphQL errors', async () => {
        mockGraphQLClient.bulkCreateScenes = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.bulkCreateScenes({
          scenes: [
            {
              name: 'Test Scene',
              projectId: 'project-1',
              fixtureValues: []
            }
          ]
        })).rejects.toThrow('Failed to bulk create scenes: Error: GraphQL error');
      });
    });

    describe('bulkUpdateScenes', () => {
      it('should successfully bulk update scenes', async () => {
        const mockUpdatedScenes = [
          {
            id: 'scene-1',
            name: 'Updated Scene 1',
            description: 'Updated description',
            fixtureValues: []
          },
          {
            id: 'scene-2',
            name: 'Updated Scene 2',
            description: null,
            fixtureValues: []
          }
        ];

        mockGraphQLClient.bulkUpdateScenes = jest.fn().mockResolvedValue(mockUpdatedScenes);

        const result = await sceneTools.bulkUpdateScenes({
          scenes: [
            { sceneId: 'scene-1', name: 'Updated Scene 1', description: 'Updated description' },
            { sceneId: 'scene-2', name: 'Updated Scene 2' }
          ]
        });

        expect(result.success).toBe(true);
        expect(result.updatedScenes).toHaveLength(2);
        expect(result.summary.totalUpdated).toBe(2);
        expect(result.message).toBe('Successfully updated 2 scenes');
      });

      it('should reject empty scenes array', async () => {
        await expect(sceneTools.bulkUpdateScenes({
          scenes: []
        })).rejects.toThrow('No scenes provided for bulk update');
      });

      it('should handle GraphQL errors', async () => {
        mockGraphQLClient.bulkUpdateScenes = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.bulkUpdateScenes({
          scenes: [{ sceneId: 'scene-1', name: 'Updated Name' }]
        })).rejects.toThrow('Failed to bulk update scenes: Error: GraphQL error');
      });
    });

    describe('bulkDeleteScenes', () => {
      it('should successfully bulk delete scenes', async () => {
        mockGraphQLClient.bulkDeleteScenes = jest.fn().mockResolvedValue({
          successCount: 3,
          failedIds: []
        });

        const result = await sceneTools.bulkDeleteScenes({
          sceneIds: ['scene-1', 'scene-2', 'scene-3'],
          confirmDelete: true
        });

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(3);
        expect(result.failedIds).toEqual([]);
        expect(result.summary.totalRequested).toBe(3);
        expect(result.message).toBe('Successfully deleted 3 scenes');
      });

      it('should handle partial deletion failures', async () => {
        mockGraphQLClient.bulkDeleteScenes = jest.fn().mockResolvedValue({
          successCount: 2,
          failedIds: ['scene-3']
        });

        const result = await sceneTools.bulkDeleteScenes({
          sceneIds: ['scene-1', 'scene-2', 'scene-3'],
          confirmDelete: true
        });

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(2);
        expect(result.failedIds).toEqual(['scene-3']);
        expect(result.message).toBe('Deleted 2 scenes, 1 failed');
      });

      it('should require confirmDelete to be true', async () => {
        await expect(sceneTools.bulkDeleteScenes({
          sceneIds: ['scene-1'],
          confirmDelete: false
        })).rejects.toThrow('confirmDelete must be true to delete scenes');
      });

      it('should reject empty scene ID array', async () => {
        await expect(sceneTools.bulkDeleteScenes({
          sceneIds: [],
          confirmDelete: true
        })).rejects.toThrow('No scene IDs provided for bulk deletion');
      });

      it('should handle GraphQL errors', async () => {
        mockGraphQLClient.bulkDeleteScenes = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(sceneTools.bulkDeleteScenes({
          sceneIds: ['scene-1'],
          confirmDelete: true
        })).rejects.toThrow('Failed to bulk delete scenes: Error: GraphQL error');
      });

      it('should return success: false when all deletions fail', async () => {
        mockGraphQLClient.bulkDeleteScenes = jest.fn().mockResolvedValue({
          successCount: 0,
          failedIds: ['scene-1', 'scene-2']
        });

        const result = await sceneTools.bulkDeleteScenes({
          sceneIds: ['scene-1', 'scene-2'],
          confirmDelete: true
        });

        expect(result.success).toBe(false);
        expect(result.deletedCount).toBe(0);
      });
    });
  });

});