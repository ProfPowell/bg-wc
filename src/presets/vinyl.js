// vinyl — a record on the platter. Fine groove rings in seeded bands, a
// rotating two-tone label with an off-center highlight so the spin reads,
// radial micro-scratches that turn with the disc, and a fixed light sheen
// the grooves rotate under. Pure function of t. density = groove fineness,
// intensity = sheen strength.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let bands = [];
  let scratches = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 37);
    bands = [];
    let r = 0.34; // label edge, in disc-radius units
    while (r < 1) {
      const step = (0.02 + rand() * 0.05) * (1.3 - params.density * 0.6);
      bands.push({ r0: r, r1: Math.min(1, r + step), tight: rand() < 0.5 });
      r += step + 0.012;
    }
    scratches = [];
    for (let i = 0; i < 26; i++) {
      scratches.push({
        a: rand() * Math.PI * 2,
        r0: 0.36 + rand() * 0.55,
        len: 0.02 + rand() * 0.05,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!bands.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const R = Math.min(w, h) * 0.44;
    const spin = t * 0.9; // 33⅓-ish at speed 1

    // The disc: near-black wax derived from fg-on-bg so it works both themes.
    c2d.fillStyle = rgbCss(mix(c.fg, c.bg, 0.88));
    c2d.beginPath();
    c2d.arc(cx, cy, R, 0, Math.PI * 2);
    c2d.fill();

    // Groove bands: fine rings, tighter bands ring closer.
    for (const b of bands) {
      const rings = b.tight ? 5 : 3;
      for (let k = 0; k < rings; k++) {
        const rr = R * (b.r0 + ((b.r1 - b.r0) * k) / rings);
        c2d.strokeStyle = rgbaCss(c.fg, 0.16);
        c2d.lineWidth = 1 * px;
        c2d.beginPath();
        c2d.arc(cx, cy, rr, 0, Math.PI * 2);
        c2d.stroke();
      }
    }

    // Micro-scratches rotate with the disc — this is what sells the spin.
    c2d.strokeStyle = rgbaCss(c.fg, 0.28);
    c2d.lineWidth = 1 * px;
    for (const sc of scratches) {
      const a = sc.a + spin;
      c2d.beginPath();
      c2d.arc(cx, cy, R * sc.r0, a, a + sc.len);
      c2d.stroke();
    }

    // Label: primary disc, accent sector so rotation reads, spindle hole.
    const Rl = R * 0.32;
    c2d.fillStyle = rgbCss(c.primary);
    c2d.beginPath();
    c2d.arc(cx, cy, Rl, 0, Math.PI * 2);
    c2d.fill();
    c2d.fillStyle = rgbCss(c.accent);
    c2d.beginPath();
    c2d.moveTo(cx, cy);
    c2d.arc(cx, cy, Rl, spin, spin + Math.PI * 0.4);
    c2d.closePath();
    c2d.fill();
    c2d.fillStyle = rgbCss(c.bg);
    c2d.beginPath();
    c2d.arc(cx, cy, 3.5 * px, 0, Math.PI * 2);
    c2d.fill();

    // Fixed sheen: two soft wedges that do NOT rotate.
    for (const base of [-0.6, Math.PI - 0.6]) {
      const grad = c2d.createRadialGradient(cx, cy, Rl, cx, cy, R);
      const sheen = mix(c.bg, [1, 1, 1], 0.6);
      grad.addColorStop(0, rgbaCss(sheen, 0));
      grad.addColorStop(0.7, rgbaCss(sheen, 0.1 * params.intensity));
      grad.addColorStop(1, rgbaCss(sheen, 0));
      c2d.save();
      c2d.beginPath();
      c2d.moveTo(cx, cy);
      c2d.arc(cx, cy, R, base, base + 0.5);
      c2d.closePath();
      c2d.clip();
      c2d.fillStyle = grad;
      c2d.fillRect(cx - R, cy - R, R * 2, R * 2);
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
      bands = [];
      scratches = [];
    },
  };
}
