import { test, expect } from '@playwright/test';
import { listPresets } from '../src/presets/index.js';

// Per-preset visual regression (gl-wc-t8b). Each preset is mounted at a fixed
// size, seed, and frozen time (speed=0) for a deterministic still, then compared
// to a committed baseline at a loose pixel threshold. Baselines are generated in
// the Playwright Docker image (see scripts/update-visual-baselines.sh) so they
// match the CI container exactly — run the `visual` CI job, not the matrix job.

const PRESETS = listPresets().map((p) => p.name);

// Presets that advance internal state per frame() call (not from the frozen `t`),
// so they never settle to a stable still. They still get the load/fallback check,
// just not a pixel baseline. reaction-diffusion steps its Gray-Scott sim every
// frame regardless of `t`; the phase-3/4 sims (flocking, accumulation buffers,
// growth) likewise advance per frame, so none settle to a stable still.
const NO_SNAPSHOT = new Set([
  'reaction-diffusion',
  'boids',
  'mycelium',
  'slime-mold',
  'oscilloscope',
  'radar',
  'drip',
]);

test.describe('visual', () => {
  for (const name of PRESETS) {
    test(name, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 240 });
      await page.goto('/test/new-presets-page.html');
      const ok = await page.evaluate(async (n) => {
        const el = document.getElementById('wc');
        el.setAttribute('seed', '7');
        el.setAttribute('intensity', '0.6');
        el.setAttribute('density', '0.5');
        el.setAttribute('speed', '0'); // freeze time → deterministic still
        el.setAttribute('text', 'BG·WC|VISUAL'); // for text presets
        el.setAttribute('preset', n);
        await el.ready;
        // Settle a couple frames at the frozen time.
        for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
        return !el.hasAttribute('data-fallback');
      }, name);
      // Every preset must at least load (this also guards the WebGL-context and
      // unknown-preset paths for every registered preset, beyond the loose pixel check).
      expect(ok, `${name} should not fall back`).toBe(true);
      if (NO_SNAPSHOT.has(name)) return;
      await expect(page.locator('#wc')).toHaveScreenshot(`${name}.png`, {
        maxDiffPixelRatio: 0.05,
        animations: 'disabled',
      });
    });
  }
});
