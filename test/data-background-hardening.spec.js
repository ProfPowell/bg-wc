import { test, expect } from '@playwright/test';

// Binder hardening (gl-wc-ff9s): forwarded params come from an explicit
// allowlist (no on*/style/class smuggling), the injected element heals when a
// framework re-render removes it, param attributes reconcile live, and
// stopWatching() cancels the queued startup.

test('only allowlisted data-background-* params reach the injected element', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => {
    if (m.type() === 'warning') warnings.push(m.text());
  });
  await page.goto('/test/data-background-page.html');
  const r = await page.evaluate(() => {
    const w = document.querySelector('#inject > bg-wc[data-bg-element]');
    return w
      ? {
          intensity: w.getAttribute('intensity'),
          onclick: w.hasAttribute('onclick'),
          style: w.getAttribute('style'),
          className: w.getAttribute('class'),
          srcdoc: w.hasAttribute('srcdoc'),
          id: w.getAttribute('id'),
          bogus: w.hasAttribute('bogus'),
          pwned: window.__pwned,
        }
      : null;
  });
  expect(r, 'the host still binds').not.toBeNull();
  expect(r.intensity).toBe('0.3');
  expect(r.onclick, 'on* handlers must never be forwarded').toBe(false);
  expect(r.style ?? '').not.toContain('red');
  expect(r.className).toBeNull();
  expect(r.srcdoc).toBe(false);
  expect(r.id).toBeNull();
  expect(r.bogus, 'unknown params are dropped').toBe(false);
  expect(r.pwned).toBeUndefined();
  expect(
    warnings.some((w) => w.includes('onclick')),
    'rejected names are warned about'
  ).toBe(true);
});

test('the same allowlist applies to the data-bg spelling', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const r = await page.evaluate(() => {
    const w = document.querySelector('#inject-short > bg-wc[data-bg-element]');
    return w
      ? {
          intensity: w.getAttribute('intensity'),
          onclick: w.hasAttribute('onclick'),
          style: w.getAttribute('style'),
          className: w.getAttribute('class'),
          srcdoc: w.hasAttribute('srcdoc'),
        }
      : null;
  });
  expect(r).toEqual({
    intensity: '0.2',
    onclick: false,
    style: null,
    className: null,
    srcdoc: false,
  });
});

test('the allowlist is exported and excludes handler/style/class attributes', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const r = await page.evaluate(async () => {
    const m = await import('/src/data-background.js');
    const list = m.BINDER_PARAM_ATTRS;
    return {
      isArray: Array.isArray(list),
      hasIntensity: list.includes('intensity'),
      hasText: list.includes('text'),
      hasColor1: list.includes('color-1'),
      hasPreset: list.includes('preset'),
      hasOnclick: list.includes('onclick'),
      hasStyle: list.includes('style'),
      hasClass: list.includes('class'),
    };
  });
  expect(r).toEqual({
    isArray: true,
    hasIntensity: true,
    hasText: true,
    hasColor1: true,
    hasPreset: false,
    hasOnclick: false,
    hasStyle: false,
    hasClass: false,
  });
});

test('a removed injected element is re-injected while the host stays annotated', async ({
  page,
}) => {
  await page.goto('/test/data-background-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('static');
    const w = () => el.querySelector(':scope > bg-wc[data-bg-element]');
    const first = w();
    first.remove(); // framework re-render dropped our child
    await tickFn();
    const healed = w();
    // Replacement (not just removal) heals too.
    healed.replaceWith(document.createElement('span'));
    await tickFn();
    const healedAgain = w();
    return {
      healed: !!healed && healed !== first,
      preset: healed?.getAttribute('preset'),
      intensity: healed?.getAttribute('intensity'),
      healedAgain: !!healedAgain && healedAgain !== healed,
      count: el.querySelectorAll(':scope > bg-wc').length,
    };
    function tickFn() {
      return new Promise((res) => setTimeout(res, 0));
    }
  });
  expect(r.healed, 'the binder must re-inject after removal').toBe(true);
  expect(r.preset).toBe('dither');
  expect(r.intensity).toBe('0.7');
  expect(r.healedAgain, 'replacement heals too').toBe(true);
  expect(r.count).toBe(1);
});

