import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { z } from 'zod';
import {
  LacyLightsGraphQLClient,
  DataExportResult,
  DataExportTableInfo,
  isUnknownQueryFieldError,
} from '../services/graphql-client-simple';

/** Default number of CSV characters returned inline before truncating. */
export const DEFAULT_MAX_CSV_CHARACTERS = 50_000;

/** Environment variable naming the directory export files are written to. */
export const DEFAULT_EXPORT_DIR_ENV = 'LACYLIGHTS_EXPORT_DIR';

/** What each DataExportTableInfo.scope value means for the export arguments. */
const SCOPE_DESCRIPTIONS = {
  none: 'Global table; projectId is optional (only access-checked).',
  project: 'Requires projectId.',
  look: 'Requires projectId and scopeId = the look ID.',
  cueList: 'Requires projectId and scopeId = the cue list ID.',
  lookBoard: 'Requires projectId; scopeId = a look board ID is optional (omit for all boards).',
};

/** Normalize a table name to the GraphQL enum form (e.g. " looks " -> "LOOKS"). */
const TableSchema = z
  .string()
  .trim()
  .min(1)
  .transform((s) => s.toUpperCase());

const ExportDataTableSchema = z.object({
  projectId: z.string().min(1).optional(),
  table: TableSchema,
  format: z
    .string()
    .transform((s) => s.toLowerCase())
    .pipe(z.enum(['csv', 'xlsx']))
    .default('csv'),
  scopeId: z.string().min(1).optional(),
  outputDirectory: z.string().min(1).optional(),
  maxCharacters: z.number().int().positive().optional(),
});

const ExportDataWorkbookSchema = z.object({
  projectId: z.string().min(1),
  tables: z.array(TableSchema).optional(),
  outputDirectory: z.string().min(1).optional(),
});

export interface ListDataExportTablesResult {
  tables: DataExportTableInfo[];
  /** Meaning of each `scope` value, so the caller knows which IDs to pass. */
  scopes: Record<keyof typeof SCOPE_DESCRIPTIONS, string>;
}

export interface DataExportFileResult {
  format: 'csv' | 'xlsx';
  filename: string;
  mimeType: string;
  rowCount: number;
  /** Absolute path of the written file (always set for XLSX). */
  filePath?: string;
  /** Size of the written file in bytes (XLSX). */
  sizeBytes?: number;
  /** CSV text, possibly truncated (CSV only). */
  csv?: string;
  truncated?: boolean;
  totalCharacters?: number;
  returnedCharacters?: number;
  note?: string;
}

export interface DataExportWorkbookResult extends DataExportFileResult {
  /** The tables requested, or "default" when the backend's default set was used. */
  tables: string[] | 'default';
}

/**
 * MCP tools for the CSV / Excel data export (lacylights-go v0.4.0+).
 *
 * CSV is returned inline (truncated at a line boundary when large) so the model
 * can read it; XLSX is binary, so it is written to disk and only the path is
 * returned, keeping base64 out of the model's context.
 */
export class DataExportTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  async listDataExportTables(): Promise<ListDataExportTablesResult> {
    const tables = await withUpdateHint('dataExportTables', () =>
      this.graphqlClient.getDataExportTables(),
    );
    return { tables, scopes: { ...SCOPE_DESCRIPTIONS } };
  }

  async exportDataTable(
    args: z.input<typeof ExportDataTableSchema>,
  ): Promise<DataExportFileResult> {
    const parsed = ExportDataTableSchema.parse(args);

    const result = await withUpdateHint('exportDataTable', () =>
      this.graphqlClient.exportDataTable({
        projectId: parsed.projectId,
        table: parsed.table,
        format: parsed.format === 'csv' ? 'CSV' : 'XLSX',
        scopeId: parsed.scopeId,
      }),
    );

    if (parsed.format === 'xlsx') {
      return writeExportFile(result, 'xlsx', parsed.outputDirectory);
    }

    const content = Buffer.from(result.contentBase64, 'base64');
    // The backend prefixes CSV with a UTF-8 BOM for Excel; drop it from the
    // inline text (a saved file keeps it).
    const text = content.toString('utf-8').replace(/^\uFEFF/, '');
    const limit = parsed.maxCharacters ?? DEFAULT_MAX_CSV_CHARACTERS;
    const csv = truncateAtLineBoundary(text, limit);
    const truncated = csv.length < text.length;

    const output: DataExportFileResult = {
      format: 'csv',
      filename: result.filename,
      mimeType: result.mimeType,
      rowCount: result.rowCount,
      csv,
      truncated,
      totalCharacters: text.length,
      returnedCharacters: csv.length,
    };

    if (parsed.outputDirectory) {
      output.filePath = saveFile(content, result.filename, 'csv', parsed.outputDirectory);
    }

    if (truncated) {
      output.note =
        `CSV truncated: showing the first ${csv.length} of ${text.length} characters ` +
        `(${result.rowCount} data rows in total). ` +
        (output.filePath
          ? `The full file was saved to ${output.filePath}.`
          : 'Pass outputDirectory to save the full file, raise maxCharacters, or use format "xlsx".') +
        ' The cut is made at a line break where possible, so a quoted field containing line breaks may be split.';
    }

    return output;
  }

  async exportDataWorkbook(
    args: z.input<typeof ExportDataWorkbookSchema>,
  ): Promise<DataExportWorkbookResult> {
    const parsed = ExportDataWorkbookSchema.parse(args);
    if (parsed.tables && parsed.tables.length === 0) {
      throw new Error(
        'tables must not be empty; omit tables to export the default set of project tables',
      );
    }

    const result = await withUpdateHint('exportDataWorkbook', () =>
      this.graphqlClient.exportDataWorkbook(parsed.projectId, parsed.tables),
    );

    return {
      ...writeExportFile(result, 'xlsx', parsed.outputDirectory),
      tables: parsed.tables ?? 'default',
    };
  }
}

