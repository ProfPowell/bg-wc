import { test, expect } from '@playwright/test';

// gl-wc-pu1: params set via --bg-wc-* CSS vars must respect the same clamps as
// their attribute equivalents (speed 0..5, intensity/density 0..1). Pinned via
// the one observable a stray stylesheet value makes obvious: a negative speed
// must clamp to 0 (frozen time), not run the animation backwards.

test('--bg-wc-speed is clamped like the speed attribute', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.style.setProperty('--bg-wc-speed', '-5'); // out of contract: clamps to 0
    el.setAttribute('preset', 'plasma');
    await el.ready;
    await new Promise((res) => setTimeout(res, 100)); // let the rAF loop run
    const a = await el.snapshot();
    await new Promise((res) => setTimeout(res, 120));
    const b = await el.snapshot();
    const aBuf = new Uint8Array(await a.arrayBuffer());
    const bBuf = new Uint8Array(await b.arrayBuffer());
    return aBuf.length === bBuf.length && aBuf.every((v, i) => v === bBuf[i]);
  });
  expect(r, 'a negative CSS-var speed must clamp to 0 (frozen), not animate').toBe(true);
});

// gl-wc-7bzy: pixel-ratio (attribute and --bg-wc-pixel-ratio) must be clamped
// like every other numeric param — a stray stylesheet value must not allocate
// a colossal backing store (high side) or a degenerate 1px one (low side).
test('pixel-ratio inputs are clamped to a sane range', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.style.setProperty('--bg-wc-pixel-ratio', '50');
    el.setAttribute('preset', 'plasma'); // fresh load applies the CSS var
    await el.ready;
    const canvas = el.shadowRoot.querySelector('canvas');
    const highW = canvas.width;
    el.style.removeProperty('--bg-wc-pixel-ratio');
    el.setAttribute('pixel-ratio', '0'); // attribute change triggers #resize
    const lowW = canvas.width;
    return { highW, lowW, cssW: el.getBoundingClientRect().width };
  });
  expect(r.highW, 'an absurd CSS-var pixel-ratio must clamp down').toBeLessThanOrEqual(r.cssW * 8);
  expect(r.lowW, 'a zero pixel-ratio attribute must clamp up').toBeGreaterThanOrEqual(
    r.cssW * 0.25
  );
});
