import { z } from 'zod';
import {
  LacyLightsGraphQLClient,
  GdtfFileInput,
  GdtfImportFileResult,
  GdtfImportStatus,
  isUnknownFieldError,
} from '../services/graphql-client-simple';
import { iterateGdtfFiles } from '../utils/gdtf-archive';

/** Most files sent in one importGdtfFixtures request. */
export const GDTF_IMPORT_BATCH_SIZE = 25;
/**
 * Most description.xml bytes sent in one request. A single larger file is
 * still sent, on its own. Keeps one request well below memory trouble even
 * though each description may be up to 32 MB.
 */
export const GDTF_IMPORT_BATCH_MAX_BYTES = 64 * 1024 * 1024;
/** Most per-file results listed in the tool output. */
export const MAX_LISTED_RESULTS = 100;
/** Most warnings listed per file in the tool output. */
export const MAX_WARNINGS_PER_FILE = 5;

const ImportGdtfFixturesSchema = z.object({
  paths: z
    .array(z.string().min(1))
    .min(1)
    .describe('Paths on the MCP host: .gdtf files, .zip archives of them, or folders searched recursively'),
  onExisting: z
    .enum(['UPDATE', 'SKIP'])
    .optional()
    .describe('What to do when a FixtureTypeID was imported before and changed (default UPDATE)'),
});

export type ImportGdtfFixturesArgs = z.infer<typeof ImportGdtfFixturesSchema>;

/** One file in the tool output. */
export interface GdtfImportFileSummary {
  fileName: string;
  status: GdtfImportStatus;
  manufacturer?: string;
  model?: string;
  modes?: number;
  definitionId?: string;
  source?: string;
  warnings?: string[];
  moreWarnings?: number;
  error?: string;
}

export interface GdtfImportSummary {
  summary: {
    filesSent: number;
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
    failed: number;
  };
  results: GdtfImportFileSummary[];
  truncated?: boolean;
  note?: string;
}

/**
 * Whether a file of `size` bytes must start a new batch after `count` files
 * totalling `bytes`. A single file larger than `maxBytes` still gets a batch
 * of its own.
 */
function startsNewBatch(count: number, bytes: number, size: number, maxFiles: number, maxBytes: number): boolean {
  return count > 0 && (count >= maxFiles || bytes + size > maxBytes);
}

/**
 * Split files into request batches of at most `maxFiles` files and
 * `maxBytes` description bytes (a single larger file gets a batch of its own).
 */
