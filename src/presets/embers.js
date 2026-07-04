// embers — sparks off an unseen fire below the frame. Seeded particles rise
// on wobbling cyclic paths (position is a pure function of t), cooling from
// accent-hot through primary to nothing as they climb; a soft warm glow
// pools along the bottom edge. Sparks are colored ink, so the preset stays
// legible on light grounds too. density = spark count, intensity = glow.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let sparks = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 17);
    const n = Math.floor(40 + params.density * 140);
    sparks = [];
    for (let i = 0; i < n; i++) {
      sparks.push({
        x0: rand(),
        off: rand(),
        v: 0.05 + rand() * 0.09, // climb rate (cycles per t-second)
        size: (1 + rand() * 2.4) * px,
        wob: 0.6 + rand() * 1.6,
        amp: (6 + rand() * 22) * px,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!sparks.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    // Warm glow pooling at the fire line (below the frame).
    const glow = c2d.createLinearGradient(0, h, 0, h * 0.55);
    glow.addColorStop(0, rgbaCss(c.accent, 0.22 * params.intensity));
    glow.addColorStop(1, rgbaCss(c.accent, 0));
    c2d.fillStyle = glow;
    c2d.fillRect(0, 0, w, h);

    for (const s of sparks) {
      const p = (s.off + t * s.v) % 1; // 0 at the fire, 1 burned out
      const y = h * (1.05 - p * 1.15);
      const x = s.x0 * w + Math.sin(t * s.wob + s.phase) * s.amp * (0.3 + p);
      const heat = 1 - p;
      const col = mix(c.accent, c.primary, p);
      c2d.fillStyle = rgbaCss(col, Math.min(1, 0.25 + heat));
      c2d.beginPath();
      c2d.arc(x, y, s.size * (0.5 + heat * 0.8), 0, Math.PI * 2);
      c2d.fill();
      // Hot core on the youngest sparks.
      if (p < 0.25) {
        c2d.fillStyle = rgbaCss(mix(c.accent, [1, 1, 1], 0.6), 0.7 * (1 - p * 4));
        c2d.beginPath();
        c2d.arc(x, y, s.size * 0.45, 0, Math.PI * 2);
        c2d.fill();
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
      sparks = [];
    },
  };
}
