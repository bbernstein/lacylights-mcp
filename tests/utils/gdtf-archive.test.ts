import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { zipSync, strToU8, Zippable } from 'fflate';
import {
  collectGdtfFiles,
  extractGdtfDescriptions,
  iterateGdtfDescriptions,
  MAX_ARCHIVE_ENTRIES,
  MAX_DESCRIPTION_BYTES,
} from '../../src/utils/gdtf-archive';

// Synthetic GDTF content only; never real GDTF Share or manufacturer files.
function descriptionXml(name: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.2"><FixtureType Name="${name}" Manufacturer="Acme" FixtureTypeID="00000000-0000-0000-0000-000000000000"/></GDTF>`;
}

function gdtf(name: string, extra: Zippable = {}): Uint8Array {
  return zipSync({ 'description.xml': strToU8(descriptionXml(name)), ...extra });
}

describe('extractGdtfDescriptions', () => {
  it('reads description.xml from a single .gdtf', () => {
    const res = extractGdtfDescriptions(gdtf('Spot', { 'wheels/gobo1.png': new Uint8Array([1, 2, 3]) }), 'Spot.gdtf');
    expect(res.errors).toEqual([]);
    expect(res.files).toEqual([{ fileName: 'Spot.gdtf', descriptionXml: descriptionXml('Spot') }]);
  });

  it('reads a stored (uncompressed) description.xml', () => {
    const data = zipSync({ 'description.xml': [strToU8(descriptionXml('Stored')), { level: 0 }] });
    const res = extractGdtfDescriptions(data, 'Stored.gdtf');
    expect(res.files[0].descriptionXml).toBe(descriptionXml('Stored'));
  });

  it('treats any archive with a root description.xml as a .gdtf (renamed file)', () => {
    const res = extractGdtfDescriptions(gdtf('Renamed'), 'Renamed.zip');
    expect(res.files).toHaveLength(1);
    expect(res.files[0].fileName).toBe('Renamed.zip');
  });

  it('extracts every .gdtf in a zip with nested names, skipping metadata and other files', () => {
    const zip = zipSync({
      'A.gdtf': gdtf('A'),
      'dir/B.GDTF': gdtf('B'),
      'readme.txt': strToU8('not a fixture'),
      '__MACOSX/dir/._B.GDTF': strToU8('resource fork'),
      'dir/._C.gdtf': strToU8('resource fork'),
      'empty/': new Uint8Array(0),
    });
    const res = extractGdtfDescriptions(zip, 'pack.zip');
    expect(res.errors).toEqual([]);
    expect(res.files.map((f) => f.fileName)).toEqual(['pack.zip/A.gdtf', 'pack.zip/dir/B.GDTF']);
    expect(res.files[1].descriptionXml).toBe(descriptionXml('B'));
  });

  it('follows nested zips up to two levels', () => {
    const inner = zipSync({ 'C.gdtf': gdtf('C') });
    const outer = zipSync({ 'vendor/inner.zip': inner, 'D.gdtf': gdtf('D') });
    const res = extractGdtfDescriptions(outer, 'outer.zip');
    expect(res.errors).toEqual([]);
    expect(res.files.map((f) => f.fileName).sort()).toEqual([
      'outer.zip/D.gdtf',
      'outer.zip/vendor/inner.zip/C.gdtf',
    ]);
  });

  it('reports archives nested too deep without failing the others', () => {
    const level3 = zipSync({ 'Deep.gdtf': gdtf('Deep') });
    const level2 = zipSync({ 'l3.zip': level3 });
    const outer = zipSync({ 'l2.zip': level2, 'Ok.gdtf': gdtf('Ok') });
    const res = extractGdtfDescriptions(outer, 'outer.zip');
    expect(res.files.map((f) => f.fileName)).toEqual(['outer.zip/Ok.gdtf']);
    expect(res.errors).toEqual([
      { fileName: 'outer.zip/l2.zip/l3.zip/Deep.gdtf', error: expect.stringMatching(/nested more than 2 levels/) },
    ]);
  });

  it('reports a .gdtf without description.xml', () => {
    const res = extractGdtfDescriptions(zipSync({ 'other.xml': strToU8('<x/>') }), 'Broken.gdtf');
    expect(res.files).toEqual([]);
    expect(res.errors).toEqual([{ fileName: 'Broken.gdtf', error: 'no description.xml found' }]);
  });

  it('reports a zip with no .gdtf files', () => {
    const res = extractGdtfDescriptions(zipSync({ 'notes.txt': strToU8('hi') }), 'empty.zip');
    expect(res.errors[0].error).toMatch(/no \.gdtf files in archive/);
  });

  it('reports data that is not a zip', () => {
    const res = extractGdtfDescriptions(strToU8('definitely not a zip archive'), 'fake.gdtf');
    expect(res.files).toEqual([]);
    expect(res.errors[0]).toEqual({ fileName: 'fake.gdtf', error: expect.stringMatching(/^not a zip archive/) });
  });

  it('reports a bad nested entry and keeps the good ones', () => {
    const outer = zipSync({ 'bad.gdtf': strToU8('garbage'), 'Good.gdtf': gdtf('Good') });
    const res = extractGdtfDescriptions(outer, 'mix.zip');
    expect(res.files.map((f) => f.fileName)).toEqual(['mix.zip/Good.gdtf']);
    expect(res.errors).toEqual([{ fileName: 'mix.zip/bad.gdtf', error: expect.stringMatching(/not a zip archive/) }]);
  });

  it('rejects a description.xml over the size limit', () => {
    const big = new Uint8Array(MAX_DESCRIPTION_BYTES + 1).fill(0x20);
    const res = extractGdtfDescriptions(zipSync({ 'description.xml': big }), 'Huge.gdtf');
    expect(res.files).toEqual([]);
    expect(res.errors[0].error).toMatch(/larger than 32 MB/);
  });

  it('accepts a description.xml exactly at the size limit', () => {
    const exact = new Uint8Array(MAX_DESCRIPTION_BYTES).fill(0x20);
    const res = extractGdtfDescriptions(zipSync({ 'description.xml': exact }), 'Exact.gdtf');
    expect(res.errors).toEqual([]);
    expect(res.files[0].descriptionXml).toHaveLength(MAX_DESCRIPTION_BYTES);
  });

  it('rejects archives with too many entries', () => {
    const entries: Zippable = {};
    for (let i = 0; i <= MAX_ARCHIVE_ENTRIES; i++) {
      entries[`f${i}.txt`] = new Uint8Array(0);
    }
    const res = extractGdtfDescriptions(zipSync(entries), 'many.zip');
    expect(res.files).toEqual([]);
    expect(res.errors[0].error).toBe(`archive has more than ${MAX_ARCHIVE_ENTRIES} entries`);
  });

  it('accepts archives with exactly the maximum number of entries', () => {
    const entries: Zippable = { 'A.gdtf': gdtf('A') };
    for (let i = 1; i < MAX_ARCHIVE_ENTRIES; i++) {
      entries[`f${i}.txt`] = new Uint8Array(0);
    }
    const res = extractGdtfDescriptions(zipSync(entries), 'max.zip');
    expect(res.errors).toEqual([]);
    expect(res.files).toHaveLength(1);
  });
});

