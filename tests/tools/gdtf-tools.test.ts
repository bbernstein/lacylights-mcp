import * as fsModule from 'fs';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { zipSync, strToU8 } from 'fflate';
import {
  GdtfTools,
  batchGdtfFiles,
  GDTF_IMPORT_BATCH_SIZE,
  MAX_LISTED_RESULTS,
  MAX_WARNINGS_PER_FILE,
} from '../../src/tools/gdtf-tools';
import {
  LacyLightsGraphQLClient,
  GdtfFileInput,
  GdtfImportResult,
  GraphQLRequestError,
} from '../../src/services/graphql-client-simple';

jest.mock('../../src/services/graphql-client-simple', () => {
  const actual = jest.requireActual('../../src/services/graphql-client-simple');
  return { ...actual, LacyLightsGraphQLClient: jest.fn() };
});

// Synthetic GDTF content only; never real GDTF Share or manufacturer files.
function gdtf(name: string): Uint8Array {
  return zipSync({
    'description.xml': strToU8(`<GDTF><FixtureType Name="${name}" Manufacturer="Acme"/></GDTF>`),
  });
}

/** Backend stand-in: every file is CREATED with one warning-free mode. */
function createdResult(files: GdtfFileInput[]): GdtfImportResult {
  return {
    results: files.map((f, i) => ({
      fileName: f.fileName,
      status: 'CREATED' as const,
      definition: { id: `def-${f.fileName}`, manufacturer: 'Acme', model: `M${i}`, source: 'GDTF' as const },
      manufacturer: 'Acme',
      model: `M${i}`,
      modeCount: 1,
      warnings: [],
      error: null,
    })),
    createdCount: files.length,
    updatedCount: 0,
    unchangedCount: 0,
    skippedCount: 0,
    failedCount: 0,
  };
}

describe('batchGdtfFiles', () => {
  const file = (n: number, size = 1): GdtfFileInput => ({ fileName: `F${n}.gdtf`, descriptionXml: 'x'.repeat(size) });

  it('splits into batches of the configured size', () => {
    const files = Array.from({ length: 2 * GDTF_IMPORT_BATCH_SIZE + 3 }, (_, i) => file(i));
    const batches = batchGdtfFiles(files);
    expect(batches.map((b) => b.length)).toEqual([GDTF_IMPORT_BATCH_SIZE, GDTF_IMPORT_BATCH_SIZE, 3]);
    expect(batches.flat()).toEqual(files);
  });

  it('starts a new batch when the byte budget would be exceeded', () => {
    const batches = batchGdtfFiles([file(1, 6), file(2, 6), file(3, 3), file(4, 20)], 25, 10);
    expect(batches.map((b) => b.map((f) => f.fileName))).toEqual([
      ['F1.gdtf'],
      ['F2.gdtf', 'F3.gdtf'],
      ['F4.gdtf'], // larger than the budget: sent alone
    ]);
  });

  it('returns no batches for no files', () => {
    expect(batchGdtfFiles([])).toEqual([]);
  });
});

