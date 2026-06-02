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
