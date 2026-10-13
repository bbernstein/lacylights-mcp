import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  DataExportTools,
  DEFAULT_MAX_CSV_CHARACTERS,
  DEFAULT_EXPORT_DIR_ENV,
} from '../../src/tools/data-export-tools';
import {
  GraphQLRequestError,
  LacyLightsGraphQLClient,
} from '../../src/services/graphql-client-simple';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64');

function unknownFieldError(field: string): GraphQLRequestError {
  return new GraphQLRequestError(
    'GraphQL request failed with status 422 Unprocessable Entity',
    [`Cannot query field "${field}" on type "Query".`],
  );
}

describe('DataExportTools', () => {
  let tools: DataExportTools;
  let client: {
    getDataExportTables: jest.Mock;
    exportDataTable: jest.Mock;
    exportDataWorkbook: jest.Mock;
  };
  let tmpDir: string;
  const savedEnv = process.env[DEFAULT_EXPORT_DIR_ENV];

  beforeEach(() => {
    client = {
      getDataExportTables: jest.fn(),
      exportDataTable: jest.fn(),
      exportDataWorkbook: jest.fn(),
    };
    tools = new DataExportTools(client as unknown as LacyLightsGraphQLClient);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lacylights-mcp-export-test-'));
    delete process.env[DEFAULT_EXPORT_DIR_ENV];
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (savedEnv === undefined) {
      delete process.env[DEFAULT_EXPORT_DIR_ENV];
    } else {
      process.env[DEFAULT_EXPORT_DIR_ENV] = savedEnv;
    }
  });

  describe('listDataExportTables', () => {
    it('returns the tables with a description of each scope', async () => {
      const tables = [
        { table: 'FIXTURES', label: 'Fixtures', scope: 'project', columns: ['Name'] },
        { table: 'LOOK_DETAILS', label: 'Look Details', scope: 'look', columns: ['Fixture', 'Ch 1 … Ch N'] },
      ];
      client.getDataExportTables.mockResolvedValue(tables);

      const result = await tools.listDataExportTables();

      expect(result.tables).toEqual(tables);
      expect(Object.keys(result.scopes).sort()).toEqual(
        ['cueList', 'lookBoard', 'look', 'none', 'project'].sort(),
      );
      expect(result.scopes.look).toMatch(/scopeId/);
    });

    it('returns an "update LacyLights" error on backends without data export', async () => {
      client.getDataExportTables.mockRejectedValue(unknownFieldError('dataExportTables'));

      await expect(tools.listDataExportTables()).rejects.toThrow(/Update LacyLights/);
    });

    it('rethrows other errors unchanged', async () => {
      const err = new Error('connection refused');
      client.getDataExportTables.mockRejectedValue(err);

      await expect(tools.listDataExportTables()).rejects.toBe(err);
    });
  });

  describe('exportDataTable', () => {
    const csv = 'Name,Universe,Channel\nPar 1,1,1\nPar 2,1,8\n';

    it('returns CSV inline by default with normalized table name', async () => {
      client.exportDataTable.mockResolvedValue({
        filename: 'Show-fixtures-2026-10-13.csv',
        mimeType: 'text/csv',
        contentBase64: b64(csv),
        rowCount: 2,
      });

      const result = await tools.exportDataTable({ projectId: 'p1', table: ' fixtures ' });

      expect(client.exportDataTable).toHaveBeenCalledWith({
        projectId: 'p1',
        table: 'FIXTURES',
        format: 'CSV',
        scopeId: undefined,
      });
      expect(result).toEqual({
        format: 'csv',
        filename: 'Show-fixtures-2026-10-13.csv',
        mimeType: 'text/csv',
        rowCount: 2,
        csv,
        truncated: false,
        totalCharacters: csv.length,
        returnedCharacters: csv.length,
      });
    });

    it('accepts an upper-case format and passes scopeId through', async () => {
      client.exportDataTable.mockResolvedValue({
        filename: 'x.csv',
        mimeType: 'text/csv',
        contentBase64: b64(csv),
        rowCount: 2,
      });

      await tools.exportDataTable({
        projectId: 'p1',
        table: 'LOOK_DETAILS',
        format: 'CSV',
        scopeId: 'look-1',
      });

      expect(client.exportDataTable).toHaveBeenCalledWith({
        projectId: 'p1',
        table: 'LOOK_DETAILS',
        format: 'CSV',
        scopeId: 'look-1',
      });
    });

    it('allows omitting projectId (fixture library)', async () => {
      client.exportDataTable.mockResolvedValue({
        filename: 'fixture-library.csv',
        mimeType: 'text/csv',
        contentBase64: b64('Manufacturer\n'),
        rowCount: 0,
      });

      const result = await tools.exportDataTable({ table: 'FIXTURE_LIBRARY', format: 'csv' });

      expect(client.exportDataTable).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: undefined, table: 'FIXTURE_LIBRARY' }),
      );
      expect(result.rowCount).toBe(0);
    });

    it('truncates large CSV at a line boundary and says so', async () => {
      const big = 'H\n' + Array.from({ length: 50 }, (_, i) => `row-${i}`).join('\n') + '\n';
      client.exportDataTable.mockResolvedValue({
        filename: 'big.csv',
        mimeType: 'text/csv',
        contentBase64: b64(big),
        rowCount: 50,
      });

      const result = await tools.exportDataTable({
        projectId: 'p1',
        table: 'LOOKS',
        maxCharacters: 30,
      });

      expect(result.truncated).toBe(true);
      expect(result.totalCharacters).toBe(big.length);
      expect(result.csv!.length).toBeLessThanOrEqual(30);
      expect(result.csv!.endsWith('\n')).toBe(true);
      expect(big.startsWith(result.csv!)).toBe(true);
      expect(result.returnedCharacters).toBe(result.csv!.length);
      expect(result.note).toMatch(/truncated/i);
      expect(result.note).toContain(String(big.length));
      expect(result.filePath).toBeUndefined();
    });

    it('hard-cuts CSV when there is no line break within the limit', async () => {
      const oneLine = 'x'.repeat(100);
      client.exportDataTable.mockResolvedValue({
        filename: 'wide.csv',
        mimeType: 'text/csv',
        contentBase64: b64(oneLine),
        rowCount: 0,
      });

      const result = await tools.exportDataTable({
        projectId: 'p1',
        table: 'LOOKS',
        maxCharacters: 10,
      });

      expect(result.csv).toBe('x'.repeat(10));
      expect(result.truncated).toBe(true);
    });

    it('uses the default CSV limit when maxCharacters is omitted', async () => {
      const big = 'a,b\n'.repeat(DEFAULT_MAX_CSV_CHARACTERS / 4 + 10);
      client.exportDataTable.mockResolvedValue({
        filename: 'big.csv',
        mimeType: 'text/csv',
        contentBase64: b64(big),
        rowCount: 1,
      });

      const result = await tools.exportDataTable({ projectId: 'p1', table: 'LOOKS' });

      expect(result.truncated).toBe(true);
      expect(result.csv!.length).toBeLessThanOrEqual(DEFAULT_MAX_CSV_CHARACTERS);
    });

    it('also saves the full CSV when outputDirectory is given', async () => {
      const big = 'H\n' + 'r\n'.repeat(40);
      client.exportDataTable.mockResolvedValue({
        filename: 'full.csv',
        mimeType: 'text/csv',
        contentBase64: b64(big),
        rowCount: 40,
      });

      const result = await tools.exportDataTable({
        projectId: 'p1',
        table: 'LOOKS',
        maxCharacters: 10,
        outputDirectory: tmpDir,
      });

      expect(result.filePath).toBe(path.join(tmpDir, 'full.csv'));
      expect(fs.readFileSync(result.filePath!, 'utf-8')).toBe(big);
      expect(result.note).toContain(result.filePath!);
    });

    it('writes XLSX to the output directory and returns its path, not the content', async () => {
      const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00, 0x10]);
      client.exportDataTable.mockResolvedValue({
        filename: 'Show-fixtures-2026-10-13.xlsx',
        mimeType: XLSX_MIME,
        contentBase64: bytes.toString('base64'),
        rowCount: 7,
      });

      const result = await tools.exportDataTable({
        projectId: 'p1',
        table: 'FIXTURES',
        format: 'xlsx',
        outputDirectory: tmpDir,
      });

      expect(client.exportDataTable).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'XLSX' }),
      );
      const expectedPath = path.join(tmpDir, 'Show-fixtures-2026-10-13.xlsx');
      expect(result).toEqual({
        format: 'xlsx',
        filename: 'Show-fixtures-2026-10-13.xlsx',
        mimeType: XLSX_MIME,
        rowCount: 7,
        filePath: expectedPath,
        sizeBytes: bytes.length,
      });
      expect(fs.readFileSync(expectedPath).equals(bytes)).toBe(true);
      expect(JSON.stringify(result)).not.toContain(bytes.toString('base64'));
    });

    it('creates a missing output directory', async () => {
      const nested = path.join(tmpDir, 'a', 'b');
      client.exportDataTable.mockResolvedValue({
        filename: 'f.xlsx',
        mimeType: XLSX_MIME,
        contentBase64: b64('xx'),
        rowCount: 1,
      });

      const result = await tools.exportDataTable({
        projectId: 'p1',
        table: 'FIXTURES',
        format: 'xlsx',
        outputDirectory: nested,
      });

      expect(result.filePath).toBe(path.join(nested, 'f.xlsx'));
      expect(fs.existsSync(result.filePath!)).toBe(true);
    });

    it('uses LACYLIGHTS_EXPORT_DIR when no outputDirectory is given', async () => {
      process.env[DEFAULT_EXPORT_DIR_ENV] = tmpDir;
      client.exportDataTable.mockResolvedValue({
        filename: 'env.xlsx',
        mimeType: XLSX_MIME,
        contentBase64: b64('xx'),
        rowCount: 1,
      });

      const result = await tools.exportDataTable({
        projectId: 'p1',
        table: 'FIXTURES',
        format: 'xlsx',
      });

      expect(result.filePath).toBe(path.join(tmpDir, 'env.xlsx'));
    });

    it('falls back to a lacylights-exports folder in the OS temp dir', async () => {
      // Spy on the real module object so the implementation's import sees it.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tmpdirSpy = jest.spyOn(require('os') as typeof os, 'tmpdir').mockReturnValue(tmpDir);
      try {
        client.exportDataTable.mockResolvedValue({
          filename: 'default.xlsx',
          mimeType: XLSX_MIME,
          contentBase64: b64('xx'),
          rowCount: 1,
        });

        const result = await tools.exportDataTable({
          projectId: 'p1',
          table: 'FIXTURES',
          format: 'xlsx',
        });

        expect(result.filePath).toBe(path.join(tmpDir, 'lacylights-exports', 'default.xlsx'));
      } finally {
        tmpdirSpy.mockRestore();
      }
    });

    it('never writes outside the output directory, whatever filename the server sends', async () => {
      client.exportDataTable.mockResolvedValue({
        filename: '../../etc/evil.xlsx',
        mimeType: XLSX_MIME,
        contentBase64: b64('xx'),
        rowCount: 1,
      });

      const result = await tools.exportDataTable({
        projectId: 'p1',
        table: 'FIXTURES',
        format: 'xlsx',
        outputDirectory: tmpDir,
      });

      expect(result.filePath).toBe(path.join(tmpDir, 'evil.xlsx'));
    });

    it.each(['', '..', '.', '/'])(
      'uses a fallback filename when the server filename is unusable (%p)',
      async (badName) => {
        client.exportDataTable.mockResolvedValue({
          filename: badName,
          mimeType: XLSX_MIME,
          contentBase64: b64('xx'),
          rowCount: 1,
        });

        const result = await tools.exportDataTable({
          projectId: 'p1',
          table: 'FIXTURES',
          format: 'xlsx',
          outputDirectory: tmpDir,
        });

        expect(result.filePath).toBe(path.join(tmpDir, 'lacylights-export.xlsx'));
      },
    );

    it('rejects an unknown format before calling the backend', async () => {
      await expect(
        tools.exportDataTable({ projectId: 'p1', table: 'FIXTURES', format: 'pdf' as any }),
      ).rejects.toThrow();
      expect(client.exportDataTable).not.toHaveBeenCalled();
    });

    it('rejects a missing table before calling the backend', async () => {
      await expect(tools.exportDataTable({ projectId: 'p1' } as any)).rejects.toThrow();
      expect(client.exportDataTable).not.toHaveBeenCalled();
    });

    it('rejects a non-positive maxCharacters', async () => {
      await expect(
        tools.exportDataTable({ projectId: 'p1', table: 'LOOKS', maxCharacters: 0 }),
      ).rejects.toThrow();
      expect(client.exportDataTable).not.toHaveBeenCalled();
    });

    it('returns an "update LacyLights" error on backends without data export', async () => {
      client.exportDataTable.mockRejectedValue(unknownFieldError('exportDataTable'));

      await expect(
        tools.exportDataTable({ projectId: 'p1', table: 'FIXTURES' }),
      ).rejects.toThrow(/does not support CSV\/Excel data export.*Update LacyLights/s);
    });

    it('rethrows other backend errors unchanged', async () => {
      const err = new GraphQLRequestError('scopeId is required', ['scopeId is required']);
      client.exportDataTable.mockRejectedValue(err);

      await expect(
        tools.exportDataTable({ projectId: 'p1', table: 'LOOK_DETAILS' }),
      ).rejects.toBe(err);
    });
  });

  describe('exportDataWorkbook', () => {
    const workbook = {
      filename: 'Show-2026-10-13.xlsx',
      mimeType: XLSX_MIME,
      contentBase64: b64('PK-workbook'),
      rowCount: 42,
    };

    it('writes the workbook and returns its path and row count', async () => {
      client.exportDataWorkbook.mockResolvedValue(workbook);

      const result = await tools.exportDataWorkbook({
        projectId: 'p1',
        tables: ['fixtures', 'LOOKS'],
        outputDirectory: tmpDir,
      });

      expect(client.exportDataWorkbook).toHaveBeenCalledWith('p1', ['FIXTURES', 'LOOKS']);
      const expectedPath = path.join(tmpDir, 'Show-2026-10-13.xlsx');
      expect(result).toEqual({
        format: 'xlsx',
        filename: 'Show-2026-10-13.xlsx',
        mimeType: XLSX_MIME,
        rowCount: 42,
        filePath: expectedPath,
        sizeBytes: Buffer.byteLength('PK-workbook'),
        tables: ['FIXTURES', 'LOOKS'],
      });
      expect(fs.readFileSync(expectedPath, 'utf-8')).toBe('PK-workbook');
    });

    it('omits tables so the backend exports its default set', async () => {
      client.exportDataWorkbook.mockResolvedValue(workbook);

      const result = await tools.exportDataWorkbook({ projectId: 'p1', outputDirectory: tmpDir });

      expect(client.exportDataWorkbook).toHaveBeenCalledWith('p1', undefined);
      expect(result.tables).toBe('default');
    });

    it('rejects an explicit empty tables list before calling the backend', async () => {
      await expect(
        tools.exportDataWorkbook({ projectId: 'p1', tables: [], outputDirectory: tmpDir }),
      ).rejects.toThrow(/omit tables/i);
      expect(client.exportDataWorkbook).not.toHaveBeenCalled();
    });

    it('requires projectId', async () => {
      await expect(tools.exportDataWorkbook({} as any)).rejects.toThrow();
      expect(client.exportDataWorkbook).not.toHaveBeenCalled();
    });

    it('returns an "update LacyLights" error on backends without data export', async () => {
      client.exportDataWorkbook.mockRejectedValue(unknownFieldError('exportDataWorkbook'));

      await expect(
        tools.exportDataWorkbook({ projectId: 'p1', outputDirectory: tmpDir }),
      ).rejects.toThrow(/Update LacyLights/);
    });

    it('rethrows other backend errors unchanged', async () => {
      const err = new Error('FIXTURE_LIBRARY cannot be included in a workbook');
      client.exportDataWorkbook.mockRejectedValue(err);

      await expect(
        tools.exportDataWorkbook({ projectId: 'p1', tables: ['FIXTURE_LIBRARY'] }),
      ).rejects.toBe(err);
    });
  });
});
