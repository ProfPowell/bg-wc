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
  await page.addInitScript(() => {
    window.__seen = { bg: false, gl: false };
    window.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('canonical');
      el?.addEventListener('bg-wc:ready', () => (window.__seen.bg = true));
      el?.addEventListener('gl-wc:ready', () => (window.__seen.gl = true));
    });
  });
  await page.goto('/test/legacy-page.html');
  // The removed twin was dispatched synchronously alongside bg-wc:ready, so
  // once bg is observed in page state the gl flag is already settled — no
  // grace sleep needed.
  await page.waitForFunction(() => window.__seen.bg);
  const seen = await page.evaluate(() => window.__seen);
  expect(seen.bg, 'bg-wc:ready should still fire').toBe(true);
  expect(seen.gl, 'gl-wc:ready twin should be gone').toBe(false);
});

test('data-bg is not bound; data-background still injects a <bg-wc>', async ({ page }) => {
  await page.goto('/test/legacy-page.html');
  await page.waitForFunction(
    () => !!document.getElementById('binder-canonical')?.querySelector('bg-wc')
  );
  // The initial scan handles every annotated element in one synchronous pass,
  // so once the canonical element is bound the legacy decision is final.
  const r = await page.evaluate(() => ({
    legacyBound: !!document.getElementById('binder-legacy')?.querySelector('bg-wc'),
    canonicalBound: !!document.getElementById('binder-canonical')?.querySelector('bg-wc'),
  }));
  expect(r.legacyBound, 'data-bg should no longer bind').toBe(false);
  expect(r.canonicalBound).toBe(true);
});
