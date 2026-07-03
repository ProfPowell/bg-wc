// paisley — boteh block print. A half-drop grid of teardrop motifs, each
// stamped with the outline layer and a fill layer that sits slightly
// off-register (per-stamp seeded offset plus a whisper of press drift from
// t — pure function, stable stills). Inside each boteh: a dotted arc row and
// a sprout of fronds. primary = ink outline, accent = fill, info = details.
// density = grid fineness, intensity = fill opacity.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let stamps = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 5);
    const s = Math.min(w, h);
    const cell = Math.max(60, s * (0.34 - params.density * 0.16));
    stamps = [];
    for (let iy = -1; iy * cell * 0.9 < h + cell; iy++) {
      for (let ix = -1; ix * cell < w + cell; ix++) {
        stamps.push({
          x: ix * cell + (iy % 2 ? cell / 2 : 0), // half-drop
          y: iy * cell * 0.9,
          size: cell * (0.32 + rand() * 0.08),
          rot: -0.5 + rand() * 0.35,
          misX: (rand() - 0.5) * 4,
          misY: (rand() - 0.5) * 4,
          phase: rand() * Math.PI * 2,
        });
      }
    }
    lastKey = `${params.seed}|${params.density}|${w}x${h}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${w}x${h}`;
    if (!stamps.length || key !== lastKey) rebuild(params);
  }

  // The boteh path: a teardrop whose tip curls over. Drawn in unit space,
  // scaled by size; callers set transform first.
  function botehPath(r) {
    c2d.beginPath();
    c2d.moveTo(0, r);
    c2d.bezierCurveTo(-r * 1.05, r * 0.55, -r * 0.85, -r * 0.75, 0, -r);
    c2d.bezierCurveTo(r * 0.55, -r * 1.15, r * 0.95, -r * 0.7, r * 0.45, -r * 0.5);
    c2d.bezierCurveTo(r * 0.95, -r * 0.1, r * 0.75, r * 0.65, 0, r);
    c2d.closePath();
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const ink = rgbCss(c.primary);
    const fill = rgbaCss(c.accent, 0.25 + params.intensity * 0.5);
    const detail = rgbCss(c.info);

    for (const st of stamps) {
      c2d.save();
      c2d.translate(st.x, st.y);
      c2d.rotate(st.rot);
      const r = st.size;
      // Fill layer, off-register: seeded offset + gentle press drift.
      c2d.save();
      c2d.translate(st.misX * px + Math.sin(t * 0.2 + st.phase) * 0.8 * px, st.misY * px);
      botehPath(r);
      c2d.fillStyle = fill;
      c2d.fill();
      c2d.restore();
      // Ink outline layer.
      botehPath(r);
      c2d.strokeStyle = ink;
      c2d.lineWidth = 2 * px;
      c2d.stroke();
      // Interior: dotted arc row following the belly.
      c2d.fillStyle = detail;
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * 0.6 + (k / 6) * Math.PI * 0.9;
        c2d.beginPath();
        c2d.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 1.6 * px, 0, Math.PI * 2);
        c2d.fill();
      }
      // A three-frond sprout from the base.
      c2d.strokeStyle = detail;
      c2d.lineWidth = 1.2 * px;
      for (let k = -1; k <= 1; k++) {
        c2d.beginPath();
        c2d.moveTo(0, r * 0.55);
        c2d.quadraticCurveTo(k * r * 0.25, r * 0.85, k * r * 0.4, r * 1.05);
        c2d.stroke();
      }
      c2d.restore();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      stamps = [];
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      stamps = [];
    },
  };
}
