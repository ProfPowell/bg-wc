// deco-spires — the Chrysler poster. Stepped-setback skyscraper silhouettes
// against gold ray bursts wheeling imperceptibly behind the tallest spire;
// thin gold outlines and seeded lit-window slits. density = building count,
// intensity = ray brightness.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let spires = [];
  let tallX = 0.5;
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 139);
    const n = 5 + Math.round(params.density * 4); // 5..9 spires
    spires = [];
    let tallest = 0;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n + (rand() - 0.5) * 0.05;
      const height = 0.35 + rand() * 0.5;
      const tiers = 3 + ((rand() * 3) | 0);
      const bw = 0.05 + rand() * 0.05;
      const windows = [];
      for (let k = 0; k < 14; k++) windows.push(rand() < 0.55);
      spires.push({ x, height, tiers, bw, windows, needle: rand() < 0.4 });
      if (height > tallest) {
        tallest = height;
        tallX = x;
      }
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!spires.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);

    const field = mix(c.primary, c.bg, 0.6);
    c2d.fillStyle = rgbCss(field);
    c2d.fillRect(0, 0, w, h);

    const gold = mix(c.accent, [1, 1, 1], 0.3);
    const rayA = 0.06 + params.intensity * 0.1;
    const cx = tallX * w;
    const cy = h * 0.42;
    const rot = t * 0.008; // imperceptible wheel — nonzero at every t
    for (let k = 0; k < 18; k++) {
      const a = rot + (k / 18) * Math.PI * 2;
      c2d.fillStyle = rgbaCss(gold, rayA * (k % 2 ? 1 : 0.55));
      c2d.beginPath();
      c2d.moveTo(cx, cy);
      c2d.arc(cx, cy, Math.hypot(w, h), a, a + Math.PI / 26);
      c2d.closePath();
      c2d.fill();
    }

    const ink = mix(c.fg, [0, 0, 0], 0.4);
    const glowWin = mix(c.accent, [1, 1, 1], 0.15);
    for (const sp of spires) {
      const bw = sp.bw * w;
      const baseY = h;
      const topY = h - sp.height * h;
      // Stepped tiers, symmetric setbacks.
      for (let tier = 0; tier < sp.tiers; tier++) {
        const f = tier / sp.tiers;
        const tw = bw * (1 - f * 0.55);
        const y0 = baseY - (sp.height * h * (tier + 1)) / sp.tiers;
        const th = (sp.height * h) / sp.tiers;
        c2d.fillStyle = rgbCss(ink);
        c2d.fillRect(sp.x * w - tw / 2, y0, tw, th + 1);
        c2d.strokeStyle = rgbaCss(gold, 0.6);
        c2d.lineWidth = 1 * px;
        c2d.strokeRect(sp.x * w - tw / 2, y0, tw, th + 1);
      }
      if (sp.needle) {
        c2d.strokeStyle = rgbaCss(gold, 0.9);
        c2d.lineWidth = 1.4 * px;
        c2d.beginPath();
        c2d.moveTo(sp.x * w, topY);
        c2d.lineTo(sp.x * w, topY - s * 0.06);
        c2d.stroke();
      }
      // Window slits on the lowest tier.
      const rows = 7;
      for (let k = 0; k < 14; k++) {
        if (!sp.windows[k]) continue;
        const col = k % 2;
        const rowk = (k / 2) | 0;
        if (rowk >= rows) continue;
        const wx = sp.x * w - bw * 0.28 + col * bw * 0.42;
        const wy = baseY - sp.height * h * 0.3 + (rowk * (sp.height * h * 0.28)) / rows;
        c2d.fillStyle = rgbaCss(glowWin, 0.85);
        c2d.fillRect(wx, wy, bw * 0.14, 2 * px);
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      spires = [];
    },
  };
}
