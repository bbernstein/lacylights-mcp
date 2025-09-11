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
});