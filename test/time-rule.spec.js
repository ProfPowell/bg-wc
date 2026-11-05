import { test, expect } from '@playwright/test';
import { listPresets } from '../src/presets/index.js';

// gl-wc-21m / gl-wc-beh4: the preset contract pre-scales `t` by speed — ALL
// motion must derive from `t` (via a dt), never from per-rAF-tick steps or
// params.speed. Properties pinned here, catalog-wide for every canvas2d and
// webgl preset:
//   1. frame() is a function of t: repeated calls at a frozen t are
//      pixel-identical (per-call integration fails this — it advances every
//      call, runs 2x faster at 120 Hz, and ignores or double-applies `speed`);
//      advancing t still produces motion.
//   2. Stateful simulations step from elapsed time with a fixed, bounded step:
//      walking t from 0 to T at 60 Hz and at 120 Hz lands on the same pixels.
// css3d presets render to DOM via CSS animations and are covered by
// css3d-delay-idiom.spec.js instead.

const PRESETS = listPresets().filter((p) => p.renderer !== 'css3d');

// Presets that carry simulation state between frames (ping-pong fields,
// accumulation buffers, agent arrays, growth). They must integrate that state
// from elapsed time, so a 60 Hz and a 120 Hz walk to the same t converge.
const STATEFUL = [
  'reaction-diffusion',
  'slime-mold',
  'spectrum',
  'boids',
  'mycelium',
  'radar',
  'oscilloscope',
  'drip',
  'matrix',
  'mystify',
];

// Presets whose motion is visible within 0.7 s at 160×120 — the "advancing t
// still moves" half of the property is asserted for these. Static or very slow
// pattern presets (truchet, damask, swiss, …) legitimately render the same
// pixels across that window; they still get the frozen-t identity check.
const ANIMATES = new Set([
  ...STATEFUL,
  'particles',
  'asteroids',
  'network',
  'rain',
  'fireflies',
  'embers',
  'lightning',
  'constellation',
  'bubbles',
  'leaves',
  'zen-garden',
  'art-nouveau',
  'constructivism',
  'brushstroke',
  'celtic-knot',
  'paisley',
  'azulejo',
  'mudcloth',
  'terrazzo',
  'cyanotype',
  'screenprint',
  'transit-diagram',
  'bluenote',
  'starburst',
  'vinyl',
  'prism',
  'laser-show',
  'scanimate',
  'airbrush',
  'video-feedback',
  'stage-lights',
  'cumulus',
  'terrace',
  'oil-sky',
  'moonrise',
  'lily-pond',
  'meadow',
  'tide',
  'fan-deco',
  'deco-spires',
  'peacock',
  'gilded',
]);

// Runs in the page: mount a preset on an offscreen canvas of the right kind
// and return a pixel reader. Mirrors the host's create() call.
const HARNESS = `
  async function mount(presetName, renderer) {
    const mod = await import('/src/presets/' + presetName + '.js');
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    let gl = null;
    let c2d = null;
    let pixels;
    if (renderer === 'webgl') {
      const { createGLContext } = await import('/src/renderer/webgl.js');
      gl = createGLContext(canvas);
      const buf = new Uint8Array(160 * 120 * 4);
      pixels = () => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.readPixels(0, 0, 160, 120, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        return Array.from(buf);
      };
    } else {
      c2d = canvas.getContext('2d', { willReadFrequently: true });
      pixels = () => Array.from(c2d.getImageData(0, 0, 160, 120).data);
    }
    const colors = {
      primary: [0.42, 0.25, 0.63, 1],
      accent: [0.85, 0.27, 0.94, 1],
      info: [0.15, 0.82, 0.65, 1],
      bg: [0.98, 0.98, 0.98, 1],
      fg: [0.1, 0.1, 0.1, 1],
      success: [0.2, 0.7, 0.3, 1],
      warning: [0.9, 0.7, 0.1, 1],
      error: [0.8, 0.2, 0.2, 1],
    };
    const params = {
      palette: 'theme',
      intensity: 0.5,
      speed: 1,
      density: 0.5,
      seed: 7,
      quality: 'med',
      fit: 'cover',
      text: 'BG·WC',
    };
    const host = { getAttribute: () => null, hasAttribute: () => false };
    const inst = mod.create({
      host,
      canvas,
      gl,
      c2d,
      css3d: null,
      getColors: () => colors,
      getParams: () => params,
      pxScale: 1,
    });
    inst.resize(160, 120);
    if (gl) gl.viewport(0, 0, 160, 120);
    return { inst, params, pixels };
  }
  const eq = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
`;

