/**
 * GDTF archive extraction for the import_gdtf_fixtures tool.
 *
 * A .gdtf file is a zip archive with description.xml at its root. Users may
 * also hand over a .zip of .gdtf files (possibly nested) or a folder of them.
 * Only description.xml is extracted; the backend never needs the 3D models or
 * wheel images. The rules mirror the backend's own extractor
 * (lacylights-go internal/services/gdtf/archive.go) so the MCP host and a
 * browser upload behave the same:
 *
 * - at most MAX_ARCHIVE_ENTRIES entries per archive (outer or nested)
 * - description.xml at most MAX_DESCRIPTION_BYTES after decompression
 * - archives nest at most MAX_NESTING_DEPTH levels (a .gdtf in a .zip in the
 *   given .zip is depth 2, the deepest allowed)
 * - an archive with description.xml at its root is a .gdtf, whatever its name
 * - macOS "__MACOSX/" and "._*" metadata entries are ignored
 * - nested results are named "outer.zip/dir/Foo.gdtf"
 * - a broken entry is reported and does not stop the others
 *
 * Only files the user points at are read. Nothing is fetched, bundled,
 * cached or written to disk.
 */
import { promises as fs } from 'fs';
import * as path from 'path';
import { unzipSync, UnzipFileInfo } from 'fflate';

/** Most entries one archive (outer or nested) may contain. */
export const MAX_ARCHIVE_ENTRIES = 2000;
/** Largest description.xml accepted, measured after decompression. */
export const MAX_DESCRIPTION_BYTES = 32 * 1024 * 1024;
/** Deepest allowed archive nesting (a .gdtf inside a .zip inside a .zip). */
export const MAX_NESTING_DEPTH = 2;
/** Largest decompressed nested archive, which is held in memory to be opened. */
export const MAX_NESTED_ARCHIVE_BYTES = 512 * 1024 * 1024;
/** Largest file read from disk (a .gdtf or .zip given by path or found in a folder). */
export const MAX_INPUT_FILE_BYTES = 512 * 1024 * 1024;

const DESCRIPTION_FILE_NAME = 'description.xml';
const MB = 1024 * 1024;

/** One GDTF description to send to the backend (GraphQL GdtfFileInput). */
export interface GdtfFile {
  /** "Foo.gdtf", or "outer.zip/dir/Foo.gdtf" for a .gdtf found inside a .zip. */
  fileName: string;
  /** Content of the .gdtf's description.xml. */
  descriptionXml: string;
}

/** A file, archive entry or path that could not be read. */
export interface GdtfExtractionError {
  fileName: string;
  error: string;
}

export interface GdtfExtractionResult {
  files: GdtfFile[];
  errors: GdtfExtractionError[];
}

class EntryLimitExceeded extends Error {}

/** List the central-directory entries of a zip without decompressing anything. */
function listEntries(data: Uint8Array): UnzipFileInfo[] {
  const entries: UnzipFileInfo[] = [];
  unzipSync(data, {
    filter: (info) => {
      entries.push(info);
      if (entries.length > MAX_ARCHIVE_ENTRIES) {
        // Stop scanning a huge (or hostile) central directory early.
        throw new EntryLimitExceeded();
      }
      return false;
    },
  });
  return entries;
}

/**
 * Decompress the entry at `index` (central-directory order). fflate bounds
 * deflate output by the header's uncompressed size, which callers check
 * against their limit before calling, so a lying header cannot make the
 * read grow beyond it.
 */
function readEntry(data: Uint8Array, index: number): Uint8Array {
  let i = -1;
  let picked: string | undefined;
  const out = unzipSync(data, {
    filter: (info) => {
      i++;
      if (i === index) {
        picked = info.name;
        return true;
      }
      return false;
    },
  });
  const bytes = picked === undefined ? undefined : out[picked];
  if (!bytes) {
    throw new Error('entry could not be read');
  }
  return bytes;
}

