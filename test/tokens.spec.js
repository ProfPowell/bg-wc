import { test, expect } from '@playwright/test';

test('fg read falls back to --color-text when --color-foreground is unset', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const value = await page.evaluate(() => {
    const host = document.getElementById('host');
    host.style.setProperty('--color-text', 'rgb(10, 20, 30)');
    return window.readTokenString(
      host,
      ['--color-foreground', '--color-text'],
      ['--bg-wc-color-fg']
    );
  });
  expect(value).toBe('rgb(10, 20, 30)');
});

test('fg read prefers --color-foreground when both are set', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const value = await page.evaluate(() => {
    const host = document.getElementById('host');
    host.style.setProperty('--color-foreground', 'rgb(1, 2, 3)');
    host.style.setProperty('--color-text', 'rgb(9, 9, 9)');
    return window.readTokenString(
      host,
      ['--color-foreground', '--color-text'],
      ['--bg-wc-color-fg']
    );
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

test('readTokenString prefers the --bg-wc override, else the token', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const r = await page.evaluate(() => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    host.style.setProperty('--color-primary', 'rgb(7, 8, 9)');
    const fromToken = window.readTokenString(host, '--color-primary', ['--bg-wc-color-1']);
    host.style.setProperty('--bg-wc-color-1', 'rgb(40, 50, 60)');
    const overridden = window.readTokenString(host, '--color-primary', ['--bg-wc-color-1']);
    host.remove();
    return { fromToken, overridden };
  });
  expect(r.fromToken).toBe('rgb(7, 8, 9)'); // no override → token value
  expect(r.overridden).toBe('rgb(40, 50, 60)'); // --bg-wc-color-1 wins
});

// gl-wc-agu: light-dark() resolution must not leak a probe element into the
// user's DOM, must honor the HOST's color-scheme (not just the page's), and
// must be cached — resolveTokens runs per frame, so an uncached DOM probe is
// 8 forced style resolutions per frame per element.

test('light-dark() resolution leaves no probe element behind', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const leftover = await page.evaluate(() => {
    const before = document.body.children.length;
    window.cssToRgba('light-dark(rgb(10, 20, 30), rgb(40, 50, 60))');
    return document.body.children.length - before;
  });
  expect(leftover, 'the DOM probe must be removed after use').toBe(0);
});

test('light-dark() resolves against the host color-scheme, not the page', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const r = await page.evaluate(() => {
    document.documentElement.style.colorScheme = 'light';
    const host = document.getElementById('host');
    host.style.colorScheme = 'dark'; // dark island on a light page
    host.style.setProperty('--color-primary', 'light-dark(oklch(15% 0 0), oklch(96% 0 0))');
    const { primary } = window.resolveTokens(host, {
      primary: { token: '--color-primary', override: null },
    });
    host.style.colorScheme = '';
    return primary;
  });
  // dark scheme → second arm (near-white), even though the page is light
  expect(r[0] + r[1] + r[2]).toBeGreaterThan(2.4);
});

test('repeated light-dark() lookups hit the cache, not the DOM', async ({ page }) => {
  await page.goto('/test/tokens-page.html');
  const r = await page.evaluate(() => {
    const orig = window.getComputedStyle;
    let calls = 0;
    window.getComputedStyle = function (...a) {
      calls++;
      return orig.apply(window, a);
    };
    try {
      window.cssToRgba('light-dark(rgb(11, 22, 33), rgb(44, 55, 66))');
      const first = calls;
      calls = 0;
      window.cssToRgba('light-dark(rgb(11, 22, 33), rgb(44, 55, 66))');
      return { first, second: calls };
    } finally {
      window.getComputedStyle = orig;
    }
  });
  expect(r.second, 'a repeat lookup must skip the DOM probe').toBeLessThan(r.first);
});
