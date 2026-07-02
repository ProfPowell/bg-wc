import { test, expect } from '@playwright/test';

// data-background binder coverage + dynamic-attribute regressions (gl-wc-sbe).
// The binder must track the attribute through its whole lifecycle: initial
// scan, params mapping, skip opt-out, dynamically added nodes, late
// annotation, value changes, and removal.

test('initial scan binds and maps params (attrs + color vars)', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const r = await page.evaluate(() => {
    const w = document.querySelector('#static > bg-wc[data-bg-element]');
    return w
      ? {
          preset: w.getAttribute('preset'),
          intensity: w.getAttribute('intensity'),
          color1: w.style.getPropertyValue('--bg-wc-color-1'),
        }
      : null;
  });
  expect(r).toEqual({ preset: 'dither', intensity: '0.7', color1: 'rgb(1, 2, 3)' });
});

test('data-background-skip opts an element out', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const bound = await page.evaluate(() => !!document.querySelector('#skip > bg-wc'));
  expect(bound).toBe(false);
});

test('dynamically added annotated nodes are bound', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const bound = await page.evaluate(async () => {
    const el = document.createElement('div');
    el.setAttribute('data-background', 'dither');
    document.body.appendChild(el);
    await new Promise((res) => setTimeout(res, 0));
    return !!el.querySelector(':scope > bg-wc[data-bg-element]');
  });
  expect(bound).toBe(true);
});

test('setting data-background on an existing element binds it', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const bound = await page.evaluate(async () => {
    const el = document.getElementById('plain');
    el.setAttribute('data-background', 'dither');
    await new Promise((res) => setTimeout(res, 0));
    return !!el.querySelector(':scope > bg-wc[data-bg-element]');
  });
  expect(bound).toBe(true);
});

test('changing the data-background value re-points the injected preset', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const preset = await page.evaluate(async () => {
    const el = document.getElementById('static');
    el.setAttribute('data-background', 'conic');
    await new Promise((res) => setTimeout(res, 0));
    return el.querySelector(':scope > bg-wc[data-bg-element]')?.getAttribute('preset');
  });
  expect(preset).toBe('conic');
});

test('removing data-background unbinds and removes the injected element', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('static');
    el.removeAttribute('data-background');
    await new Promise((res) => setTimeout(res, 0));
    const gone = !el.querySelector(':scope > bg-wc');
    // and re-adding later binds again (no stale WeakSet entry)
    el.setAttribute('data-background', 'dither');
    await new Promise((res) => setTimeout(res, 0));
    const rebound = !!el.querySelector(':scope > bg-wc[data-bg-element]');
    return { gone, rebound };
  });
  expect(r.gone, 'the injected bg-wc must be removed with the attribute').toBe(true);
  expect(r.rebound, 're-annotating must bind again').toBe(true);
});

test('binder defaults yield to unlayered author rules (positioned hosts)', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const r = await page.evaluate(async () => {
    const style = document.createElement('style');
    style.textContent =
      'layer-host { display: block; position: absolute; left: 40px; top: 30px; width: 120px; height: 80px; }';
    document.head.appendChild(style);
    const el = document.createElement('layer-host');
    el.setAttribute('data-background', 'dither');
    document.body.appendChild(el);
    await new Promise((res) => setTimeout(res, 0));
    const w = el.querySelector(':scope > bg-wc[data-bg-element]');
    const r1 = el.getBoundingClientRect();
    const r2 = w?.getBoundingClientRect();
    return {
      position: getComputedStyle(el).position,
      hostRect: [r1.x, r1.y, r1.width, r1.height],
      layerFills: !!r2 && Math.abs(r2.width - r1.width) < 1 && Math.abs(r2.height - r1.height) < 1,
    };
  });
  // The author said absolute; the binder's defaults must not override that.
  expect(r.position).toBe('absolute');
  expect(r.hostRect).toEqual([40, 30, 120, 80]);
  expect(r.layerFills, 'injected layer must still fill the host').toBe(true);
});
