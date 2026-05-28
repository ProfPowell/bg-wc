// pulse — concentric rings expanding from center. Spawn rate scales with
// speed; ring thickness with density; ring color cycles through the
// primary / accent / info theme tokens.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let rings = [];
  let spawnAcc = 0;
  let lastT = 0;
  let cycle = 0;

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;

    // Spawn ring at fixed intervals — host speed-scales the dt accumulator.
    const interval = 1.0;
    spawnAcc += dt;
    while (spawnAcc >= interval) {
      const palette = [c.primary, c.accent, c.info];
      rings.push({ start: t, color: palette[cycle % palette.length] });
      cycle++;
      spawnAcc -= interval;
    }

    const cx = w * 0.5,
      cy = h * 0.5;
    const maxR = Math.hypot(cx, cy);
    // Expansion speed (px/s) — scales with intensity
    const expansion = maxR * (0.35 + params.intensity * 0.65) * 0.5;
    const thick = 1.5 + params.density * 12;

    c2d.lineWidth = thick;
    c2d.lineCap = 'round';

    rings = rings.filter((ring) => {
      const age = t - ring.start;
      const radius = age * expansion;
      if (radius < 0) return true;
      if (radius > maxR * 1.25) return false;
      const a = 1 - Math.min(1, radius / (maxR * 1.25));
      const [r, g, b] = ring.color;
      c2d.strokeStyle = `rgba(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0},${(a * 0.85).toFixed(3)})`;
      c2d.beginPath();
      c2d.arc(cx, cy, radius, 0, Math.PI * 2);
      c2d.stroke();
      return true;
    });
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
      // Render a snapshot with several pre-existing rings at different radii.
      const c = getColors();
      clearAndFill(c2d, w, h, c.bg);
      const cx = w * 0.5,
        cy = h * 0.5;
      const maxR = Math.hypot(cx, cy);
      const palette = [c.primary, c.accent, c.info];
      c2d.lineWidth = 1.5 + params.density * 12;
      c2d.lineCap = 'round';
      const rand = mulberry32(params.seed || 1);
      for (let i = 0; i < 6; i++) {
        const radius = (i + rand()) * (maxR / 6);
        const ring = palette[i % palette.length];
        const a = 1 - radius / (maxR * 1.25);
        c2d.strokeStyle = `rgba(${(ring[0] * 255) | 0},${(ring[1] * 255) | 0},${(ring[2] * 255) | 0},${(a * 0.85).toFixed(3)})`;
        c2d.beginPath();
        c2d.arc(cx, cy, radius, 0, Math.PI * 2);
        c2d.stroke();
      }
    },
    dispose() {
      rings = [];
    },
  };
}