/** Overwrite the uncompressed size of every central-directory entry. */
function withDeclaredSize(zip: Uint8Array, size: number): Uint8Array {
  const out = zip.slice();
  const view = new DataView(out.buffer);
  for (let o = 0; o + 46 <= out.length; o++) {
    if (view.getUint32(o, true) === 0x02014b50) {
      view.setUint32(o + 24, size, true);
      o += 45;
    }
  }
  return out;
}

describe('understated zip headers', () => {
  it('rejects an oversized description.xml whose header claims a small size', () => {
    // Valid XML followed by whitespace well past the 32 MB limit; deflates to a few KB.
    const xml = descriptionXml('Padded') + ' '.repeat(MAX_DESCRIPTION_BYTES + 1024);
    const data = withDeclaredSize(zipSync({ 'description.xml': strToU8(xml) }), 200);
    const res = extractGdtfDescriptions(data, 'Padded.gdtf');
    expect(res.files).toEqual([]);
    expect(res.errors).toEqual([{ fileName: 'Padded.gdtf', error: expect.stringMatching(/larger than 32 MB/) }]);
  });

  it('rejects a description.xml whose size does not match its header', () => {
    const data = withDeclaredSize(gdtf('Short'), 10);
    const res = extractGdtfDescriptions(data, 'Short.gdtf');
    expect(res.errors).toEqual([
      { fileName: 'Short.gdtf', error: 'decompressed size does not match the archive header' },
    ]);
  });

  it('applies the check to nested archives too', () => {
    // Only the outer archive's entry for inner.zip is understated (inner.zip is deflated, so its
    // own headers are not visible to withDeclaredSize).
    const outer = withDeclaredSize(zipSync({ 'inner.zip': zipSync({ 'A.gdtf': gdtf('A') }) }), 5);
    const res = extractGdtfDescriptions(outer, 'outer.zip');
    expect(res.files).toEqual([]);
    expect(res.errors[0]).toEqual({
      fileName: 'outer.zip/inner.zip',
      error: expect.stringMatching(/does not match the archive header/),
    });
  });

  it('rejects a stored entry whose size does not match its header', () => {
    const stored = zipSync({ 'description.xml': [strToU8(descriptionXml('S')), { level: 0 }] });
    const res = extractGdtfDescriptions(withDeclaredSize(stored, 3), 'S.gdtf');
    expect(res.errors[0].error).toMatch(/does not match the archive header/);
  });
});

