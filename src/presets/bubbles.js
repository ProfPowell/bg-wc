// bubbles — an underwater column. Seeded bubbles rise on wobbling cyclic
// paths (bigger rises faster), each a thin fg rim with an offset highlight;
// slow caustic light shafts sweep behind them. Rims are fg ink, so the
// preset reads on light grounds as well as deep-water darks. Pure function
// of t. density = bubble count, intensity = shaft strength.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let bubbles = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 23);
    const n = Math.floor(24 + params.density * 80);
    bubbles = [];
    for (let i = 0; i < n; i++) {
      const r = (2 + rand() * 12) * px;
      bubbles.push({
        x0: rand(),
        off: rand(),
        r,
        v: 0.04 + r / (140 * px), // larger bubbles rise faster
        wob: 0.7 + rand() * 1.8,
        amp: (4 + rand() * 10) * px + r * 0.5,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!bubbles.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    // Caustic shafts: three slow diagonal light bands.
    for (let k = 0; k < 3; k++) {
      const cx = w * (0.2 + 0.3 * k) + Math.sin(t * 0.05 + k * 2.1) * w * 0.12;
      const grad = c2d.createLinearGradient(cx - w * 0.06, 0, cx + w * 0.14, h);
      grad.addColorStop(0, rgbaCss(c.primary, 0));
      grad.addColorStop(
        0.5,
        rgbaCss(c.primary, 0.06 * params.intensity * (1.2 + Math.sin(t * 0.11 + k)))
      );
      grad.addColorStop(1, rgbaCss(c.primary, 0));
      c2d.fillStyle = grad;
      c2d.fillRect(0, 0, w, h);
    }

    for (const b of bubbles) {
      const p = (b.off + t * b.v) % 1;
      const y = h * (1.06 - p * 1.18);
      const x = b.x0 * w + Math.sin(t * b.wob + b.phase) * b.amp;
      const grow = 0.7 + p * 0.4; // decompression: slightly bigger near the top
      c2d.strokeStyle = rgbaCss(c.fg, 0.55);
      c2d.lineWidth = 1.2 * px;
      c2d.beginPath();
      c2d.arc(x, y, b.r * grow, 0, Math.PI * 2);
      c2d.stroke();
      c2d.fillStyle = rgbaCss(c.fg, 0.7);
      c2d.beginPath();
      c2d.arc(
        x - b.r * grow * 0.35,
        y - b.r * grow * 0.35,
        Math.max(1, b.r * grow * 0.18),
        0,
        Math.PI * 2
      );
      c2d.fill();
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
      bubbles = [];
    },
  };
}