for (const { name, renderer } of PRESETS) {
  test(`${name}: motion derives from t, not from call count`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const r = await page.evaluate(
      async ([presetName, kind, harness]) => {
        const { mount, eq } = new Function(harness + 'return { mount, eq };')();
        const { inst, params, pixels } = await mount(presetName, kind);
        inst.frame(0.5, params);
        inst.frame(0.5, params); // t frozen — must not advance
        const a = pixels();
        inst.frame(0.5, params);
        const b = pixels();
        // t advanced 0.7 s in frame-sized increments (a single 0.7 s jump is
        // clamped to 0.1 s of simulation by the fixed-step cap) — must move.
        for (let k = 1; k <= 42; k++) inst.frame(0.5 + k / 60, params);
        const after = pixels();
        inst.dispose();
        return { frozenStill: eq(a, b), moves: !eq(a, after) };
      },
      [name, renderer, HARNESS]
    );
    expect(r.frozenStill, 'repeated frames at the same t must be identical').toBe(true);
    if (ANIMATES.has(name)) {
      expect(r.moves, 'advancing t must still produce motion').toBe(true);
    }
  });
}

for (const name of STATEFUL) {
  const { renderer } = PRESETS.find((p) => p.name === name);
  test(`${name}: 60 Hz and 120 Hz walks to the same t converge`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const r = await page.evaluate(
      async ([presetName, kind, harness]) => {
        const { mount, eq } = new Function(harness + 'return { mount, eq };')();
        // Two independent instances, same seed, walked to t = 1.5 s with
        // different frame cadences. Elapsed-time stepping makes them land on
        // the same simulation state; per-call stepping runs the 120 Hz one
        // twice as far.
        const walk = async (hz) => {
          const { inst, params, pixels } = await mount(presetName, kind);
          const n = Math.round(1.5 * hz);
          for (let i = 0; i <= n; i++) inst.frame(i / hz, params);
          const px = pixels();
          inst.dispose();
          return px;
        };
        const a = await walk(60);
        const b = await walk(120);
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
        return { same: eq(a, b), meanDiff: diff / a.length };
      },
      [name, renderer, HARNESS]
    );
    expect(
      r.same,
      `60 Hz and 120 Hz walks must reach identical pixels (mean |diff| ${r.meanDiff.toFixed(2)})`
    ).toBe(true);
  });
}

// Host level: speed="0" must freeze a stateful simulation outright — not only
// the pixels (snapshot) but the simulation state behind them, so resuming
// continues from where it stopped instead of having silently advanced.
test('speed=0 freezes a stateful simulation at the host level', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('seed', '3');
    el.setAttribute('preset', 'reaction-diffusion');
    await el.ready;
    // Let the sim run a little, then freeze.
    await new Promise((res) => setTimeout(res, 150));
    el.setAttribute('speed', '0');
    await new Promise((res) => requestAnimationFrame(res));
    const bytes = async () => new Uint8Array(await (await el.snapshot()).arrayBuffer());
    const a = await bytes();
    await new Promise((res) => setTimeout(res, 200));
    const b = await bytes();
    return a.length === b.length && a.every((v, i) => v === b[i]);
  });
  expect(r, 'two snapshots 200ms apart at speed=0 must be byte-identical').toBe(true);
});
