// The css3d pause rule lives in ONE place (gl-wc-7pkh): exported from the
// renderer, imported by every css3d preset — never re-declared per preset.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { PAUSE_RULE } from '../src/renderer/css3d.js';

test('renderer exports the shared pause rule', () => {
  assert.equal(typeof PAUSE_RULE, 'string');
  assert.match(PAUSE_RULE, /\.stage\[data-playing="0"\]/);
  assert.match(PAUSE_RULE, /animation-play-state:\s*paused/);
});

test('no preset declares its own copy of the pause rule', () => {
  const dir = new URL('../src/presets/', import.meta.url);
  const offenders = readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => /const PAUSE_RULE\s*=/.test(readFileSync(new URL(f, dir), 'utf8')));
  assert.deepEqual(offenders, []);
});
