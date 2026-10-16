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
import { Inflate } from 'fflate';

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
/** Compressed bytes fed to the inflater at a time, so a limit is noticed early. */
const INFLATE_CHUNK_BYTES = 16 * 1024;

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

/** One extraction outcome, produced in order as archives are read. */
export type GdtfExtractionItem =
  | { kind: 'file'; file: GdtfFile }
  | { kind: 'error'; error: GdtfExtractionError };

class EntryLimitExceeded extends Error {}
class SizeLimitExceeded extends Error {}

/** A central-directory entry with the offset of its data. */
interface ZipEntry {
  name: string;
  /** 0 = stored, 8 = deflate. */
  compression: number;
  compressedSize: number;
  /** General-purpose bit 0: the entry is encrypted. */
  encrypted: boolean;
  /** Uncompressed size declared by the header. Not trusted. */
  originalSize: number;
  dataStart: number;
}

function u16(d: Uint8Array, o: number): number {
  return d[o] | (d[o + 1] << 8);
}

function u32(d: Uint8Array, o: number): number {
  return (d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) + d[o + 3] * 0x1000000;
}

function u64(d: Uint8Array, o: number): number {
  return u32(d, o) + u32(d, o + 4) * 0x100000000;
}

function corrupt(): Error {
  return new Error('corrupt zip archive');
}

function decodeName(bytes: Uint8Array, utf8: boolean): string {
  if (utf8) return new TextDecoder('utf-8').decode(bytes);
  let out = '';
  for (const b of bytes) out += String.fromCharCode(b);
  return out;
}

/**
 * Read the central directory (including ZIP64 records) without decompressing
 * anything. Throws EntryLimitExceeded beyond MAX_ARCHIVE_ENTRIES.
 */
function readCentralDirectory(data: Uint8Array): ZipEntry[] {
  let eocd = data.length - 22;
  for (; eocd >= 0 && u32(data, eocd) !== 0x06054b50; eocd--) {
    if (data.length - eocd > 65557) throw new Error('end of central directory not found');
  }
  if (eocd < 0) throw new Error('end of central directory not found');
  let count = u16(data, eocd + 10);
  let offset = u32(data, eocd + 16);
  let zip64 = false;
  if (eocd >= 20 && u32(data, eocd - 20) === 0x07064b50) {
    const z = u64(data, eocd - 12);
    if (z + 56 <= data.length && u32(data, z) === 0x06064b50) {
      zip64 = true;
      count = u64(data, z + 32);
      offset = u64(data, z + 48);
    }
  }
  if (count > MAX_ARCHIVE_ENTRIES) throw new EntryLimitExceeded();

  const entries: ZipEntry[] = [];
  let o = offset;
  for (let i = 0; i < count; i++) {
    if (o + 46 > data.length || u32(data, o) !== 0x02014b50) throw corrupt();
    const flags = u16(data, o + 8);
    const compression = u16(data, o + 10);
    let compressedSize = u32(data, o + 20);
    let originalSize = u32(data, o + 24);
    const nameLen = u16(data, o + 28);
    const extraLen = u16(data, o + 30);
    const commentLen = u16(data, o + 32);
    let localOffset = u32(data, o + 42);
    const nameStart = o + 46;
    const extraStart = nameStart + nameLen;
    if (extraStart + extraLen > data.length) throw corrupt();
    const name = decodeName(data.subarray(nameStart, extraStart), (flags & 0x800) !== 0);

    const max = 0xffffffff;
    if (zip64 || compressedSize === max || originalSize === max || localOffset === max) {
      for (let x = extraStart; x + 4 <= extraStart + extraLen; x += 4 + u16(data, x + 2)) {
        if (u16(data, x) !== 1) continue;
        let f = x + 4;
        // ZIP64 fields appear in this order, each only when its 32-bit value is 0xFFFFFFFF.
        if (originalSize === max) {
          originalSize = u64(data, f);
          f += 8;
        }
        if (compressedSize === max) {
          compressedSize = u64(data, f);
          f += 8;
        }
        if (localOffset === max) localOffset = u64(data, f);
        break;
      }
    }

    if (localOffset + 30 > data.length || u32(data, localOffset) !== 0x04034b50) throw corrupt();
    const dataStart = localOffset + 30 + u16(data, localOffset + 26) + u16(data, localOffset + 28);
    if (dataStart + compressedSize > data.length) throw corrupt();
    entries.push({ name, compression, compressedSize, encrypted: (flags & 0x1) !== 0, originalSize, dataStart });
    o = extraStart + extraLen + commentLen;
  }
  return entries;
}

