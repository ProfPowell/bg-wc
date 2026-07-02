// Demo pages are previewed inside the hub's <browser-window> iframes. A back
// link without target="_top" navigates the iframe instead of the tab, nesting
// the hub inside its own tile (gl-wc: demo crumb convention). Every anchor
// pointing back at the hub must escape the frame.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

test('every demo back-link to the hub carries target="_top"', () => {
  const offenders = new Set();
  for (const f of readdirSync('demos')) {
    if (!f.endsWith('.html') || f === 'index.html') continue;
    const html = readFileSync(`demos/${f}`, 'utf8');
    for (const m of html.matchAll(/<a\s[^>]*href="(?:\.\/index\.html|index\.html|\.\/)"[^>]*>/g)) {
      if (!m[0].includes('target="_top"')) offenders.add(f);
    }
  }
  assert.deepEqual([...offenders].sort(), []);
});
