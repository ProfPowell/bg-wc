// Manifest regressions (gl-wc-t8b): the published custom-elements.json must keep
// describing the element's documented surface.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../custom-elements.json', import.meta.url)), 'utf8')
);
const elements = manifest.modules.flatMap((m) => m.declarations || []).filter((d) => d.tagName);
const bgWc = elements.find((d) => d.tagName === 'bg-wc');

test('manifest declares the <bg-wc> custom element', () => {
  assert.ok(bgWc, 'bg-wc declaration present');
});

test('<bg-wc> exposes the canvas cssPart', () => {
  const parts = (bgWc.cssParts || []).map((p) => p.name);
  assert.ok(parts.includes('canvas'), `cssParts should include "canvas" (got ${parts.join(', ')})`);
});

// gl-wc-fvam: the package ships dist/ only (package.json "files"), so every
// manifest path must point at a published dist module, and internal modules
// (renderer/, util/, `_`-prefixed preset helpers, the preset registry) must not
// be documented as public surface.
const paths = manifest.modules.map((m) => m.path);
const moduleRefs = JSON.stringify(manifest).match(/"module":\s*"([^"]*)"/g) || [];

test('every manifest module path points at a published dist/ file', () => {
  assert.ok(paths.length > 0, 'manifest has modules');
  for (const p of paths) {
    assert.ok(p.startsWith('dist/'), `${p} should start with dist/`);
    assert.ok(!p.startsWith('src/'), `${p} must not point at unpublished src/`);
  }
});

test('declaration module references point at dist/ too', () => {
  assert.ok(moduleRefs.length > 0, 'manifest has declaration references');
  for (const ref of moduleRefs) {
    assert.match(ref, /"module":\s*"dist\//, `${ref} should reference dist/`);
  }
});

test('internal modules are not part of the manifest', () => {
  for (const p of paths) {
    assert.ok(!p.includes('/renderer/'), `${p} is a renderer internal`);
    assert.ok(!p.includes('/util/'), `${p} is a util internal`);
    assert.ok(!/\/_[^/]*$/.test(p), `${p} is a private helper`);
    assert.notEqual(p, 'dist/presets/index.js', 'the preset registry is not public surface');
  }
});

test('the public entry points and a preset are documented', () => {
  assert.ok(paths.includes('dist/bg-wc.js'));
  assert.ok(paths.includes('dist/data-background.js'));
  assert.ok(paths.includes('dist/presets/dither.js'));
});
