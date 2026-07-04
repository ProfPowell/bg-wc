import { test, expect } from '@playwright/test';

// gl-wc-21m: the preset contract pre-scales `t` by speed — ALL motion must
// derive from `t` (via a dt), never from per-rAF-tick steps or params.speed.
// Property pinned here: frame() is a function of t. Repeated calls at a frozen
// t are pixel-identical (per-tick integration fails this: it advances every
// call, runs 2x faster at 120 Hz, and ignores or double-applies `speed`);
// advancing t still produces motion.

const PRESETS = [
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
];

for (const name of PRESETS) {
  test(`${name}: motion derives from t, not from call count`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const r = await page.evaluate(async (presetName) => {
      const mod = await import(`/src/presets/${presetName}.js`);
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const c2d = canvas.getContext('2d', { willReadFrequently: true });
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
        text: '',
      };
      const inst = mod.create({
        host: null,
        canvas,
        gl: null,
        c2d,
        css3d: null,
        getColors: () => colors,
        getParams: () => params,
        pxScale: 1,
      });
      inst.resize(160, 120);
      const pixels = () => Array.from(c2d.getImageData(0, 0, 160, 120).data);
      inst.frame(0.5, params);
      inst.frame(0.5, params); // t frozen — must not advance
      const a = pixels();
      inst.frame(0.5, params);
      const b = pixels();
      inst.frame(1.2, params); // t advanced — must move
      const after = pixels();
      inst.dispose();
      const eq = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
      return { frozenStill: eq(a, b), moves: !eq(a, after) };
    }, name);
    expect(r.frozenStill, 'repeated frames at the same t must be identical').toBe(true);
    expect(r.moves, 'advancing t must still produce motion').toBe(true);
  });
}
