import { test, expect } from '@playwright/test';

// gl-wc-kq9: matrix faded its trails by compositing a 10%-alpha bg fill;
// 8-bit rounding makes that converge to the WRONG color (measured stall at
// rgb(9,9,9) vs bg rgb(5,11,6)), permanently burning ghost columns into the
// canvas — glaring on dark full-page themes. Pin the property directly: a
// flood of bright ink must decay back to (near-)nothing under the frame
// fade — no opaque off-bg residue may survive.

test('matrix trail fade fully clears old ink (no burned-in residue)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const r = await page.evaluate(async () => {
    const mod = await import('/src/presets/matrix.js');
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const c2d = canvas.getContext('2d', { willReadFrequently: true });
    const colors = {
      primary: [0.2, 0.82, 0.48, 1],
      accent: [1, 0.82, 0.4, 1],
      info: [0.35, 0.85, 0.9, 1],
      bg: [0.02, 0.043, 0.024, 1], // near-black green — the worst case for the stall
      fg: [0.49, 1, 0.63, 1],
      success: [0.2, 0.7, 0.3, 1],
      warning: [0.9, 0.7, 0.1, 1],
      error: [0.8, 0.2, 0.2, 1],
    };
    const params = {
      palette: 'theme',
      intensity: 0.5,
      speed: 1,
      density: 0.5,
      seed: 7,
      quality: 'med',
      fit: 'cover',
      text: '',
    };
    const inst = mod.create({
      host: null,
      canvas,
      gl: null,
      c2d,
      css3d: null,
      getColors: () => colors,
      getParams: () => params,
      pxScale: 1,
    });
    inst.resize(160, 120);
    // Flood the canvas with bright ink, then let the fade run for ~5s of
    // frames. Live glyph cells stay bright; everything else must decay to bg
    // (or to transparency, letting the host bg show through).
    c2d.globalCompositeOperation = 'source-over';
    c2d.fillStyle = 'rgb(125,255,160)';
    c2d.fillRect(0, 0, 160, 120);
    for (let i = 1; i <= 300; i++) inst.frame(i / 60, params);
    const d = c2d.getImageData(0, 0, 160, 120).data;
    const bg = [5, 11, 6];
    let cleared = 0;
    let live = 0;
    let residue = 0;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a < 16) {
        cleared++; // faded to (near-)transparent — host bg shows
        continue;
      }
      const delta = Math.max(
        Math.abs(d[i] - bg[0]),
        Math.abs(d[i + 1] - bg[1]),
        Math.abs(d[i + 2] - bg[2])
      );
      if (delta <= 3)
        cleared++; // back at the bg color
      else if (d[i + 1] > 120)
        live++; // a live glyph or fresh trail
      else residue++; // stuck between — the burn-in
    }
    inst.dispose();
    const total = d.length / 4;
    return { total, cleared, live, residuePct: (100 * residue) / total };
  });
  // Live glyphs and fresh trails legitimately occupy a few percent of the
  // frame; stalled residue must not.
  expect(r.residuePct, 'burned-in ghost pixels must not survive the fade').toBeLessThan(5);
});
