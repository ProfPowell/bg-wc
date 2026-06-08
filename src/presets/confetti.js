// confetti — continuous drop from above using semantic palette
// (primary/accent/success/warning/error). intensity = drop rate, density = spread cap.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

const CAPS = { low: 80, med: 220, high: 500 };

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let pieces = [];
  let rand = mulberry32(1);
  let lastSeed = null;
  let spawnAccum = 0;
  let lastT = 0;

  function makePiece(palette) {
    const colorIdx = (rand() * palette.length) | 0;
    return {
      x: rand() * w,
      y: -10,
      vx: (rand() - 0.5) * 60,
      vy: 60 + rand() * 90,
      rot: rand() * Math.PI * 2,
      vrot: (rand() - 0.5) * 6,
      w: 5 + rand() * 7,
      h: 8 + rand() * 10,
      color: palette[colorIdx],
    };
  }

  function buildPalette(c) {
    return [
      `rgb(${(c.primary[0] * 255) | 0},${(c.primary[1] * 255) | 0},${(c.primary[2] * 255) | 0})`,
      `rgb(${(c.accent[0] * 255) | 0},${(c.accent[1] * 255) | 0},${(c.accent[2] * 255) | 0})`,
      `rgb(${(c.success[0] * 255) | 0},${(c.success[1] * 255) | 0},${(c.success[2] * 255) | 0})`,
      `rgb(${(c.warning[0] * 255) | 0},${(c.warning[1] * 255) | 0},${(c.warning[2] * 255) | 0})`,
      `rgb(${(c.error[0] * 255) | 0},${(c.error[1] * 255) | 0},${(c.error[2] * 255) | 0})`,
    ];
  }

  function frame(t, params) {
    if (params.seed !== lastSeed) {
      rand = mulberry32(params.seed || 13);
      lastSeed = params.seed;
    }
    const c = getColors();
    const palette = buildPalette(c);
    const cap = CAPS[params.quality] || CAPS.med;
    const maxPieces = Math.floor(40 + cap * params.density);

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;

    // Spawn rate scales with intensity (10..120 pieces/sec).
    const rate = 10 + params.intensity * 110;
    spawnAccum += rate * dt;
    while (spawnAccum >= 1 && pieces.length < maxPieces) {
      pieces.push(makePiece(palette));
      spawnAccum -= 1;
    }

    clearAndFill(c2d, w, h, c.bg);

    const gravity = 80;
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      p.vy += gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      if (p.y - p.h > h || p.x < -20 || p.x > w + 20) {
        pieces.splice(i, 1);
        continue;
      }
      c2d.save();
      c2d.translate(p.x, p.y);
      c2d.rotate(p.rot);
      c2d.fillStyle = p.color;
      c2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c2d.restore();
    }
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
      // Custom still (can't delegate to frame(0): confetti falls in over time,
      // so t=0 is nearly empty). Fill once with a fixed scatter.
      const c = getColors();
      const palette = buildPalette(c);
      clearAndFill(c2d, w, h, c.bg);
      const r = mulberry32(params.seed || 13);
      const n = 40 + Math.floor(80 * params.density);
      for (let i = 0; i < n; i++) {
        const x = r() * w,
          y = r() * h;
        const rot = r() * Math.PI * 2;
        const pw = 5 + r() * 7,
          ph = 8 + r() * 10;
        c2d.save();
        c2d.translate(x, y);
        c2d.rotate(rot);
        c2d.fillStyle = palette[(r() * palette.length) | 0];
        c2d.fillRect(-pw / 2, -ph / 2, pw, ph);
        c2d.restore();
      }
    },
    dispose() {
      pieces = [];
    },
  };
}
