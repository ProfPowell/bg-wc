import { test, expect } from '@playwright/test';

test('fg read falls back to --color-text when --color-foreground is unset', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const value = await page.evaluate(() => {
    const host = document.getElementById('host');
    host.style.setProperty('--color-text', 'rgb(10, 20, 30)');
    return window.readTokenString(host, ['--color-foreground', '--color-text'], ['--bg-wc-color-fg', '--gl-wc-color-fg']);
  });
  expect(value).toBe('rgb(10, 20, 30)');
});

test('fg read prefers --color-foreground when both are set', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const value = await page.evaluate(() => {
    const host = document.getElementById('host');
    host.style.setProperty('--color-foreground', 'rgb(1, 2, 3)');
    host.style.setProperty('--color-text', 'rgb(9, 9, 9)');
    return window.readTokenString(host, ['--color-foreground', '--color-text'], ['--bg-wc-color-fg', '--gl-wc-color-fg']);
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

test('cssToRgba resolves light-dark() per color-scheme (vanilla-breeze light mode)', async ({
  page,
}) => {
  await page.goto('/test/tokens-page.html');
  const r = await page.evaluate(() => {
    document.documentElement.style.colorScheme = 'light';
    const light = window.cssToRgba('light-dark(oklch(15% 0 0), oklch(96% 0 0))'); // → near-black
    document.documentElement.style.colorScheme = 'dark';
    const dark = window.cssToRgba('light-dark(oklch(15% 0 0), oklch(96% 0 0))'); // → near-white
    return { light, dark };
  });
  // light-dark() previously collapsed to black (canvas can't parse it). Now the
  // light scheme picks the first arg (dark ink) and dark scheme the second (light).
  const lum = (c) => c[0] + c[1] + c[2];
  expect(lum(r.light)).toBeLessThan(0.6); // dark in light scheme
  expect(lum(r.dark)).toBeGreaterThan(2.4); // light in dark scheme
});

test('readTokenString prefers --bg-wc override, falls back to --gl-wc', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const r = await page.evaluate(() => {
    const host = document.createElement('div');
    host.style.setProperty('--gl-wc-color-1', 'rgb(10, 20, 30)');
    document.body.appendChild(host);
    const legacyOnly = window.readTokenString(host, '--color-primary', [
      '--bg-wc-color-1',
      '--gl-wc-color-1',
    ]);
    host.style.setProperty('--bg-wc-color-1', 'rgb(40, 50, 60)');
    const canonical = window.readTokenString(host, '--color-primary', [
      '--bg-wc-color-1',
      '--gl-wc-color-1',
    ]);
    host.remove();
    return { legacyOnly, canonical };
  });
  expect(r.legacyOnly).toBe('rgb(10, 20, 30)');
  expect(r.canonical).toBe('rgb(40, 50, 60)');
});
