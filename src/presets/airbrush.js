// airbrush — the prog-sleeve gatefold. Soft radial orbs, a hazy horizon
// band, and wide sweeping arcs, all gradient-edged and slowly adrift —
// Roger-Dean-adjacent without the figuration. Everything is a gradient;
// nothing has a hard edge. Pure function of t. density = element count,
// intensity = tint strength.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let orbs = [];
  let arcs = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 53);
    const no = 2 + Math.round(params.density * 3); // 2..5 orbs
    orbs = [];
    for (let i = 0; i < no; i++) {
      orbs.push({
        x: 0.15 + rand() * 0.7,
        y: 0.12 + rand() * 0.45,
        r: 0.1 + rand() * 0.16,
        ci: (rand() * 3) | 0,
        drift: 0.05 + rand() * 0.08,
        phase: rand() * Math.PI * 2,
      });
    }
    arcs = [];
    for (let i = 0; i < 2 + ((rand() * 2) | 0); i++) {
      arcs.push({
        cx: 0.2 + rand() * 0.6,
        cy: 0.9 + rand() * 0.4,
        r: 0.45 + rand() * 0.4,
        a0: Math.PI * (1.05 + rand() * 0.3),
        a1: Math.PI * (1.6 + rand() * 0.3),
        lw: 0.02 + rand() * 0.035,
        ci: (rand() * 3) | 0,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!orbs.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const pal = [c.primary, c.accent, c.info];
    const tint = 0.35 + params.intensity * 0.45;

    // Horizon band: a soft belt of primary across the lower third.
    const hy = h * 0.66;
    const belt = c2d.createLinearGradient(0, hy - s * 0.18, 0, hy + s * 0.22);
    belt.addColorStop(0, rgbaCss(c.primary, 0));
    belt.addColorStop(0.5, rgbaCss(mix(c.primary, c.bg, 0.35), tint * 0.7));
    belt.addColorStop(1, rgbaCss(c.primary, 0));
    c2d.fillStyle = belt;
    c2d.fillRect(0, 0, w, h);

    // Orbs: soft radial pools that drift.
    for (const o of orbs) {
      const x = (o.x + Math.sin(t * o.drift + o.phase) * 0.02) * w;
      const y = (o.y + Math.cos(t * o.drift * 0.8 + o.phase) * 0.015) * h;
      const R = o.r * s;
      const g = c2d.createRadialGradient(x, y, 0, x, y, R);
      const col = mix(pal[o.ci % pal.length], c.bg, 0.25);
      g.addColorStop(0, rgbaCss(col, tint));
      g.addColorStop(0.7, rgbaCss(col, tint * 0.35));
      g.addColorStop(1, rgbaCss(col, 0));
      c2d.fillStyle = g;
      c2d.fillRect(x - R, y - R, R * 2, R * 2);
    }

    // Arcs: wide soft ring segments sweeping the sky, breathing slightly.
    for (const a of arcs) {
      const R = a.r * s;
      const lw = a.lw * s * (1 + 0.1 * Math.sin(t * 0.2 + a.phase));
      const col = mix(pal[a.ci % pal.length], c.bg, 0.3);
      for (const [width, alpha] of [
        [lw * 2.2, tint * 0.25],
        [lw, tint * 0.6],
      ]) {
        c2d.strokeStyle = rgbaCss(col, alpha);
        c2d.lineWidth = width;
        c2d.lineCap = 'round';
        c2d.beginPath();
        c2d.arc(a.cx * w, a.cy * h, R, a.a0, a.a1);
        c2d.stroke();
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
      orbs = [];
      arcs = [];
    },
  };
}
