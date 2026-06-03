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

test('mandala renders to canvas', async ({ page }) => {
  const r = await loadsAndRenders(page, 'mandala', '');
  expect(r.rendered).toBe(true);
  expect(r.fallback).toBe(false);
});

test('mandala is registered in the ornamental group', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const meta = await page.evaluate(() =>
    customElements.get('bg-wc').presets().find((p) => p.name === 'mandala')
  );
  expect(meta.renderer).toBe('webgl');
  expect(meta.group).toBe('ornamental');
});

for (const mode of ['', 'mixed', 'boomerangs', 'starbursts', 'harlequin']) {
  test(`atomic renders for mode="${mode}"`, async ({ page }) => {
    const r = await loadsAndRenders(page, 'atomic', mode);
    expect(r.rendered, `mode="${mode}" should render`).toBe(true);
    expect(r.fallback).toBe(false);
  });
}

test('atomic is registered in the pop group', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const meta = await page.evaluate(() =>
    customElements.get('bg-wc').presets().find((p) => p.name === 'atomic')
  );
  expect(meta.renderer).toBe('canvas2d');
  expect(meta.group).toBe('pop');
});

for (const mode of ['', 'riley', 'cafewall', 'moire', 'drift']) {
  test(`op-art renders for mode="${mode}"`, async ({ page }) => {
    const r = await loadsAndRenders(page, 'op-art', mode);
    expect(r.rendered, `mode="${mode}" should render`).toBe(true);
    expect(r.fallback).toBe(false);
  });
}

test('op-art is registered in the ornamental group', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const meta = await page.evaluate(() =>
    customElements.get('bg-wc').presets().find((p) => p.name === 'op-art')
  );
  expect(meta.renderer).toBe('webgl');
  expect(meta.group).toBe('ornamental');
});

test('ornamental presets show a static frame under reduced motion (no fallback)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const preset of ['girih', 'mandala', 'atomic', 'op-art']) {
    const ok = await page.evaluate(async (p) => {
      const el = document.getElementById('wc');
      el.setAttribute('preset', p);
      await el.ready;
      const c = el.shadowRoot.querySelector('canvas');
      return !el.hasAttribute('data-fallback') && !!c && c.width > 0;
    }, preset);
    expect(ok, `${preset} should render a static frame, not fallback`).toBe(true);
  }
});
