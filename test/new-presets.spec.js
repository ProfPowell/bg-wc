import { test, expect } from '@playwright/test';

const PRESETS = [
  'mosaic',
  'ribbons',
  'source',
  'system7',
  'supergraphics',
  'flowlines',
  'paper-grain',
  'doodles',
  'groove',
  'scandi',
  'seigaiha',
  'dotwork',
  'stipple',
  'tapestry',
  'sumi-e',
  'kintsugi',
  'ukiyo-e',
  'sakura',
  'risograph',
  'plotter',
  'linocut',
  'truchet',
  'bauhaus',
  'phyllotaxis',
  'circuit',
  'reaction-diffusion',
  'gyroid',
  'de-stijl',
  'meander',
  'damask',
  'morris',
  'delaunay',
  'moire',
  'hilbert',
];

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
  for (const [density, seed] of [
    ['0.1', '1'],
    ['0.5', '7'],
    ['1', '42'],
  ]) {
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
    for (const [density, seed] of [
      ['0.2', '2'],
      ['0.6', '11'],
      ['1', '99'],
    ]) {
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
      expect(
        detail.fallback,
        `${preset} density=${density} seed=${seed} should not fall back`
      ).toBe(false);
      expect(
        detail.size,
        `${preset} density=${density} seed=${seed} should paint bytes`
      ).toBeGreaterThan(0);
    }
  });
}

// dotwork: every radial-structure mode loads and renders without falling back.
test('dotwork honors each `mode` value without erroring', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const mode of ['rings', 'spiral', 'double', 'whorl', 'waterholes', '']) {
    const ok = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', 'dotwork');
      await el.ready;
      return !el.hasAttribute('data-fallback');
    }, mode);
    expect(ok, `mode="${mode}" should render`).toBe(true);
  }
});

// stipple: each field mode renders, paints bytes, and never falls back.
test('stipple honors each `mode` value and paints bytes', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const mode of ['field', 'contour', 'vortex', '']) {
    const detail = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', 'stipple');
      await el.ready;
      await new Promise((r) => requestAnimationFrame(r));
      const blob = await el.snapshot();
      return { fallback: el.hasAttribute('data-fallback'), size: blob.size };
    }, mode);
    expect(detail.fallback, `mode="${mode}" should not fall back`).toBe(false);
    expect(detail.size, `mode="${mode}" should paint bytes`).toBeGreaterThan(0);
  }
});

// tapestry: dense composite backdrop must render across density/seed and paint.
test('tapestry renders across density and seed without erroring', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const [density, seed] of [
    ['0.2', '2'],
    ['0.6', '11'],
    ['1', '99'],
  ]) {
    const detail = await page.evaluate(
      async ([d, s]) => {
        const el = document.getElementById('wc');
        el.setAttribute('preset', 'tapestry');
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

// Japanese + print round: each preset must not fall back (catches WebGL shader
// compile failures the generic canvas-size test would miss) and must paint.
for (const name of ['sumi-e', 'kintsugi', 'ukiyo-e', 'sakura', 'risograph', 'plotter', 'linocut']) {
  test(`${name} does not fall back and paints bytes`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const detail = await page.evaluate(async (n) => {
      const el = document.getElementById('wc');
      el.setAttribute('preset', n);
      await el.ready;
      await new Promise((r) => requestAnimationFrame(r));
      const blob = await el.snapshot();
      return { fallback: el.hasAttribute('data-fallback'), size: blob ? blob.size : 0 };
    }, name);
    expect(detail.fallback, `${name} should not fall back`).toBe(false);
    expect(detail.size, `${name} should paint bytes`).toBeGreaterThan(0);
  });
}

// Preset-families phase 1 (classic / geometric / science / tech): every preset —
// canvas2d and WebGL (reaction-diffusion exercises the ping-pong FBO helper,
// gyroid the raymarch shader) — must not fall back and must paint bytes.
for (const name of [
  'truchet',
  'bauhaus',
  'phyllotaxis',
  'circuit',
  'reaction-diffusion',
  'gyroid',
]) {
  test(`${name} does not fall back and paints bytes`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const detail = await page.evaluate(async (n) => {
      const el = document.getElementById('wc');
      el.setAttribute('preset', n);
      await el.ready;
      await new Promise((r) => requestAnimationFrame(r));
      const blob = await el.snapshot();
      return { fallback: el.hasAttribute('data-fallback'), size: blob ? blob.size : 0 };
    }, name);
    expect(detail.fallback, `${name} should not fall back`).toBe(false);
    expect(detail.size, `${name} should paint bytes`).toBeGreaterThan(0);
  });
}

// truchet: each tiling mode loads, renders across density/seed, never falls back.
test('truchet honors each `mode` value and paints bytes', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const mode of ['arcs', 'diagonals', 'wedges', '']) {
    const detail = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', 'truchet');
      await el.ready;
      await new Promise((r) => requestAnimationFrame(r));
      const blob = await el.snapshot();
      return { fallback: el.hasAttribute('data-fallback'), size: blob.size };
    }, mode);
    expect(detail.fallback, `mode="${mode}" should not fall back`).toBe(false);
    expect(detail.size, `mode="${mode}" should paint bytes`).toBeGreaterThan(0);
  }
});