describe('corrupt archives', () => {
  it('reports a truncated central directory', () => {
    const zip = gdtf('T');
    const view = new DataView(zip.buffer);
    let eocd = zip.length - 22;
    while (view.getUint32(eocd, true) !== 0x06054b50) eocd--;
    // Point the central directory past the end of the data.
    view.setUint32(eocd + 16, zip.length + 100, true);
    const res = extractGdtfDescriptions(zip, 'T.gdtf');
    expect(res.errors[0].error).toMatch(/not a zip archive: corrupt zip archive/);
  });

  it('reports an unsupported compression method', () => {
    const zip = gdtf('M');
    const view = new DataView(zip.buffer);
    for (let o = 0; o + 46 <= zip.length; o++) {
      if (view.getUint32(o, true) === 0x02014b50) view.setUint16(o + 10, 12, true); // bzip2
    }
    const res = extractGdtfDescriptions(zip, 'M.gdtf');
    expect(res.errors[0].error).toMatch(/unsupported compression method 12/);
  });
});

/**
 * A one-entry stored zip written with ZIP64 records: the central directory
 * sizes and offset are 0xFFFFFFFF with the real values in a ZIP64 extra
 * field, and a ZIP64 end-of-central-directory record and locator precede
 * the classic one.
 */
function zip64Stored(name: string, content: Uint8Array): Uint8Array {
  const nameBytes = strToU8(name);
  const parts: number[] = [];
  const u16 = (v: number) => parts.push(v & 0xff, (v >>> 8) & 0xff);
  const u32 = (v: number) => {
    u16(v & 0xffff);
    u16(Math.floor(v / 0x10000) & 0xffff);
  };
  const u64 = (v: number) => {
    u32(v % 0x100000000);
    u32(Math.floor(v / 0x100000000));
  };
  const bytes = (b: Uint8Array) => parts.push(...b);

  // Local file header + data
  u32(0x04034b50); u16(45); u16(0); u16(0); u16(0); u16(0); u32(0);
  u32(content.length); u32(content.length); u16(nameBytes.length); u16(0);
  bytes(nameBytes);
  bytes(content);

  const cdOffset = parts.length;
  u32(0x02014b50); u16(45); u16(45); u16(0); u16(0); u16(0); u16(0); u32(0);
  u32(0xffffffff); u32(0xffffffff); u16(nameBytes.length); u16(28); u16(0);
  u16(0); u16(0); u32(0); u32(0xffffffff);
  bytes(nameBytes);
  u16(1); u16(24); u64(content.length); u64(content.length); u64(0);
  const cdSize = parts.length - cdOffset;

  const z64Offset = parts.length;
  u32(0x06064b50); u64(44); u16(45); u16(45); u32(0); u32(0);
  u64(1); u64(1); u64(cdSize); u64(cdOffset);
  u32(0x07064b50); u32(0); u64(z64Offset); u32(1);
  u32(0x06054b50); u16(0); u16(0); u16(0xffff); u16(0xffff);
  u32(0xffffffff); u32(0xffffffff); u16(0);
  return new Uint8Array(parts);
}

