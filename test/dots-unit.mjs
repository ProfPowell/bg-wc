// Units for the pure helpers in _dots.js. Drawing helpers need a real canvas
// and are exercised by the Playwright preset tests instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mix, buildDotPalette } from '../src/presets/_dots.js';

test('mix lerps each channel', () => {
  assert.deepEqual(mix([0, 0, 0], [1, 1, 1], 0.5), [0.5, 0.5, 0.5]);
  assert.deepEqual(mix([0.2, 0.4, 0.6], [0.2, 0.4, 0.6], 1), [0.2, 0.4, 0.6]);
});

test('buildDotPalette returns css strings and a highlight', () => {
  const c = {
    primary: [1, 0, 0],
    accent: [0, 1, 0],
    info: [0, 0, 1],
    success: [1, 1, 0],
    warning: [1, 0, 1],
    error: [0, 1, 1],
    bg: [0, 0, 0, 1],
    fg: [1, 1, 1, 1],
  };
  const { pal, highlight } = buildDotPalette(c, 1);
  assert.equal(pal.length, 6);
  assert.match(pal[0], /^rgb\(/);
  assert.match(highlight, /^rgb\(/);
});

test('buildDotPalette softens toward bg at low intensity', () => {
  const c = { primary: [1, 1, 1], bg: [0, 0, 0, 1], fg: [1, 1, 1, 1] };
  const vivid = buildDotPalette(c, 1).pal[0];
  const soft = buildDotPalette(c, 0).pal[0];
  assert.notEqual(vivid, soft); // low intensity pulls white toward black
});

test('buildDotPalette tolerates missing roles and transparent bg', () => {
  const { pal, highlight } = buildDotPalette({ primary: [0.9, 0.3, 0.3], bg: [0, 0, 0, 0] }, 0.5);
  assert.ok(pal.length >= 1);
  assert.equal(highlight, '#ffffff'); // no fg → white
});
