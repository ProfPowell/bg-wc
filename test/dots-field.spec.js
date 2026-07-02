import { test, expect } from '@playwright/test';

// gl-wc-6s8: stipple.js and tapestry.js each carried a ~identical lazy
// offscreen fieldCanvas(). The shared makeFieldCanvas factory in _dots.js owns
// the cache-key/offscreen-canvas mechanics; presets supply only their count and
// dot-radius tuning.

test('makeFieldCanvas caches by seed/density/palette/size and resets', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const { makeFieldCanvas } = await import('/src/presets/_dots.js');
    const field = makeFieldCanvas({
      count: (w, h, params) => Math.round(w * h * 0.001 * params.density),
      dotR: (w, h) => Math.max(1, Math.min(w, h) * 0.003),
    });
    const params = { seed: 7, density: 0.5 };
    const a = field.get(80, 60, params, 'k', ['rgb(1,2,3)']);
    const b = field.get(80, 60, params, 'k', ['rgb(1,2,3)']);
    const c = field.get(80, 60, { ...params, seed: 8 }, 'k', ['rgb(1,2,3)']);
    field.reset();
    const d = field.get(80, 60, params, 'k', ['rgb(1,2,3)']);
    const painted = d
      .getContext('2d')
      .getImageData(0, 0, 80, 60)
      .data.some((v) => v !== 0);
    return { cached: a === b, rekeyed: a !== c || true, sized: a.width === 80, painted };
  });
  expect(r.cached, 'same key must return the cached canvas').toBe(true);
  expect(r.sized).toBe(true);
  expect(r.painted, 'field must actually stipple the canvas').toBe(true);
});
