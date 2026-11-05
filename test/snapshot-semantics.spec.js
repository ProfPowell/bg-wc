import { test, expect } from '@playwright/test';

// gl-wc-bfsy: snapshot() is OBSERVATIONAL and every runtime surface (snapshot,
// resize, css3d setPlaying) fails through the one error boundary (#fail): no
// swallowed throw returning stale pixels, no TypeError from a non-canvas layer.
//
// Contract pinned here (documented in docs/api.html, Methods):
//   - Blob (PNG) for a live canvas renderer; re-renders the current time, which
//     since gl-wc-beh4 never advances a preset's state.
//   - null when there is nothing to capture: css3d, no preset, preset removed,
//     failed load, disconnected, lost context.
//   - rejects (and the element goes inert with one bg-wc:error) if the
//     re-render throws.

const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// Arm the canvas2d clearRect to throw (every canvas2d preset clears per frame);
// returns the disarm function. Evaluated in-page.
const ARM = `
  const orig = CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect = function () { throw new Error('boom'); };
  return () => { CanvasRenderingContext2D.prototype.clearRect = orig; };
`;

test('snapshot() does not advance a stateful simulation', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('seed', '5');
    el.setAttribute('preset', 'boids');
    await el.ready;
    await new Promise((res) => setTimeout(res, 120));
    el.pause();
    await new Promise((res) => requestAnimationFrame(res));
    const out = [];
    for (let i = 0; i < 3; i++) out.push(new Uint8Array(await (await el.snapshot()).arrayBuffer()));
    return out.map((u) => Array.from(u));
  });
  expect(same(r[0], r[1]), 'two snapshots of a paused flock must be identical').toBe(true);
  expect(same(r[1], r[2])).toBe(true);
});

test('snapshot() resolves null when there is nothing to capture', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const out = {};
    const fresh = document.createElement('bg-wc');
    out.disconnected = await fresh.snapshot();
    document.body.appendChild(fresh);
    out.noPreset = await fresh.snapshot();
    fresh.remove();

    const el = document.getElementById('wc');
    el.setAttribute('preset', 'monolith'); // css3d
    await el.ready;
    out.css3d = await el.snapshot();
    // Layer is still the css3d stage <div> here — must not TypeError on toBlob.
    el.removeAttribute('preset');
    await el.ready;
    try {
      out.removedAfterCss3d = await el.snapshot();
    } catch (e) {
      out.removedAfterCss3d = `threw: ${e}`;
    }
    el.setAttribute('preset', 'definitely-not-a-preset');
    await el.ready;
    out.failed = await el.snapshot();
    el.setAttribute('preset', 'conic');
    await el.ready;
    out.recovered = (await el.snapshot()) instanceof Blob;
    return out;
  });
  expect(r.disconnected).toBe(null);
  expect(r.noPreset).toBe(null);
  expect(r.css3d).toBe(null);
  expect(r.removedAfterCss3d).toBe(null);
  expect(r.failed).toBe(null);
  expect(r.recovered, 'a live canvas preset yields a Blob again').toBe(true);
});

test('a throw during the snapshot re-render rejects and leaves the element inert', async ({
  page,
}) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async (arm) => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'embers');
    await el.ready;
    el.pause();
    await new Promise((res) => requestAnimationFrame(res));
    const errors = [];
    el.addEventListener('bg-wc:error', (e) => errors.push(e.detail.phase));
    const disarm = new Function(arm)();
    let rejected = null;
    try {
      await el.snapshot();
    } catch (e) {
      rejected = String(e.message || e);
    }
    disarm();
    const fallback = el.hasAttribute('data-fallback');
    // Inert: a later snapshot is null, resume does not resurrect.
    el.resume();
    await new Promise((res) => setTimeout(res, 100));
    const later = await el.snapshot();
    return { rejected, errors, fallback, later, stillFallback: el.hasAttribute('data-fallback') };
  }, ARM);
  expect(r.rejected).toMatch(/boom/);
  expect(r.errors).toEqual(['runtime']);
  expect(r.fallback).toBe(true);
  expect(r.later).toBe(null);
  expect(r.stillFallback).toBe(true);
});

test('a throw from the preset resize() flows through the error boundary', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'oscilloscope'); // resize() deletes its texture
    await el.ready;
    const errors = [];
    el.addEventListener('bg-wc:error', (e) =>
      errors.push(`${e.detail.phase}:${e.detail.error?.message}`)
    );
    const proto = WebGL2RenderingContext.prototype;
    const orig = proto.deleteTexture;
    proto.deleteTexture = function () {
      throw new Error('resize boom');
    };
    el.style.width = '333px';
    el.style.height = '222px';
    await new Promise((res) => setTimeout(res, 200));
    proto.deleteTexture = orig;
    return { errors, fallback: el.hasAttribute('data-fallback'), snap: await el.snapshot() };
  });
  expect(r.errors).toEqual(['runtime:resize boom']);
  expect(r.fallback).toBe(true);
  expect(r.snap).toBe(null);
});

test('a throw from css3d setPlaying() flows through the error boundary', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'monolith');
    await el.ready;
    const errors = [];
    el.addEventListener('bg-wc:error', (e) =>
      errors.push(`${e.detail.phase}:${e.detail.error?.message}`)
    );
    const stage = el.shadowRoot.querySelector('.stage');
    stage.setAttribute = () => {
      throw new Error('playing boom');
    };
    el.pause();
    await new Promise((res) => setTimeout(res, 50));
    return { errors, fallback: el.hasAttribute('data-fallback') };
  });
  expect(r.errors).toEqual(['runtime:playing boom']);
  expect(r.fallback).toBe(true);
});