// reaction-diffusion: each density regime (spots/stripes/coral/waves) must
// settle into a painted field via staticFrame without falling back.
test('reaction-diffusion renders each density regime', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const density of ['0.1', '0.4', '0.6', '0.9']) {
    const detail = await page.evaluate(async (d) => {
      const el = document.getElementById('wc');
      el.setAttribute('preset', 'reaction-diffusion');
      el.setAttribute('density', d);
      await el.ready;
      await new Promise((r) => requestAnimationFrame(r));
      const blob = await el.snapshot();
      return { fallback: el.hasAttribute('data-fallback'), size: blob.size };
    }, density);
    expect(detail.fallback, `density=${density} should not fall back`).toBe(false);
    expect(detail.size, `density=${density} should paint bytes`).toBeGreaterThan(0);
  }
});

// Preset-families phase 2 (classic + geometric fill-out): canvas2d and WebGL
// (damask, moire) presets must not fall back and must paint bytes.
for (const name of ['de-stijl', 'meander', 'damask', 'morris', 'delaunay', 'moire', 'hilbert']) {
  test(`${name} does not fall back and paints bytes`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const detail = await page.evaluate(async (n) => {
      const el = document.getElementById('wc');
      el.setAttribute('preset', n);
      await el.ready;
      await new Promise((r) => requestAnimationFrame(r));
      const blob = await el.snapshot();
      return { fallback: el.hasAttribute('data-fallback'), size: blob ? blob.size : 0 };
    }, name);
    expect(detail.fallback, `${name} should not fall back`).toBe(false);
    expect(detail.size, `${name} should paint bytes`).toBeGreaterThan(0);
  });
}

// delaunay + hilbert: seed/density-driven layouts that must render across the
// range without falling back (delaunay runs Bowyer–Watson; hilbert scales order).
for (const preset of ['delaunay', 'hilbert']) {
  test(`${preset} renders across density and seed without erroring`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    for (const [density, seed] of [
      ['0.1', '3'],
      ['0.5', '17'],
      ['1', '88'],
    ]) {
      const detail = await page.evaluate(
        async ([p, d, s]) => {
          const el = document.getElementById('wc');
          el.setAttribute('preset', p);
          el.setAttribute('density', d);
          el.setAttribute('seed', s);
          await el.ready;
          await new Promise((r) => requestAnimationFrame(r));
          const blob = await el.snapshot();
          return { fallback: el.hasAttribute('data-fallback'), size: blob.size };
        },
        [preset, density, seed]
      );
      expect(
        detail.fallback,
        `${preset} density=${density} seed=${seed} should not fall back`
      ).toBe(false);
      expect(
        detail.size,
        `${preset} density=${density} seed=${seed} should paint bytes`
      ).toBeGreaterThan(0);
    }
  });
}
