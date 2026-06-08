// Pack the library, install the tarball into a throwaway fixture, and import a
// preset subpath. Catches dist-layout breaks, missing files in package.json
// "files", and wrong exports subpath patterns before publish. Requires dist/
// to be built first (npm run build).
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const run = (cmd, opts = {}) =>
  execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

const tgz = JSON.parse(run('npm pack --json'))[0].filename;
const tgzPath = join(root, tgz);
const dir = mkdtempSync(join(tmpdir(), 'bgwc-pack-'));
try {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture', private: true, type: 'module' })
  );
  run(`npm install --no-audit --no-fund "${tgzPath}"`, { cwd: dir });
  // Subpath export "./presets/*" → dist/presets/*.js must resolve, and the
  // imported preset must expose create(). Write the probe to a file (avoids
  // shell-escaping a multi-line -e).
  writeFileSync(
    join(dir, 'check.mjs'),
    [
      "const m = await import('@profpowell/bg-wc/presets/dither');",
      "if (typeof m.create !== 'function') { console.error('presets/dither: create() missing'); process.exit(1); }",
      "console.log('pack-smoke OK: @profpowell/bg-wc/presets/dither resolved, create() present');",
      '',
    ].join('\n')
  );
  run('node check.mjs', { cwd: dir, stdio: 'inherit' });
} finally {
  rmSync(dir, { recursive: true, force: true });
  rmSync(tgzPath, { force: true });
}