/**
 * Decompress an entry, counting the bytes actually produced: the read fails
 * with SizeLimitExceeded as soon as it passes `limit`, and with an error when
 * the result does not match the size the header declares. The header's size
 * is never used to size a buffer, so an understated header cannot truncate
 * or hide output.
 */
function readEntryBytes(data: Uint8Array, entry: ZipEntry, limit: number): Uint8Array {
  if (entry.encrypted) {
    throw new Error('encrypted zip entries are not supported');
  }
  const raw = data.subarray(entry.dataStart, entry.dataStart + entry.compressedSize);
  let out: Uint8Array;
  if (entry.compression === 0) {
    if (raw.length > limit) throw new SizeLimitExceeded();
    out = raw.slice();
  } else if (entry.compression === 8) {
    const chunks: Uint8Array[] = [];
    let total = 0;
    let done = false;
    const inflater = new Inflate((chunk, final) => {
      total += chunk.length;
      if (total > limit) throw new SizeLimitExceeded();
      chunks.push(chunk);
      if (final) done = true;
    });
    if (raw.length === 0) throw corrupt();
    for (let i = 0; i < raw.length; i += INFLATE_CHUNK_BYTES) {
      const end = Math.min(i + INFLATE_CHUNK_BYTES, raw.length);
      inflater.push(raw.subarray(i, end), end === raw.length);
    }
    if (!done) throw corrupt();
    out = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      out.set(c, at);
      at += c.length;
    }
  } else {
    throw new Error(`unsupported compression method ${entry.compression}`);
  }
  if (out.length !== entry.originalSize) {
    throw new Error('decompressed size does not match the archive header');
  }
  return out;
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

function failure(fileName: string, error: string): GdtfExtractionItem {
  return { kind: 'error', error: { fileName, error } };
}

function readDescription(data: Uint8Array, entry: ZipEntry): string {
  const tooLarge = `description.xml is larger than ${MAX_DESCRIPTION_BYTES / MB} MB`;
  if (entry.originalSize > MAX_DESCRIPTION_BYTES) {
    throw new Error(tooLarge);
  }
  try {
    return new TextDecoder('utf-8').decode(readEntryBytes(data, entry, MAX_DESCRIPTION_BYTES));
  } catch (error) {
    if (error instanceof SizeLimitExceeded) throw new Error(tooLarge);
    throw error;
  }
}

function* extract(data: Uint8Array, name: string, depth: number): Generator<GdtfExtractionItem> {
  if (depth > MAX_NESTING_DEPTH) {
    yield failure(name, `archives nested more than ${MAX_NESTING_DEPTH} levels deep`);
    return;
  }

  let entries: ZipEntry[];
  try {
    entries = readCentralDirectory(data);
  } catch (error) {
    if (error instanceof EntryLimitExceeded) {
      yield failure(name, `archive has more than ${MAX_ARCHIVE_ENTRIES} entries`);
    } else {
      yield failure(name, `not a zip archive: ${message(error)}`);
    }
    return;
  }

  const root = entries.find((e) => e.name.toLowerCase() === DESCRIPTION_FILE_NAME);
  if (root) {
    try {
      yield { kind: 'file', file: { fileName: name, descriptionXml: readDescription(data, root) } };
    } catch (error) {
      yield failure(name, message(error));
    }
    return;
  }
  if (extOf(name) === '.gdtf') {
    yield failure(name, 'no description.xml found');
    return;
  }

  let found = false;
  for (const entry of entries) {
    if (isSkippedEntry(entry.name)) {
      continue;
    }
    const ext = extOf(entry.name);
    if (ext !== '.gdtf' && ext !== '.zip') {
      continue;
    }
    found = true;
    yield* extractEntry(data, entry, `${name}/${entry.name}`, depth + 1);
  }
  if (!found) {
    yield failure(name, 'no description.xml found (no .gdtf files in archive)');
  }
}

