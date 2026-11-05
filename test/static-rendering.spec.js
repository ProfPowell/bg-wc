import { test, expect } from '@playwright/test';

// gl-wc-6efd: when playback is inactive (paused, reduced motion, speed=0) the
// element must still show a correct STILL: a resize redraws instead of leaving
// the cleared canvas, a parameter change re-renders, speed=0 schedules no rAF
// and freezes css3d motion, and resuming is reliable.
//
// Pixels are read straight from the shadow <canvas> (its own 2d context) so a
// cleared canvas is observed as-is — snapshot() re-renders and would mask it.

const READ = `
  const canvasPx = (el) => {
    const c = el.shadowRoot.querySelector('canvas');
    const ctx = c.getContext('2d');
    return { w: c.width, h: c.height, px: Array.from(ctx.getImageData(0, 0, c.width, c.height).data) };
  };
  const distinct = (px) => {
    const s = new Set();
    for (let i = 0; i < px.length; i += 4) s.add((px[i] << 24) | (px[i + 1] << 16) | (px[i + 2] << 8) | px[i + 3]);
    return s.size;
  };
  const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const frame = () => new Promise((res) => requestAnimationFrame(res));
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
`;

// Count every rAF the page schedules (installed before the element exists).
const COUNT_RAF = `
  window.__raf = 0;
  const orig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { window.__raf++; return orig(cb); };
`;

test('a resize while paused redraws a still instead of leaving a cleared canvas', async ({
  page,
}) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async (read) => {
    const { canvasPx, distinct, frame, sleep } = new Function(
      read + 'return { canvasPx, distinct, frame, sleep };'
    )();
    const el = document.getElementById('wc');
    el.setAttribute('seed', '3');
    el.setAttribute('preset', 'boids');
    await el.ready;
    el.pause();
    await frame();
    const before = canvasPx(el);
    el.style.width = '260px';
    el.style.height = '190px';
    await sleep(150); // ResizeObserver + redraw
    const after = canvasPx(el);
    return {
      beforeDistinct: distinct(before.px),
      resized: after.w !== before.w || after.h !== before.h,
      afterDistinct: distinct(after.px),
    };
  }, READ);
  expect(r.beforeDistinct).toBeGreaterThan(1);
  expect(r.resized, 'the backing store was resized').toBe(true);
  expect(r.afterDistinct, 'a redrawn still, not a cleared canvas').toBeGreaterThan(1);
});

test('a parameter change while paused re-renders the still', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async (read) => {
    const { canvasPx, eq, frame } = new Function(read + 'return { canvasPx, eq, frame };')();
    const el = document.getElementById('wc');
    el.setAttribute('seed', '3');
    el.setAttribute('intensity', '0.1');
    el.setAttribute('preset', 'boids'); // intensity = streak length
    await el.ready;
    el.pause();
    await frame();
    const a = canvasPx(el).px;
    el.setAttribute('intensity', '1');
    await frame();
    const b = canvasPx(el).px;
    return { changed: !eq(a, b) };
  }, READ);
  expect(r.changed, 'intensity change must be visible while paused').toBe(true);
});

test('a parameter change under reduced motion re-renders the static frame', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async (read) => {
    const { canvasPx, eq, frame } = new Function(read + 'return { canvasPx, eq, frame };')();
    const el = document.getElementById('wc');
    el.setAttribute('seed', '3');
    el.setAttribute('intensity', '0.1');
    el.setAttribute('motion', 'reduce');
    el.setAttribute('preset', 'boids');
    await el.ready;
    await frame();
    const a = canvasPx(el).px;
    el.setAttribute('intensity', '1');
    await frame();
    const b = canvasPx(el).px;
    return { changed: !eq(a, b), fallback: el.hasAttribute('data-fallback') };
  }, READ);
  expect(r.fallback).toBe(false);
  expect(r.changed, 'intensity change must refresh the reduced-motion still').toBe(true);
});

test('speed=0 stops the rAF loop and resuming restarts it', async ({ page }) => {
  await page.addInitScript(COUNT_RAF);
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async (read) => {
    const { sleep } = new Function(read + 'return { sleep };')();
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'particles');
    await el.ready;
    await sleep(100);
    const runningDelta = window.__raf;
    el.setAttribute('speed', '0');
    await sleep(100); // let any already-queued frame drain
    const n1 = window.__raf;
    await sleep(250);
    const n2 = window.__raf;
    el.setAttribute('speed', '1');
    await sleep(250);
    const n3 = window.__raf;
    const bytes = async () => new Uint8Array(await (await el.snapshot()).arrayBuffer());
    const a = await bytes();
    await sleep(150);
    const b = await bytes();
    const moving = !(a.length === b.length && a.every((v, i) => v === b[i]));
    return { runningDelta, idle: n2 - n1, resumed: n3 - n2, moving };
  }, READ);
  expect(r.runningDelta).toBeGreaterThan(0);
  expect(r.idle, 'no rAF scheduled while speed=0').toBe(0);
  expect(r.resumed, 'loop restarts when speed returns').toBeGreaterThan(5);
  expect(r.moving, 'frames advance again after resuming').toBe(true);
});

test('speed=0 freezes css3d motion and resuming releases it', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'monolith');
    await el.ready;
    const stage = () => el.shadowRoot.querySelector('.stage').getAttribute('data-playing');
    const playing = stage();
    el.setAttribute('speed', '0');
    await new Promise((res) => requestAnimationFrame(res));
    const frozen = stage();
    el.setAttribute('speed', '0.5');
    await new Promise((res) => requestAnimationFrame(res));
    const released = stage();
    return { playing, frozen, released };
  });
  expect(r.playing).toBe('1');
  expect(r.frozen).toBe('0');
  expect(r.released).toBe('1');
});

test('pause/resume and speed toggles compose without a stuck loop', async ({ page }) => {
  await page.addInitScript(COUNT_RAF);
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async (read) => {
    const { sleep } = new Function(read + 'return { sleep };')();
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'particles');
    await el.ready;
    el.setAttribute('speed', '0');
    el.pause();
    await sleep(50);
    el.setAttribute('speed', '1'); // still paused → must stay idle
    await sleep(100);
    const n1 = window.__raf;
    await sleep(200);
    const idleWhilePaused = window.__raf - n1;
    el.resume();
    await sleep(250);
    const resumed = window.__raf - n1;
    return { idleWhilePaused, resumed };
  }, READ);
  expect(r.idleWhilePaused).toBe(0);
  expect(r.resumed).toBeGreaterThan(5);
});
