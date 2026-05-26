// dashboard — a live metrics dashboard: a streaming area-line chart, a row
// of bouncing bars, and a sweeping gauge. Theme-tinted. Dataviz group.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let rand = mulberry32(1);
  let seeds = [];
  let lastSeed = null;

  function build(params) {
    rand = mulberry32(params.seed || 1);
    seeds = Array.from({ length: 16 }, () => rand() * 6.28);
    lastSeed = params.seed;
  }

  function rgba(c, a) {
    return `rgba(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0},${a})`;
  }

  function frame(t, params) {
    if (!seeds.length || params.seed !== lastSeed) build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const sp = params.speed;

    // grid lines
    c2d.strokeStyle = rgba(c.fg, 0.07);
    c2d.lineWidth = 1;
    for (let gy = 0; gy < h; gy += h / 10) {
      c2d.beginPath();
      c2d.moveTo(0, gy);
      c2d.lineTo(w, gy);
      c2d.stroke();
    }

    // --- streaming area-line chart (top ~55%) ---
    const chH = h * 0.55,
      pad = w * 0.04;
    const cw = w - pad * 2;
    const samples = 80;
    c2d.beginPath();
    for (let i = 0; i <= samples; i++) {
      const x = pad + (i / samples) * cw;
      const u = i / samples;
      const v = 0.5 + 0.3 * Math.sin(u * 6 + t * sp) + 0.15 * Math.sin(u * 17 - t * sp * 1.7);
      const y = chH * 0.85 - v * chH * 0.6;
      if (i) c2d.lineTo(x, y);
      else c2d.moveTo(x, y);
    }
    // area fill
    c2d.lineTo(pad + cw, chH * 0.9);
    c2d.lineTo(pad, chH * 0.9);
    c2d.closePath();
    c2d.fillStyle = rgba(c.primary, 0.16);
    c2d.fill();
    // crisp line (re-trace top only)
    c2d.beginPath();
    for (let i = 0; i <= samples; i++) {
      const x = pad + (i / samples) * cw;
      const u = i / samples;
      const v = 0.5 + 0.3 * Math.sin(u * 6 + t * sp) + 0.15 * Math.sin(u * 17 - t * sp * 1.7);
      const y = chH * 0.85 - v * chH * 0.6;
      if (i) c2d.lineTo(x, y);
      else c2d.moveTo(x, y);
    }
    c2d.strokeStyle = rgba(c.primary, 0.95);
    c2d.lineWidth = 2;
    c2d.stroke();

    // --- bouncing bars (bottom-left) ---
    const barTop = chH + h * 0.06,
      barH = h - barTop - h * 0.04;
    const nb = 14,
      bw = (w * 0.6) / nb;
    for (let i = 0; i < nb; i++) {
      const v =
        0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * sp * 1.4 + seeds[i % seeds.length] + i * 0.4));
      const bh = v * barH;
      c2d.fillStyle = rgba(i % 2 ? c.accent : c.info, 0.85);
      c2d.fillRect(pad + i * bw, barTop + barH - bh, bw * 0.7, bh);
    }

    // --- gauge (bottom-right) ---
    const gx = w * 0.82,
      gy = barTop + barH * 0.5,
      gr = Math.min(w * 0.12, barH * 0.5);
    c2d.lineWidth = Math.max(4, gr * 0.18);
    c2d.strokeStyle = rgba(c.fg, 0.12);
    c2d.beginPath();
    c2d.arc(gx, gy, gr, Math.PI * 0.75, Math.PI * 2.25);
    c2d.stroke();
    const val = 0.5 + 0.45 * Math.sin(t * sp * 0.6);
    c2d.strokeStyle = rgba(c.accent, 0.95);
    c2d.beginPath();
    c2d.arc(gx, gy, gr, Math.PI * 0.75, Math.PI * 0.75 + val * Math.PI * 1.5);
    c2d.stroke();
    c2d.fillStyle = rgba(c.fg, 0.9);
    c2d.font = `${Math.max(12, gr * 0.4)}px ui-monospace, monospace`;
    c2d.textAlign = 'center';
    c2d.textBaseline = 'middle';
    c2d.fillText(`${(val * 100) | 0}%`, gx, gy);
    c2d.textAlign = 'left';
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      frame(t, params);
    },
    staticFrame(params) {
      frame(0.5, params);
    },
    dispose() {},
  };
}
