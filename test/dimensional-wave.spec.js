import { test, expect } from '@playwright/test';

// Smoke for the 2026-07-05 dimensional-wave css3d presets: each must mount a
// stage (not a canvas), build a non-trivial scene, and ship the shared pause
// rule so reduced-motion / paused stills freeze the keyframes (visual
// baselines rely on it). Motion lives in CSS, so these are NOT in time-rule.

const PRESETS = ['carousel'];

for (const name of PRESETS) {
  test(`${name} mounts a css3d scene with the pause rule`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const r = await page.evaluate(async (n) => {
      const el = document.getElementById('wc');
      el.setAttribute('seed', '7');
      el.setAttribute('preset', n);
      await el.ready;
      const root = el.shadowRoot;
      const stage = root.querySelector('div.stage[part="stage"]');
      return {
        fallback: el.hasAttribute('data-fallback'),
        hasStage: !!stage,
        hasCanvas: !!root.querySelector('canvas'),
        sceneNodes: stage ? stage.querySelectorAll('*').length : 0,
        pauseRule: stage
          ? /data-playing="0"/.test(stage.querySelector('style')?.textContent || '')
          : false,
      };
    }, name);
    expect(r.fallback, `${name} must not fall back`).toBe(false);
    expect(r.hasStage, 'css3d stage must mount').toBe(true);
    expect(r.hasCanvas, 'css3d must not create a canvas').toBe(false);
    expect(r.sceneNodes, 'scene must be non-trivial').toBeGreaterThanOrEqual(10);
    expect(r.pauseRule, 'STYLE must include the pause rule').toBe(true);
  });
}