describe('GdtfTools.importGdtfFixtures', () => {
  let tmp: string;
  let client: jest.Mocked<Pick<LacyLightsGraphQLClient, 'importGdtfFixtures'>>;
  let tools: GdtfTools;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gdtf-tools-test-'));
    client = { importGdtfFixtures: jest.fn() };
    tools = new GdtfTools(client as unknown as LacyLightsGraphQLClient);
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  async function writeGdtfs(count: number, dir = 'lib'): Promise<string> {
    const root = path.join(tmp, dir);
    await fs.mkdir(root, { recursive: true });
    for (let i = 0; i < count; i++) {
      await fs.writeFile(path.join(root, `F${String(i).padStart(3, '0')}.gdtf`), gdtf(`F${i}`));
    }
    return root;
  }

  it('imports a folder in batches and aggregates counts', async () => {
    const root = await writeGdtfs(GDTF_IMPORT_BATCH_SIZE + 5);
    client.importGdtfFixtures.mockImplementation(async (files) => createdResult(files));

    const out = await tools.importGdtfFixtures({ paths: [root] });

    expect(client.importGdtfFixtures).toHaveBeenCalledTimes(2);
    expect(client.importGdtfFixtures.mock.calls[0][0]).toHaveLength(GDTF_IMPORT_BATCH_SIZE);
    expect(client.importGdtfFixtures.mock.calls[1][0]).toHaveLength(5);
    expect(client.importGdtfFixtures.mock.calls[0][1]).toBeUndefined();
    expect(client.importGdtfFixtures.mock.calls[0][0][0]).toEqual({
      fileName: 'lib/F000.gdtf',
      descriptionXml: '<GDTF><FixtureType Name="F0" Manufacturer="Acme"/></GDTF>',
    });
    expect(out.summary).toEqual({
      filesSent: GDTF_IMPORT_BATCH_SIZE + 5,
      created: GDTF_IMPORT_BATCH_SIZE + 5,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      failed: 0,
    });
    expect(out.results).toHaveLength(GDTF_IMPORT_BATCH_SIZE + 5);
    expect(out.results[0]).toEqual({
      fileName: 'lib/F000.gdtf',
      status: 'CREATED',
      manufacturer: 'Acme',
      model: 'M0',
      modes: 1,
      definitionId: 'def-lib/F000.gdtf',
      source: 'GDTF',
    });
    expect(out.truncated).toBeUndefined();
  });

  it('sends each batch before reading the remaining files', async () => {
    const root = await writeGdtfs(GDTF_IMPORT_BATCH_SIZE + 5);
    const readFile = jest.spyOn(fsModule.promises, 'readFile');
    const readsAtCall: number[] = [];
    client.importGdtfFixtures.mockImplementation(async (files) => {
      readsAtCall.push(readFile.mock.calls.length);
      return createdResult(files);
    });
    try {
      await tools.importGdtfFixtures({ paths: [root] });
    } finally {
      readFile.mockRestore();
    }
    // The first batch goes out when file 26 is read, not after all 30.
    expect(readsAtCall).toEqual([GDTF_IMPORT_BATCH_SIZE + 1, GDTF_IMPORT_BATCH_SIZE + 5]);
  });

  it('passes onExisting through', async () => {
    const root = await writeGdtfs(1);
    client.importGdtfFixtures.mockImplementation(async (files) => createdResult(files));
    await tools.importGdtfFixtures({ paths: [root], onExisting: 'SKIP' });
    expect(client.importGdtfFixtures.mock.calls[0][1]).toEqual({ onExisting: 'SKIP' });
  });

  it('reports unreadable files and server failures per file, capping warnings', async () => {
    const root = await writeGdtfs(2);
    await fs.writeFile(path.join(root, 'Broken.gdtf'), 'not a zip');
    const warnings = Array.from({ length: MAX_WARNINGS_PER_FILE + 2 }, (_, i) => `w${i}`);
    client.importGdtfFixtures.mockResolvedValue({
      results: [
        {
          fileName: 'lib/F000.gdtf',
          status: 'UPDATED',
          definition: { id: 'd0', manufacturer: 'Acme', model: 'Spot', source: 'GDTF' },
          manufacturer: null,
          model: null,
          modeCount: 2,
          warnings,
          error: null,
        },
        {
          fileName: 'lib/F001.gdtf',
          status: 'FAILED',
          definition: null,
          manufacturer: null,
          model: null,
          modeCount: null,
          warnings: [],
          error: 'invalid XML',
        },
      ],
      createdCount: 0,
      updatedCount: 1,
      unchangedCount: 0,
      skippedCount: 0,
      failedCount: 1,
    });

    const out = await tools.importGdtfFixtures({ paths: [root] });

    expect(client.importGdtfFixtures.mock.calls[0][0].map((f) => f.fileName)).toEqual([
      'lib/F000.gdtf',
      'lib/F001.gdtf',
    ]);
    expect(out.summary).toEqual({ filesSent: 2, created: 0, updated: 1, unchanged: 0, skipped: 0, failed: 2 });
    expect(out.results).toEqual([
      { fileName: 'lib/Broken.gdtf', status: 'FAILED', error: expect.stringMatching(/not a zip archive/) },
      {
        fileName: 'lib/F000.gdtf',
        status: 'UPDATED',
        manufacturer: 'Acme',
        model: 'Spot',
        modes: 2,
        definitionId: 'd0',
        source: 'GDTF',
        warnings: warnings.slice(0, MAX_WARNINGS_PER_FILE),
        moreWarnings: 2,
      },
      { fileName: 'lib/F001.gdtf', status: 'FAILED', error: 'invalid XML' },
    ]);
  });

  it('marks a failed batch as FAILED and continues with the next', async () => {
    const root = await writeGdtfs(GDTF_IMPORT_BATCH_SIZE + 1);
    client.importGdtfFixtures
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockImplementation(async (files) => createdResult(files));

    const out = await tools.importGdtfFixtures({ paths: [root] });

    expect(client.importGdtfFixtures).toHaveBeenCalledTimes(2);
    expect(out.summary.failed).toBe(GDTF_IMPORT_BATCH_SIZE);
    expect(out.summary.created).toBe(1);
    expect(out.results[0]).toEqual({
      fileName: 'lib/F000.gdtf',
      status: 'FAILED',
      error: 'import request failed: connection reset',
    });
  });

  it('explains when the backend has no GDTF import', async () => {
    const root = await writeGdtfs(1);
    client.importGdtfFixtures.mockRejectedValue(
      new GraphQLRequestError('validation failed', [
        'Cannot query field "importGdtfFixtures" on type "Mutation".',
      ]),
    );
    await expect(tools.importGdtfFixtures({ paths: [root] })).rejects.toThrow(
      /does not support GDTF import.*Update LacyLights/,
    );
  });

  it('caps the listed results, failures first', async () => {
    const root = await writeGdtfs(MAX_LISTED_RESULTS + 10);
    await fs.writeFile(path.join(root, 'zzz-broken.gdtf'), 'not a zip');
    client.importGdtfFixtures.mockImplementation(async (files) => createdResult(files));

    const out = await tools.importGdtfFixtures({ paths: [root] });

    expect(out.results).toHaveLength(MAX_LISTED_RESULTS);
    expect(out.results[0]).toMatchObject({ fileName: 'lib/zzz-broken.gdtf', status: 'FAILED' });
    expect(out.results[1].fileName).toBe('lib/F000.gdtf');
    expect(out.truncated).toBe(true);
    expect(out.note).toMatch(`Listed ${MAX_LISTED_RESULTS} of ${MAX_LISTED_RESULTS + 11} files`);
    expect(out.summary.created).toBe(MAX_LISTED_RESULTS + 10);
    expect(out.summary.failed).toBe(1);
  });

  it('does not call the backend when nothing could be read', async () => {
    const out = await tools.importGdtfFixtures({ paths: [path.join(tmp, 'missing.gdtf')] });
    expect(client.importGdtfFixtures).not.toHaveBeenCalled();
    expect(out.summary).toEqual({ filesSent: 0, created: 0, updated: 0, unchanged: 0, skipped: 0, failed: 1 });
    expect(out.results[0].status).toBe('FAILED');
  });

  it('throws when the paths contain no GDTF files at all', async () => {
    await fs.mkdir(path.join(tmp, 'empty'));
    await expect(tools.importGdtfFixtures({ paths: [path.join(tmp, 'empty')] })).rejects.toThrow(
      'No .gdtf or .zip files found in the given paths',
    );
  });

  it('validates arguments', async () => {
    await expect(tools.importGdtfFixtures({ paths: [] })).rejects.toThrow();
    await expect(tools.importGdtfFixtures({} as any)).rejects.toThrow();
    await expect(tools.importGdtfFixtures({ paths: ['x'], onExisting: 'REPLACE' as any })).rejects.toThrow();
    expect(client.importGdtfFixtures).not.toHaveBeenCalled();
  });
});
