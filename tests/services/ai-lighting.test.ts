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
                  channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
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
      expect(result.fixtureValues[0].channels).toEqual([{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]);
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
                  channels: [{ offset: 0, value: 255 }, { offset: 1, value: 128 }, { offset: 2, value: 64 }]
                },
                {
                  fixtureId: 'fixture-1',
                  channels: [{ offset: 0, value: 100 }, { offset: 1, value: 200 }]
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

      // Should only include valid fixture with sparse channel format
      expect(result.fixtureValues).toHaveLength(1);
      expect(result.fixtureValues[0].fixtureId).toBe('fixture-1');
      expect(result.fixtureValues[0].channels).toEqual([{ offset: 0, value: 100 }, { offset: 1, value: 200 }]); // Sparse format - no padding needed
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
            channels: [{ offset: 0, value: 300 }, { offset: 1, value: -50 }, { offset: 2, value: 128 }] // Out of range values
          }
        ],
        reasoning: 'Test'
      };

      const result = await aiService.optimizeSceneForFixtures(scene, [mockFixture]);

      // Values should be clamped to 0-255 range (sparse format)
      expect(result.fixtureValues[0].channels).toEqual([
        { offset: 0, value: 255 },
        { offset: 1, value: 0 },
        { offset: 2, value: 128 }
      ]);
    });

    it('should preserve sparse format (no padding needed)', async () => {
      const scene = {
        name: 'Test Scene',
        description: 'Test',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channels: [{ offset: 0, value: 100 }, { offset: 1, value: 200 }] // Only 2 values, sparse format doesn't need padding
          }
        ],
        reasoning: 'Test'
      };

      const result = await aiService.optimizeSceneForFixtures(scene, [mockFixture]);

      // Sparse format: no padding needed, just preserve provided values
      expect(result.fixtureValues[0].channels).toEqual([
        { offset: 0, value: 100 },
        { offset: 1, value: 200 }
      ]);
    });

    it('should filter out-of-bounds offsets', async () => {
      const scene = {
        name: 'Test Scene',
        description: 'Test',
        fixtureValues: [
          {
            fixtureId: 'fixture-1',
            channels: [{ offset: 0, value: 100 }, { offset: 1, value: 200 }, { offset: 2, value: 50 }, { offset: 3, value: 75 }, { offset: 4, value: 25 }] // 5 values, fixture only has 3 channels
          }
        ],
        reasoning: 'Test'
      };

      const result = await aiService.optimizeSceneForFixtures(scene, [mockFixture]);

      // Sparse format: offsets 3 and 4 should be filtered out (fixture only has 3 channels, offsets 0-2)
      expect(result.fixtureValues[0].channels).toEqual([
        { offset: 0, value: 100 },
        { offset: 1, value: 200 },
        { offset: 2, value: 50 }
      ]);
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

    it('should handle malformed JSON extraction error', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Here is my analysis: {"primaryFixtures": ["fixture-1", malformed json}'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await aiService.suggestFixtureUsage('Test', [mockFixture]);

      expect(result.primaryFixtures).toEqual([]);
      expect(result.reasoning).toContain('Unable to parse AI response');
    });
  });

  describe('generateScene - additive scenes', () => {
    it('should generate additive scene with only specified fixtures', async () => {
      const allFixtures: FixtureInstance[] = [
        mockFixture,
        {
          ...mockFixture,
          id: 'fixture-2',
          name: 'Background LED',
          tags: ['background']
        }
      ];

      mockRAGService.generateLightingRecommendations.mockResolvedValue({
        colorSuggestions: ['blue'],
        intensityLevels: {},
        focusAreas: [],
        reasoning: 'Test'
      });

      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              name: 'Additive Scene',
              description: 'Only modifying some fixtures',
              fixtureValues: [
                {
                  fixtureId: 'fixture-1',
                  channels: [{ offset: 0, value: 100 }, { offset: 1, value: 150 }, { offset: 2, value: 200 }]
                }
              ]
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const request = {
        scriptContext: 'Test',
        sceneDescription: 'Additive test',
        availableFixtures: [mockFixture],
        allFixtures: allFixtures,
        sceneType: 'additive' as const
      };

      const result = await aiService.generateScene(request);

      expect(result.name).toBe('Additive Scene');
      expect(result.fixtureValues).toHaveLength(1);
      expect(result.fixtureValues[0].fixtureId).toBe('fixture-1');
    });

    it('should handle additive scene with many fixtures', async () => {
      // Create 20 fixtures to test truncation
      const manyFixtures = Array.from({ length: 20 }, (_, i) => ({
        ...mockFixture,
        id: `fixture-${i}`,
        name: `Fixture ${i}`
      }));

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
              fixtureValues: []
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const request = {
        scriptContext: 'Test',
        sceneDescription: 'Test',
        availableFixtures: manyFixtures.slice(0, 10),
        allFixtures: manyFixtures,
        sceneType: 'additive' as const
      };

      await aiService.generateScene(request);

      // Should call OpenAI with truncated fixture list
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });
  });

  describe('generateScene - JSON extraction edge cases', () => {
    it('should extract JSON from text with nested braces', async () => {
      mockRAGService.generateLightingRecommendations.mockResolvedValue({
        colorSuggestions: [],
        intensityLevels: {},
        focusAreas: [],
        reasoning: 'Test'
      });

      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Here is the scene: {"name": "Test", "fixtureValues": []}'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await aiService.generateScene({
        scriptContext: 'Test',
        sceneDescription: 'Test',
        availableFixtures: [mockFixture]
      });

      expect(result.name).toBe('Test');
    });

    it('should handle failed JSON extraction with nested try-catch', async () => {
      mockRAGService.generateLightingRecommendations.mockResolvedValue({
        colorSuggestions: [],
        intensityLevels: {},
        focusAreas: [],
        reasoning: 'Test reasoning'
      });

      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Some text { invalid json here that will fail }'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await aiService.generateScene({
        scriptContext: 'Test',
        sceneDescription: 'Test scene',
        availableFixtures: [mockFixture]
      });

      expect(result.name).toBe('Scene for Test scene');
      expect(result.reasoning).toContain('Test reasoning');
    });
  });

  describe('generateCueSequence - JSON extraction', () => {
    it('should extract JSON from text response', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Here is the cue sequence: {"name": "Act 1", "cues": [], "reasoning": "Test"}'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await aiService.generateCueSequence('Test', []);

      expect(result.name).toBe('Act 1');
    });

    it('should handle failed JSON extraction in cue sequence', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'Text { broken json here }'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await aiService.generateCueSequence('Test', []);

      expect(result.name).toBe('Generated Cue Sequence');
      expect(result.reasoning).toContain('Unable to parse AI response');
    });

    it('should handle no JSON match in response', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: 'No JSON here at all'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

      const result = await aiService.generateCueSequence('Test', []);

      expect(result.name).toBe('Generated Cue Sequence');
      expect(result.cues).toEqual([]);
    });
  });
});
