// atomic — mid-century / atomic-age scattered shapes on a flat token field:
// boomerangs, kidney blobs, starbursts, plus a harlequin diamond grid. Seeded
// placement (deterministic) with a lazy bob/rotate drift.
// mode: mixed (default) | boomerangs | starbursts | harlequin.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

function rgb(c) {
  return `rgb(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0})`;
}

function drawBoomerang(ctx, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.26);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.6, -Math.PI * 0.78, -Math.PI * 0.06);
  ctx.stroke();
}

function drawKidney(ctx, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.7, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStarburst(ctx, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * size * 0.7, Math.sin(a) * size * 0.7);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawHarlequin(ctx, w, h, c1, c2, cell) {
  for (let y = -cell; y < h + cell; y += cell) {
    for (let x = -cell; x < w + cell; x += cell) {
      const even = (Math.round(x / cell) + Math.round(y / cell)) % 2 === 0;
      ctx.fillStyle = even ? c1 : c2;
      ctx.beginPath();
      ctx.moveTo(x + cell / 2, y);
      ctx.lineTo(x + cell, y + cell / 2);
      ctx.lineTo(x + cell / 2, y + cell);
      ctx.lineTo(x, y + cell / 2);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function create({ c2d, getColors, host }) {
  let w = 1,
    h = 1;

  function modeOf() {
    return (host.getAttribute('mode') || 'mixed').toLowerCase();
  }
  function kindsFor(mode) {
    if (mode === 'boomerangs') return ['boom'];
    if (mode === 'starbursts') return ['star'];
    return ['boom', 'kidney', 'star'];
  }

  function render(t, params) {
    const c = getColors();
    const palette = [rgb(c.primary), rgb(c.accent), rgb(c.info)];
    clearAndFill(c2d, w, h, c.bg);

    const mode = modeOf();
    if (mode === 'harlequin') {
      const cell = 30 + (1 - params.density) * 50;
      drawHarlequin(c2d, w, h, palette[0], palette[1], cell);
      return;
    }

    const r = mulberry32(params.seed | 0 || 7);
    const kinds = kindsFor(mode);
    const n = Math.floor(12 + params.density * 60);
    const base = Math.min(w, h) * (0.06 + params.intensity * 0.06);
    for (let i = 0; i < n; i++) {
      const x = r() * w;
      const y = r() * h;
      const kind = kinds[(r() * kinds.length) | 0];
      const size = base * (0.6 + r() * 0.8);
      const color = palette[(r() * palette.length) | 0];
      const phase = r() * Math.PI * 2;
      const bob = Math.sin(t * 0.6 + phase) * size * 0.15;
      const rot = phase + Math.sin(t * 0.2 + phase) * 0.2;
      c2d.save();
      c2d.translate(x, y + bob);
      c2d.rotate(rot);
      if (kind === 'boom') drawBoomerang(c2d, size, color);
      else if (kind === 'kidney') drawKidney(c2d, size, color);
      else drawStarburst(c2d, size, color);
      c2d.restore();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      render(t, params);
    },
    staticFrame(params) {
      render(0, params);
    },
    dispose() {},
  };
}
