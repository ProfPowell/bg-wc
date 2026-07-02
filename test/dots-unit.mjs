// Units for the pure helpers in _dots.js. Drawing helpers need a real canvas
// and are exercised by the Playwright preset tests instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mix, buildDotPalette, phyllotaxis, doubleSpiral, whorl } from '../src/presets/_dots.js';

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

// gl-wc-2h7: dir means chirality (geometry mirroring) ONLY — rotation over
// time is the caller's job via `phase`. Helpers must never scale phase by dir:
// callers bake direction into phase, so a helper-side dir multiply gives
// dir^2 = 1 and the motif can never rotate backwards.

function recordDots(fn) {
  const pts = [];
  const c2d = {
    fillStyle: '',
    beginPath() {},
    fill() {},
    arc(x, y) {
      pts.push([x, y]);
    },
  };
  fn(c2d);
  return pts;
}

const rotate = ([x, y], phi) => [
  Math.cos(phi) * x - Math.sin(phi) * y,
  Math.sin(phi) * x + Math.cos(phi) * y,
];
const close = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9;

test('whorl: phase rotates the motif by +phase regardless of dir', () => {
  const opts = { turns: 1, b: 10, dotR: 1, baseCss: 'a', highlight: 'b' };
  for (const dir of [1, -1]) {
    const at0 = recordDots((c2d) => whorl(c2d, 0, 0, { ...opts, dir, phase: 0 }));
    const at3 = recordDots((c2d) => whorl(c2d, 0, 0, { ...opts, dir, phase: 0.3 }));
    at0.forEach((pt, i) =>
      assert.ok(close(rotate(pt, 0.3), at3[i]), `whorl dir=${dir} dot ${i} rotated by +phase`)
    );
  }
});

test('doubleSpiral: phase rotates the motif by +phase regardless of dir', () => {
  const opts = { arms: 2, n: 20, b: 8, dotR: 1, pal: ['a', 'b'] };
  for (const dir of [1, -1]) {
    const at0 = recordDots((c2d) => doubleSpiral(c2d, 0, 0, { ...opts, dir, phase: 0 }));
    const at3 = recordDots((c2d) => doubleSpiral(c2d, 0, 0, { ...opts, dir, phase: 0.3 }));
    at0.forEach((pt, i) =>
      assert.ok(close(rotate(pt, 0.3), at3[i]), `doubleSpiral dir=${dir} dot ${i}`)
    );
  }
});

test('phyllotaxis: phase rotates by +phase; dir mirrors chirality', () => {
  const opts = { n: 30, scale: 4, dotR: 1, pal: ['a', 'b'] };
  for (const dir of [1, -1]) {
    const at0 = recordDots((c2d) => phyllotaxis(c2d, 0, 0, { ...opts, dir, phase: 0 }));
    const at3 = recordDots((c2d) => phyllotaxis(c2d, 0, 0, { ...opts, dir, phase: 0.3 }));
    at0.forEach((pt, i) => assert.ok(close(rotate(pt, 0.3), at3[i]), `phyllo dir=${dir} dot ${i}`));
  }
  // chirality: dir=-1 at phase=0 is the mirror (y → −y) of dir=+1
  const cw = recordDots((c2d) => phyllotaxis(c2d, 0, 0, { ...opts, dir: 1, phase: 0 }));
  const ccw = recordDots((c2d) => phyllotaxis(c2d, 0, 0, { ...opts, dir: -1, phase: 0 }));
  cw.forEach((pt, i) => assert.ok(close([pt[0], -pt[1]], ccw[i]), `phyllo mirror dot ${i}`));
});
