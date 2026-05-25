import { test, expect } from '@playwright/test';

test('gl-wc element upgrades and exposes its API', async ({ page }) => {
  await page.goto('/test/test-page.html');
  const isUpgraded = await page.evaluate(() => {
    const el = document.getElementById('wc');
    return el instanceof HTMLElement && typeof el.snapshot === 'function' && !!el.shadowRoot;
  });
  expect(isUpgraded).toBe(true);
});

test('a preset loads and sizes the canvas', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('wc').ready);
  await page.waitForTimeout(200);
  const sized = await page.evaluate(() => {
    const canvas = document.getElementById('wc').shadowRoot.querySelector('canvas');
    return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0;
  });
  expect(sized).toBe(true);
});

test('snapshot() resolves to a PNG blob', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('wc').ready);
  const type = await page.evaluate(async () => {
    const blob = await document.getElementById('wc').snapshot();
    return blob && blob.type;
  });
  expect(type).toBe('image/png');
});
