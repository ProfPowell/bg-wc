import { test, expect } from '@playwright/test';

// Targeted lifecycle regressions (gl-wc-t8b). The happy path is covered by the
// per-preset render suite; these pin the error / teardown transitions.

test('removing the preset attribute settles ready and surfaces the fallback', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    let changedTo = 'unset';
    el.addEventListener('bg-wc:preset-changed', (e) => {
      changedTo = e.detail.to;
    });
    el.setAttribute('preset', 'plasma');
    await el.ready;
    el.removeAttribute('preset');
    await el.ready; // must settle, not hang
    // Rendering stopped: two snapshots a beat apart are byte-identical.
    const a = await el.snapshot();
    await new Promise((res) => setTimeout(res, 120));
    const b = await el.snapshot();
    const aBuf = a ? new Uint8Array(await a.arrayBuffer()) : null;
    const bBuf = b ? new Uint8Array(await b.arrayBuffer()) : null;
    const still =
      !aBuf || !bBuf || (aBuf.length === bBuf.length && aBuf.every((v, i) => v === bBuf[i]));
    return { preset: el.preset, fallback: el.hasAttribute('data-fallback'), changedTo, still };
  });
  expect(r.preset).toBe(null);
  expect(r.fallback).toBe(true);
  expect(r.changedTo).toBe(null); // preset-changed fired from plasma → null
  expect(r.still, 'RAF should have stopped — frames no longer change').toBe(true);
});

test('re-adding a preset after removal recovers (no stuck state)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const ok = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'plasma');
    await el.ready;
    el.removeAttribute('preset');
    await el.ready;
    el.setAttribute('preset', 'conic');
    await el.ready;
    return !el.hasAttribute('data-fallback');
  });
  expect(ok).toBe(true);
});

test('an unknown preset settles ready and falls back', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    let errored = false;
    el.addEventListener('bg-wc:error', () => {
      errored = true;
    });
    el.setAttribute('preset', 'definitely-not-a-real-preset');
    await el.ready; // must settle, not hang
    return { fallback: el.hasAttribute('data-fallback'), errored };
  });
  expect(r.fallback).toBe(true);
  expect(r.errored).toBe(true);
});

test('an unavailable rendering context settles ready and falls back', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    // Force WebGL context creation to fail.
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) {
      if (typeof type === 'string' && type.includes('webgl')) return null;
      return orig.call(this, type, ...a);
    };
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'plasma'); // a WebGL preset
    await el.ready; // must settle, not hang
    HTMLCanvasElement.prototype.getContext = orig;
    return { fallback: el.hasAttribute('data-fallback') };
  });
  expect(r.fallback).toBe(true);
});
