import { test, expect } from '@playwright/test';

const PRESETS = ['mosaic', 'ribbons', 'source', 'system7', 'supergraphics', 'flowlines', 'paper-grain'];

for (const name of PRESETS) {
  test(`preset "${name}" loads and renders to canvas`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    await page.evaluate((n) => {
      const el = document.getElementById('wc');
      el.setAttribute('preset', n);
    }, name);
    await page.evaluate(() => document.getElementById('wc').ready);
    const ok = await page.evaluate(() => {
      const c = document.getElementById('wc').shadowRoot.querySelector('canvas');
      return c instanceof HTMLCanvasElement && c.width > 0 && c.height > 0;
    });
    expect(ok).toBe(true);
  });
}

// Smoke-level: confirms each mode value loads without error. Real
// mode-distinguishing assertions come in Task 2 when mosaic is implemented.
test('mosaic honors each `mode` value without erroring', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const mode of ['isometric', 'flat', 'sparse', 'stacked', 'blocks']) {
    const ok = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      el.setAttribute('mode', m);
      el.setAttribute('preset', 'mosaic');
      await el.ready;
      return !el.hasAttribute('data-fallback');
    }, mode);
    expect(ok, `mode=${mode} should render`).toBe(true);
  }
});

// Smoke-level: confirms toggling use-theme produces a render with bytes.
// Real chrome-color assertions come in Task 5 when system7 is implemented.
test('system7 honors use-theme toggle', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const detail = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'system7');
    await el.ready;
    const blob1 = await el.snapshot();
    el.setAttribute('use-theme', '');
    await new Promise((r) => requestAnimationFrame(r));
    const blob2 = await el.snapshot();
    return { size1: blob1.size, size2: blob2.size };
  });
  expect(detail.size1).toBeGreaterThan(0);
  expect(detail.size2).toBeGreaterThan(0);
});
