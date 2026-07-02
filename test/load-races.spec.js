import { test, expect } from '@playwright/test';

// Async-load race regressions (gl-wc-lmp, gl-wc-se8, gl-wc-2s8, gl-wc-bm9).
// #loadCurrentPreset awaits a dynamic import(); these pin what happens when the
// element is torn down, retargeted, or errored while that import is in flight,
// and after a WebGL context loss. The common failure shape is a rAF loop (or a
// fresh WebGL context) surviving a state that should be inert.

test('disconnecting mid preset load aborts the load (no WebGL context, no rAF)', async ({
  page,
}) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    document.getElementById('wc').remove(); // quiet page: no other animation
    // Warm the module cache so the in-flight import below settles promptly.
    const warm = document.createElement('bg-wc');
    warm.setAttribute('preset', 'plasma');
    document.body.append(warm);
    await warm.ready;
    warm.remove();

    let glAfterRemove = 0;
    let removed = false;
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) {
      if (removed && typeof type === 'string' && type.includes('webgl')) glAfterRemove++;
      return orig.call(this, type, ...a);
    };
    const el = document.createElement('bg-wc');
    el.setAttribute('preset', 'plasma');
    document.body.append(el); // starts the async load
    el.remove(); // disconnect before the import settles
    removed = true;
    await new Promise((res) => setTimeout(res, 150)); // let the stale import land
    HTMLCanvasElement.prototype.getContext = orig;

    let rafCalls = 0;
    const origRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) {
      rafCalls++;
      return origRaf.call(window, cb);
    };
    await new Promise((res) => setTimeout(res, 200));
    window.requestAnimationFrame = origRaf;
    return { glAfterRemove, rafCalls };
  });
  expect(r.glAfterRemove, 'no WebGL context may be created after disconnect').toBe(0);
  expect(r.rafCalls, 'no rAF loop may run for a detached element').toBe(0);
});

test('removing the preset mid-load keeps the element inert', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    await el.ready; // initial mosaic load settles
    const warm = document.createElement('bg-wc');
    warm.setAttribute('preset', 'plasma');
    document.body.append(warm);
    await warm.ready;
    warm.remove();

    el.setAttribute('preset', 'plasma'); // load in flight…
    el.removeAttribute('preset'); // …null path must invalidate it
    await el.ready;
    await new Promise((res) => setTimeout(res, 150)); // let the stale import land
    const a = await el.snapshot();
    await new Promise((res) => setTimeout(res, 120));
    const b = await el.snapshot();
    const aBuf = a ? new Uint8Array(await a.arrayBuffer()) : null;
    const bBuf = b ? new Uint8Array(await b.arrayBuffer()) : null;
    const still =
      !aBuf || !bBuf || (aBuf.length === bBuf.length && aBuf.every((v, i) => v === bBuf[i]));
    return { preset: el.preset, fallback: el.hasAttribute('data-fallback'), still };
  });
  expect(r.preset).toBe(null);
  expect(r.fallback, 'fallback must stay visible after preset removal').toBe(true);
  expect(r.still, 'the stale load must not start rendering').toBe(true);
});

test('a failed preset switch stops the previous preset for good', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'plasma');
    await el.ready;
    let errored = false;
    el.addEventListener('bg-wc:error', () => {
      errored = true;
    });
    el.setAttribute('preset', 'definitely-not-a-real-preset');
    await el.ready;
    // Ghost animation: the plasma instance must be gone, not hidden-but-running.
    const a = await el.snapshot();
    await new Promise((res) => setTimeout(res, 120));
    const b = await el.snapshot();
    const aBuf = a ? new Uint8Array(await a.arrayBuffer()) : null;
    const bBuf = b ? new Uint8Array(await b.arrayBuffer()) : null;
    const still =
      !aBuf || !bBuf || (aBuf.length === bBuf.length && aBuf.every((v, i) => v === bBuf[i]));
    // Resurface: a motion toggle must not clear the fallback of a failed element.
    el.setAttribute('motion', 'force');
    const resurfaced = !el.hasAttribute('data-fallback');
    return { errored, fallback: !resurfaced, still };
  });
  expect(r.errored).toBe(true);
  expect(r.still, 'the previous preset must stop animating after a failed switch').toBe(true);
  expect(r.fallback, 'a motion toggle must not resurface a failed element').toBe(true);
});

test('a failed context init leaves no orphan rAF loop', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    document.getElementById('wc').remove(); // quiet page: no other animation
    const el = document.createElement('bg-wc');
    el.setAttribute('preset', 'particles'); // canvas2d — unaffected by the webgl patch
    document.body.append(el);
    await el.ready;

    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) {
      if (typeof type === 'string' && type.includes('webgl')) return null;
      return orig.call(this, type, ...a);
    };
    el.setAttribute('preset', 'plasma'); // webgl — context creation fails
    await el.ready;
    HTMLCanvasElement.prototype.getContext = orig;

    let rafCalls = 0;
    const origRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) {
      rafCalls++;
      return origRaf.call(window, cb);
    };
    await new Promise((res) => setTimeout(res, 200));
    window.requestAnimationFrame = origRaf;
    return { fallback: el.hasAttribute('data-fallback'), rafCalls };
  });
  expect(r.fallback).toBe(true);
  expect(r.rafCalls, 'the old rAF loop must be cancelled on a failed context init').toBe(0);
});

test('after webgl context loss, playback does not restart against the dead context', async ({
  page,
}) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    document.getElementById('wc').remove(); // quiet page: no other animation
    const el = document.createElement('bg-wc');
    el.setAttribute('preset', 'plasma');
    document.body.append(el);
    await el.ready;

    const canvas = el.shadowRoot.querySelector('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const lost = new Promise((res) => el.addEventListener('bg-wc:error', res, { once: true }));
    gl.getExtension('WEBGL_lose_context').loseContext();
    await lost;

    // A motion toggle must not unhide the dead canvas…
    el.setAttribute('motion', 'force');
    const resurfaced = !el.hasAttribute('data-fallback');
    el.removeAttribute('motion');
    // …and a play trigger must not restart the rAF loop.
    el.setAttribute('paused', '');
    el.removeAttribute('paused');
    let rafCalls = 0;
    const origRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = function (cb) {
      rafCalls++;
      return origRaf.call(window, cb);
    };
    await new Promise((res) => setTimeout(res, 200));
    window.requestAnimationFrame = origRaf;
    return { resurfaced, rafCalls, fallback: el.hasAttribute('data-fallback') };
  });
  expect(r.resurfaced, 'a motion toggle must not resurface a lost-context canvas').toBe(false);
  expect(r.rafCalls, 'no rAF may run against a lost context').toBe(0);
  expect(r.fallback).toBe(true);
});
