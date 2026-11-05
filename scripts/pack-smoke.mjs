// Pack the library, install the tarball into a throwaway fixture, and probe the
// published surface from the consumer's side. Catches dist-layout breaks,
// missing files in package.json "files", wrong/leaky exports subpath patterns,
// and a custom-elements.json that points at files the tarball does not ship
// (gl-wc-fvam). Requires dist/ + custom-elements.json to be current (CI runs
// `npm run build` first; `npm pack` itself is run with --ignore-scripts so the
// `prepack` build is not repeated here).
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const run = (cmd, opts = {}) =>
  execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

const tgz = JSON.parse(run('npm pack --json --ignore-scripts'))[0].filename;
const tgzPath = join(root, tgz);
const dir = mkdtempSync(join(tmpdir(), 'bgwc-pack-'));
try {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'fixture', private: true, type: 'module' })
  );
  run(`npm install --no-audit --no-fund --ignore-scripts "${tgzPath}"`, { cwd: dir });
  // The probe runs inside the fixture so every import resolves through the
  // installed package's exports map exactly as a consumer's would. Written to a
  // file (avoids shell-escaping a multi-line -e).
  writeFileSync(
    join(dir, 'check.mjs'),
    `
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PKG = '@profpowell/bg-wc';
const fail = (msg) => { console.error('pack-smoke FAIL: ' + msg); process.exit(1); };

// SSR-like globals so the element module can be imported outside a browser.
globalThis.HTMLElement = class HTMLElement {};

// 1) Public entry points resolve and expose their documented API.
const root = await import(PKG);
if (typeof root.BgWc !== 'function') fail('root export BgWc missing');
if (typeof root.listPresets !== 'function') fail('root export listPresets missing');
const binder = await import(PKG + '/data-background');
if (typeof binder.bindDataBackgrounds !== 'function') fail('data-background: bindDataBackgrounds missing');
if (typeof binder.stopWatching !== 'function') fail('data-background: stopWatching missing');
const preset = await import(PKG + '/presets/dither');
if (typeof preset.create !== 'function') fail('presets/dither: create() missing');

// 2) Private subpaths are blocked by the exports map (null targets).
for (const sub of ['/presets/_pool', '/presets/_dots', '/presets/index']) {
  try {
    await import(PKG + sub);
    fail(PKG + sub + ' resolved but must be blocked');
  } catch (err) {
    if (err.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') fail(PKG + sub + ': expected ERR_PACKAGE_PATH_NOT_EXPORTED, got ' + (err.code || err.message));
  }
}

// 3) Every custom-elements.json module path exists in the installed package.
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve(PKG + '/package.json'));
const manifest = JSON.parse(readFileSync(join(pkgDir, 'custom-elements.json'), 'utf8'));
const paths = manifest.modules.map((m) => m.path);
if (!paths.length) fail('custom-elements.json has no modules');
const missing = paths.filter((p) => !existsSync(join(pkgDir, p)));
if (missing.length) fail('manifest paths missing from the tarball: ' + missing.join(', '));
const refs = [...JSON.stringify(manifest).matchAll(/"module":\\s*"([^"]+)"/g)].map((m) => m[1]);
const missingRefs = [...new Set(refs)].filter((p) => !existsSync(join(pkgDir, p)));
if (missingRefs.length) fail('manifest module refs missing from the tarball: ' + missingRefs.join(', '));

console.log(
  'pack-smoke OK: root, data-background, presets/dither resolved; private subpaths blocked; ' +
    paths.length + ' manifest paths present in the tarball'
);
`
  );
  run('node check.mjs', { cwd: dir, stdio: 'inherit' });
} finally {
  rmSync(dir, { recursive: true, force: true });
  rmSync(tgzPath, { force: true });
}
