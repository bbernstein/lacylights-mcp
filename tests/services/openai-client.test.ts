import OpenAI from 'openai';
import {
  createOptionalOpenAIClient,
  requireOpenAIClient,
  OpenAIUnavailableError,
} from '../../src/services/openai-client';

jest.mock('openai');
const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('openai-client', () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  describe('createOptionalOpenAIClient', () => {
    it('returns an OpenAI client constructed with OPENAI_API_KEY', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const instance = { chat: {} } as unknown as OpenAI;
      MockOpenAI.mockImplementation(() => instance);

      const client = createOptionalOpenAIClient();

      expect(client).toBe(instance);
      expect(MockOpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test' });
    });

    it('returns null instead of throwing when the OpenAI constructor throws (e.g. missing key)', () => {
      delete process.env.OPENAI_API_KEY;
      MockOpenAI.mockImplementation(() => {
        throw new Error(
          'Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.',
        );
      });

      expect(() => createOptionalOpenAIClient()).not.toThrow();
      expect(createOptionalOpenAIClient()).toBeNull();
    });
  });

  describe('requireOpenAIClient', () => {
    it('returns the client when one is available', () => {
      const instance = { chat: {} } as unknown as OpenAI;
      expect(requireOpenAIClient(instance)).toBe(instance);
    });

    it('throws OpenAIUnavailableError with an actionable message when the client is null', () => {
      expect(() => requireOpenAIClient(null)).toThrow(OpenAIUnavailableError);
      expect(() => requireOpenAIClient(null)).toThrow(/OPENAI_API_KEY/);
    });
  });

  describe('OpenAIUnavailableError', () => {
    it('is an Error with a stable name', () => {
      const err = new OpenAIUnavailableError();
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('OpenAIUnavailableError');
    });
  });
});
