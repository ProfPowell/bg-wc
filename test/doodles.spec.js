// Behavioral tests for the doodles preset (browser-side), beyond the smoke
// load/render checks in new-presets.spec.js. Covers reduced-motion staticFrame,
// clean disposal, margin-bias placement, and mode family selection.
import { test, expect } from '@playwright/test';

// Read the doodles shadow <canvas> 2d pixels and count non-transparent ones.
async function inkStats(page) {
  return page.evaluate(() => {
    const el = document.getElementById('wc');
    const c = el.shadowRoot.querySelector('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let ink = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) ink++;
    return { ink, w: c.width, h: c.height };
  });
}

test('renders a static frame under reduced motion (no fallback, has ink)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('motion', 'reduce');
    el.setAttribute('density', '1');
    el.setAttribute('preset', 'doodles');
    await el.ready;
  });
  const onFallback = await page.evaluate(() =>
    document.getElementById('wc').hasAttribute('data-fallback')
  );
  const { ink } = await inkStats(page);
  expect(onFallback).toBe(false); // staticFrame means the canvas, not the fallback
  expect(ink).toBeGreaterThan(0); // marginalia actually drew
});

test('disposes cleanly when the preset is removed (no error event)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const res = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'doodles');
    await el.ready;
    let errored = false;
    el.addEventListener('bg-wc:error', () => {
      errored = true;
    });
    el.removeAttribute('preset'); // transition to inert -> dispose()
    await el.ready;
    return { errored, fallback: el.hasAttribute('data-fallback') };
  });
  expect(res.errored).toBe(false);
  expect(res.fallback).toBe(true); // inert element surfaces the fallback slot
});

test('biases placement toward the margins (center stays clearer)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const res = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('motion', 'force'); // force the animation loop on
    el.setAttribute('intensity', '1');
    el.setAttribute('density', '1');
    el.setAttribute('quality', 'high');
    el.setAttribute('seed', '1');
    el.setAttribute('preset', 'doodles');
    await el.ready;
    const c = el.shadowRoot.querySelector('canvas');
    const ctx = c.getContext('2d');
    const W = c.width,
      H = c.height;
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    let cInk = 0,
      mInk = 0,
      cArea = 0,
      mArea = 0;
    const start = performance.now();
    // Accumulate ink over a multi-second run; marginalia spawn slowly (~1.5/s),
    // so aggregate across many frames to make the bias statistically clear.
    while (performance.now() - start < 4500) {
      await raf();
      const d = ctx.getImageData(0, 0, W, H).data;
      for (let y = 0; y < H; y += 4) {
        for (let x = 0; x < W; x += 4) {
          const a = d[(y * W + x) * 4 + 3];
          const inCenter = x > 0.3 * W && x < 0.7 * W && y > 0.3 * H && y < 0.7 * H;
          if (inCenter) {
            cArea++;
            if (a > 0) cInk++;
          } else {
            mArea++;
            if (a > 0) mInk++;
          }
        }
      }
    }
    return {
      centerDensity: cInk / Math.max(1, cArea),
      marginDensity: mInk / Math.max(1, mArea),
    };
  });
  expect(res.marginDensity).toBeGreaterThan(res.centerDensity);
});

test('mode selects different icon families (planner vs geometric differ)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const grab = (mode) =>
    page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      el.setAttribute('preset', ''); // force a fresh re-init for the next mode
      await el.ready;
      el.setAttribute('motion', 'reduce');
      el.setAttribute('density', '1');
      el.setAttribute('seed', '3'); // same seed -> same positions, only icons differ
      el.setAttribute('mode', m);
      el.setAttribute('preset', 'doodles');
      await el.ready;
      const c = el.shadowRoot.querySelector('canvas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let cnt = 0,
        sum = 0;
      for (let i = 3; i < d.length; i += 4)
        if (d[i] > 0) {
          cnt++;
          sum = (sum + i) % 1_000_000_007;
        }
      return { cnt, sum };
    }, mode);
  const a = await grab('planner');
  const b = await grab('geometric');
  // identical seed/positions but different icon vocabularies => different pixels
  expect(a.cnt === b.cnt && a.sum === b.sum).toBe(false);
});
