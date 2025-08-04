import { AILightingService } from '../../src/services/ai-lighting';
import { RAGService } from '../../src/services/rag-service-simple';
import { FixtureInstance, FixtureType, ChannelType } from '../../src/types/lighting';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

// Mock RAGService
jest.mock('../../src/services/rag-service-simple');
const MockRAGService = RAGService as jest.MockedClass<typeof RAGService>;

describe('AILightingService', () => {
  let aiService: AILightingService;
  let mockRAGService: jest.Mocked<RAGService>;
  let mockOpenAI: jest.Mocked<OpenAI>;

  const mockFixture: FixtureInstance = {
    id: 'fixture-1',
    name: 'Test LED Par',
    definitionId: 'def-1',
    manufacturer: 'Test Manufacturer',
    model: 'Test Model',
    type: FixtureType.LED_PAR,
    modeName: 'Standard',
    channelCount: 3,
    channels: [
      { id: 'ch1', offset: 0, name: 'Red', type: ChannelType.RED, minValue: 0, maxValue: 255, defaultValue: 0 },
      { id: 'ch2', offset: 1, name: 'Green', type: ChannelType.GREEN, minValue: 0, maxValue: 255, defaultValue: 0 },
      { id: 'ch3', offset: 2, name: 'Blue', type: ChannelType.BLUE, minValue: 0, maxValue: 255, defaultValue: 0 }
    ],
    universe: 1,
    startChannel: 1,
    tags: ['wash']
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock OpenAI instance
    const mockCreate = jest.fn();
    mockOpenAI = {
      chat: {
        completions: {
          create: mockCreate
        }
      }
    } as any;
    MockOpenAI.mockImplementation(() => mockOpenAI);

    // Create mock RAGService instance
    mockRAGService = {
      generateLightingRecommendations: jest.fn(),
      analyzeScript: jest.fn(),
      findSimilarLightingPatterns: jest.fn(),
      indexLightingPattern: jest.fn(),
      initializeCollection: jest.fn(),
      seedDefaultPatterns: jest.fn()
    } as any;
    MockRAGService.mockImplementation(() => mockRAGService);

    aiService = new AILightingService(mockRAGService);
  });

  describe('constructor', () => {
    it('should create AILightingService instance', () => {
      expect(aiService).toBeInstanceOf(AILightingService);
      expect(MockOpenAI).toHaveBeenCalledWith({
        apiKey: process.env.OPENAI_API_KEY
      });
    });
  });

  describe('generateScene', () => {
    it('should generate scene with valid fixture values', async () => {
      const mockRecommendations = {
        colorSuggestions: ['red', 'blue'],
        intensityLevels: { ambient: 50, key: 75 },
        focusAreas: ['center'],
        reasoning: 'Test reasoning'
      };

      mockRAGService.generateLightingRecommendations.mockResolvedValue(mockRecommendations);

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'Romantic Scene',
              description: 'A romantic lighting scene',
              fixtureValues: [
                {
                  fixtureId: 'fixture-1',
                  channelValues: [255, 128, 64]
                }
              ],
              reasoning: 'AI reasoning'
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const request = {
        scriptContext: 'Act 1, Scene 1',
        sceneDescription: 'Romantic scene',
        availableFixtures: [mockFixture],
        designPreferences: {
          mood: 'romantic',
          intensity: 'moderate' as const
        }
      };

      const result = await aiService.generateScene(request);

      expect(mockRAGService.generateLightingRecommendations).toHaveBeenCalledWith(
        'Romantic scene',
        'romantic',
        ['LED_PAR']
      );

      expect(result.name).toBe('Romantic Scene');
      expect(result.fixtureValues).toHaveLength(1);
      expect(result.fixtureValues[0].fixtureId).toBe('fixture-1');
      expect(result.fixtureValues[0].channelValues).toEqual([255, 128, 64]);
    });

    it('should handle invalid JSON response from AI', async () => {
      mockRAGService.generateLightingRecommendations.mockResolvedValue({
        colorSuggestions: [],
        intensityLevels: {},
        focusAreas: [],
        reasoning: 'Test'
      });

      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const request = {
        scriptContext: 'Test',
        sceneDescription: 'Test scene',
        availableFixtures: [mockFixture]
      };

      const result = await aiService.generateScene(request);

      expect(result.name).toBe('Scene for Test scene');
      expect(result.fixtureValues).toEqual([]);
    });

    it('should validate fixture values against available fixtures', async () => {
      mockRAGService.generateLightingRecommendations.mockResolvedValue({
        colorSuggestions: [],
        intensityLevels: {},
        focusAreas: [],
        reasoning: 'Test'
      });

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'Test Scene',
              fixtureValues: [
                {
                  fixtureId: 'invalid-fixture',
                  channelValues: [255, 128, 64]
                },
                {
                  fixtureId: 'fixture-1',
                  channelValues: [100, 200]
                }
              ]
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const request = {
        scriptContext: 'Test',
        sceneDescription: 'Test scene',
        availableFixtures: [mockFixture]
      };

      const result = await aiService.generateScene(request);

      // Should only include valid fixture and pad channel values
      expect(result.fixtureValues).toHaveLength(1);
      expect(result.fixtureValues[0].fixtureId).toBe('fixture-1');
      expect(result.fixtureValues[0].channelValues).toEqual([100, 200, 0]); // Padded to 3 channels
    });
  });

  describe('generateCueSequence', () => {
    it('should generate cue sequence', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'Act 1 Cues',
              description: 'Cue sequence for Act 1',
              cues: [
                {
                  name: 'Lights Up',
                  cueNumber: 1.0,
                  sceneId: '0',
                  fadeInTime: 3.0,
                  fadeOutTime: 3.0,
                  followTime: null,
                  notes: 'Opening cue'
                }
              ],
              reasoning: 'Standard opening sequence'
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const scenes = [
        {
          name: 'Opening',
          description: 'Opening scene',
          fixtureValues: [],
          reasoning: 'Test'
        }
      ];

      const result = await aiService.generateCueSequence(
        'Act 1, Scene 1',
        scenes,
        { defaultFadeIn: 3, defaultFadeOut: 3, followCues: false }
      );

      expect(result.name).toBe('Act 1 Cues');
      expect(result.cues).toHaveLength(1);
      expect(result.cues[0].name).toBe('Lights Up');
      expect(result.cues[0].cueNumber).toBe(1.0);
    });

    it('should handle invalid JSON in cue sequence', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await aiService.generateCueSequence('Test', []);

      expect(result.name).toBe('Generated Cue Sequence');
      expect(result.cues).toEqual([]);
      expect(result.reasoning).toContain('Unable to parse AI response');
    });
  });

  describe('optimizeSceneForFixtures', () => {
    it('should optimize scene fixture values', async () => {
      const scene = {
        name: 'Test Scene',
        description: 'Test',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channelValues: [300, -50, 128] // Out of range values
          }
        ],
        reasoning: 'Test'
      };

      const result = await aiService.optimizeSceneForFixtures(scene, [mockFixture]);

      // Values should be clamped to 0-255 range
      expect(result.fixtureValues[0].channelValues).toEqual([255, 0, 128]);
    });

    it('should pad channel values to match fixture channel count', async () => {
      const scene = {
        name: 'Test Scene',
        description: 'Test',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channelValues: [100, 200] // Only 2 values, fixture needs 3
          }
        ],
        reasoning: 'Test'
      };

      const result = await aiService.optimizeSceneForFixtures(scene, [mockFixture]);

      expect(result.fixtureValues[0].channelValues).toEqual([100, 200, 0]);
    });

    it('should truncate channel values if too many', async () => {
      const scene = {
        name: 'Test Scene',
        description: 'Test',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channelValues: [100, 200, 50, 75, 25] // 5 values, fixture only has 3 channels
          }
        ],
        reasoning: 'Test'
      };

      const result = await aiService.optimizeSceneForFixtures(scene, [mockFixture]);

      expect(result.fixtureValues[0].channelValues).toEqual([100, 200, 50]);
    });
  });

  describe('suggestFixtureUsage', () => {
    it('should suggest fixture usage', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              primaryFixtures: ['fixture-1'],
              supportingFixtures: [],
              unusedFixtures: [],
              reasoning: 'Using main LED par for wash'
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await aiService.suggestFixtureUsage(
        'Romantic scene',
        [mockFixture]
      );

      expect(result.primaryFixtures).toEqual(['fixture-1']);
      expect(result.reasoning).toBe('Using main LED par for wash');
    });

    it('should handle invalid JSON in fixture usage', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await aiService.suggestFixtureUsage('Test', [mockFixture]);

      expect(result.primaryFixtures).toEqual([]);
      expect(result.reasoning).toContain('Unable to parse AI response');
    });
  });
});