describe('ZIP64 archives', () => {
  it('reads sizes and offsets from ZIP64 records', () => {
    const data = zip64Stored('description.xml', strToU8(descriptionXml('Z64')));
    const res = extractGdtfDescriptions(data, 'Z64.gdtf');
    expect(res.errors).toEqual([]);
    expect(res.files[0].descriptionXml).toBe(descriptionXml('Z64'));
  });
});

describe('entry names', () => {
  it('reads names without the UTF-8 flag as Latin-1', () => {
    // fflate sets the UTF-8 flag only for non-ASCII names; clear it and use a
    // Latin-1 byte (0xE9, "é") in the stored name.
    const zip = zipSync({ 'Caf_.gdtf': gdtf('Cafe') });
    const view = new DataView(zip.buffer);
    for (let o = 0; o + 46 <= zip.length; o++) {
      if (view.getUint32(o, true) === 0x02014b50) {
        view.setUint16(o + 8, view.getUint16(o + 8, true) & ~0x800, true);
        zip[o + 46 + 3] = 0xe9;
      }
    }
    const res = extractGdtfDescriptions(zip, 'pack.zip');
    expect(res.files.map((f) => f.fileName)).toEqual(['pack.zip/Café.gdtf']);
  });
});

describe('iterateGdtfDescriptions', () => {
  it('yields descriptions one at a time, in archive order', () => {
    const zip = zipSync({ 'A.gdtf': gdtf('A'), 'B.gdtf': gdtf('B'), 'broken.gdtf': strToU8('x') });
    const it = iterateGdtfDescriptions(zip, 'pack.zip');
    const first = it.next();
    expect(first.value).toEqual({ kind: 'file', file: { fileName: 'pack.zip/A.gdtf', descriptionXml: descriptionXml('A') } });
    expect([...it].map((i) => i.kind)).toEqual(['file', 'error']);
  });
});

