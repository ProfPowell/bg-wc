// marquee — a scrolling vector ticker. Outline (vector) type flows right to
// left, repeating to fill the width; per-character coloring flows with it.
// Set the string with the `text` attribute. Text group.

import { clearAndFill } from '../renderer/canvas2d.js';

const DEFAULT = 'GL·WC ★ VANILLA BREEZE ★ ';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let offset = 0;
  let lastT = 0;

  function rgb(c) {
    return `rgb(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0})`;
  }
  function colorFor(palette, i, c) {
    if (palette === 'rainbow') return `hsl(${(i * 32) % 360},85%,62%)`;
    if (palette === 'mono') return rgb(c.fg);
    const pal = [c.primary, c.accent, c.info];
    return rgb(pal[i % 3]);
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const text = params.text || DEFAULT;
    const fs = Math.round(h * 0.46);
    c2d.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
    c2d.textBaseline = 'middle';
    c2d.lineJoin = 'round';

    const chars = [...text];
    const widths = chars.map((ch) => c2d.measureText(ch).width);
    const unit = widths.reduce((s, x) => s + x, 0) || 1;

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    offset = (offset + dt * params.speed * 120) % unit;

    const midY = h / 2;
    const lw = Math.max(1.5, fs * 0.03);
    let x = -offset;
    let gi = 0;
    while (x < w) {
      for (let k = 0; k < chars.length; k++) {
        const cw = widths[k];
        if (x + cw > 0 && x < w && chars[k] !== ' ') {
          const col = colorFor(params.palette, gi, c);
          c2d.strokeStyle = col;
          c2d.lineWidth = lw;
          c2d.strokeText(chars[k], x, midY);
          if (params.intensity > 0.5) {
            // fill the outline above mid intensity
            c2d.globalAlpha = (params.intensity - 0.5) * 1.6;
            c2d.fillStyle = col;
            c2d.fillText(chars[k], x, midY);
            c2d.globalAlpha = 1;
          }
        }
        x += cw;
        gi++;
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      frame(t, params);
    },
    staticFrame(params) {
      lastT = 0;
      offset = 0;
      frame(0, params);
    },
    dispose() {},
  };
}
