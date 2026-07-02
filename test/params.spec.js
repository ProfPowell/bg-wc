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
