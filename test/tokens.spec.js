import { test, expect } from '@playwright/test';

test('fg read falls back to --color-text when --color-foreground is unset', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const value = await page.evaluate(() => {
    const host = document.getElementById('host');
    host.style.setProperty('--color-text', 'rgb(10, 20, 30)');
    return window.readTokenString(host, ['--color-foreground', '--color-text'], '--gl-wc-color-fg');
  });
  expect(value).toBe('rgb(10, 20, 30)');
});

test('fg read prefers --color-foreground when both are set', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const value = await page.evaluate(() => {
    const host = document.getElementById('host');
    host.style.setProperty('--color-foreground', 'rgb(1, 2, 3)');
    host.style.setProperty('--color-text', 'rgb(9, 9, 9)');
    return window.readTokenString(host, ['--color-foreground', '--color-text'], '--gl-wc-color-fg');
  });
  expect(value).toBe('rgb(1, 2, 3)');
});

test('cssToRgba resolves oklch() colors (vanilla-breeze tokens) to real RGB, not black', async ({
  page,
}) => {
  await page.goto('/test/tokens-page.html');
  const rgba = await page.evaluate(() => window.cssToRgba('oklch(62% .1 230)'));
  // oklch(62% .1 230) is a mid blue. The bug: parseColor returned [0,0,0,1].
  expect(rgba[0] + rgba[1] + rgba[2]).toBeGreaterThan(0); // not black
  expect(rgba[2]).toBeGreaterThan(rgba[0]); // blue channel dominant
  expect(rgba[3]).toBeCloseTo(1, 2); // opaque
});

test('cssToRgba handles hsl() and named colors too', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const [hsl, named, transparent] = await page.evaluate(() => [
    window.cssToRgba('hsl(120 100% 50%)'), // pure green
    window.cssToRgba('rebeccapurple'),
    window.cssToRgba('transparent'),
  ]);
  expect(hsl[1]).toBeGreaterThan(hsl[0]); // green channel dominant
  expect(named[0] + named[1] + named[2]).toBeGreaterThan(0); // not black
  expect(transparent).toEqual([0, 0, 0, 0]);
});
