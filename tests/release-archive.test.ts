/**
 * Guards the contents of the release tarball built by .github/workflows/release.yml.
 *
 * The LacyLights Mac app installs this tarball and writes a .mcp.json that
 * launches `node <install dir>/run-mcp.js` (as does the README). Releases up
 * to v1.6.16 omitted run-mcp.js, so every MCP client using that config failed
 * with "Cannot find module .../run-mcp.js" (bbernstein/lacylights-mcp#176).
 */
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.join(__dirname, '..');

function archiveCopyCommand(): string {
  const workflow = fs.readFileSync(
    path.join(repoRoot, '.github', 'workflows', 'release.yml'),
    'utf8',
  );
  const line = workflow
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('cp ') && l.endsWith(' lacylights-mcp/'));
  if (!line) {
    throw new Error('release.yml: could not find the archive "cp ... lacylights-mcp/" step');
  }
  return line;
}

describe('release archive contents (#176)', () => {
  it('copies run-mcp.js into the release archive', () => {
    expect(archiveCopyCommand().split(/\s+/)).toContain('run-mcp.js');
  });

  it('copies the compiled server and production dependencies', () => {
    const parts = archiveCopyCommand().split(/\s+/);
    expect(parts).toEqual(expect.arrayContaining(['dist/', 'node_modules/', 'package.json']));
  });

  it('run-mcp.js exists and loads the compiled entrypoint', () => {
    const wrapper = fs.readFileSync(path.join(repoRoot, 'run-mcp.js'), 'utf8');
    expect(wrapper).toMatch(/require\(['"]\.\/dist\/index\.js['"]\)/);
  });
});
