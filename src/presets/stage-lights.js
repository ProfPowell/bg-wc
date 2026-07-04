// stage-lights — the concert opener. Par cans along the stage edge sweep
// colored cones up through the haze; dust motes drift where the beams
// live. Cones are colored theme ink at low alpha so overlaps feel additive
// and the rig reads on light grounds. Pure function of t. density = can
// count, intensity = beam brightness.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let cans = [];
  let motes = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 61);
    const n = 3 + Math.round(params.density * 2); // 3..5 cans
    cans = [];
    for (let i = 0; i < n; i++) {
      cans.push({
        x: (i + 0.5) / n + (rand() - 0.5) * 0.06,
        sweep: 0.35 + rand() * 0.25, // sweep half-angle envelope
        rate: 0.12 + rand() * 0.14,
        phase: rand() * Math.PI * 2,
        ci: (rand() * 3) | 0,
      });
    }
    motes = [];
    for (let i = 0; i < 60; i++) {
      motes.push({
        x: rand(),
        y: rand() * 0.8,
        r: (0.6 + rand()) * px,
        drift: 0.01 + rand() * 0.02,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!cans.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.info];
    const floorY = h * 0.9;
    const bright = 0.16 + params.intensity * 0.2;

    // Haze.
    const haze = c2d.createLinearGradient(0, h, 0, 0);
    haze.addColorStop(0, rgbaCss(mix(c.primary, c.bg, 0.6), 0.12));
    haze.addColorStop(1, rgbaCss(c.primary, 0));
    c2d.fillStyle = haze;
    c2d.fillRect(0, 0, w, h);

    // Beams: cones from each can, swept by t.
    for (const can of cans) {
      const col = pal[can.ci % pal.length];
      const ox = can.x * w;
      const angle = -Math.PI / 2 + Math.sin(t * can.rate + can.phase) * can.sweep;
      const len = h * 1.15;
      const half = len * 0.14;
      const tipX = ox + Math.cos(angle) * len;
      const tipY = floorY + Math.sin(angle) * len;
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      const grad = c2d.createLinearGradient(ox, floorY, tipX, tipY);
      grad.addColorStop(0, rgbaCss(col, bright));
      grad.addColorStop(1, rgbaCss(col, 0));
      c2d.fillStyle = grad;
      c2d.beginPath();
      c2d.moveTo(ox, floorY);
      c2d.lineTo(tipX + nx * half, tipY + ny * half);
      c2d.lineTo(tipX - nx * half, tipY - ny * half);
      c2d.closePath();
      c2d.fill();
      // The can itself.
      c2d.fillStyle = rgbaCss(c.fg, 0.85);
      c2d.beginPath();
      c2d.arc(ox, floorY, 4 * px, 0, Math.PI * 2);
      c2d.fill();
    }

    // Dust motes drifting above the stage.
    for (const m of motes) {
      const x = (m.x + Math.sin(t * m.drift + m.phase) * 0.02) * w;
      const y = (m.y + Math.cos(t * m.drift * 0.7 + m.phase) * 0.02) * h;
      c2d.fillStyle = rgbaCss(mix(c.accent, c.bg, 0.3), 0.25);
      c2d.beginPath();
      c2d.arc(x, y, m.r, 0, Math.PI * 2);
      c2d.fill();
    }

    // The stage edge.
    c2d.fillStyle = rgbaCss(mix(c.bg, [0, 0, 0], 0.45), 0.9);
    c2d.fillRect(0, floorY, w, h - floorY);
    c2d.fillStyle = rgbaCss(c.accent, 0.5);
    c2d.fillRect(0, floorY, w, 2 * px);
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
      cans = [];
      motes = [];
    },
  };
}
