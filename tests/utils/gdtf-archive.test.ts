import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { zipSync, strToU8, Zippable } from 'fflate';
import {
  collectGdtfFiles,
  extractGdtfDescriptions,
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