test('unbinding does not trigger healing (removal is intentional)', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('static');
    el.removeAttribute('data-background');
    await new Promise((res) => setTimeout(res, 0));
    await new Promise((res) => setTimeout(res, 20));
    return el.querySelectorAll(':scope > bg-wc').length;
  });
  expect(r).toBe(0);
});

test('param attributes reconcile live on the injected element', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const r = await page.evaluate(async () => {
    const tick = () => new Promise((res) => setTimeout(res, 0));
    const el = document.getElementById('static');
    const w = el.querySelector(':scope > bg-wc[data-bg-element]');
    el.setAttribute('data-background-intensity', '0.9');
    await tick();
    const changed = w.getAttribute('intensity');
    el.removeAttribute('data-background-intensity');
    await tick();
    const removed = w.hasAttribute('intensity');
    el.dataset.backgroundSpeed = '0.25'; // dataset edits are attribute edits
    await tick();
    const viaDataset = w.getAttribute('speed');
    el.setAttribute('data-background-color-1', 'rgb(9, 9, 9)');
    await tick();
    const color = w.style.getPropertyValue('--bg-wc-color-1');
    el.removeAttribute('data-background-color-1');
    await tick();
    const colorGone = w.style.getPropertyValue('--bg-wc-color-1');
    el.setAttribute('data-background-onclick', 'window.__pwned = 1');
    await tick();
    const injected = w.hasAttribute('onclick');
    return { changed, removed, viaDataset, color, colorGone, injected };
  });
  expect(r).toEqual({
    changed: '0.9',
    removed: false,
    viaDataset: '0.25',
    color: 'rgb(9, 9, 9)',
    colorGone: '',
    injected: false,
  });
});

test('data-bg-* params reconcile live too', async ({ page }) => {
  await page.goto('/test/data-background-page.html');
  const r = await page.evaluate(async () => {
    const tick = () => new Promise((res) => setTimeout(res, 0));
    const el = document.getElementById('short');
    const w = el.querySelector(':scope > bg-wc[data-bg-element]');
    el.setAttribute('data-bg-intensity', '0.8');
    await tick();
    const changed = w.getAttribute('intensity');
    el.setAttribute('data-bg-color-2', 'rgb(7, 7, 7)');
    await tick();
    const color = w.style.getPropertyValue('--bg-wc-color-2');
    return { changed, color };
  });
  expect(r).toEqual({ changed: '0.8', color: 'rgb(7, 7, 7)' });
});

// The binder queues its startup on DOMContentLoaded only while the document is
// still parsing. Module scripts are deferred (readyState is already
// "interactive" when they run), so pin readyState to "loading" to exercise that
// path deterministically; the ?keep control proves the override does so.
const FORCE_LOADING = `Object.defineProperty(document, 'readyState', {
  configurable: true,
  get: () => 'loading',
});`;

test('control: the queued startup binds on DOMContentLoaded when left alone', async ({ page }) => {
  await page.addInitScript(FORCE_LOADING);
  await page.goto('/test/data-background-cancel-page.html?keep');
  const bound = await page.evaluate(async () => {
    await new Promise((res) => setTimeout(res, 20));
    return !!document.querySelector('#host > bg-wc[data-bg-element]');
  });
  expect(bound).toBe(true);
});

test('stopWatching() before DOMContentLoaded cancels the queued startup', async ({ page }) => {
  await page.addInitScript(FORCE_LOADING);
  await page.goto('/test/data-background-cancel-page.html');
  const r = await page.evaluate(async () => {
    const host = document.getElementById('host');
    const w = () => host.querySelector(':scope > bg-wc[data-bg-element]');
    await new Promise((res) => setTimeout(res, 20));
    const autoBound = !!w();
    // Nor does the observer run: a late annotation stays unbound.
    const late = document.createElement('div');
    late.setAttribute('data-background', 'dither');
    document.body.appendChild(late);
    await new Promise((res) => setTimeout(res, 20));
    const lateBound = !!late.querySelector(':scope > bg-wc');
    // The manual path still works, and is idempotent.
    window.__binder.bindDataBackgrounds();
    window.__binder.bindDataBackgrounds();
    const manual = host.querySelectorAll(':scope > bg-wc[data-bg-element]').length;
    return { autoBound, lateBound, manual };
  });
  expect(r).toEqual({ autoBound: false, lateBound: false, manual: 1 });
});
