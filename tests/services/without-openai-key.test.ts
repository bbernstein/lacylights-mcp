/**
 * Regression tests for bbernstein/lacylights-mcp#176.
 *
 * The openai SDK (v5+) throws from its constructor when no API key is
 * available. RAGService and AILightingService used to construct the client
 * eagerly, so the whole MCP server crashed on startup (exit 1, nothing on
 * stdio) whenever OPENAI_API_KEY was unset -- e.g. when launched by Claude Code
 * from the .mcp.json the LacyLights Mac app generates. Only the AI-backed tools
 * need OpenAI, so the server must start without it and those tools must fail
 * with an actionable error instead.
 */
import OpenAI from 'openai';
import { RAGService } from '../../src/services/rag-service-simple';
import { AILightingService } from '../../src/services/ai-lighting';
import { OpenAIUnavailableError } from '../../src/services/openai-client';

jest.mock('openai');
const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

const missingKeyError = () =>
  new Error(
    'Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.',
  );

describe('services without OPENAI_API_KEY (#176)', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    // Keep the suite hermetic: a key exported in the developer's shell must
    // not turn this into the "key set but client failed" path.
    delete process.env.OPENAI_API_KEY;
    MockOpenAI.mockImplementation(() => {
      throw missingKeyError();
    });
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  describe('RAGService', () => {
    it('constructs without throwing', () => {
      expect(() => new RAGService()).not.toThrow();
    });

    it('still supports non-AI operations', async () => {
      const rag = new RAGService();
      await expect(rag.initializeCollection()).resolves.toBeUndefined();
      const similar = await rag.findSimilarLightingPatterns('sunset', 'romantic');
      expect(similar.documents.length).toBeGreaterThan(0);
    });

    it('rejects analyzeScript with OpenAIUnavailableError', async () => {
      const rag = new RAGService();
      await expect(rag.analyzeScript('ACT 1')).rejects.toBeInstanceOf(OpenAIUnavailableError);
    });

    it('rejects generateLightingRecommendations with OpenAIUnavailableError', async () => {
      const rag = new RAGService();
      await expect(
        rag.generateLightingRecommendations('scene', 'tense', ['LED_PAR']),
      ).rejects.toBeInstanceOf(OpenAIUnavailableError);
    });
  });

  describe('AILightingService', () => {
    const fakeRag = {
      generateLightingRecommendations: jest.fn().mockResolvedValue({
        colorSuggestions: [],
        intensityLevels: {},
        focusAreas: [],
        reasoning: '',
      }),
    } as unknown as RAGService;

    it('constructs without throwing', () => {
      expect(() => new AILightingService(fakeRag)).not.toThrow();
    });

    it('rejects generateLook with OpenAIUnavailableError', async () => {
      const ai = new AILightingService(fakeRag);
      await expect(
        ai.generateLook({
          scriptContext: 'ctx',
          lookDescription: 'warm sunset',
          availableFixtures: [],
        }),
      ).rejects.toBeInstanceOf(OpenAIUnavailableError);
    });

    it('rejects generateCueSequence with OpenAIUnavailableError', async () => {
      const ai = new AILightingService(fakeRag);
      await expect(ai.generateCueSequence('ctx', [])).rejects.toBeInstanceOf(
        OpenAIUnavailableError,
      );
    });

    it('rejects suggestFixtureUsage with OpenAIUnavailableError', async () => {
      const ai = new AILightingService(fakeRag);
      await expect(ai.suggestFixtureUsage('ctx', [])).rejects.toBeInstanceOf(
        OpenAIUnavailableError,
      );
    });
  });
});