function* extractEntry(data: Uint8Array, entry: ZipEntry, name: string, depth: number): Generator<GdtfExtractionItem> {
  if (depth > MAX_NESTING_DEPTH) {
    yield failure(name, `archives nested more than ${MAX_NESTING_DEPTH} levels deep`);
    return;
  }
  const tooLarge = `nested archive is larger than ${MAX_NESTED_ARCHIVE_BYTES / MB} MB`;
  if (entry.originalSize > MAX_NESTED_ARCHIVE_BYTES) {
    yield failure(name, tooLarge);
    return;
  }
  let bytes: Uint8Array;
  try {
    bytes = readEntryBytes(data, entry, MAX_NESTED_ARCHIVE_BYTES);
  } catch (error) {
    yield failure(name, error instanceof SizeLimitExceeded ? tooLarge : `could not read entry: ${message(error)}`);
    return;
  }
  yield* extract(bytes, name, depth);
}

/** Append items one at a time (spreading a huge array into push() can throw). */
function collect(items: Iterable<GdtfExtractionItem>, into: GdtfExtractionResult): GdtfExtractionResult {
  for (const item of items) {
    if (item.kind === 'file') into.files.push(item.file);
    else into.errors.push(item.error);
  }
  return into;
}

/**
 * Extract the description.xml of a .gdtf, or of every .gdtf inside a .zip
 * (nested .zip files included, up to MAX_NESTING_DEPTH), one at a time and
 * in archive order. `name` labels the results and errors. Only the
 * description being produced and the archives it sits in are held in memory.
 */
export function iterateGdtfDescriptions(data: Uint8Array, name: string): Generator<GdtfExtractionItem> {
  return extract(data, name, 0);
}

/** Like iterateGdtfDescriptions, but collects everything. */
export function extractGdtfDescriptions(data: Uint8Array, name: string): GdtfExtractionResult {
  return collect(iterateGdtfDescriptions(data, name), { files: [], errors: [] });
}

function isCandidateFile(name: string): boolean {
  const ext = extOf(name);
  return ext === '.gdtf' || ext === '.zip';
}

function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  // A child may itself be named "..foo"; only ".." as a whole segment leaves root.
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
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
 * Read GDTF descriptions from paths on this host, one at a time. Each path
 * may be a .gdtf, a .zip of them, or a folder searched recursively for both
 * (other files are ignored). A path given directly is opened whatever its
 * extension, so a renamed .gdtf still works. Problems with one path or entry
 * are yielded as errors and never stop the others. Only one file from disk
 * (and the description being produced) is held in memory at a time, so a
 * consumer that imports as it goes keeps memory bounded.
 */
export async function* iterateGdtfFiles(paths: string[]): AsyncGenerator<GdtfExtractionItem> {
  const candidates: DiskFile[] = [];
  const walkErrors: GdtfExtractionError[] = [];

  for (const given of paths) {
    const resolved = path.resolve(given);
    let real: string;
    let stat;
    try {
      real = await fs.realpath(resolved);
      stat = await fs.stat(real);
    } catch (error) {
      walkErrors.push({ fileName: given, error: `could not open path: ${message(error)}` });
      continue;
    }
    if (stat.isDirectory()) {
      await walkFolder(resolved, real, path.basename(resolved), candidates, walkErrors);
    } else if (stat.isFile()) {
      candidates.push({ realPath: real, label: path.basename(resolved) });
    } else {
      walkErrors.push({ fileName: given, error: 'not a regular file or folder' });
    }
  }
  for (const error of walkErrors) {
    yield { kind: 'error', error };
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
        yield failure(candidate.label, `file is larger than ${MAX_INPUT_FILE_BYTES / MB} MB`);
        continue;
      }
      data = new Uint8Array(await fs.readFile(candidate.realPath));
    } catch (error) {
      yield failure(candidate.label, `could not read file: ${message(error)}`);
      continue;
    }
    yield* iterateGdtfDescriptions(data, candidate.label);
  }
}

/** Like iterateGdtfFiles, but collects everything. */
export async function collectGdtfFiles(paths: string[]): Promise<GdtfExtractionResult> {
  const result: GdtfExtractionResult = { files: [], errors: [] };
  for await (const item of iterateGdtfFiles(paths)) {
    collect([item], result);
  }
  return result;
}
