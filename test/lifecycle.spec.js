import { test, expect } from '@playwright/test';

// Covers gl-wc-n11 (removeAttribute('preset') disposes) and
// gl-wc-dmz (el.ready settles on every failure path).

test('removeAttribute("preset") stops RAF and disposes the instance', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('wc').ready);

  const result = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.removeAttribute('preset');
    // Wait a microtask for the async #loadCurrentPreset path to run
    await Promise.resolve();
    await el.ready; // must NOT hang
    return {
      hasFallback: el.hasAttribute('data-fallback'),
      hasPreset: el.hasAttribute('preset'),
    };
  });
  expect(result.hasPreset).toBe(false);
  expect(result.hasFallback).toBe(true);
});

test('removeAttribute("preset") emits preset-changed with to:null', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('wc').ready);

  const detail = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.getElementById('wc');
        el.addEventListener('bg-wc:preset-changed', (e) => resolve(e.detail), { once: true });
        el.removeAttribute('preset');
      })
  );
  expect(detail.to).toBeNull();
  expect(typeof detail.from).toBe('string');
});

test('el.ready settles when an unknown preset is loaded', async ({ page }) => {
  await page.goto('/test/test-page.html');
  await page.evaluate(() => document.getElementById('wc').ready);

  // Should not hang — ready resolves after load failure, bg-wc:error fires.
  const result = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    const errorP = new Promise((resolve) => {
      el.addEventListener('bg-wc:error', (e) => resolve(e.detail), { once: true });
    });
    el.setAttribute('preset', 'no-such-preset-xyz');
    const errorDetail = await errorP;
    await el.ready; // must NOT hang
    return { phase: errorDetail.phase, hasFallback: el.hasAttribute('data-fallback') };
  });
  expect(result.phase).toBe('load');
  expect(result.hasFallback).toBe(true);
});