/**
 * Run a data-export request, turning the "unknown Query field" validation error
 * from backends older than lacylights-go v0.4.0 into an actionable message.
 */
async function withUpdateHint<T>(field: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isUnknownQueryFieldError(error, field)) {
      throw new Error(
        `This LacyLights server does not support CSV/Excel data export (the "${field}" query is missing). ` +
          'Update LacyLights (backend lacylights-go v0.4.0 or newer) to use this tool.',
      );
    }
    throw error;
  }
}

/** Cut `text` to at most `limit` characters, preferring to end after a newline. */
function truncateAtLineBoundary(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }
  const cut = text.slice(0, limit);
  const lastNewline = cut.lastIndexOf('\n');
  if (lastNewline > 0) {
    return cut.slice(0, lastNewline + 1);
  }
  // Hard cut: do not leave a lone high surrogate (half of an emoji etc.).
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

function writeExportFile(
  result: DataExportResult,
  format: 'csv' | 'xlsx',
  outputDirectory: string | undefined,
): DataExportFileResult {
  const content = Buffer.from(result.contentBase64, 'base64');
  const filePath = saveFile(content, result.filename, format, outputDirectory);
  return {
    format,
    filename: result.filename,
    mimeType: result.mimeType,
    rowCount: result.rowCount,
    filePath,
    sizeBytes: content.length,
  };
}

/** Highest numeric suffix tried before giving up on finding a free filename. */
const MAX_FILENAME_ATTEMPTS = 1000;

/**
 * Write `content` into the output directory and return the absolute path.
 *
 * - Only the base name of the server-supplied filename is used, so the file
 *   can never land outside the chosen directory.
 * - Files are created exclusively (O_CREAT | O_EXCL) with mode 0600: an
 *   existing file is never overwritten and a symlink planted at the target
 *   name is never followed. On a clash a numeric suffix is added
 *   (name-1.xlsx, name-2.xlsx, ...).
 * - The default folder in the shared temp directory is created private
 *   (0700) and must be a real directory owned by the current user.
 */
function saveFile(
  content: Buffer,
  serverFilename: string,
  format: 'csv' | 'xlsx',
  outputDirectory: string | undefined,
): string {
  const configured = outputDirectory?.trim() || process.env[DEFAULT_EXPORT_DIR_ENV]?.trim();
  const dir = configured ? path.resolve(configured) : ensurePrivateDefaultDir();
  if (configured) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Backslashes (Windows separators) and control characters are replaced so
  // the name is a plain, printable file name on every platform.
  // eslint-disable-next-line no-control-regex
  let name = path.basename(serverFilename || '').replace(/[\\\u0000-\u001f\u007f]/g, '_');
  if (!name || name === '.' || name === '..') {
    name = `lacylights-export.${format}`;
  }
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);

  for (let attempt = 0; attempt < MAX_FILENAME_ATTEMPTS; attempt++) {
    const candidate = path.join(dir, attempt === 0 ? name : `${stem}-${attempt}${ext}`);
    try {
      fs.writeFileSync(candidate, content, { flag: 'wx', mode: 0o600 });
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        // fs always throws Error instances (with an errno code).
        throw new Error(`Could not write export file to ${dir}: ${(error as Error).message}`);
      }
    }
  }
  throw new Error(`Could not find a free filename for ${name} in ${dir}`);
}

/**
 * Create (or validate) `<tmpdir>/lacylights-exports` as a directory only the
 * current user can access, so exports are not readable by other local users
 * and a pre-created symlink cannot redirect them.
 */
function ensurePrivateDefaultDir(): string {
  const dir = path.join(os.tmpdir(), 'lacylights-exports');
  try {
    fs.mkdirSync(dir, { mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
  const stat = fs.lstatSync(dir);
  const ownedByOtherUser =
    typeof process.getuid === 'function' && stat.uid !== process.getuid();
  if (!stat.isDirectory() || stat.isSymbolicLink() || ownedByOtherUser) {
    throw new Error(
      `Default export folder ${dir} is not a private directory owned by the current user. ` +
        `Remove it, or pass outputDirectory / set ${DEFAULT_EXPORT_DIR_ENV}.`,
    );
  }
  if ((stat.mode & 0o777) !== 0o700) {
    fs.chmodSync(dir, 0o700);
  }
  return dir;
}
