import { test, expect } from '@playwright/test';

// Regression guard for gl-wc-elz: the deprecated gl-wc / data-bg aliases are
// removed. Only the canonical surface (bg-wc, data-background, --bg-wc-*,
// bg-wc:*) works.

test('<gl-wc> is not registered and does not upgrade; <bg-wc> still does', async ({ page }) => {
  await page.goto('/test/legacy-page.html');
  await page.waitForFunction(
    () => !!document.getElementById('canonical')?.shadowRoot?.querySelector('canvas')
  );
  const r = await page.evaluate(() => ({
    glRegistered: !!customElements.get('gl-wc'),
    legacyUpgraded: !!document.getElementById('legacy')?.shadowRoot,
    canonicalUpgraded: !!document.getElementById('canonical')?.shadowRoot?.querySelector('canvas'),
  }));
  expect(r.glRegistered).toBe(false);
  expect(r.legacyUpgraded).toBe(false);
  expect(r.canonicalUpgraded).toBe(true);
});

test('gl-wc:* events no longer fire; bg-wc:* still do', async ({ page }) => {
  const seen = { bg: false, gl: false };
  await page.exposeFunction('__bg', () => {
    seen.bg = true;
  });
  await page.exposeFunction('__gl', () => {
    seen.gl = true;
  });
  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('canonical');
      el?.addEventListener('bg-wc:ready', () => window.__bg());
      el?.addEventListener('gl-wc:ready', () => window.__gl());
    });
  });
  await page.goto('/test/legacy-page.html');
  const deadline = Date.now() + 4000;
  while (!seen.bg && Date.now() < deadline) await page.waitForTimeout(100);
  await page.waitForTimeout(400); // give any stray gl-wc:ready a chance — it must NOT fire
  expect(seen.bg, 'bg-wc:ready should still fire').toBe(true);
  expect(seen.gl, 'gl-wc:ready twin should be gone').toBe(false);
});

test('data-bg is not bound; data-background still injects a <bg-wc>', async ({ page }) => {
  await page.goto('/test/legacy-page.html');
  await page.waitForFunction(
    () => !!document.getElementById('binder-canonical')?.querySelector('bg-wc')
  );
  await page.waitForTimeout(300); // let the binder finish scanning
  const r = await page.evaluate(() => ({
    legacyBound: !!document.getElementById('binder-legacy')?.querySelector('bg-wc'),
    canonicalBound: !!document.getElementById('binder-canonical')?.querySelector('bg-wc'),
  }));
  expect(r.legacyBound, 'data-bg should no longer bind').toBe(false);
  expect(r.canonicalBound).toBe(true);
});
