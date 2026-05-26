import { test, expect } from '@playwright/test';

// Regression: when the page is restored from the back/forward cache, the WebGL
// context that was dropped while the page was frozen must be rebuilt. bg-wc used
// to only recover via `webglcontextrestored` (which bfcache restore does not
// reliably fire), leaving the canvas hidden behind a stuck `data-fallback`.
// bfcache itself can't be driven under CDP/Playwright, so we reproduce the same
// failure mode: force a context loss (as the freeze does), then fire `pageshow`
// with persisted=true (as the restore does) and assert the background recovers.

async function heroHasInk(page) {
  return page.evaluate(async () => {
    const el = document.getElementById('wc');
    const canvas = el.shadowRoot.querySelector('canvas');
    return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0;
  });
}

test('recovers rendering after a WebGL context loss + bfcache restore', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('wc').ready);
  expect(await heroHasInk(page)).toBe(true);

  // Simulate the freeze dropping the GL context.
  await page.evaluate(() => {
    const canvas = document.getElementById('wc').shadowRoot.querySelector('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    gl.getExtension('WEBGL_lose_context').loseContext();
  });
  await page.waitForTimeout(150);
  // Lost context puts the element into its fallback (canvas hidden) state.
  expect(await page.evaluate(() => document.getElementById('wc').hasAttribute('data-fallback'))).toBe(
    true
  );

  // Simulate the bfcache restore.
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  // The element should rebuild on its own (fresh canvas + context) and become ready again.
  await page.evaluate(() => document.getElementById('wc').ready);
  await page.waitForTimeout(150);

  expect(await page.evaluate(() => document.getElementById('wc').hasAttribute('data-fallback'))).toBe(
    false
  );
  expect(await heroHasInk(page)).toBe(true);
});
