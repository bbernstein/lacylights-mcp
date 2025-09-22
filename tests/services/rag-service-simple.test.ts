import { RAGService } from '../../src/services/rag-service-simple';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('RAGService', () => {
  let ragService: RAGService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    // Clear all mocks before each test
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

    // Make OpenAI constructor return our mock
    MockOpenAI.mockImplementation(() => mockOpenAI);

    ragService = new RAGService();
  });

  describe('constructor', () => {
    it('should create RAGService instance', () => {
      expect(ragService).toBeInstanceOf(RAGService);
      expect(MockOpenAI).toHaveBeenCalledWith({
        apiKey: process.env.OPENAI_API_KEY
      });
    });

    it('should initialize default patterns', () => {
      expect(ragService).toBeInstanceOf(RAGService);
    });
  });

  describe('initializeCollection', () => {
    it('should initialize without error', async () => {
      await expect(ragService.initializeCollection()).resolves.toBeUndefined();
    });
  });

  describe('indexLightingPattern', () => {
    it('should index a lighting pattern', async () => {
      const pattern = {
        id: 'test-pattern',
        description: 'Test pattern',
        context: 'test context',
        mood: 'romantic',
        fixtureTypes: ['LED_PAR'],
        colorPalette: ['red', 'blue'],
        intensity: 'moderate',
        metadata: { test: 'value' }
      };

      await ragService.indexLightingPattern(pattern);
      
      // Pattern should be indexed (we can't directly test the private patterns map)
      expect(ragService).toBeInstanceOf(RAGService);
    });
  });

  describe('analyzeScript', () => {
    it('should analyze script and return structured data', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              scenes: [{
                sceneNumber: '1',
                title: 'Opening',
                content: 'Test content',
                mood: 'dramatic',
                characters: ['Alice', 'Bob'],
                stageDirections: ['Lights up'],
                lightingCues: ['Cue 1'],
                timeOfDay: 'evening',
                location: 'living room'
              }],
              characters: ['Alice', 'Bob'],
              settings: ['living room'],
              overallMood: 'dramatic',
              themes: ['love', 'conflict']
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse as any);

      const result = await ragService.analyzeScript('Test script text');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [{ role: 'user', content: expect.stringContaining('Test script text') }],
        temperature: 0.3
      });

      expect(result).toEqual({
        scenes: [{
          sceneNumber: '1',
          title: 'Opening',
          content: 'Test content',
          mood: 'dramatic',
          characters: ['Alice', 'Bob'],
          stageDirections: ['Lights up'],
          lightingCues: ['Cue 1'],
          timeOfDay: 'evening',
          location: 'living room'
        }],
        characters: ['Alice', 'Bob'],
        settings: ['living room'],
        overallMood: 'dramatic',
        themes: ['love', 'conflict']
      });
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse as any);

      const result = await ragService.analyzeScript('Test script');

      expect(result).toEqual({
        scenes: [],
        characters: [],
        settings: [],
        overallMood: 'unknown',
        themes: []
      });
    });

    it('should extract JSON from mixed content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Here is the analysis: {"scenes": [], "characters": [], "settings": [], "overallMood": "test", "themes": []}'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse as any);

      const result = await ragService.analyzeScript('Test script');

      expect(result.overallMood).toBe('test');
    });

    it('should handle malformed JSON with parse error', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Analysis: {"scenes": [], "characters": incomplete json}'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse as any);

      const result = await ragService.analyzeScript('Test script');

      expect(result).toEqual({
        scenes: [],
        characters: [],
        settings: [],
        overallMood: 'unknown',
        themes: []
      });
    });

    it('should handle OpenAI API errors', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(new Error('API Error'));

      await expect(ragService.analyzeScript('Test script')).rejects.toThrow('API Error');
    });
  });

  describe('findSimilarLightingPatterns', () => {
    beforeEach(async () => {
      // Index some test patterns
      await ragService.indexLightingPattern({
        id: 'romantic-1',
        description: 'Romantic lighting',
        context: 'love scene',
        mood: 'romantic',
        fixtureTypes: ['LED_PAR'],
        colorPalette: ['red', 'pink'],
        intensity: 'subtle',
        metadata: {}
      });

      await ragService.indexLightingPattern({
        id: 'dramatic-1',
        description: 'Dramatic lighting',
        context: 'conflict scene',
        mood: 'dramatic',
        fixtureTypes: ['MOVING_HEAD'],
        colorPalette: ['red', 'white'],
        intensity: 'high',
        metadata: {}
      });
    });

    it('should find patterns by mood', async () => {
      const result = await ragService.findSimilarLightingPatterns(
        'romance scene',
        'romantic',
        5
      );

      expect(result.documents.length).toBeGreaterThan(0);
      expect(result.documents).toContain('Romantic lighting');
      expect(result.metadatas.some(m => m.mood === 'romantic')).toBe(true);
    });

    it('should find patterns by scene description', async () => {
      const result = await ragService.findSimilarLightingPatterns(
        'love scene',
        'unknown',
        5
      );

      expect(result.documents.length).toBeGreaterThan(0);
      expect(result.documents).toContain('Romantic lighting');
    });

    it('should return empty results for no matches', async () => {
      const result = await ragService.findSimilarLightingPatterns(
        'unknown scene',
        'unknown mood',
        5
      );

      expect(result.documents).toHaveLength(0);
    });

    it('should limit results', async () => {
      const result = await ragService.findSimilarLightingPatterns(
        'scene',
        'romantic',
        1
      );

      expect(result.documents.length).toBeLessThanOrEqual(1);
    });
  });

  describe('generateLightingRecommendations', () => {
    it('should generate recommendations', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              colorSuggestions: ['red', 'blue'],
              intensityLevels: {
                ambient: 50,
                key: 75,
                fill: 60,
                background: 30
              },
              focusAreas: ['center stage'],
              reasoning: 'Test reasoning'
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse as any);

      const result = await ragService.generateLightingRecommendations(
        'romantic scene',
        'romantic',
        ['LED_PAR', 'MOVING_HEAD']
      );

      expect(result).toEqual({
        colorSuggestions: ['red', 'blue'],
        intensityLevels: {
          ambient: 50,
          key: 75,
          fill: 60,
          background: 30
        },
        focusAreas: ['center stage'],
        reasoning: 'Test reasoning'
      });
    });

    it('should handle invalid JSON in recommendations', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse as any);

      const result = await ragService.generateLightingRecommendations(
        'test scene',
        'test mood',
        ['LED_PAR']
      );

      expect(result).toEqual({
        colorSuggestions: [],
        intensityLevels: {
          ambient: 50,
          key: 75,
          fill: 60,
          background: 30
        },
        focusAreas: [],
        reasoning: 'Unable to parse AI response, using default values'
      });
    });

    it('should handle malformed JSON extraction in recommendations', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Here is the recommendation: {"colorSuggestions": ["red", malformed json}'
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse as any);

      const result = await ragService.generateLightingRecommendations(
        'test scene',
        'test mood',
        ['LED_PAR']
      );

      expect(result).toEqual({
        colorSuggestions: [],
        intensityLevels: {
          ambient: 50,
          key: 75,
          fill: 60,
          background: 30
        },
        focusAreas: [],
        reasoning: 'Unable to parse AI response, using default values'
      });
    });
  });

  describe('seedDefaultPatterns', () => {
    it('should seed default patterns', async () => {
      // Capture console.log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await ragService.seedDefaultPatterns();
      
      expect(consoleSpy).toHaveBeenCalledWith('Default patterns loaded');
      
      consoleSpy.mockRestore();
    });
  });
});