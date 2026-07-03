import { test, expect } from '@playwright/test';

// Render smoke for the 2026-07-03 style-wave presets: each must mount without
// fallback and produce a non-blank still. Pixel baselines live in the visual
// project; frame-purity is pinned in time-rule.spec.js (all twelve are pure
// functions of t by design).

const PRESETS = [
  'art-nouveau',
  'constructivism',
  'psychedelia',
  'brushstroke',
  'celtic-knot',
  'paisley',
  'azulejo',
  'mudcloth',
  'terrazzo',
];

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
    // A blank 320x240 canvas PNG compresses to a few hundred bytes; any real
    // drawing lands well above this.
    expect(r.bytes, `${name} still should not be blank`).toBeGreaterThan(1500);
  });
}