describe('collectGdtfFiles', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gdtf-archive-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  async function write(rel: string, data: Uint8Array | string): Promise<string> {
    const full = path.join(tmp, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return full;
  }

  it('reads a single .gdtf path', async () => {
    const file = await write('Spot.gdtf', gdtf('Spot'));
    const res = await collectGdtfFiles([file]);
    expect(res.errors).toEqual([]);
    expect(res.files).toEqual([{ fileName: 'Spot.gdtf', descriptionXml: descriptionXml('Spot') }]);
  });

  it('reads a zip of .gdtf files', async () => {
    const file = await write('pack.zip', zipSync({ 'A.gdtf': gdtf('A'), 'B.gdtf': gdtf('B') }));
    const res = await collectGdtfFiles([file]);
    expect(res.files.map((f) => f.fileName)).toEqual(['pack.zip/A.gdtf', 'pack.zip/B.gdtf']);
  });

  it('recurses folders, ignores other files and skips hidden folders and files', async () => {
    const root = path.join(tmp, 'lib');
    await write('lib/A.gdtf', gdtf('A'));
    await write('lib/vendor/B.gdtf', gdtf('B'));
    await write('lib/vendor/deeper/pack.zip', zipSync({ 'C.gdtf': gdtf('C') }));
    await write('lib/notes.txt', 'ignore me');
    await write('lib/image.png', new Uint8Array([1, 2, 3]));
    await write('lib/.hidden/H.gdtf', gdtf('Hidden'));
    await write('lib/._A.gdtf', 'resource fork');
    await write('lib/__MACOSX/M.gdtf', gdtf('Mac'));

    const res = await collectGdtfFiles([root]);
    expect(res.errors).toEqual([]);
    expect(res.files.map((f) => f.fileName).sort()).toEqual([
      'lib/A.gdtf',
      'lib/vendor/B.gdtf',
      'lib/vendor/deeper/pack.zip/C.gdtf',
    ]);
  });

  it('does not follow symlinks out of the folder but follows ones inside it', async () => {
    const root = path.join(tmp, 'lib');
    await write('outside/Out.gdtf', gdtf('Out'));
    await write('lib/In.gdtf', gdtf('In'));
    await write('lib/real/R.gdtf', gdtf('R'));
    await fs.symlink(path.join(tmp, 'outside'), path.join(root, 'linkOut'));
    await fs.symlink(path.join(tmp, 'outside', 'Out.gdtf'), path.join(root, 'OutLink.gdtf'));
    // A link back to the root must not loop forever.
    await fs.symlink(root, path.join(root, 'real', 'loop'));

    const res = await collectGdtfFiles([root]);
    expect(res.errors).toEqual([]);
    expect(res.files.map((f) => f.fileName).sort()).toEqual(['lib/In.gdtf', 'lib/real/R.gdtf']);
  });

  it('reads the same file only once', async () => {
    const file = await write('lib/Once.gdtf', gdtf('Once'));
    const res = await collectGdtfFiles([file, path.join(tmp, 'lib'), file]);
    expect(res.files).toHaveLength(1);
  });

  it('reports missing paths and unreadable files without stopping the rest', async () => {
    const good = await write('Good.gdtf', gdtf('Good'));
    const bad = await write('Bad.gdtf', 'not a zip');
    const missing = path.join(tmp, 'missing.gdtf');
    const res = await collectGdtfFiles([missing, bad, good]);
    expect(res.files.map((f) => f.fileName)).toEqual(['Good.gdtf']);
    expect(res.errors).toEqual([
      { fileName: missing, error: expect.stringMatching(/^could not open path/) },
      { fileName: 'Bad.gdtf', error: expect.stringMatching(/^not a zip archive/) },
    ]);
  });

  it('ignores dangling symlinks in a folder', async () => {
    await write('lib/A.gdtf', gdtf('A'));
    await fs.symlink(path.join(tmp, 'gone.gdtf'), path.join(tmp, 'lib', 'Dangling.gdtf'));
    const res = await collectGdtfFiles([path.join(tmp, 'lib')]);
    expect(res.errors).toEqual([]);
    expect(res.files.map((f) => f.fileName)).toEqual(['lib/A.gdtf']);
  });

  it('reports paths that are neither files nor folders', async () => {
    const res = await collectGdtfFiles(['/dev/null']);
    expect(res.files).toEqual([]);
    expect(res.errors).toEqual([{ fileName: '/dev/null', error: 'not a regular file or folder' }]);
  });

  it('returns nothing for an empty folder', async () => {
    await fs.mkdir(path.join(tmp, 'empty'));
    const res = await collectGdtfFiles([path.join(tmp, 'empty')]);
    expect(res).toEqual({ files: [], errors: [] });
  });
});
