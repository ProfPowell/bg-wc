// mudcloth — bogolanfini bands. Horizontal strips, each filled with one
// hand-drawn symbol row (zigzag, dot rows, ticks, diamonds, crosses); every
// stroke carries seeded jitter so nothing is ruler-straight. The cloth
// scrolls slowly — row content derives from the absolute row index, so the
// scroll is an exact function of t and stills are stable. fg symbols on the
// theme bg; density = band count, intensity = stroke weight.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

const KINDS = 5; // zigzag, dots, ticks, diamonds, crosses

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;

  // Deterministic per-row values derived from seed + absolute row index.
  function rowRand(seed, row) {
    return mulberry32(((seed | 0 || 7) * 2654435761) ^ (row * 40503));
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const bands = 6 + Math.round(params.density * 8);
    const bandH = h / bands;
    const ink = rgbaCss(c.fg, 0.92);
    const lw = (1.6 + params.intensity * 2.2) * px;
    const scroll = t * bandH * 0.12; // slow upward drift, pure in t
    const firstRow = Math.floor(scroll / bandH);
    c2d.strokeStyle = ink;
    c2d.fillStyle = ink;
    c2d.lineWidth = lw;
    c2d.lineCap = 'round';

    for (let r = firstRow; r <= firstRow + bands + 1; r++) {
      const y0 = r * bandH - scroll;
      const rand = rowRand(params.seed, r);
      const kind = (rand() * KINDS) | 0;
      const jit = () => (rand() - 0.5) * 2.4 * px;
      const midY = y0 + bandH / 2;
      const step = bandH * (0.8 + rand() * 0.5);

      // Band separator line, hand-wavering.
      c2d.beginPath();
      for (let x = 0; x <= w; x += 14 * px) {
        const yy = y0 + jit() * 0.6;
        if (x === 0) c2d.moveTo(x, yy);
        else c2d.lineTo(x, yy);
      }
      c2d.stroke();

      for (let x = step / 2; x < w + step; x += step) {
        if (kind === 0) {
          // zigzag
          c2d.beginPath();
          c2d.moveTo(x - step / 2 + jit(), midY + bandH * 0.22 + jit());
          c2d.lineTo(x + jit(), midY - bandH * 0.22 + jit());
          c2d.lineTo(x + step / 2 + jit(), midY + bandH * 0.22 + jit());
          c2d.stroke();
        } else if (kind === 1) {
          // dot pair
          for (const dy of [-0.15, 0.15]) {
            c2d.beginPath();
            c2d.arc(x + jit(), midY + bandH * dy + jit(), lw * 0.9, 0, Math.PI * 2);
            c2d.fill();
          }
        } else if (kind === 2) {
          // tick fence
          c2d.beginPath();
          c2d.moveTo(x + jit(), midY - bandH * 0.24 + jit());
          c2d.lineTo(x + jit(), midY + bandH * 0.24 + jit());
          c2d.stroke();
        } else if (kind === 3) {
          // hollow diamond
          c2d.beginPath();
          c2d.moveTo(x + jit(), midY - bandH * 0.24 + jit());
          c2d.lineTo(x + step * 0.22 + jit(), midY + jit());
          c2d.lineTo(x + jit(), midY + bandH * 0.24 + jit());
          c2d.lineTo(x - step * 0.22 + jit(), midY + jit());
          c2d.closePath();
          c2d.stroke();
        } else {
          // cross
          c2d.beginPath();
          c2d.moveTo(x - step * 0.16 + jit(), midY - bandH * 0.18 + jit());
          c2d.lineTo(x + step * 0.16 + jit(), midY + bandH * 0.18 + jit());
          c2d.moveTo(x + step * 0.16 + jit(), midY - bandH * 0.18 + jit());
          c2d.lineTo(x - step * 0.16 + jit(), midY + bandH * 0.18 + jit());
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
    dispose() {},
  };
}
