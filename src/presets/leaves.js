// leaves — autumn fall. Seeded leaves in three shapes tumble down cyclic
// paths, each rotating and swaying, all leaning together under a slow gust.
// Tints mix primary/accent/warning toward the bg for depth. Pure function
// of t. density = leaf count, intensity = leaf size.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let leaves = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 29);
    const n = Math.floor(18 + params.density * 60);
    leaves = [];
    for (let i = 0; i < n; i++) {
      leaves.push({
        x0: rand(),
        off: rand(),
        v: 0.03 + rand() * 0.05,
        size: (8 + rand() * 14) * px,
        kind: (rand() * 3) | 0, // oval / three-lobe / willow
        rotW: 0.4 + rand() * 1.4,
        sway: (14 + rand() * 30) * px,
        swayW: 0.5 + rand() * 1.1,
        phase: rand() * Math.PI * 2,
        ci: (rand() * 3) | 0,
        depth: 0.15 + rand() * 0.85, // far leaves smaller + fainter
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!leaves.length || key !== lastKey) rebuild(params);
  }

  function leafPath(kind, s) {
    c2d.beginPath();
    if (kind === 0) {
      // oval leaf with a pointed tip
      c2d.moveTo(0, -s);
      c2d.quadraticCurveTo(s * 0.7, -s * 0.3, 0, s);
      c2d.quadraticCurveTo(-s * 0.7, -s * 0.3, 0, -s);
    } else if (kind === 1) {
      // three-lobe (maple-ish)
      c2d.moveTo(0, s * 0.9);
      c2d.quadraticCurveTo(-s, s * 0.2, -s * 0.55, -s * 0.35);
      c2d.quadraticCurveTo(-s * 0.25, -s * 0.15, 0, -s);
      c2d.quadraticCurveTo(s * 0.25, -s * 0.15, s * 0.55, -s * 0.35);
      c2d.quadraticCurveTo(s, s * 0.2, 0, s * 0.9);
    } else {
      // willow: a slim lens
      c2d.moveTo(0, -s);
      c2d.quadraticCurveTo(s * 0.3, 0, 0, s);
      c2d.quadraticCurveTo(-s * 0.3, 0, 0, -s);
    }
    c2d.closePath();
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.warning];
    const gust = Math.sin(t * 0.1) * w * 0.05;
    const sizeMul = 0.7 + params.intensity * 0.6;

    for (const L of leaves) {
      const p = (L.off + t * L.v) % 1;
      const y = h * (p * 1.2 - 0.1);
      const x = L.x0 * w + Math.sin(t * L.swayW + L.phase) * L.sway + gust * p;
      const s = L.size * sizeMul * (0.5 + L.depth * 0.6);
      const col = mix(pal[L.ci % pal.length], c.bg, (1 - L.depth) * 0.45);
      c2d.save();
      c2d.translate(x, y);
      c2d.rotate(t * L.rotW + L.phase + Math.sin(t * L.swayW + L.phase) * 0.4);
      leafPath(L.kind, s);
      c2d.fillStyle = rgbaCss(col, 0.55 + L.depth * 0.4);
      c2d.fill();
      // mid-vein
      c2d.strokeStyle = rgbaCss(mix(col, c.bg, 0.35), 0.8);
      c2d.lineWidth = 1 * px;
      c2d.beginPath();
      c2d.moveTo(0, -s * 0.85);
      c2d.lineTo(0, s * 0.85);
      c2d.stroke();
      c2d.restore();
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
      leaves = [];
    },
  };
}
