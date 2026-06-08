import { test, expect } from '@playwright/test';

const PRESETS = ['mosaic', 'ribbons', 'source', 'system7', 'supergraphics', 'flowlines', 'paper-grain', 'doodles', 'groove', 'scandi', 'seigaiha'];

for (const name of PRESETS) {
  test(`preset "${name}" loads and renders to canvas`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    await page.evaluate((n) => {
      const el = document.getElementById('wc');
      el.setAttribute('preset', n);
    }, name);
    await page.evaluate(() => document.getElementById('wc').ready);
    const ok = await page.evaluate(() => {
      const c = document.getElementById('wc').shadowRoot.querySelector('canvas');
      return c instanceof HTMLCanvasElement && c.width > 0 && c.height > 0;
    });
    expect(ok).toBe(true);
  });
}

// Smoke-level: confirms each mode value loads without error. Real
// mode-distinguishing assertions come in Task 2 when mosaic is implemented.
test('mosaic honors each `mode` value without erroring', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const mode of ['isometric', 'flat', 'sparse', 'stacked', 'blocks']) {
    const ok = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      el.setAttribute('mode', m);
      el.setAttribute('preset', 'mosaic');
      await el.ready;
      return !el.hasAttribute('data-fallback');
    }, mode);
    expect(ok, `mode=${mode} should render`).toBe(true);
  }
});

// Smoke-level: confirms toggling use-theme produces a render with bytes.
// Real chrome-color assertions come in Task 5 when system7 is implemented.
test('system7 use-theme toggle changes the rendered pixels', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const detail = await page.evaluate(async () => {
    const bytes = async (el) => new Uint8Array(await (await el.snapshot()).arrayBuffer());
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'system7');
    el.setAttribute('speed', '0'); // freeze time so only the theme can change pixels
    await el.ready;
    await new Promise((r) => requestAnimationFrame(r));
    const b1 = await bytes(el);
    el.setAttribute('use-theme', '');
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    const b2 = await bytes(el);
    const identical = b1.length === b2.length && b1.every((v, i) => v === b2[i]);
    return { size1: b1.length, size2: b2.length, identical };
  });
  expect(detail.size1).toBeGreaterThan(0);
  expect(detail.size2).toBeGreaterThan(0);
  expect(detail.identical, 'use-theme should change the rendered pixels').toBe(false);
});

// doodles: every `mode` family value loads and renders without error, and an
// absent mode (defaults to all families) also renders.
test('doodles honors each `mode` value and defaults to all', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const mode of ['planner', 'botanical', 'geometric', 'planner botanical', '']) {
    const ok = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', 'doodles');
      await el.ready;
      return !el.hasAttribute('data-fallback');
    }, mode);
    expect(ok, `mode="${mode}" should render`).toBe(true);
  }
});

// groove: a seed-driven route generator that should render across the whole
// density range (framed → tangle) and produce a non-empty snapshot for each.
test('groove renders across density and seed without erroring', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const [density, seed] of [['0.1', '1'], ['0.5', '7'], ['1', '42']]) {
    const detail = await page.evaluate(
      async ([d, s]) => {
        const el = document.getElementById('wc');
        el.setAttribute('preset', 'groove');
        el.setAttribute('density', d);
        el.setAttribute('seed', s);
        await el.ready;
        const blob = await el.snapshot();
        return { fallback: el.hasAttribute('data-fallback'), size: blob.size };
      },
      [density, seed]
    );
    expect(detail.fallback, `density=${density} seed=${seed} should not fall back`).toBe(false);
    expect(detail.size, `density=${density} seed=${seed} should paint bytes`).toBeGreaterThan(0);
  }
});

// scandi + seigaiha: tiled pattern presets that must render across the density
// range and produce a non-empty snapshot for each seed.
for (const preset of ['scandi', 'seigaiha']) {
  test(`${preset} renders across density and seed without erroring`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    for (const [density, seed] of [['0.2', '2'], ['0.6', '11'], ['1', '99']]) {
      const detail = await page.evaluate(
        async ([p, d, s]) => {
          const el = document.getElementById('wc');
          el.setAttribute('preset', p);
          el.setAttribute('density', d);
          el.setAttribute('seed', s);
          await el.ready;
          const blob = await el.snapshot();
          return { fallback: el.hasAttribute('data-fallback'), size: blob.size };
        },
        [preset, density, seed]
      );
      expect(detail.fallback, `${preset} density=${density} seed=${seed} should not fall back`).toBe(false);
      expect(detail.size, `${preset} density=${density} seed=${seed} should paint bytes`).toBeGreaterThan(0);
    }
  });
}
