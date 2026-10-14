import OpenAI from 'openai';
import {
  createOptionalOpenAIClient,
  requireOpenAIClient,
  OpenAIUnavailableError,
} from '../../src/services/openai-client';

import { logger } from '../../src/utils/logger';

jest.mock('openai');
jest.mock('../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
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

    it('returns null without constructing a client when OPENAI_API_KEY is not set', () => {
      delete process.env.OPENAI_API_KEY;
      MockOpenAI.mockImplementation(() => {
        throw new Error(
          'Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.',
        );
      });

      expect(() => createOptionalOpenAIClient()).not.toThrow();
      expect(createOptionalOpenAIClient()).toBeNull();
      expect(MockOpenAI).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('treats a blank OPENAI_API_KEY as not set', () => {
      process.env.OPENAI_API_KEY = '   ';

      expect(createOptionalOpenAIClient()).toBeNull();
      expect(MockOpenAI).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('returns null but logs the real cause when the key is set and the constructor still throws', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      MockOpenAI.mockImplementation(() => {
        throw new Error('Invalid URL: not-a-url');
      });

      expect(() => createOptionalOpenAIClient()).not.toThrow();
      expect(createOptionalOpenAIClient()).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('OpenAI client could not be initialized'),
        expect.objectContaining({ error: 'Invalid URL: not-a-url' }),
      );
    });
  });

  describe('createOptionalOpenAIClient non-Error throws', () => {
    it('stringifies a non-Error value thrown by the constructor when logging', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      MockOpenAI.mockImplementation(() => {
        throw 'boom';
      });

      expect(createOptionalOpenAIClient()).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ error: 'boom' }),
      );
    });
  });

  describe('requireOpenAIClient', () => {
    it('returns the client when one is available', () => {
      const instance = { chat: {} } as unknown as OpenAI;
      expect(requireOpenAIClient(instance)).toBe(instance);
    });

    it('throws OpenAIUnavailableError with an actionable message when the client is null', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => requireOpenAIClient(null)).toThrow(OpenAIUnavailableError);
      expect(() => requireOpenAIClient(null)).toThrow(/OPENAI_API_KEY is not set/);
    });

    it('does not claim the key is missing when OPENAI_API_KEY is set but the client failed to initialize', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(() => requireOpenAIClient(null)).toThrow(OpenAIUnavailableError);
      expect(() => requireOpenAIClient(null)).toThrow(/could not be initialized/);
      expect(() => requireOpenAIClient(null)).not.toThrow(/is not set/);
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
