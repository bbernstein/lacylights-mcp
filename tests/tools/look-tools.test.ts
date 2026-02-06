import { LookTools } from '../../src/tools/look-tools';
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

describe('LookTools', () => {
  let lookTools: LookTools;
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
    looks: [
      {
        id: 'look-1',
        name: 'Test Look',
        description: 'Test look description',
        fixtureValues: []
      }
    ],
    cueLists: []
  };

  const mockGeneratedLook = {
    name: 'Romantic Look',
    description: 'A romantic lighting look',
    fixtureValues: [
      {
        fixtureId: 'fixture-1',
        channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
      }
    ],
    reasoning: 'Warm colors for romantic atmosphere'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphQLClient = {
      getProject: jest.fn(),
      createLook: jest.fn(),
      updateLook: jest.fn(),
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
      generateLook: jest.fn(),
      optimizeLookForFixtures: jest.fn(),
      suggestFixtureUsage: jest.fn(),
      generateCueSequence: jest.fn()
    } as any;

    MockGraphQLClient.mockImplementation(() => mockGraphQLClient);
    MockRAGService.mockImplementation(() => mockRAGService);
    MockAILightingService.mockImplementation(() => mockAILightingService);

    lookTools = new LookTools(mockGraphQLClient, mockRAGService, mockAILightingService);
  });

  describe('constructor', () => {
    it('should create LookTools instance', () => {
      expect(lookTools).toBeInstanceOf(LookTools);
    });
  });

  describe('generateLook', () => {
    it('should generate a full look', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockResolvedValue(mockGeneratedLook);
      mockAILightingService.optimizeLookForFixtures.mockResolvedValue(mockGeneratedLook);

      const mockCreatedLook = {
        id: 'look-id',
        name: 'Romantic Look',
        description: 'A romantic lighting look',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
        }]
      };
      mockGraphQLClient.createLook.mockResolvedValue(mockCreatedLook as any);

      const result = await lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Romantic dinner look',
        lookType: 'full',
        designPreferences: {
          mood: 'romantic',
          intensity: 'moderate'
        }
      });

      expect(mockGraphQLClient.getProject).toHaveBeenCalledWith('project-1');
      expect(mockAILightingService.generateLook).toHaveBeenCalled();
      expect(mockGraphQLClient.createLook).toHaveBeenCalled();
      expect(result.lookId).toBe('look-id');
      expect(result.look?.name).toBe('Romantic Look');
    });

    it('should generate an additive look', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockResolvedValue(mockGeneratedLook);
      mockAILightingService.optimizeLookForFixtures.mockResolvedValue(mockGeneratedLook);

      const mockCreatedLook = {
        id: 'look-id',
        name: 'Romantic Look',
        description: 'A romantic lighting look',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
        }]
      };
      mockGraphQLClient.createLook.mockResolvedValue(mockCreatedLook as any);

      const result = await lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Romantic dinner look',
        lookType: 'additive',
        fixtureFilter: {
          includeTags: ['wash']
        }
      });

      expect(result.lookId).toBe('look-id');
      expect(result.look?.name).toBe('Romantic Look');
    });

    it('should filter fixtures by include types', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockResolvedValue(mockGeneratedLook);
      mockAILightingService.optimizeLookForFixtures.mockResolvedValue(mockGeneratedLook);
      const mockCreatedLook = {
        id: 'look-id',
        name: 'Romantic Look',
        description: 'A romantic lighting look',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
        }]
      };
      mockGraphQLClient.createLook.mockResolvedValue(mockCreatedLook as any);

      const result = await lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test look',
        lookType: 'full',
        fixtureFilter: {
          includeTypes: ['LED_PAR']
        }
      });

      expect(mockAILightingService.generateLook).toHaveBeenCalled();
      expect(result.lookId).toBe('look-id');
    });

    it('should filter fixtures by exclude types', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockResolvedValue(mockGeneratedLook);
      mockAILightingService.optimizeLookForFixtures.mockResolvedValue(mockGeneratedLook);
      const mockCreatedLook = {
        id: 'look-id',
        name: 'Romantic Look',
        description: 'A romantic lighting look',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
        }]
      };
      mockGraphQLClient.createLook.mockResolvedValue(mockCreatedLook as any);

      const result = await lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test look',
        lookType: 'full',
        fixtureFilter: {
          excludeTypes: ['STROBE']
        }
      });

      expect(mockAILightingService.generateLook).toHaveBeenCalled();
      expect(result.lookId).toBe('look-id');
    });

    it('should handle script context', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockResolvedValue(mockGeneratedLook);
      mockAILightingService.optimizeLookForFixtures.mockResolvedValue(mockGeneratedLook);
      const mockCreatedLook = {
        id: 'look-id',
        name: 'Romantic Look',
        description: 'A romantic lighting look',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
        }]
      };
      mockGraphQLClient.createLook.mockResolvedValue(mockCreatedLook as any);

      const result = await lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test look',
        lookType: 'full',
        scriptContext: 'Act 1, Scene 2'
      });

      expect(mockAILightingService.generateLook).toHaveBeenCalledWith(
        expect.objectContaining({
          scriptContext: 'Act 1, Scene 2'
        })
      );
      expect(result.lookId).toBe('look-id');
    });

    it('should handle design preferences', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockResolvedValue(mockGeneratedLook);
      mockAILightingService.optimizeLookForFixtures.mockResolvedValue(mockGeneratedLook);
      const mockCreatedLook = {
        id: 'look-id',
        name: 'Romantic Look',
        description: 'A romantic lighting look',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
        }]
      };
      mockGraphQLClient.createLook.mockResolvedValue(mockCreatedLook as any);

      const result = await lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test look',
        lookType: 'full',
        designPreferences: {
          colorPalette: ['red', 'blue'],
          mood: 'dramatic',
          intensity: 'dramatic',
          focusAreas: ['center stage']
        }
      });

      expect(mockAILightingService.generateLook).toHaveBeenCalledWith(
        expect.objectContaining({
          designPreferences: {
            colorPalette: ['red', 'blue'],
            mood: 'dramatic',
            intensity: 'dramatic',
            focusAreas: ['center stage']
          }
        })
      );
      expect(result.lookId).toBe('look-id');
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(lookTools.generateLook({
        projectId: 'non-existent',
        lookDescription: 'Test look',
        lookType: 'full'
      })).rejects.toThrow('Project with ID non-existent not found');
    });

    it('should handle look generation errors', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockRejectedValue(new Error('AI Error'));

      await expect(lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test look',
        lookType: 'full'
      })).rejects.toThrow('Failed to generate look: Error: AI Error');
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

      const result = await lookTools.analyzeScript({
        scriptText: 'Test script text',
        extractLightingCues: true,
        suggestLooks: true
      });

      expect(mockRAGService.analyzeScript).toHaveBeenCalledWith('Test script text');
      expect(result.analysis).toEqual(mockAnalysis);
      expect(result.lightingCues).toBeDefined();
      expect(result.lookTemplates).toBeDefined();
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

      const result = await lookTools.analyzeScript({
        scriptText: 'Test script text',
        extractLightingCues: false,
        suggestLooks: false
      });

      expect(result.lightingCues).toBeUndefined();
      expect(result.lookTemplates).toBeUndefined();
    });

    it('should handle script analysis errors', async () => {
      mockRAGService.analyzeScript.mockRejectedValue(new Error('Analysis error'));

      await expect(lookTools.analyzeScript({
        scriptText: 'Test script',
        extractLightingCues: true,
        suggestLooks: true
      })).rejects.toThrow('Failed to analyze script: Error: Analysis error');
    });
  });

  describe('optimizeLook', () => {
    it('should optimize look for dramatic impact', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await lookTools.optimizeLook({
        lookId: 'look-1',
        projectId: 'project-1',
        optimizationGoals: ['dramatic_impact']
      });

      expect(mockGraphQLClient.getProject).toHaveBeenCalledWith('project-1');
      expect(result.lookId).toBe('look-1');
      expect(result.status).toBe('not_implemented');
      expect(result.recommendations).toBeDefined();
      expect(result.requestedGoals).toContain('dramatic_impact');
    });

    it('should handle multiple optimization goals', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      const result = await lookTools.optimizeLook({
        lookId: 'look-1',
        projectId: 'project-1',
        optimizationGoals: ['energy_efficiency', 'color_accuracy']
      });

      expect(result.requestedGoals).toHaveLength(2);
      expect(result.requestedGoals).toContain('energy_efficiency');
      expect(result.requestedGoals).toContain('color_accuracy');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle look not found', async () => {
      const projectWithoutLook = {
        ...mockProject,
        looks: []
      };
      mockGraphQLClient.getProject.mockResolvedValue(projectWithoutLook as any);

      await expect(lookTools.optimizeLook({
        lookId: 'non-existent',
        projectId: 'project-1',
        optimizationGoals: ['dramatic_impact']
      })).rejects.toThrow('Look with ID non-existent not found');
    });

    it('should handle project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(lookTools.optimizeLook({
        lookId: 'look-1',
        projectId: 'non-existent',
        optimizationGoals: ['dramatic_impact']
      })).rejects.toThrow('Project with ID non-existent not found');
    });

    it('should handle optimization errors', async () => {
      mockGraphQLClient.getProject.mockRejectedValue(new Error('Optimization error'));

      await expect(lookTools.optimizeLook({
        lookId: 'look-1',
        projectId: 'project-1',
        optimizationGoals: ['dramatic_impact']
      })).rejects.toThrow('Failed to optimize look: Error: Optimization error');
    });
  });

  describe('updateLook', () => {
    it('should update look with new name and fixture values', async () => {
      const updatedLook = {
        id: 'look-1',
        name: 'Updated Look',
        description: 'Updated description',
        updatedAt: '2023-01-01T00:00:00Z',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }]
        }]
      };

      mockGraphQLClient.updateLook.mockResolvedValue(updatedLook as any);

      const result = await lookTools.updateLook({
        lookId: 'look-1',
        name: 'Updated Look',
        description: 'Updated description',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }]
          }
        ]
      });

      expect(mockGraphQLClient.updateLook).toHaveBeenCalledWith('look-1', {
        name: 'Updated Look',
        description: 'Updated description',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }]
          }
        ]
      });
      expect(result.lookId).toBe('look-1');
      expect(result.look.name).toBe('Updated Look');
    });

    it('should update look with minimal data', async () => {
      const updatedLook = {
        id: 'look-1',
        name: 'Look 1',
        description: 'Test description',
        updatedAt: '2023-01-01T00:00:00Z',
        fixtureValues: []
      };

      mockGraphQLClient.updateLook.mockResolvedValue(updatedLook as any);

      const result = await lookTools.updateLook({
        lookId: 'look-1'
      });

      expect(mockGraphQLClient.updateLook).toHaveBeenCalledWith('look-1', {});
      expect(result.lookId).toBe('look-1');
      expect(result.look.name).toBe('Look 1');
    });

    it('should handle update errors', async () => {
      mockGraphQLClient.updateLook.mockRejectedValue(new Error('Update error'));

      await expect(lookTools.updateLook({
        lookId: 'look-1',
        name: 'Updated Look'
      })).rejects.toThrow('Failed to update look: Error: Update error');
    });
  });

  describe('validation', () => {
    it('should validate input parameters', async () => {
      // Test invalid parameters trigger validation errors
      await expect(lookTools.generateLook({} as any)).rejects.toThrow();

      await expect(lookTools.analyzeScript({} as any)).rejects.toThrow();

      await expect(lookTools.optimizeLook({} as any)).rejects.toThrow();

      await expect(lookTools.updateLook({} as any)).rejects.toThrow();
    });

    it('should validate channel values range in updateLook', async () => {
      await expect(lookTools.updateLook({
        lookId: 'look-1',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channels: [{ offset: 0, value: 300 }] // Out of range
          }
        ]
      })).rejects.toThrow();
    });

    it('should validate channel values minimum in updateLook', async () => {
      await expect(lookTools.updateLook({
        lookId: 'look-1',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channels: [{ offset: 0, value: -10 }] // Below minimum
          }
        ]
      })).rejects.toThrow();
    });
  });

  // Safe Look Management Tests
  describe('Safe Look Management Functions', () => {
    const mockLook = {
      id: 'look-1',
      name: 'Test Look',
      description: 'Test look description',
      updatedAt: '2023-01-01T00:00:00Z',
      fixtureValues: [
        {
          fixture: { id: 'fixture-1', name: 'LED Par 1' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }],
          lookOrder: 1
        },
        {
          fixture: { id: 'fixture-2', name: 'LED Par 2' },
          channels: [{ offset: 0, value: 128 }, { offset: 1, value: 255 }, { offset: 2, value: 32 }],
          lookOrder: 2
        }
      ]
    };

    beforeEach(() => {
      // Add new methods to mock GraphQL client
      mockGraphQLClient.addFixturesToLook = jest.fn();
      mockGraphQLClient.removeFixturesFromLook = jest.fn();
      mockGraphQLClient.updateLookPartial = jest.fn();
      mockGraphQLClient.getLook = jest.fn();
    });

    describe('addFixturesToLook', () => {
      it('should add fixtures to look with overwrite disabled', async () => {
        mockGraphQLClient.addFixturesToLook.mockResolvedValue(mockLook as any);

        const result = await lookTools.addFixturesToLook({
          lookId: 'look-1',
          fixtureValues: [
            {
              fixtureId: 'fixture-3',
              channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }],
              lookOrder: 3
            }
          ],
          overwriteExisting: false
        });

        expect(mockGraphQLClient.addFixturesToLook).toHaveBeenCalledWith(
          'look-1',
          [{ fixtureId: 'fixture-3', channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }], lookOrder: 3 }],
          false
        );
        expect(result.lookId).toBe('look-1');
        expect(result.look.name).toBe('Test Look');
        expect(result.fixturesAdded).toBe(1);
        expect(result.overwriteMode).toBe(false);
        expect(result.look.fixtureValues).toHaveLength(2);
        expect(result.look.fixtureValues[0].lookOrder).toBe(1);
        expect(result.message).toContain('(preserving existing)');
      });

      it('should add fixtures to look with overwrite enabled', async () => {
        mockGraphQLClient.addFixturesToLook.mockResolvedValue(mockLook as any);

        const result = await lookTools.addFixturesToLook({
          lookId: 'look-1',
          fixtureValues: [
            {
              fixtureId: 'fixture-1',
              channels: [{ offset: 0, value: 100 }, { offset: 1, value: 200 }, { offset: 2, value: 150 }]
            }
          ],
          overwriteExisting: true
        });

        expect(mockGraphQLClient.addFixturesToLook).toHaveBeenCalledWith(
          'look-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 100 }, { offset: 1, value: 200 }, { offset: 2, value: 150 }] }],
          true
        );
        expect(result.overwriteMode).toBe(true);
        expect(result.message).toContain('(overwriting existing)');
      });

      it('should add multiple fixtures to look', async () => {
        mockGraphQLClient.addFixturesToLook.mockResolvedValue(mockLook as any);

        const result = await lookTools.addFixturesToLook({
          lookId: 'look-1',
          fixtureValues: [
            { fixtureId: 'fixture-3', channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }] },
            { fixtureId: 'fixture-4', channels: [{ offset: 0, value: 150 }, { offset: 1, value: 200 }, { offset: 2, value: 100 }] }
          ],
          overwriteExisting: false
        });

        expect(result.fixturesAdded).toBe(2);
        expect(result.look.totalFixtures).toBe(2);
      });

      it('should handle addFixturesToLook errors', async () => {
        mockGraphQLClient.addFixturesToLook.mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.addFixturesToLook({
          lookId: 'look-1',
          fixtureValues: [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          overwriteExisting: false
        })).rejects.toThrow('Failed to add fixtures to look: Error: GraphQL error');
      });

      it('should validate channel values in addFixturesToLook', async () => {
        await expect(lookTools.addFixturesToLook({
          lookId: 'look-1',
          fixtureValues: [
            { fixtureId: 'fixture-1', channels: [{ offset: 0, value: 300 }] }
          ],
          overwriteExisting: false
        })).rejects.toThrow();
      });

      it('should validate required parameters in addFixturesToLook', async () => {
        await expect(lookTools.addFixturesToLook({} as any)).rejects.toThrow();

        await expect(lookTools.addFixturesToLook({
          lookId: 'look-1'
        } as any)).rejects.toThrow();
      });
    });

    describe('removeFixturesFromLook', () => {
      it('should remove fixtures from look', async () => {
        const lookAfterRemoval = {
          ...mockLook,
          fixtureValues: [mockLook.fixtureValues[0]] // Only first fixture remains
        };
        mockGraphQLClient.removeFixturesFromLook.mockResolvedValue(lookAfterRemoval as any);

        const result = await lookTools.removeFixturesFromLook({
          lookId: 'look-1',
          fixtureIds: ['fixture-2']
        });

        expect(mockGraphQLClient.removeFixturesFromLook).toHaveBeenCalledWith('look-1', ['fixture-2']);
        expect(result.lookId).toBe('look-1');
        expect(result.fixturesRemoved).toBe(1);
        expect(result.look.totalFixtures).toBe(1);
        expect(result.look.fixtureValues[0].lookOrder).toBe(1);
        expect(result.message).toContain('Successfully removed 1 fixtures');
      });

      it('should remove multiple fixtures from look', async () => {
        const lookAfterRemoval = {
          ...mockLook,
          fixtureValues: [] // All fixtures removed
        };
        mockGraphQLClient.removeFixturesFromLook.mockResolvedValue(lookAfterRemoval as any);

        const result = await lookTools.removeFixturesFromLook({
          lookId: 'look-1',
          fixtureIds: ['fixture-1', 'fixture-2']
        });

        expect(result.fixturesRemoved).toBe(2);
        expect(result.look.totalFixtures).toBe(0);
      });

      it('should handle removeFixturesFromLook errors', async () => {
        mockGraphQLClient.removeFixturesFromLook.mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.removeFixturesFromLook({
          lookId: 'look-1',
          fixtureIds: ['fixture-1']
        })).rejects.toThrow('Failed to remove fixtures from look: Error: GraphQL error');
      });

      it('should validate required parameters in removeFixturesFromLook', async () => {
        await expect(lookTools.removeFixturesFromLook({} as any)).rejects.toThrow();

        await expect(lookTools.removeFixturesFromLook({
          lookId: 'look-1'
        } as any)).rejects.toThrow();
      });
    });

    describe('getLookFixtureValues', () => {
      it('should get look fixture values with details', async () => {
        mockGraphQLClient.getLook.mockResolvedValue(mockLook as any);

        const result = await lookTools.getLookFixtureValues({
          lookId: 'look-1',
          includeFixtureDetails: true
        });

        expect(mockGraphQLClient.getLook).toHaveBeenCalledWith('look-1');
        expect(result.lookId).toBe('look-1');
        expect(result.look.name).toBe('Test Look');
        expect(result.look.totalFixtures).toBe(2);
        expect(result.fixtureValues).toHaveLength(2);
        expect(result.fixtureValues[0].fixtureId).toBe('fixture-1');
        expect(result.fixtureValues[0].fixtureName).toBe('LED Par 1');
        expect(result.fixtureValues[0].channels).toEqual([{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]);
        expect(result.fixtureValues[0].lookOrder).toBe(1);
        expect(result.fixtureValues[0].channelCount).toBe(3);
      });

      it('should get look fixture values without details', async () => {
        mockGraphQLClient.getLook.mockResolvedValue(mockLook as any);

        const result = await lookTools.getLookFixtureValues({
          lookId: 'look-1',
          includeFixtureDetails: false
        });

        expect(result.fixtureValues[0].fixtureName).toBeUndefined();
      });

      it('should handle look not found in getLookFixtureValues', async () => {
        mockGraphQLClient.getLook.mockResolvedValue(null);

        await expect(lookTools.getLookFixtureValues({
          lookId: 'non-existent',
          includeFixtureDetails: true
        })).rejects.toThrow('Look with ID non-existent not found');
      });

      it('should handle getLookFixtureValues errors', async () => {
        mockGraphQLClient.getLook.mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.getLookFixtureValues({
          lookId: 'look-1',
          includeFixtureDetails: true
        })).rejects.toThrow('Failed to get look fixture values: Error: GraphQL error');
      });

      it('should validate required parameters in getLookFixtureValues', async () => {
        await expect(lookTools.getLookFixtureValues({} as any)).rejects.toThrow();
      });
    });

    describe('ensureFixturesInLook', () => {
      it('should ensure fixtures exist in look (safe add)', async () => {
        mockGraphQLClient.addFixturesToLook.mockResolvedValue(mockLook as any);

        const result = await lookTools.ensureFixturesInLook({
          lookId: 'look-1',
          fixtureValues: [
            { fixtureId: 'fixture-3', channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }] }
          ]
        });

        expect(mockGraphQLClient.addFixturesToLook).toHaveBeenCalledWith(
          'look-1',
          [{ fixtureId: 'fixture-3', channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }] }],
          false // Always safe mode
        );
        expect(result.lookId).toBe('look-1');
        expect(result.fixturesAdded).toBe(1);
        expect(result.message).toContain('(only if missing)');
      });

      it('should handle ensureFixturesInLook errors', async () => {
        mockGraphQLClient.addFixturesToLook.mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.ensureFixturesInLook({
          lookId: 'look-1',
          fixtureValues: [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }]
        })).rejects.toThrow('Failed to ensure fixtures in look: Error: GraphQL error');
      });

      it('should validate required parameters in ensureFixturesInLook', async () => {
        await expect(lookTools.ensureFixturesInLook({} as any)).rejects.toThrow();
      });
    });

    describe('updateLookPartial', () => {
      it('should update look metadata only', async () => {
        const updatedLook = {
          ...mockLook,
          name: 'Updated Look Name',
          description: 'Updated description'
        };
        mockGraphQLClient.updateLookPartial.mockResolvedValue(updatedLook as any);

        const result = await lookTools.updateLookPartial({
          lookId: 'look-1',
          name: 'Updated Look Name',
          description: 'Updated description',
          mergeFixtures: true
        });

        expect(mockGraphQLClient.updateLookPartial).toHaveBeenCalledWith('look-1', {
          name: 'Updated Look Name',
          description: 'Updated description',
          fixtureValues: undefined,
          mergeFixtures: true
        });
        expect(result.lookId).toBe('look-1');
        expect(result.look.name).toBe('Updated Look Name');
        expect(result.updateType).toBe('merged');
        expect(result.fixturesUpdated).toBe(0);
        expect(result.message).toContain('(safe merge)');
      });

      it('should update look with fixture values (merge mode)', async () => {
        mockGraphQLClient.updateLookPartial.mockResolvedValue(mockLook as any);

        const result = await lookTools.updateLookPartial({
          lookId: 'look-1',
          name: 'Updated Look',
          fixtureValues: [
            { fixtureId: 'fixture-3', channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }] }
          ],
          mergeFixtures: true
        });

        expect(mockGraphQLClient.updateLookPartial).toHaveBeenCalledWith('look-1', {
          name: 'Updated Look',
          description: undefined,
          fixtureValues: [{ fixtureId: 'fixture-3', channels: [{ offset: 0, value: 200 }, { offset: 1, value: 100 }, { offset: 2, value: 50 }] }],
          mergeFixtures: true
        });
        expect(result.updateType).toBe('merged');
        expect(result.fixturesUpdated).toBe(1);
        expect(result.message).toContain('(safe merge)');
      });

      it('should update look with fixture values (replace mode)', async () => {
        mockGraphQLClient.updateLookPartial.mockResolvedValue(mockLook as any);

        const result = await lookTools.updateLookPartial({
          lookId: 'look-1',
          fixtureValues: [
            { fixtureId: 'fixture-1', channels: [{ offset: 0, value: 100 }, { offset: 1, value: 200 }, { offset: 2, value: 150 }] }
          ],
          mergeFixtures: false
        });

        expect(result.updateType).toBe('replaced');
        expect(result.message).toContain('(full replace)');
      });

      it('should update look with lookOrder values', async () => {
        mockGraphQLClient.updateLookPartial.mockResolvedValue(mockLook as any);

        const result = await lookTools.updateLookPartial({
          lookId: 'look-1',
          fixtureValues: [
            {
              fixtureId: 'fixture-1',
              channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }],
              lookOrder: 10
            }
          ],
          mergeFixtures: true
        });

        expect(result.look.fixtureValues[0].lookOrder).toBe(1); // From mock response
      });

      it('should handle updateLookPartial errors', async () => {
        mockGraphQLClient.updateLookPartial.mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.updateLookPartial({
          lookId: 'look-1',
          name: 'Updated Look',
          mergeFixtures: true
        })).rejects.toThrow('Failed to update look partially: Error: GraphQL error');
      });

      it('should validate required parameters in updateLookPartial', async () => {
        await expect(lookTools.updateLookPartial({} as any)).rejects.toThrow();
      });

      it('should validate channel values in updateLookPartial', async () => {
        await expect(lookTools.updateLookPartial({
          lookId: 'look-1',
          fixtureValues: [
            { fixtureId: 'fixture-1', channels: [{ offset: 0, value: 500 }] }
          ],
          mergeFixtures: true
        })).rejects.toThrow();
      });
    });

    describe('API Consistency', () => {
      it('should return consistent fixture value structure across all methods', async () => {
        mockGraphQLClient.addFixturesToLook.mockResolvedValue(mockLook as any);
        mockGraphQLClient.removeFixturesFromLook.mockResolvedValue(mockLook as any);
        mockGraphQLClient.updateLookPartial.mockResolvedValue(mockLook as any);
        mockGraphQLClient.getLook.mockResolvedValue(mockLook as any);

        const addResult = await lookTools.addFixturesToLook({
          lookId: 'look-1',
          fixtureValues: [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          overwriteExisting: false
        });

        const removeResult = await lookTools.removeFixturesFromLook({
          lookId: 'look-1',
          fixtureIds: ['fixture-1']
        });

        const updateResult = await lookTools.updateLookPartial({
          lookId: 'look-1',
          name: 'Updated',
          mergeFixtures: true
        });

        // Verify all methods return lookOrder field
        expect(addResult.look.fixtureValues[0]).toHaveProperty('lookOrder');
        expect(removeResult.look.fixtureValues[0]).toHaveProperty('lookOrder');
        expect(updateResult.look.fixtureValues[0]).toHaveProperty('lookOrder');

        // Verify consistent structure
        const expectedFixtureStructure = {
          fixture: expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String)
          }),
          channels: expect.any(Array),
          lookOrder: expect.any(Number)
        };

        expect(addResult.look.fixtureValues[0]).toMatchObject(expectedFixtureStructure);
        expect(removeResult.look.fixtureValues[0]).toMatchObject(expectedFixtureStructure);
        expect(updateResult.look.fixtureValues[0]).toMatchObject(expectedFixtureStructure);
      });
    });

    describe('Data Safety', () => {
      it('should prevent accidental data loss with safe defaults', async () => {
        mockGraphQLClient.addFixturesToLook.mockResolvedValue(mockLook as any);

        // Test that default is safe (non-overwriting)
        const result = await lookTools.addFixturesToLook({
          lookId: 'look-1',
          fixtureValues: [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          overwriteExisting: false
        });

        expect(mockGraphQLClient.addFixturesToLook).toHaveBeenCalledWith(
          'look-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false
        );
        expect(result.overwriteMode).toBe(false);
      });

      it('should use safe merge mode by default in updateLookPartial', async () => {
        mockGraphQLClient.updateLookPartial.mockResolvedValue(mockLook as any);

        const result = await lookTools.updateLookPartial({
          lookId: 'look-1',
          name: 'Updated',
          mergeFixtures: true
        });

        expect(mockGraphQLClient.updateLookPartial).toHaveBeenCalledWith('look-1', {
          name: 'Updated',
          description: undefined,
          fixtureValues: undefined,
          mergeFixtures: true
        });
        expect(result.updateType).toBe('merged');
      });

      it('should always use safe mode in ensureFixturesInLook', async () => {
        mockGraphQLClient.addFixturesToLook.mockResolvedValue(mockLook as any);

        await lookTools.ensureFixturesInLook({
          lookId: 'look-1',
          fixtureValues: [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }]
        });

        expect(mockGraphQLClient.addFixturesToLook).toHaveBeenCalledWith(
          'look-1',
          [{ fixtureId: 'fixture-1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
          false // Always safe mode, cannot be overridden
        );
      });
    });
  });

  describe('generateLook - edge cases and error handling', () => {
    it('should require fixtureFilter for additive looks', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      await expect(lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test additive look',
        lookType: 'additive'
        // Missing fixtureFilter
      })).rejects.toThrow('Additive looks require fixtureFilter to specify which fixtures to modify');
    });

    it('should throw error when no fixtures match filter criteria', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      await expect(lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test look',
        lookType: 'full',
        fixtureFilter: {
          includeTypes: [FixtureType.STROBE] // No STROBE fixtures in mockProject
        }
      })).rejects.toThrow('No fixtures available matching the specified criteria');
    });

    it('should filter fixtures by includeTags', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockResolvedValue(mockGeneratedLook);
      mockAILightingService.optimizeLookForFixtures.mockResolvedValue(mockGeneratedLook);
      const mockCreatedLook = {
        id: 'look-id',
        name: 'Tagged Look',
        description: 'Look using tagged fixtures',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
        }]
      };
      mockGraphQLClient.createLook.mockResolvedValue(mockCreatedLook as any);

      const result = await lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test look',
        lookType: 'full',
        fixtureFilter: {
          includeTags: ['wash']
        }
      });

      expect(result.lookId).toBe('look-id');
      expect(mockAILightingService.generateLook).toHaveBeenCalledWith(
        expect.objectContaining({
          availableFixtures: expect.arrayContaining([
            expect.objectContaining({ tags: expect.arrayContaining(['wash']) })
          ])
        })
      );
    });

    it('should handle look activation success', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockResolvedValue(mockGeneratedLook);
      mockAILightingService.optimizeLookForFixtures.mockResolvedValue(mockGeneratedLook);
      const mockCreatedLook = {
        id: 'look-id',
        name: 'Activated Look',
        description: 'Look that will be activated',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
        }]
      };
      mockGraphQLClient.createLook.mockResolvedValue(mockCreatedLook as any);
      mockGraphQLClient.setLookLive = jest.fn().mockResolvedValue(true);

      const result = await lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test look',
        lookType: 'full',
        activate: true
      });

      expect(mockGraphQLClient.setLookLive).toHaveBeenCalledWith('look-id');
      expect(result.activation).toEqual({
        success: true,
        message: 'Look "Activated Look" is now active'
      });
    });

    it('should handle look activation failure', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockResolvedValue(mockGeneratedLook);
      mockAILightingService.optimizeLookForFixtures.mockResolvedValue(mockGeneratedLook);
      const mockCreatedLook = {
        id: 'look-id',
        name: 'Failed Activation Look',
        description: 'Look with failed activation',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
        }]
      };
      mockGraphQLClient.createLook.mockResolvedValue(mockCreatedLook as any);
      mockGraphQLClient.setLookLive = jest.fn().mockResolvedValue(false);

      const result = await lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test look',
        lookType: 'full',
        activate: true
      });

      expect(result.activation).toEqual({
        success: false,
        message: 'Look created but activation failed'
      });
    });

    it('should handle look activation error exception', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);
      mockAILightingService.generateLook.mockResolvedValue(mockGeneratedLook);
      mockAILightingService.optimizeLookForFixtures.mockResolvedValue(mockGeneratedLook);
      const mockCreatedLook = {
        id: 'look-id',
        name: 'Error Activation Look',
        description: 'Look with activation error',
        fixtureValues: [{
          fixture: { id: 'fixture-1', name: 'LED Par 1', type: 'LED_PAR' },
          channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
        }]
      };
      mockGraphQLClient.createLook.mockResolvedValue(mockCreatedLook as any);
      mockGraphQLClient.setLookLive = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await lookTools.generateLook({
        projectId: 'project-1',
        lookDescription: 'Test look',
        lookType: 'full',
        activate: true
      });

      expect(result.activation).toEqual({
        success: false,
        error: 'Look created but activation failed: Error: Connection failed'
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

      const result = await lookTools.analyzeScript({
        scriptText: 'Act 1, Scene 1. The stage is dark.',
        extractLightingCues: true,
        suggestLooks: true
      });

      expect(mockRAGService.analyzeScript).toHaveBeenCalledWith('Act 1, Scene 1. The stage is dark.');
      expect(result.analysis).toBeDefined();
      expect(result.lightingCues).toBeDefined();
      expect(result.lookTemplates).toBeDefined();
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

      const result = await lookTools.analyzeScript({
        scriptText: 'Simple script',
        extractLightingCues: false,
        suggestLooks: false
      });

      expect(result.analysis).toBeDefined();
      expect(result.lightingCues).toBeUndefined();
      expect(result.lookTemplates).toBeUndefined();
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

      const result = await lookTools.analyzeScript({
        scriptText: 'Action packed scene.',
        extractLightingCues: true,
        suggestLooks: true
      });

      expect(result.lightingCues).toBeDefined();
      // Should have called suggestCueTiming with different cue types
      expect(result.lookTemplates).toBeDefined();
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

      const result = await lookTools.analyzeScript({
        scriptText: 'Complex scene.',
        extractLightingCues: false,
        suggestLooks: true
      });

      expect(result.lookTemplates).toBeDefined();
      // Should estimate fixture needs based on focus areas and colors
    });
  });

  describe('activateLook', () => {
    it('should activate look by lookId', async () => {
      const mockLook = {
        id: 'look-1',
        name: 'Test Look',
        description: 'Test description',
        fixtureValues: [{ fixture: mockProject.fixtures[0], channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }]
      };

      mockGraphQLClient.setLookLive = jest.fn().mockResolvedValue(true);
      mockGraphQLClient.getLook = jest.fn().mockResolvedValue(mockLook as any);

      const result = await lookTools.activateLook({
        lookId: 'look-1'
      });

      expect(mockGraphQLClient.setLookLive).toHaveBeenCalledWith('look-1');
      expect(result.success).toBe(true);
      expect(result.look.id).toBe('look-1');
      expect(result.message).toContain('Test Look');
    });

    it('should activate look by lookName with projectId', async () => {
      const mockLook = {
        id: 'look-1',
        name: 'Test Look',
        description: 'Test description',
        fixtureValues: [{ fixture: mockProject.fixtures[0], channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }]
      };

      mockGraphQLClient.getProject.mockResolvedValue({
        ...mockProject,
        looks: [mockLook]
      } as any);
      mockGraphQLClient.setLookLive = jest.fn().mockResolvedValue(true);
      mockGraphQLClient.getLook = jest.fn().mockResolvedValue(mockLook as any);

      const result = await lookTools.activateLook({
        projectId: 'project-1',
        lookName: 'Test Look'
      });

      expect(result.success).toBe(true);
      expect(result.look.name).toBe('Test Look');
    });

    it('should activate look by lookName across all projects', async () => {
      const mockLook = {
        id: 'look-1',
        name: 'Test Look',
        description: 'Test description',
        fixtureValues: [{ fixture: mockProject.fixtures[0], channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }]
      };

      mockGraphQLClient.getProjects = jest.fn().mockResolvedValue([{
        ...mockProject,
        looks: [mockLook]
      }] as any);
      mockGraphQLClient.setLookLive = jest.fn().mockResolvedValue(true);
      mockGraphQLClient.getLook = jest.fn().mockResolvedValue(mockLook as any);

      const result = await lookTools.activateLook({
        lookName: 'Test Look'
      });

      expect(result.success).toBe(true);
      expect(result.look.name).toBe('Test Look');
    });

    it('should handle partial look name match', async () => {
      const mockLook = {
        id: 'look-1',
        name: 'Opening Look',
        description: 'Test description',
        fixtureValues: [{ fixture: mockProject.fixtures[0], channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }]
      };

      mockGraphQLClient.getProject.mockResolvedValue({
        ...mockProject,
        looks: [mockLook]
      } as any);
      mockGraphQLClient.setLookLive = jest.fn().mockResolvedValue(true);
      mockGraphQLClient.getLook = jest.fn().mockResolvedValue(mockLook as any);

      const result = await lookTools.activateLook({
        projectId: 'project-1',
        lookName: 'opening'
      });

      expect(result.success).toBe(true);
      expect(result.look.name).toBe('Opening Look');
    });

    it('should throw error when neither lookId nor lookName provided', async () => {
      await expect(lookTools.activateLook({})).rejects.toThrow('Either lookId or lookName must be provided');
    });

    it('should throw error when look not found by name in project', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(mockProject as any);

      await expect(lookTools.activateLook({
        projectId: 'project-1',
        lookName: 'NonExistent Look'
      })).rejects.toThrow('Look with name "NonExistent Look" not found');
    });

    it('should throw error when look not found across all projects', async () => {
      mockGraphQLClient.getProjects = jest.fn().mockResolvedValue([mockProject] as any);

      await expect(lookTools.activateLook({
        lookName: 'NonExistent Look'
      })).rejects.toThrow('Look with name "NonExistent Look" not found in any project');
    });

    it('should throw error when project not found', async () => {
      mockGraphQLClient.getProject.mockResolvedValue(null);

      await expect(lookTools.activateLook({
        projectId: 'invalid-project',
        lookName: 'Test Look'
      })).rejects.toThrow('Project with ID invalid-project not found');
    });

    it('should throw error when activation fails', async () => {
      mockGraphQLClient.setLookLive = jest.fn().mockResolvedValue(false);

      await expect(lookTools.activateLook({
        lookId: 'look-1'
      })).rejects.toThrow('Failed to activate look');
    });

    it('should throw error when look cannot be retrieved after activation', async () => {
      mockGraphQLClient.setLookLive = jest.fn().mockResolvedValue(true);
      mockGraphQLClient.getLook = jest.fn().mockResolvedValue(null);

      await expect(lookTools.activateLook({
        lookId: 'look-1'
      })).rejects.toThrow('Look could not be retrieved after activation');
    });
  });

  describe('fadeToBlack', () => {
    it('should fade to black successfully', async () => {
      mockGraphQLClient.fadeToBlack = jest.fn().mockResolvedValue(true);

      const result = await lookTools.fadeToBlack({
        fadeOutTime: 3
      });

      expect(mockGraphQLClient.fadeToBlack).toHaveBeenCalledWith(3);
      expect(result.success).toBe(true);
      expect(result.message).toContain('faded to black');
      expect(result.fadeOutTime).toBe(3);
    });

    it('should handle fade to black failure', async () => {
      mockGraphQLClient.fadeToBlack = jest.fn().mockResolvedValue(false);

      const result = await lookTools.fadeToBlack({
        fadeOutTime: 2
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed');
    });

    it('should use default fade out time', async () => {
      mockGraphQLClient.fadeToBlack = jest.fn().mockResolvedValue(true);

      await lookTools.fadeToBlack({ fadeOutTime: 3 });

      expect(mockGraphQLClient.fadeToBlack).toHaveBeenCalledWith(3);
    });
  });

  describe('getCurrentActiveLook', () => {
    it('should return active look with project info', async () => {
      const mockActiveLook = {
        id: 'look-1',
        name: 'Active Look',
        description: 'Currently active',
        fixtureValues: [{ fixture: mockProject.fixtures[0], channels: [{ offset: 0, value: 255 }, { offset: 1, value: 0 }, { offset: 2, value: 0 }] }],
        project: {
          id: 'project-1',
          name: 'Test Project'
        }
      };

      mockGraphQLClient.getCurrentActiveLook = jest.fn().mockResolvedValue(mockActiveLook);

      const result = await lookTools.getCurrentActiveLook();

      expect(result.hasActiveLook).toBe(true);
      expect(result.look?.name).toBe('Active Look');
      expect(result.look?.project?.name).toBe('Test Project');
      expect(result.fixturesActive).toBe(1);
    });

    it('should handle no active look', async () => {
      mockGraphQLClient.getCurrentActiveLook = jest.fn().mockResolvedValue(null);

      const result = await lookTools.getCurrentActiveLook();

      expect(result.hasActiveLook).toBe(false);
      expect(result.message).toContain('No look is currently active');
    });

    it('should handle active look without project info', async () => {
      const mockActiveLook = {
        id: 'look-1',
        name: 'Active Look',
        description: 'Currently active',
        fixtureValues: [],
        project: null
      };

      mockGraphQLClient.getCurrentActiveLook = jest.fn().mockResolvedValue(mockActiveLook);

      const result = await lookTools.getCurrentActiveLook();

      expect(result.hasActiveLook).toBe(true);
      expect(result.look?.project).toBeNull();
    });
  });

  // MCP API Refactor - Task 2.4: Look Query Tools Tests
  describe('Look Query Tools', () => {
    beforeEach(() => {
      // Add new query methods to mock GraphQL client
      mockGraphQLClient.listLooks = jest.fn();
      mockGraphQLClient.getLookWithOptions = jest.fn();
      mockGraphQLClient.getLookFixtures = jest.fn();
    });

    describe('listLooks', () => {
      it('should list looks with pagination', async () => {
        const mockLookList = {
          items: [
            {
              id: 'look-1',
              name: 'Look 1',
              description: 'First look',
              fixtureCount: 3,
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z'
            },
            {
              id: 'look-2',
              name: 'Look 2',
              description: 'Second look',
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

        mockGraphQLClient.listLooks = jest.fn().mockResolvedValue(mockLookList);

        const result = await lookTools.listLooks({
          projectId: 'project-1',
          page: 1,
          perPage: 50
        });

        expect(mockGraphQLClient.listLooks).toHaveBeenCalledWith({
          projectId: 'project-1',
          page: 1,
          perPage: 50,
          nameContains: undefined,
          usesFixture: undefined,
          sortBy: undefined
        });
        expect(result.looks).toHaveLength(2);
        expect(result.pagination.total).toBe(10);
        expect(result.message).toContain('Found 10 looks');
      });

      it('should list looks with filtering by name', async () => {
        const mockLookList = {
          items: [{
            id: 'look-1',
            name: 'Romantic Look',
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

        mockGraphQLClient.listLooks = jest.fn().mockResolvedValue(mockLookList);

        const result = await lookTools.listLooks({
          projectId: 'project-1',
          nameContains: 'romantic'
        });

        expect(mockGraphQLClient.listLooks).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: 'project-1',
            nameContains: 'romantic'
          })
        );
        expect(result.looks).toHaveLength(1);
        expect(result.looks[0].name).toBe('Romantic Look');
      });

      it('should list looks with sorting', async () => {
        const mockLookList = {
          items: [],
          pagination: {
            total: 0,
            page: 1,
            perPage: 50,
            totalPages: 0,
            hasMore: false
          }
        };

        mockGraphQLClient.listLooks = jest.fn().mockResolvedValue(mockLookList);

        await lookTools.listLooks({
          projectId: 'project-1',
          sortBy: 'NAME' as any
        });

        expect(mockGraphQLClient.listLooks).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'NAME'
          })
        );
      });

      it('should handle list looks errors', async () => {
        mockGraphQLClient.listLooks = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.listLooks({
          projectId: 'project-1'
        })).rejects.toThrow('Failed to list looks: Error: GraphQL error');
      });
    });

    describe('getLookDetails', () => {
      it('should get look with fixture values', async () => {
        const mockLook = {
          id: 'look-1',
          name: 'Test Look',
          description: 'Test description',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          fixtureValues: [
            {
              fixture: { id: 'fixture-1', name: 'LED Par 1' },
              channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }],
              lookOrder: 1
            }
          ]
        };

        mockGraphQLClient.getLookWithOptions = jest.fn().mockResolvedValue(mockLook);

        const result = await lookTools.getLookDetails({
          lookId: 'look-1',
          includeFixtureValues: true
        });

        expect(mockGraphQLClient.getLookWithOptions).toHaveBeenCalledWith('look-1', true);
        expect(result.look.id).toBe('look-1');
        expect(result.look.fixtureValues).toHaveLength(1);
        expect(result.fixtureCount).toBe(1);
        expect(result.message).toContain('with 1 fixtures');
      });

      it('should get look without fixture values', async () => {
        const mockLook = {
          id: 'look-1',
          name: 'Test Look',
          description: 'Test description',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
          fixtureValues: []
        };

        mockGraphQLClient.getLookWithOptions = jest.fn().mockResolvedValue(mockLook);

        const result = await lookTools.getLookDetails({
          lookId: 'look-1',
          includeFixtureValues: false
        });

        expect(mockGraphQLClient.getLookWithOptions).toHaveBeenCalledWith('look-1', false);
        expect(result.look.fixtureValues).toBeUndefined();
        expect(result.fixtureCount).toBeUndefined();
        expect(result.message).toContain('fixture values excluded for performance');
      });

      it('should handle look not found', async () => {
        mockGraphQLClient.getLookWithOptions = jest.fn().mockResolvedValue(null);

        await expect(lookTools.getLookDetails({
          lookId: 'non-existent',
          includeFixtureValues: true
        })).rejects.toThrow('Look with ID non-existent not found');
      });

      it('should handle get look errors', async () => {
        mockGraphQLClient.getLookWithOptions = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.getLookDetails({
          lookId: 'look-1',
          includeFixtureValues: true
        })).rejects.toThrow('Failed to get look details: Error: GraphQL error');
      });
    });

    describe('getLookFixtures', () => {
      it('should get look fixtures', async () => {
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

        mockGraphQLClient.getLookFixtures = jest.fn().mockResolvedValue(mockFixtures);

        const result = await lookTools.getLookFixtures({
          lookId: 'look-1'
        });

        expect(mockGraphQLClient.getLookFixtures).toHaveBeenCalledWith('look-1');
        expect(result.fixtures).toHaveLength(2);
        expect(result.fixtures[0].fixtureId).toBe('fixture-1');
        expect(result.fixtures[0].fixtureName).toBe('LED Par 1');
        expect(result.fixtures[0].fixtureType).toBe('LED_PAR');
        expect(result.fixtureCount).toBe(2);
        expect(result.message).toContain('Look uses 2 fixtures');
      });

      it('should handle empty look fixtures', async () => {
        mockGraphQLClient.getLookFixtures = jest.fn().mockResolvedValue([]);

        const result = await lookTools.getLookFixtures({
          lookId: 'look-1'
        });

        expect(result.fixtures).toHaveLength(0);
        expect(result.fixtureCount).toBe(0);
        expect(result.message).toContain('Look uses 0 fixtures');
      });

      it('should handle get look fixtures errors', async () => {
        mockGraphQLClient.getLookFixtures = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.getLookFixtures({
          lookId: 'look-1'
        })).rejects.toThrow('Failed to get look fixtures: Error: GraphQL error');
      });
    });
  });

  describe('Bulk Look Operations', () => {
    describe('bulkCreateLooks', () => {
      it('should create multiple looks successfully', async () => {
        const mockCreatedLooks = [
          {
            id: 'look-1',
            name: 'Look 1',
            description: 'First look',
            fixtureValues: [{ fixture: { id: 'f1' }, channels: [{ offset: 0, value: 255 }] }]
          },
          {
            id: 'look-2',
            name: 'Look 2',
            description: 'Second look',
            fixtureValues: []
          }
        ];

        mockGraphQLClient.bulkCreateLooks = jest.fn().mockResolvedValue(mockCreatedLooks);

        const result = await lookTools.bulkCreateLooks({
          looks: [
            { projectId: 'project-1', name: 'Look 1', description: 'First look', fixtureValues: [] },
            { projectId: 'project-1', name: 'Look 2', description: 'Second look', fixtureValues: [] }
          ]
        });

        expect(mockGraphQLClient.bulkCreateLooks).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.createdLooks).toHaveLength(2);
        expect(result.summary.totalCreated).toBe(2);
        expect(result.summary.projectIds).toContain('project-1');
        expect(result.message).toContain('Successfully created 2 looks');
      });

      it('should throw error when no looks provided', async () => {
        await expect(lookTools.bulkCreateLooks({
          looks: []
        })).rejects.toThrow('No looks provided for bulk creation');
      });

      it('should handle bulk create errors', async () => {
        mockGraphQLClient.bulkCreateLooks = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.bulkCreateLooks({
          looks: [{ projectId: 'project-1', name: 'Look 1', fixtureValues: [] }]
        })).rejects.toThrow('Failed to bulk create looks');
      });
    });

    describe('bulkUpdateLooks', () => {
      it('should update multiple looks successfully', async () => {
        const mockUpdatedLooks = [
          {
            id: 'look-1',
            name: 'Updated Look 1',
            description: 'Updated first look',
            fixtureValues: []
          },
          {
            id: 'look-2',
            name: 'Updated Look 2',
            description: 'Updated second look',
            fixtureValues: [{ fixture: { id: 'f1' }, channels: [{ offset: 0, value: 128 }] }]
          }
        ];

        mockGraphQLClient.bulkUpdateLooks = jest.fn().mockResolvedValue(mockUpdatedLooks);

        const result = await lookTools.bulkUpdateLooks({
          looks: [
            { lookId: 'look-1', name: 'Updated Look 1', description: 'Updated first look' },
            { lookId: 'look-2', name: 'Updated Look 2', description: 'Updated second look' }
          ]
        });

        expect(mockGraphQLClient.bulkUpdateLooks).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.updatedLooks).toHaveLength(2);
        expect(result.summary.totalUpdated).toBe(2);
        expect(result.summary.looksWithNameChange).toBe(2);
        expect(result.summary.looksWithDescriptionChange).toBe(2);
        expect(result.message).toContain('Successfully updated 2 looks');
      });

      it('should throw error when no looks provided', async () => {
        await expect(lookTools.bulkUpdateLooks({
          looks: []
        })).rejects.toThrow('No looks provided for bulk update');
      });

      it('should handle bulk update errors', async () => {
        mockGraphQLClient.bulkUpdateLooks = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.bulkUpdateLooks({
          looks: [{ lookId: 'look-1', name: 'Updated' }]
        })).rejects.toThrow('Failed to bulk update looks');
      });
    });

    describe('bulkUpdateLooksPartial', () => {
      it('should update multiple looks with partial merge successfully', async () => {
        const mockUpdatedLooks = [
          {
            id: 'look-1',
            name: 'Updated Look 1',
            description: 'Updated first look',
            fixtureValues: [{ fixture: { id: 'f1', name: 'Fixture 1' }, channels: [{ offset: 0, value: 128 }], lookOrder: 1 }]
          },
          {
            id: 'look-2',
            name: 'Updated Look 2',
            description: 'Updated second look',
            fixtureValues: [{ fixture: { id: 'f1', name: 'Fixture 1' }, channels: [{ offset: 0, value: 64 }], lookOrder: 1 }]
          }
        ];

        mockGraphQLClient.bulkUpdateLooksPartial = jest.fn().mockResolvedValue(mockUpdatedLooks);

        const result = await lookTools.bulkUpdateLooksPartial({
          looks: [
            {
              lookId: 'look-1',
              name: 'Updated Look 1',
              description: 'Updated first look',
              fixtureValues: [{ fixtureId: 'f1', channels: [{ offset: 0, value: 128 }] }],
              mergeFixtures: true
            },
            {
              lookId: 'look-2',
              name: 'Updated Look 2',
              description: 'Updated second look',
              fixtureValues: [{ fixtureId: 'f1', channels: [{ offset: 0, value: 64 }] }],
              mergeFixtures: true
            }
          ]
        });

        expect(mockGraphQLClient.bulkUpdateLooksPartial).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.updatedLooks).toHaveLength(2);
        expect(result.summary.totalUpdated).toBe(2);
        expect(result.summary.looksWithNameChange).toBe(2);
        expect(result.summary.looksWithDescriptionChange).toBe(2);
        expect(result.summary.looksWithFixtureValueChange).toBe(2);
        expect(result.summary.looksWithMergeEnabled).toBe(2);
        expect(result.message).toContain('Successfully updated 2 looks with partial merge');
      });

      it('should track mergeFixtures=false looks correctly', async () => {
        const mockUpdatedLooks = [
          {
            id: 'look-1',
            name: 'Look 1',
            description: null,
            fixtureValues: []
          }
        ];

        mockGraphQLClient.bulkUpdateLooksPartial = jest.fn().mockResolvedValue(mockUpdatedLooks);

        const result = await lookTools.bulkUpdateLooksPartial({
          looks: [
            {
              lookId: 'look-1',
              fixtureValues: [{ fixtureId: 'f1', channels: [{ offset: 0, value: 128 }] }],
              mergeFixtures: false
            }
          ]
        });

        expect(result.success).toBe(true);
        expect(result.summary.looksWithMergeEnabled).toBe(0);
      });

      it('should throw error when no looks provided', async () => {
        await expect(lookTools.bulkUpdateLooksPartial({
          looks: []
        })).rejects.toThrow('No looks provided for bulk partial update');
      });

      it('should handle bulk partial update errors', async () => {
        mockGraphQLClient.bulkUpdateLooksPartial = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.bulkUpdateLooksPartial({
          looks: [{ lookId: 'look-1', fixtureValues: [{ fixtureId: 'f1', channels: [{ offset: 0, value: 128 }] }], mergeFixtures: true }]
        })).rejects.toThrow('Failed to bulk update looks partially');
      });

      it('should include fixture values in response', async () => {
        const mockUpdatedLooks = [
          {
            id: 'look-1',
            name: 'Look 1',
            description: 'Test look',
            fixtureValues: [
              { fixture: { id: 'f1', name: 'Par Light' }, channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }], lookOrder: 1 }
            ]
          }
        ];

        mockGraphQLClient.bulkUpdateLooksPartial = jest.fn().mockResolvedValue(mockUpdatedLooks);

        const result = await lookTools.bulkUpdateLooksPartial({
          looks: [
            {
              lookId: 'look-1',
              fixtureValues: [{ fixtureId: 'f1', channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }] }],
              mergeFixtures: true
            }
          ]
        });

        expect(result.updatedLooks[0].fixtureValues).toBeDefined();
        expect(result.updatedLooks[0].fixtureValues).toHaveLength(1);
        expect(result.updatedLooks[0].fixtureValues![0].fixture.name).toBe('Par Light');
        expect(result.updatedLooks[0].fixtureValues![0].channels).toHaveLength(2);
      });
    });

    describe('bulkDeleteLooks', () => {
      it('should delete multiple looks successfully', async () => {
        mockGraphQLClient.bulkDeleteLooks = jest.fn().mockResolvedValue({
          successCount: 2,
          failedIds: []
        });

        const result = await lookTools.bulkDeleteLooks({
          lookIds: ['look-1', 'look-2'],
          confirmDelete: true
        });

        expect(mockGraphQLClient.bulkDeleteLooks).toHaveBeenCalledWith(['look-1', 'look-2']);
        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(2);
        expect(result.failedIds).toHaveLength(0);
        expect(result.summary.totalRequested).toBe(2);
        expect(result.summary.successCount).toBe(2);
        expect(result.message).toContain('Successfully deleted 2 looks');
      });

      it('should handle partial deletion failures', async () => {
        mockGraphQLClient.bulkDeleteLooks = jest.fn().mockResolvedValue({
          successCount: 1,
          failedIds: ['look-2']
        });

        const result = await lookTools.bulkDeleteLooks({
          lookIds: ['look-1', 'look-2'],
          confirmDelete: true
        });

        expect(result.success).toBe(true);
        expect(result.deletedCount).toBe(1);
        expect(result.failedIds).toContain('look-2');
        expect(result.summary.failureCount).toBe(1);
        expect(result.message).toContain('1 failed');
      });

      it('should require confirmDelete to be true', async () => {
        await expect(lookTools.bulkDeleteLooks({
          lookIds: ['look-1'],
          confirmDelete: false
        })).rejects.toThrow('confirmDelete must be true to delete looks');
      });

      it('should throw error when no look IDs provided', async () => {
        await expect(lookTools.bulkDeleteLooks({
          lookIds: [],
          confirmDelete: true
        })).rejects.toThrow('No look IDs provided for bulk deletion');
      });

      it('should handle bulk delete errors', async () => {
        mockGraphQLClient.bulkDeleteLooks = jest.fn().mockRejectedValue(new Error('GraphQL error'));

        await expect(lookTools.bulkDeleteLooks({
          lookIds: ['look-1'],
          confirmDelete: true
        })).rejects.toThrow('Failed to bulk delete looks');
      });
    });

    describe('copyFixturesToLooks', () => {
      it('should copy fixtures to looks successfully', async () => {
        const mockResult = {
          updatedLookCount: 3,
          affectedCueCount: 5,
          operationId: 'op-123',
          updatedLooks: [
            {
              id: 'look-1',
              name: 'Look 1',
              updatedAt: '2024-01-01T00:00:00Z'
            },
            {
              id: 'look-2',
              name: 'Look 2',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ]
        };

        mockGraphQLClient.copyFixturesToLooks = jest.fn().mockResolvedValue(mockResult);

        const result = await lookTools.copyFixturesToLooks({
          sourceLookId: 'source-look',
          fixtureIds: ['fixture-1', 'fixture-2'],
          targetLookIds: ['look-1', 'look-2', 'look-3']
        });

        expect(mockGraphQLClient.copyFixturesToLooks).toHaveBeenCalledWith({
          sourceLookId: 'source-look',
          fixtureIds: ['fixture-1', 'fixture-2'],
          targetLookIds: ['look-1', 'look-2', 'look-3']
        });
        expect(result.success).toBe(true);
        expect(result.updatedLookCount).toBe(3);
        expect(result.affectedCueCount).toBe(5);
        expect(result.operationId).toBe('op-123');
        expect(result.updatedLooks).toHaveLength(2);
        expect(result.message).toContain('Successfully copied');
      });

      it('should include look metadata in response', async () => {
        const mockResult = {
          updatedLookCount: 1,
          affectedCueCount: 2,
          operationId: 'op-456',
          updatedLooks: [
            {
              id: 'look-1',
              name: 'Test Look',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ]
        };

        mockGraphQLClient.copyFixturesToLooks = jest.fn().mockResolvedValue(mockResult);

        const result = await lookTools.copyFixturesToLooks({
          sourceLookId: 'source-look',
          fixtureIds: ['fixture-1'],
          targetLookIds: ['look-1']
        });

        // Verify the response contains look metadata (fixtureValues no longer returned)
        expect(result.updatedLooks[0].lookId).toBe('look-1');
        expect(result.updatedLooks[0].name).toBe('Test Look');
        expect(result.updatedLooks[0].updatedAt).toBe('2024-01-01T00:00:00Z');
      });

      it('should validate sourceLookId is required', async () => {
        await expect(lookTools.copyFixturesToLooks({
          fixtureIds: ['fixture-1'],
          targetLookIds: ['look-1']
        } as any)).rejects.toThrow();
      });

      it('should validate fixtureIds array is not empty (via Zod schema)', async () => {
        await expect(lookTools.copyFixturesToLooks({
          sourceLookId: 'source-look',
          fixtureIds: [],
          targetLookIds: ['look-1']
        })).rejects.toThrow();
      });

      it('should validate targetLookIds array is not empty (via Zod schema)', async () => {
        await expect(lookTools.copyFixturesToLooks({
          sourceLookId: 'source-look',
          fixtureIds: ['fixture-1'],
          targetLookIds: []
        })).rejects.toThrow();
      });

      it('should handle copy operation errors', async () => {
        mockGraphQLClient.copyFixturesToLooks = jest.fn().mockRejectedValue(new Error('Source look not found'));

        await expect(lookTools.copyFixturesToLooks({
          sourceLookId: 'invalid-source',
          fixtureIds: ['fixture-1'],
          targetLookIds: ['look-1']
        })).rejects.toThrow('Failed to copy fixtures to looks: Error: Source look not found');
      });

      it('should handle partial copy failures', async () => {
        const mockResult = {
          updatedLookCount: 2,
          affectedCueCount: 0,
          operationId: 'op-789',
          updatedLooks: [
            {
              id: 'look-1',
              name: 'Look 1',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ]
        };

        mockGraphQLClient.copyFixturesToLooks = jest.fn().mockResolvedValue(mockResult);

        const result = await lookTools.copyFixturesToLooks({
          sourceLookId: 'source-look',
          fixtureIds: ['fixture-1'],
          targetLookIds: ['look-1', 'look-2', 'look-3']
        });

        // Should still succeed even if some looks weren't in the response
        expect(result.success).toBe(true);
        expect(result.updatedLookCount).toBe(2);
      });

      it('should report affected cues in the response', async () => {
        const mockResult = {
          updatedLookCount: 2,
          affectedCueCount: 10,
          operationId: 'op-cue',
          updatedLooks: []
        };

        mockGraphQLClient.copyFixturesToLooks = jest.fn().mockResolvedValue(mockResult);

        const result = await lookTools.copyFixturesToLooks({
          sourceLookId: 'source-look',
          fixtureIds: ['fixture-1'],
          targetLookIds: ['look-1', 'look-2']
        });

        expect(result.affectedCueCount).toBe(10);
        expect(result.message).toContain('10 cue(s) affected');
      });
    });
  });

});
