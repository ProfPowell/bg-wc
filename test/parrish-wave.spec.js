import { test, expect } from '@playwright/test';

// Render smoke for the 2026-07-07 parrish-wave presets: each must mount
// without fallback and produce a non-blank still. Baselines live in the
// visual project; the eleven canvas2d presets are pinned pure-in-t by
// time-rule.spec.js; halcyon is pure u_time by construction.

const PRESETS = ['cumulus'];

for (const name of PRESETS) {
  test(`${name} renders with ink and no fallback`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const r = await page.evaluate(async (n) => {
      const el = document.getElementById('wc');
      el.setAttribute('seed', '7');
      el.setAttribute('intensity', '0.6');
      el.setAttribute('preset', n);
      await el.ready;
      const blob = await el.snapshot();
      return { fallback: el.hasAttribute('data-fallback'), bytes: blob ? blob.size : 0 };
    }, name);
    expect(r.fallback, `${name} must not fall back`).toBe(false);
    expect(r.bytes, `${name} still should not be blank`).toBeGreaterThan(1500);
  });
}
