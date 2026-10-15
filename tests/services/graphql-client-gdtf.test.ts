import fetch from 'cross-fetch';
import {
  LacyLightsGraphQLClient,
  GraphQLRequestError,
  isUnknownFieldError,
  isUnknownQueryFieldError,
} from '../../src/services/graphql-client-simple';

jest.mock('cross-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

function jsonResponse(data: unknown, status = 200): Partial<Response> {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Unprocessable Entity',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

function sentBody(call: number): { query: string; variables: any } {
  return JSON.parse((mockFetch.mock.calls[call][1] as RequestInit).body as string);
}

const unknownSource = {
  errors: [{ message: 'Cannot query field "source" on type "FixtureDefinition".' }],
};

describe('isUnknownFieldError', () => {
  it('matches the field on the given type only', () => {
    const err = new GraphQLRequestError('x', ['Cannot query field "source" on type "FixtureDefinition".']);
    expect(isUnknownFieldError(err, 'source', 'FixtureDefinition')).toBe(true);
    expect(isUnknownFieldError(err, 'source', 'Query')).toBe(false);
    expect(isUnknownFieldError(err, 'sourceId', 'FixtureDefinition')).toBe(false);
    expect(isUnknownFieldError('not an error', 'source', 'FixtureDefinition')).toBe(false);
  });

  it('keeps isUnknownQueryFieldError working', () => {
    const err = new Error('Cannot query field "projectExportEos" on type "Query".');
    expect(isUnknownQueryFieldError(err, 'projectExportEos')).toBe(true);
  });
});

describe('LacyLightsGraphQLClient fixture source compatibility', () => {
  let client: LacyLightsGraphQLClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new LacyLightsGraphQLClient('http://localhost:4000/graphql');
  });

  it('selects source fields on current backends', async () => {
    const defs = [{ id: 'd1', manufacturer: 'Acme', model: 'Spot', source: 'GDTF', sourceId: 'x', sourceVersion: '1' }];
    mockFetch.mockResolvedValue(jsonResponse({ data: { fixtureDefinitions: defs } }) as Response);

    await expect(client.getFixtureDefinitions()).resolves.toEqual(defs);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const { query } = sentBody(0);
    expect(query).toMatch(/\bsource\b/);
    expect(query).toMatch(/\bsourceId\b/);
    expect(query).toMatch(/\bsourceVersion\b/);
    expect(query).toMatch(/\bisBuiltIn\b/);
  });

  it('retries without source on older backends and remembers it', async () => {
    const defs = [{ id: 'd1', manufacturer: 'Acme', model: 'Par', isBuiltIn: true }];
    mockFetch
      .mockResolvedValueOnce(jsonResponse(unknownSource, 422) as Response)
      .mockResolvedValue(jsonResponse({ data: { fixtureDefinitions: defs } }) as Response);

    await expect(client.getFixtureDefinitions()).resolves.toEqual(defs);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(sentBody(1).query).not.toMatch(/\bsource/);
    expect(sentBody(1).query).toMatch(/\bisBuiltIn\b/);

    // Later calls go straight to the compatible query.
    await client.getFixtureDefinitions();
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(sentBody(2).query).not.toMatch(/\bsource/);
  });

  it('also falls back when the error arrives with HTTP 200', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(unknownSource) as Response)
      .mockResolvedValue(jsonResponse({ data: { fixtureDefinitions: [] } }) as Response);
    await expect(client.getFixtureDefinitions()).resolves.toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry on other errors', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ errors: [{ message: 'database is locked' }] }) as Response);
    await expect(client.getFixtureDefinitions()).rejects.toThrow('database is locked');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('LacyLightsGraphQLClient.importGdtfFixtures', () => {
  let client: LacyLightsGraphQLClient;
  const result = {
    results: [],
    createdCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    skippedCount: 0,
    failedCount: 0,
  };
  const files = [{ fileName: 'A.gdtf', descriptionXml: '<GDTF/>' }];

  beforeEach(() => {
    jest.clearAllMocks();
    client = new LacyLightsGraphQLClient('http://localhost:4000/graphql');
  });

  it('sends files and null options by default', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { importGdtfFixtures: result } }) as Response);

    await expect(client.importGdtfFixtures(files)).resolves.toEqual(result);

    const body = sentBody(0);
    expect(body.query).toMatch(/importGdtfFixtures\(files: \$files, options: \$options\)/);
    expect(body.query).toMatch(/definition \{[^}]*source/);
    expect(body.variables).toEqual({ files, options: null });
  });

  it('sends onExisting when given', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { importGdtfFixtures: result } }) as Response);
    await client.importGdtfFixtures(files, { onExisting: 'SKIP' });
    expect(sentBody(0).variables.options).toEqual({ onExisting: 'SKIP' });
  });

  it('throws when the response has no result', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: { importGdtfFixtures: null } }) as Response);
    await expect(client.importGdtfFixtures(files)).rejects.toThrow('did not include "importGdtfFixtures"');
  });
});
