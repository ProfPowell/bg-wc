// terrazzo — stone-chip speckle. Seeded convex chips (3–6-gons) in softened
// theme tints scattered dense over the ground, big flakes with a scatter of
// fines between; a faint polish sheen sweeps with t (pure function of t).
// density = chip count, intensity = tint strength.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let chips = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 3);
    const n = Math.floor(90 + params.density * 260);
    chips = [];
    for (let i = 0; i < n; i++) {
      const sides = 3 + ((rand() * 4) | 0);
      const base = i < n * 0.25 ? 0.02 + rand() * 0.025 : 0.004 + rand() * 0.01; // big flakes + fines
      const verts = [];
      for (let v = 0; v < sides; v++) {
        const a = (v / sides) * Math.PI * 2 + rand() * 0.5;
        verts.push([
          Math.cos(a) * base * (0.7 + rand() * 0.5),
          Math.sin(a) * base * (0.7 + rand() * 0.5),
        ]);
      }
      chips.push({ x: rand(), y: rand(), rot: rand() * Math.PI, verts, ci: (rand() * 4) | 0 });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!chips.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const soften = 0.45 - params.intensity * 0.3;
    const pal = [c.primary, c.accent, c.info, c.fg].map((col) => mix(col, c.bg, soften));

    for (const ch of chips) {
      const col = pal[ch.ci % pal.length];
      c2d.save();
      c2d.translate(ch.x * w, ch.y * h);
      c2d.rotate(ch.rot);
      c2d.beginPath();
      ch.verts.forEach(([vx, vy], i) => {
        if (i === 0) c2d.moveTo(vx * s, vy * s);
        else c2d.lineTo(vx * s, vy * s);
      });
      c2d.closePath();
      c2d.fillStyle = rgbCss(col);
      c2d.fill();
      c2d.strokeStyle = rgbCss(mix(col, c.fg, 0.25));
      c2d.lineWidth = 0.8 * px;
      c2d.stroke();
      c2d.restore();
    }

    // Polish sheen, drifting diagonally.
    const sweep = ((t * 0.03) % 1.4) - 0.2;
    const grad = c2d.createLinearGradient(w * (sweep - 0.2), 0, w * (sweep + 0.2), h * 0.5);
    const sheen = mix(c.bg, [1, 1, 1], 0.45);
    grad.addColorStop(0, rgbaCss(sheen, 0));
    grad.addColorStop(0.5, rgbaCss(sheen, 0.08));
    grad.addColorStop(1, rgbaCss(sheen, 0));
    c2d.fillStyle = grad;
    c2d.fillRect(0, 0, w, h);
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
      chips = [];
    },
  };
}
