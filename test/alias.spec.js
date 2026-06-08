import { test, expect } from '@playwright/test';

test('<gl-wc> alias upgrades, renders, and warns once', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.goto('/test/alias-page.html');
  // The element upgrades to the BgWc subclass and produces a canvas.
  await page.waitForFunction(
    () => !!document.getElementById('legacy')?.shadowRoot?.querySelector('canvas')
  );
  const isBgWc = await page.evaluate(() => {
    const el = document.getElementById('legacy');
    return el instanceof customElements.get('bg-wc');
  });
  expect(isBgWc).toBe(true);
  expect(warnings.some((w) => /<gl-wc> is deprecated/.test(w))).toBe(true);
});

test('legacy data-bg still injects a <bg-wc> child and warns', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.goto('/test/alias-page.html');
  await page.waitForFunction(
    () => !!document.getElementById('binder-legacy')?.querySelector('bg-wc[data-bg-element]')
  );
  expect(warnings.some((w) => /data-bg is deprecated/.test(w))).toBe(true);
});

test('canonical bg-wc:ready also fires a legacy gl-wc:ready twin', async ({ page }) => {
  // Attach listeners before the module script fires so we don't miss the events.
  // exposeFunction bridges the browser-side signal back to the Node side.
  const eventSeen = { bg: false, gl: false };
  await page.exposeFunction('__onBgReady', () => {
    eventSeen.bg = true;
  });
  await page.exposeFunction('__onGlReady', () => {
    eventSeen.gl = true;
  });
  await page.addInitScript(() => {
    // Run after the DOM is parsed but before any deferred/module scripts execute.
    window.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('legacy');
      if (el) {
        el.addEventListener('bg-wc:ready', () => window.__onBgReady());
        el.addEventListener('gl-wc:ready', () => window.__onGlReady());
      }
    });
  });
  await page.goto('/test/alias-page.html');
  // Wait for the element to render (canvas present in shadow root).
  await page.waitForFunction(
    () => !!document.getElementById('legacy')?.shadowRoot?.querySelector('canvas')
  );
  // Give the ready events up to 4 s to arrive.
  const deadline = Date.now() + 4000;
  while ((!eventSeen.bg || !eventSeen.gl) && Date.now() < deadline) {
    await page.waitForTimeout(100);
  }
  expect(eventSeen).toEqual({ bg: true, gl: true });
});
