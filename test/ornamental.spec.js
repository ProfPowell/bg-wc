// test/ornamental.spec.js
import { test, expect } from '@playwright/test';

async function loadsAndRenders(page, preset, mode) {
  await page.goto('/test/new-presets-page.html');
  return page.evaluate(
    async ([p, m]) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', p);
      await el.ready;
      const c = el.shadowRoot.querySelector('canvas');
      return {
        rendered: !!c && c.width > 0 && c.height > 0,
        fallback: el.hasAttribute('data-fallback'),
      };
    },
    [preset, mode]
  );
}

for (const mode of ['', '8fold', '12fold', '6fold']) {
  test(`girih renders for mode="${mode}"`, async ({ page }) => {
    const r = await loadsAndRenders(page, 'girih', mode);
    expect(r.rendered, `mode="${mode}" should render to canvas`).toBe(true);
    expect(r.fallback).toBe(false);
  });
}

test('girih is registered in the ornamental group', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const meta = await page.evaluate(() =>
    customElements.get('bg-wc').presets().find((p) => p.name === 'girih')
  );
  expect(meta.renderer).toBe('webgl');
  expect(meta.group).toBe('ornamental');
});