export function batchGdtfFiles(
  files: GdtfFileInput[],
  maxFiles: number = GDTF_IMPORT_BATCH_SIZE,
  maxBytes: number = GDTF_IMPORT_BATCH_MAX_BYTES,
): GdtfFileInput[][] {
  const batches: GdtfFileInput[][] = [];
  let current: GdtfFileInput[] = [];
  let currentBytes = 0;
  for (const file of files) {
    const size = Buffer.byteLength(file.descriptionXml, 'utf8');
    if (startsNewBatch(current.length, currentBytes, size, maxFiles, maxBytes)) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += size;
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function summarizeResult(r: GdtfImportFileResult): GdtfImportFileSummary {
  const out: GdtfImportFileSummary = { fileName: r.fileName, status: r.status };
  const manufacturer = r.manufacturer ?? r.definition?.manufacturer;
  const model = r.model ?? r.definition?.model;
  if (manufacturer) out.manufacturer = manufacturer;
  if (model) out.model = model;
  if (r.modeCount !== null && r.modeCount !== undefined) out.modes = r.modeCount;
  if (r.definition) {
    out.definitionId = r.definition.id;
    out.source = r.definition.source;
  }
  const warnings = r.warnings ?? [];
  if (warnings.length > 0) {
    out.warnings = warnings.slice(0, MAX_WARNINGS_PER_FILE);
    if (warnings.length > MAX_WARNINGS_PER_FILE) {
      out.moreWarnings = warnings.length - MAX_WARNINGS_PER_FILE;
    }
  }
  if (r.error) out.error = r.error;
  return out;
}

/** Failures first, then files with warnings, then the rest (stable). */
function listingPriority(r: GdtfImportFileSummary): number {
  if (r.status === 'FAILED') return 0;
  if (r.warnings && r.warnings.length > 0) return 1;
  return 2;
}

export class GdtfTools {
  constructor(private graphqlClient: LacyLightsGraphQLClient) {}

  /**
   * Read .gdtf files, .zip archives and folders on this host, extract each
   * fixture type's description.xml and import them through the backend in
   * batches. Unreadable files and failed batches are reported per file and
   * never stop the rest.
   */
  async importGdtfFixtures(args: ImportGdtfFixturesArgs): Promise<GdtfImportSummary> {
    const parsed = ImportGdtfFixturesSchema.parse(args);
    const options = parsed.onExisting ? { onExisting: parsed.onExisting } : undefined;

    const counts = { created: 0, updated: 0, unchanged: 0, skipped: 0, failed: 0 };
    const results: GdtfImportFileSummary[] = [];
    let filesSent = 0;
    let readErrors = 0;

    // Descriptions are imported as they are extracted, so at most one batch
    // (plus the archive being read) is held in memory.
    let batch: GdtfFileInput[] = [];
    let batchBytes = 0;
    const sendBatch = async () => {
      if (batch.length === 0) return;
      const files = batch;
      batch = [];
      batchBytes = 0;
      try {
        const res = await this.graphqlClient.importGdtfFixtures(files, options);
        counts.created += res.createdCount;
        counts.updated += res.updatedCount;
        counts.unchanged += res.unchangedCount;
        counts.skipped += res.skippedCount;
        counts.failed += res.failedCount;
        for (const r of res.results) results.push(summarizeResult(r));
      } catch (error) {
        // An unsupported backend fails the first request, so no earlier
        // results are lost by throwing here.
        if (isUnknownFieldError(error, 'importGdtfFixtures', 'Mutation')) {
          throw new Error(
            'This LacyLights server does not support GDTF import (the "importGdtfFixtures" mutation is missing). ' +
              'Update LacyLights (backend lacylights-go) to use this tool.',
          );
        }
        const message = `import request failed: ${errorMessage(error)}`;
        counts.failed += files.length;
        for (const f of files) results.push({ fileName: f.fileName, status: 'FAILED', error: message });
      }
    };

    for await (const item of iterateGdtfFiles(parsed.paths)) {
      if (item.kind === 'error') {
        readErrors++;
        counts.failed++;
        results.push({ fileName: item.error.fileName, status: 'FAILED', error: item.error.error });
        continue;
      }
      const size = Buffer.byteLength(item.file.descriptionXml, 'utf8');
      if (startsNewBatch(batch.length, batchBytes, size, GDTF_IMPORT_BATCH_SIZE, GDTF_IMPORT_BATCH_MAX_BYTES)) {
        await sendBatch();
      }
      batch.push(item.file);
      batchBytes += size;
      filesSent++;
    }
    await sendBatch();

    if (filesSent === 0 && readErrors === 0) {
      throw new Error('No .gdtf or .zip files found in the given paths');
    }

    const output: GdtfImportSummary = {
      summary: { filesSent, ...counts },
      results,
    };
    if (results.length > MAX_LISTED_RESULTS) {
      const ordered = results
        .map((r, i) => ({ r, i }))
        .sort((a, b) => listingPriority(a.r) - listingPriority(b.r) || a.i - b.i)
        .map((x) => x.r);
      output.results = ordered.slice(0, MAX_LISTED_RESULTS);
      output.truncated = true;
      output.note =
        `Listed ${MAX_LISTED_RESULTS} of ${results.length} files (failures and files with warnings first); ` +
        'the summary counts cover all files.';
    }
    return output;
  }
}