/** Bytes an entry will occupy once extracted, per its header. */
function declaredSize(info: UnzipFileInfo): number {
  // Stored entries are copied as-is, so their compressed size is what is read.
  return info.compression === 0 ? Math.max(info.size, info.originalSize) : info.originalSize;
}

function isSkippedEntry(name: string): boolean {
  if (name.endsWith('/')) {
    return true; // directory
  }
  if (name.startsWith('__MACOSX/') || name.includes('/__MACOSX/')) {
    return true;
  }
  return path.posix.basename(name).startsWith('._');
}

function extOf(name: string): string {
  return path.posix.extname(name).toLowerCase();
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readDescription(data: Uint8Array, index: number, info: UnzipFileInfo): string {
  const tooLarge = `description.xml is larger than ${MAX_DESCRIPTION_BYTES / MB} MB`;
  if (declaredSize(info) > MAX_DESCRIPTION_BYTES) {
    throw new Error(tooLarge);
  }
  const bytes = readEntry(data, index);
  if (bytes.length > MAX_DESCRIPTION_BYTES) {
    throw new Error(tooLarge);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

function extract(data: Uint8Array, name: string, depth: number): GdtfExtractionResult {
  if (depth > MAX_NESTING_DEPTH) {
    return fail(name, `archives nested more than ${MAX_NESTING_DEPTH} levels deep`);
  }

  let entries: UnzipFileInfo[];
  try {
    entries = listEntries(data);
  } catch (error) {
    if (error instanceof EntryLimitExceeded) {
      return fail(name, `archive has more than ${MAX_ARCHIVE_ENTRIES} entries`);
    }
    return fail(name, `not a zip archive: ${message(error)}`);
  }

  const rootIndex = entries.findIndex((e) => e.name.toLowerCase() === DESCRIPTION_FILE_NAME);
  if (rootIndex >= 0) {
    try {
      const descriptionXml = readDescription(data, rootIndex, entries[rootIndex]);
      return { files: [{ fileName: name, descriptionXml }], errors: [] };
    } catch (error) {
      return fail(name, message(error));
    }
  }
  if (extOf(name) === '.gdtf') {
    return fail(name, 'no description.xml found');
  }

  const result: GdtfExtractionResult = { files: [], errors: [] };
  entries.forEach((info, index) => {
    if (isSkippedEntry(info.name)) {
      return;
    }
    const ext = extOf(info.name);
    if (ext !== '.gdtf' && ext !== '.zip') {
      return;
    }
    const entryName = `${name}/${info.name}`;
    const nested = extractEntry(data, index, info, entryName, depth + 1);
    result.files.push(...nested.files);
    result.errors.push(...nested.errors);
  });
  if (result.files.length === 0 && result.errors.length === 0) {
    return fail(name, 'no description.xml found (no .gdtf files in archive)');
  }
  return result;
}

function extractEntry(
  data: Uint8Array,
  index: number,
  info: UnzipFileInfo,
  name: string,
  depth: number,
): GdtfExtractionResult {
  if (depth > MAX_NESTING_DEPTH) {
    return fail(name, `archives nested more than ${MAX_NESTING_DEPTH} levels deep`);
  }
  const tooLarge = `nested archive is larger than ${MAX_NESTED_ARCHIVE_BYTES / MB} MB`;
  if (declaredSize(info) > MAX_NESTED_ARCHIVE_BYTES) {
    return fail(name, tooLarge);
  }
  let bytes: Uint8Array;
  try {
    bytes = readEntry(data, index);
  } catch (error) {
    return fail(name, `could not read entry: ${message(error)}`);
  }
  return extract(bytes, name, depth);
}

function fail(fileName: string, error: string): GdtfExtractionResult {
  return { files: [], errors: [{ fileName, error }] };
}

/**
 * Extract the description.xml of a .gdtf, or of every .gdtf inside a .zip
 * (nested .zip files included, up to MAX_NESTING_DEPTH). `name` labels the
 * results and errors.
 */
export function extractGdtfDescriptions(data: Uint8Array, name: string): GdtfExtractionResult {
  return extract(data, name, 0);
}

function isCandidateFile(name: string): boolean {
  const ext = extOf(name);
  return ext === '.gdtf' || ext === '.zip';
}

function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

interface DiskFile {
  /** Real (symlink-resolved) path, used to read and to de-duplicate. */
  realPath: string;
  /** Label reported to the backend and the agent. */
  label: string;
}

/**
 * Walk a folder for .gdtf and .zip files. Hidden entries (names starting
 * with ".") are skipped. Symlinks are followed only when their target stays
 * inside the folder, and each real directory is visited once.
 */
async function walkFolder(
  root: string,
  realRoot: string,
  labelRoot: string,
  found: DiskFile[],
  errors: GdtfExtractionError[],
): Promise<void> {
  const visited = new Set<string>([realRoot]);
  const queue: Array<{ dir: string; label: string }> = [{ dir: root, label: labelRoot }];

  while (queue.length > 0) {
    const { dir, label } = queue.shift()!;
    let names: string[];
    try {
      names = (await fs.readdir(dir)).sort();
    } catch (error) {
      errors.push({ fileName: label, error: `could not read folder: ${message(error)}` });
      continue;
    }
    for (const entryName of names) {
      if (entryName.startsWith('.') || entryName === '__MACOSX') {
        continue;
      }
      const full = path.join(dir, entryName);
      const entryLabel = `${label}/${entryName}`;
      let real: string;
      let stat;
      try {
        real = await fs.realpath(full);
        if (!isInside(realRoot, real)) {
          continue; // symlink pointing out of the folder
        }
        stat = await fs.stat(real);
      } catch {
        continue; // dangling symlink or vanished entry
      }
      if (stat.isDirectory()) {
        if (!visited.has(real)) {
          visited.add(real);
          queue.push({ dir: full, label: entryLabel });
        }
      } else if (stat.isFile() && isCandidateFile(entryName)) {
        found.push({ realPath: real, label: entryLabel });
      }
    }
  }
}

/**
 * Collect GDTF descriptions from paths on this host. Each path may be a
 * .gdtf, a .zip of them, or a folder searched recursively for both (other
 * files are ignored). A path given directly is opened whatever its
 * extension, so a renamed .gdtf still works. Problems with one path or
 * entry are reported in `errors` and never stop the others.
 */
export async function collectGdtfFiles(paths: string[]): Promise<GdtfExtractionResult> {
  const candidates: DiskFile[] = [];
  const result: GdtfExtractionResult = { files: [], errors: [] };

  for (const given of paths) {
    const resolved = path.resolve(given);
    let real: string;
    let stat;
    try {
      real = await fs.realpath(resolved);
      stat = await fs.stat(real);
    } catch (error) {
      result.errors.push({ fileName: given, error: `could not open path: ${message(error)}` });
      continue;
    }
    if (stat.isDirectory()) {
      await walkFolder(resolved, real, path.basename(resolved), candidates, result.errors);
    } else if (stat.isFile()) {
      candidates.push({ realPath: real, label: path.basename(resolved) });
    } else {
      result.errors.push({ fileName: given, error: 'not a regular file or folder' });
    }
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.realPath)) {
      continue;
    }
    seen.add(candidate.realPath);
    let data: Uint8Array;
    try {
      const { size } = await fs.stat(candidate.realPath);
      if (size > MAX_INPUT_FILE_BYTES) {
        result.errors.push({
          fileName: candidate.label,
          error: `file is larger than ${MAX_INPUT_FILE_BYTES / MB} MB`,
        });
        continue;
      }
      data = new Uint8Array(await fs.readFile(candidate.realPath));
    } catch (error) {
      result.errors.push({ fileName: candidate.label, error: `could not read file: ${message(error)}` });
      continue;
    }
    const extracted = extractGdtfDescriptions(data, candidate.label);
    result.files.push(...extracted.files);
    result.errors.push(...extracted.errors);
  }

  return result;
}
