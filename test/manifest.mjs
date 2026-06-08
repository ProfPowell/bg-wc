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
