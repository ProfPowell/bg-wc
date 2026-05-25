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
