// azulejo — glazed tile wall. A grid of quadrant-symmetric tiles: each tile
// draws one motif quarter (petal, star-arm, or corner-arc — seeded per tile
// from a small family) reflected into all four quadrants, in cobalt primary
// on a light tile ground with thin grout lines. Every seventh-ish tile flips
// to the accent variant. A soft glaze sheen sweeps the wall with t (pure
// function of t). density = tile fineness, intensity = motif ink weight.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let tiles = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 9);
    const s = Math.min(w, h);
    const size = Math.max(48, s * (0.3 - params.density * 0.16));
    tiles = [];
    for (let iy = 0; iy * size < h + size; iy++) {
      for (let ix = 0; ix * size < w + size; ix++) {
        tiles.push({
          x: ix * size,
          y: iy * size,
          size,
          kind: (rand() * 3) | 0, // petal / star / corner-arc family
          accent: rand() < 0.14,
        });
      }
    }
    lastKey = `${params.seed}|${params.density}|${w}x${h}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${w}x${h}`;
    if (!tiles.length || key !== lastKey) rebuild(params);
  }

  // One motif quarter drawn in the unit quadrant (0..1); the caller mirrors it.
  function quarter(kind, q, lw) {
    c2d.lineWidth = lw;
    c2d.beginPath();
    if (kind === 0) {
      // Petal reaching from the corner to the center.
      c2d.moveTo(q, q);
      c2d.quadraticCurveTo(q * 0.15, q * 0.75, 0, 0);
      c2d.quadraticCurveTo(q * 0.75, q * 0.15, q, q);
      c2d.closePath();
      c2d.fill();
      c2d.stroke();
    } else if (kind === 1) {
      // Star arm: a slim triangle plus a center dot.
      c2d.moveTo(0, 0);
      c2d.lineTo(q * 0.8, q * 0.18);
      c2d.lineTo(q * 0.35, q * 0.35);
      c2d.closePath();
      c2d.fill();
      c2d.beginPath();
      c2d.arc(0, 0, q * 0.1, 0, Math.PI * 2);
      c2d.fill();
    } else {
      // Corner arc with a bud.
      c2d.arc(q, q, q * 0.55, Math.PI, Math.PI * 1.5);
      c2d.stroke();
      c2d.beginPath();
      c2d.arc(q * 0.45, q * 0.45, q * 0.09, 0, Math.PI * 2);
      c2d.fill();
    }
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const ground = rgbCss(mix(c.bg, c.fg, 0.04)); // barely-off tile white
    const grout = rgbaCss(c.fg, 0.25);
    const lw = (1.4 + params.intensity * 1.6) * px;

    for (const tl of tiles) {
      const q = tl.size / 2;
      const col = tl.accent ? c.accent : c.primary;
      c2d.fillStyle = ground;
      c2d.fillRect(tl.x, tl.y, tl.size, tl.size);
      c2d.strokeStyle = grout;
      c2d.lineWidth = 1 * px;
      c2d.strokeRect(tl.x, tl.y, tl.size, tl.size);
      c2d.fillStyle = rgbaCss(col, 0.85);
      c2d.strokeStyle = rgbCss(col);
      // Mirror the quarter into all four quadrants.
      for (const [sx, sy] of [
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        c2d.save();
        c2d.translate(tl.x + q, tl.y + q);
        c2d.scale(sx, sy);
        quarter(tl.kind, q * 0.92, lw);
        c2d.restore();
      }
    }

    // Glaze sheen: a soft diagonal light band sweeping slowly.
    const sweep = ((t * 0.04) % 1.4) - 0.2;
    const grad = c2d.createLinearGradient(w * (sweep - 0.15), 0, w * (sweep + 0.15), h * 0.4);
    const sheen = mix(c.bg, [1, 1, 1], 0.5);
    grad.addColorStop(0, rgbaCss(sheen, 0));
    grad.addColorStop(0.5, rgbaCss(sheen, 0.12));
    grad.addColorStop(1, rgbaCss(sheen, 0));
    c2d.fillStyle = grad;
    c2d.fillRect(0, 0, w, h);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      tiles = [];
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      tiles = [];
    },
  };
}
