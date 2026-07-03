import { test, expect } from '@playwright/test';

// Render smoke for the 2026-07-03 style-wave presets: each must mount without
// fallback and produce a non-blank still. Pixel baselines live in the visual
// project; frame-purity is pinned in time-rule.spec.js (all twelve are pure
// functions of t by design).

const PRESETS = [
  'art-nouveau',
  'constructivism',
  'psychedelia',
  'brushstroke',
  'celtic-knot',
  'paisley',
  'azulejo',
  'mudcloth',
  'terrazzo',
  'cyanotype',
  'screenprint',
  'transit-diagram',
];

for (const name of PRESETS) {
  test(`${name} renders with ink and no fallback`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const r = await page.evaluate(async (n) => {
      const el = document.getElementById('wc');
      el.setAttribute('seed', '7');
      el.setAttribute('intensity', '0.6');
      el.setAttribute('preset', n);
      await el.ready;
      const blob = await el.snapshot();
      return { fallback: el.hasAttribute('data-fallback'), bytes: blob ? blob.size : 0 };
    }, name);
    expect(r.fallback, `${name} must not fall back`).toBe(false);
    // A blank 320x240 canvas PNG compresses to a few hundred bytes; any real
    // drawing lands well above this.
    expect(r.bytes, `${name} still should not be blank`).toBeGreaterThan(1500);
  });
}

// gl-wc-0eq6: screenprint's multiply compositing can only darken, so over a
// dark theme background all three ink pulls sank toward black and the preset
// vanished. Pin legibility directly: on a near-black theme a meaningful
// fraction of pixels must differ visibly from the background.
test('screenprint stays legible on a dark theme', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const mod = await import('/src/presets/screenprint.js');
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const c2d = canvas.getContext('2d', { willReadFrequently: true });
    const colors = {
      primary: [0.55, 0.3, 0.85, 1],
      accent: [0.9, 0.35, 0.55, 1],
      info: [0.25, 0.75, 0.7, 1],
      bg: [0.04, 0.05, 0.08, 1], // near-black night theme
      fg: [0.92, 0.93, 0.96, 1],
      success: [0.2, 0.7, 0.3, 1],
      warning: [0.9, 0.7, 0.1, 1],
      error: [0.8, 0.2, 0.2, 1],
    };
    const params = {
      palette: 'theme',
      intensity: 0.6,
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
    inst.frame(1, params);
    const d = c2d.getImageData(0, 0, 160, 120).data;
    const bg = [10, 13, 20];
    let ink = 0;
    for (let i = 0; i < d.length; i += 4) {
      const delta = Math.max(
        Math.abs(d[i] - bg[0]),
        Math.abs(d[i + 1] - bg[1]),
        Math.abs(d[i + 2] - bg[2])
      );
      if (delta > 40) ink++;
    }
    inst.dispose();
    return { inkPct: (100 * ink) / (d.length / 4) };
  });
  expect(r.inkPct, 'ink must stay visible over a dark ground').toBeGreaterThan(3);
});
