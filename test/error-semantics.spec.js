import { test, expect } from '@playwright/test';

// Runtime frame-error doctrine (gl-wc-zy39): a preset that throws from
// frame() leaves the element INERT — exactly like a failed load. One
// bg-wc:error, the fallback slot up, and no play/pause/visibility toggle
// resurrects the broken instance. Changing the preset is the recovery path.

// Arm the canvas2d clearRect to throw; every canvas2d preset clears each
// frame, so this makes the *next* frame() call fail on a real preset without
// any test hook in production code.
const ARM = `
  window.__disarm = (() => {
    const orig = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function () {
      throw new Error('boom');
    };
    return () => { CanvasRenderingContext2D.prototype.clearRect = orig; };
  })();
`;

test('a throwing frame() leaves the element inert: one error, no resurrection', async ({
  page,
}) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async (arm) => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'embers');
    await el.ready;
    const errors = [];
    el.addEventListener('bg-wc:error', (e) => errors.push(e.detail.phase));
    const firstError = new Promise((res) =>
      el.addEventListener('bg-wc:error', res, { once: true })
    );
    new Function(arm)();
    await firstError;
    const afterThrow = el.hasAttribute('data-fallback');

    // Every path that used to restart the loop on the broken instance.
    el.pause();
    el.resume();
    el.paused = true;
    el.paused = false;
    await new Promise((res) => setTimeout(res, 250));
    const afterToggles = el.hasAttribute('data-fallback');

    // Recovery: a preset change builds a fresh instance.
    window.__disarm();
    el.setAttribute('preset', 'conic');
    await el.ready;
    return { errors, afterThrow, afterToggles, recovered: !el.hasAttribute('data-fallback') };
  }, ARM);
  expect(r.errors).toEqual(['runtime']);
  expect(r.afterThrow, 'fallback shown after a runtime throw').toBe(true);
  expect(r.afterToggles, 'pause/resume must not resurrect a broken instance').toBe(true);
  expect(r.recovered, 'a preset change recovers').toBe(true);
});
