// fan-deco — Erté's scalloped shell-fans in a staggered repeat: half-disc
// fans with radiating ribs and scallop border arcs, gold-derived on a deep
// field, shimmering row by row. Gold = accent pulled toward white; the deep
// field = primary pulled toward the ground. density = fan size,
// intensity = gold brightness.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const RIBS = 9;

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let jitters = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 137);
    jitters = [];
    for (let i = 0; i < 64; i++) jitters.push(rand());
    lastKey = `${params.seed}`;
  }

  function ensure(params) {
    if (!jitters.length || `${params.seed}` !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);
    const R = s * (0.16 - params.density * 0.06 + 0.06); // fan radius by density

    const field = mix(c.primary, c.bg, 0.55);
    c2d.fillStyle = rgbCss(field);
    c2d.fillRect(0, 0, w, h);

    const goldHi = mix(c.accent, [1, 1, 1], 0.25 + params.intensity * 0.25);
    const goldLo = mix(c.accent, field, 0.35);

    const stepX = R * 2;
    const stepY = R * 1.05;
    let row = 0;
    for (let y = 0; y < h + stepY; y += stepY, row++) {
      const offX = row % 2 ? R : 0;
      const shimmer = 0.75 + 0.25 * Math.sin(t * 0.4 + row * 0.9);
      let col = 0;
      for (let x = -R + offX; x < w + R; x += stepX, col++) {
        const j = jitters[(row * 13 + col) % jitters.length];
        // The shell: filled half-disc rising from its baseline.
        c2d.fillStyle = rgbCss(mix(goldLo, field, 0.25 + j * 0.2));
        c2d.beginPath();
        c2d.arc(x, y, R, Math.PI, 0);
        c2d.closePath();
        c2d.fill();
        // Radiating ribs.
        c2d.strokeStyle = rgbaCss(goldHi, 0.8 * shimmer);
        c2d.lineWidth = 1.4 * px;
        for (let k = 0; k <= RIBS; k++) {
          const a = Math.PI + (k / RIBS) * Math.PI;
          c2d.beginPath();
          c2d.moveTo(x, y);
          c2d.lineTo(x + Math.cos(a) * R * 0.94, y + Math.sin(a) * R * 0.94);
          c2d.stroke();
        }
        // Scallop border: three concentric arcs.
        for (const rr of [1, 0.82, 0.64]) {
          c2d.strokeStyle = rgbaCss(goldHi, (rr === 1 ? 0.95 : 0.5) * shimmer);
          c2d.lineWidth = (rr === 1 ? 2 : 1.2) * px;
          c2d.beginPath();
          c2d.arc(x, y, R * rr, Math.PI, 0);
          c2d.stroke();
        }
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
      jitters = [];
    },
  };
}
