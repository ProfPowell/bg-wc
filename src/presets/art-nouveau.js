// art-nouveau — whiplash-curve botanical borders. Seeded vine spines sweep in
// from the frame edges as long tapering S-curves; leaves and buds sprout at
// the curvature peaks, and a double frame line contains the composition. The
// tendril tips sway gently — everything is a pure function of t, so a frozen
// frame is a stable still. primary = vine, accent = blooms, fg = frame.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let vines = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 2);
    const n = 3 + Math.round(params.density * 4); // 3..7 spines
    vines = [];
    for (let i = 0; i < n; i++) {
      // Anchor on a frame edge; the spine is a chain of alternating S-curves.
      const edge = (rand() * 4) | 0;
      const a = 0.15 + rand() * 0.7;
      const start =
        edge === 0 ? [a, 0.02] : edge === 1 ? [0.98, a] : edge === 2 ? [a, 0.98] : [0.02, a];
      const inward = edge === 0 ? [0, 1] : edge === 1 ? [-1, 0] : edge === 2 ? [0, -1] : [1, 0];
      const segs = [];
      let heading = Math.atan2(inward[1], inward[0]) + (rand() - 0.5) * 0.6;
      let len = 0.16 + rand() * 0.12;
      for (let s = 0; s < 4 + ((rand() * 3) | 0); s++) {
        segs.push({
          len,
          bend: (s % 2 ? 1 : -1) * (0.7 + rand() * 0.9), // alternating whiplash
          leaf: rand() < 0.6,
          bud: rand() < 0.35,
        });
        len *= 0.78;
      }
      vines.push({ start, heading, segs, phase: rand() * Math.PI * 2, ci: (rand() * 3) | 0 });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!vines.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const sway = 0.12 * Math.sin(t * 0.4);

    // Double frame.
    c2d.strokeStyle = rgbaCss(c.fg, 0.55);
    c2d.lineWidth = 2 * px;
    c2d.strokeRect(s * 0.03, s * 0.03, w - s * 0.06, h - s * 0.06);
    c2d.lineWidth = 1 * px;
    c2d.strokeRect(s * 0.055, s * 0.055, w - s * 0.11, h - s * 0.11);

    const vineCss = rgbCss(c.primary);
    const bloomCss = rgbCss(c.accent);
    c2d.lineCap = 'round';

    for (const v of vines) {
      let x = v.start[0] * w;
      let y = v.start[1] * h;
      let heading = v.heading;
      let width = (5 + params.intensity * 4) * px;
      for (let i = 0; i < v.segs.length; i++) {
        const seg = v.segs[i];
        const tipSway = i === v.segs.length - 1 ? sway + 0.1 * Math.sin(t * 0.7 + v.phase) : 0;
        const bend = seg.bend + tipSway;
        const L = seg.len * s;
        // Quadratic S-curve: control point off to one side of the chord.
        const midA = heading + bend * 0.5;
        const cx = x + Math.cos(midA) * L * 0.6;
        const cy = y + Math.sin(midA) * L * 0.6;
        const endA = heading + bend;
        const ex = x + Math.cos(endA) * L;
        const ey = y + Math.sin(endA) * L;
        c2d.strokeStyle = vineCss;
        c2d.lineWidth = Math.max(1, width);
        c2d.beginPath();
        c2d.moveTo(x, y);
        c2d.quadraticCurveTo(cx, cy, ex, ey);
        c2d.stroke();
        // Leaf: a lens of two arcs off the curvature peak.
        if (seg.leaf) {
          const la = midA + Math.PI / 2;
          const lx = cx + Math.cos(la) * 4 * px;
          const ly = cy + Math.sin(la) * 4 * px;
          const ll = L * 0.28;
          c2d.fillStyle = rgbaCss(c.primary, 0.8);
          c2d.beginPath();
          c2d.moveTo(lx, ly);
          c2d.quadraticCurveTo(
            lx + Math.cos(la - 0.5) * ll,
            ly + Math.sin(la - 0.5) * ll,
            lx + Math.cos(la) * ll * 1.4,
            ly + Math.sin(la) * ll * 1.4
          );
          c2d.quadraticCurveTo(lx + Math.cos(la + 0.5) * ll, ly + Math.sin(la + 0.5) * ll, lx, ly);
          c2d.fill();
        }
        // Bud/bloom at the joint.
        if (seg.bud) {
          c2d.fillStyle = bloomCss;
          c2d.beginPath();
          c2d.arc(
            ex,
            ey,
            (2.5 + width * 0.4) * (1 + 0.15 * Math.sin(t * 0.6 + v.phase + i)),
            0,
            Math.PI * 2
          );
          c2d.fill();
        }
        x = ex;
        y = ey;
        heading = endA;
        width *= 0.72; // taper
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
      vines = [];
    },
  };
}
