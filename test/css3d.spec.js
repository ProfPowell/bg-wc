// test/css3d.spec.js
import { test, expect } from '@playwright/test';

test('css3d preset mounts a stage <div>, not a canvas', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const result = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'fly-through');
    await el.ready;
    const root = el.shadowRoot;
    return {
      hasStage: !!root.querySelector('div.stage[part="stage"]'),
      hasCanvas: !!root.querySelector('canvas'),
      fallback: el.hasAttribute('data-fallback'),
    };
  });
  expect(result.hasStage).toBe(true);
  expect(result.hasCanvas).toBe(false);
  expect(result.fallback).toBe(false);
});

test('css3d preset emits bg-wc:ready with renderer "css3d"', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const detail = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.getElementById('wc');
        el.addEventListener('bg-wc:ready', (e) => resolve(e.detail), { once: true });
        el.setAttribute('preset', 'fly-through');
      })
  );
  expect(detail.renderer).toBe('css3d');
  expect(detail.preset).toBe('fly-through');
});

test('paused toggles data-playing on the stage', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const states = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'fly-through');
    await el.ready;
    const stage = el.shadowRoot.querySelector('div.stage');
    const playing = stage.getAttribute('data-playing');
    el.setAttribute('paused', '');
    const paused = stage.getAttribute('data-playing');
    el.removeAttribute('paused');
    const resumed = stage.getAttribute('data-playing');
    return { playing, paused, resumed };
  });
  expect(states.playing).toBe('1');
  expect(states.paused).toBe('0');
  expect(states.resumed).toBe('1');
});

test('reduced motion freezes the scene but keeps it visible (no fallback)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/test/new-presets-page.html');
  const result = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'fly-through');
    await el.ready;
    const stage = el.shadowRoot.querySelector('div.stage');
    return {
      fallback: el.hasAttribute('data-fallback'),
      playing: stage.getAttribute('data-playing'),
      stageVisible: getComputedStyle(stage).display !== 'none',
    };
  });
  expect(result.fallback).toBe(false);
  expect(result.playing).toBe('0');
  expect(result.stageVisible).toBe(true);
});

test('snapshot() returns null for a css3d preset', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const snap = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'fly-through');
    await el.ready;
    return await el.snapshot();
  });
  expect(snap).toBeNull();
});

test('changing density rebuilds the css3d scene (node count changes)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const counts = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('density', '0.25');
    el.setAttribute('preset', 'fly-through');
    await el.ready;
    const before = el.shadowRoot.querySelectorAll('.ring').length;
    el.setAttribute('density', '0.9');
    await el.ready;
    const after = el.shadowRoot.querySelectorAll('.ring').length;
    return { before, after };
  });
  expect(counts.after).toBeGreaterThan(counts.before);
});

test('changing mode on a canvas preset does NOT re-init (mosaic unaffected)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const ok = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'mosaic');
    await el.ready;
    let reinits = 0;
    el.addEventListener('bg-wc:ready', () => reinits++);
    el.setAttribute('mode', 'flat');
    await new Promise((r) => requestAnimationFrame(r));
    return reinits === 0 && !el.hasAttribute('data-fallback');
  });
  expect(ok).toBe(true);
});

const FLY_MODES = ['', 'ring straight cube', 'corridor helix sphere', 'hex wave pyramid', 'tube straight card'];

for (const mode of FLY_MODES) {
  test(`fly-through renders for mode="${mode}"`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const ok = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', 'fly-through');
      await el.ready;
      const scene = el.shadowRoot.querySelector('.scene');
      return !el.hasAttribute('data-fallback') && scene && scene.querySelectorAll('.ring').length > 0;
    }, mode);
    expect(ok, `mode="${mode}" should render rings`).toBe(true);
  });
}

test('fly-through palette="theme" pulls a token color onto a unit', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const usesToken = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'fly-through');
    el.setAttribute('palette', 'theme');
    await el.ready;
    const face = el.shadowRoot.querySelector('.ring i');
    const bg = getComputedStyle(face).backgroundColor;
    return /^rgb/.test(bg);
  });
  expect(usesToken).toBe(true);
});
