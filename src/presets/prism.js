// prism — the Hipgnosis triangle. A thin beam enters the left face of a
// centered prism and leaves the right face as a six-band spectrum fan; the
// entry angle drifts a few degrees and the bands shimmer. Spectrum bands
// are theme colors (plus one mixed sixth), so the sleeve reads on any
// ground. Pure function of t. density = fan spread, intensity = band
// brightness. seed nudges the prism off exact center.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let off = null;

  function ensure(params) {
    if (off && off.seed === (params.seed | 0)) return;
    const rand = mulberry32(params.seed | 0 || 41);
    off = { seed: params.seed | 0, dx: (rand() - 0.5) * 0.08, dy: (rand() - 0.5) * 0.06 };
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const cx = w * (0.5 + off.dx);
    const cy = h * (0.52 + off.dy);
    const T = s * 0.22; // prism half-size

    // Prism vertices: equilateral, point up.
    const top = [cx, cy - T];
    const left = [cx - T * 0.87, cy + T * 0.5];
    const right = [cx + T * 0.87, cy + T * 0.5];

    // Incoming beam to the midpoint of the left face; angle drifts.
    const entry = [(top[0] + left[0]) / 2, (top[1] + left[1]) / 2];
    const drift = Math.sin(t * 0.15) * 0.07;
    const beamA = Math.atan2(entry[1] - cy * 0.2, entry[0] + w * 0.1) + drift;
    c2d.strokeStyle = rgbaCss(c.fg, 0.9);
    c2d.lineWidth = 2 * px;
    c2d.beginPath();
    c2d.moveTo(entry[0] - Math.cos(beamA) * w, entry[1] - Math.sin(beamA) * w);
    c2d.lineTo(entry[0], entry[1]);
    c2d.stroke();

    // Refraction hint inside the glass.
    const exit = [(top[0] + right[0]) / 2, (top[1] + right[1]) / 2];
    c2d.strokeStyle = rgbaCss(c.fg, 0.25);
    c2d.beginPath();
    c2d.moveTo(entry[0], entry[1]);
    c2d.lineTo(exit[0], exit[1]);
    c2d.stroke();

    // The spectrum fan.
    const pal = [c.primary, c.accent, c.info, c.success, c.warning, mix(c.primary, c.info, 0.5)];
    const spread = 0.28 + params.density * 0.3;
    const base = Math.atan2(exit[1] - entry[1], exit[0] - entry[0]) - spread / 2 + drift * 0.4;
    const reach = Math.hypot(w, h);
    for (let i = 0; i < pal.length; i++) {
      const a0 = base + (i / pal.length) * spread;
      const a1 = base + ((i + 1) / pal.length) * spread;
      const shimmer = 0.75 + 0.15 * Math.sin(t * 0.6 + i * 0.9);
      c2d.fillStyle = rgbaCss(pal[i], (0.45 + params.intensity * 0.45) * shimmer);
      c2d.beginPath();
      c2d.moveTo(exit[0], exit[1]);
      c2d.lineTo(exit[0] + Math.cos(a0) * reach, exit[1] + Math.sin(a0) * reach);
      c2d.lineTo(exit[0] + Math.cos(a1) * reach, exit[1] + Math.sin(a1) * reach);
      c2d.closePath();
      c2d.fill();
    }

    // The prism outline sits on top of everything.
    c2d.strokeStyle = rgbaCss(c.fg, 0.95);
    c2d.lineWidth = 2.5 * px;
    c2d.beginPath();
    c2d.moveTo(top[0], top[1]);
    c2d.lineTo(right[0], right[1]);
    c2d.lineTo(left[0], left[1]);
    c2d.closePath();
    c2d.stroke();
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
      off = null;
    },
  };
}
