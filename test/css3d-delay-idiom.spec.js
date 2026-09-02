import { test, expect } from '@playwright/test';

// css3d delay idiom (gl-wc-7pkh): negative animation-delays are phase offsets,
// so they must be expressed as a FRACTION of the (speed-scaled) duration —
// `calc(var(--dur) * -frac)` — never as fixed seconds. A fixed-second delay
// drifts to a different phase whenever `speed` rescales the duration, so a
// preset's resting composition would depend on speed. Assert the
// delay/duration ratio of every animated node is speed-invariant.

const CASES = {
  chamber: ['.room', '.glow'],
  carousel: ['.tilt', '.ring'],
  skyline: ['.world'],
  satellites: ['.system', '.spin'],
  shards: ['.cloud', '.shard'],
  explode: ['.particle::before'],
  'fly-through': ['.scene'],
  gyroscope: ['.ring'],
  monolith: ['.spin'],
  'cube-wave': ['.bob'],
};

for (const [preset, selectors] of Object.entries(CASES)) {
  test(`${preset}: animation phase (delay/duration) is speed-invariant`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const r = await page.evaluate(
      async ({ preset, selectors }) => {
        const el = document.getElementById('wc');
        if (preset === 'fly-through') el.setAttribute('mode', 'fly');
        el.setAttribute('preset', preset);
        await el.ready;
        const settle = () =>
          new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
        const first = (v) => parseFloat(String(v).split(',')[0]);
        const ratios = () =>
          selectors.map((sel) => {
            const [s, pseudo] = sel.split('::');
            const node = el.shadowRoot.querySelector(s);
            const cs = getComputedStyle(node, pseudo ? `::${pseudo}` : null);
            const d = first(cs.animationDuration);
            return d ? first(cs.animationDelay) / d : 0;
          });
        el.setAttribute('speed', '1');
        await settle();
        const at1 = ratios();
        el.setAttribute('speed', '3');
        await settle();
        const at3 = ratios();
        return { at1, at3 };
      },
      { preset, selectors }
    );
    for (let i = 0; i < selectors.length; i++) {
      expect(r.at1[i], `${selectors[i]} should carry a phase offset`).not.toBe(0);
      expect(r.at3[i], `${selectors[i]} phase drifted with speed`).toBeCloseTo(r.at1[i], 3);
    }
  });
}
