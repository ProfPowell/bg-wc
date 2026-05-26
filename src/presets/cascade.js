// cascade — a word assembles letter-by-letter: each glyph drops from above
// and bounces into place on a stagger, holds, then the cycle repeats. Set
// the word with `text`. Text group.

import { clearAndFill } from '../renderer/canvas2d.js';

const DEFAULT = 'BG·WC';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;

  function rgb(c) {
    return `rgb(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0})`;
  }

  // Bounce-out easing toward a settled value of 1.
  function bounce(x) {
    if (x < 0) return 0;
    if (x >= 1) return 1;
    const n1 = 7.5625,
      d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) {
      x -= 1.5 / d1;
      return n1 * x * x + 0.75;
    }
    if (x < 2.5 / d1) {
      x -= 2.25 / d1;
      return n1 * x * x + 0.9375;
    }
    x -= 2.625 / d1;
    return n1 * x * x + 0.984375;
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const chars = [...(params.text || DEFAULT)];
    const fs = Math.round(Math.min(h * 0.34, (w * 1.4) / Math.max(chars.length, 1)));
    c2d.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
    c2d.textBaseline = 'middle';
    c2d.textAlign = 'center';

    const widths = chars.map((ch) => c2d.measureText(ch).width);
    const totalW = widths.reduce((s, x) => s + x, 0);
    const midY = h / 2;

    // Cycle: stagger letters in, hold, restart. speed scales the tempo.
    const stagger = 0.18;
    const inDur = 0.7;
    const hold = 1.6;
    const cycle = chars.length * stagger + inDur + hold;
    const tt = (t * params.speed) % cycle;

    let x = (w - totalW) / 2;
    for (let i = 0; i < chars.length; i++) {
      const cw = widths[i];
      const cx = x + cw / 2;
      const local = (tt - i * stagger) / inDur; // 0..1 drop-in window
      let y, alpha;
      if (local <= 0) {
        x += cw;
        continue;
      } // not yet arrived
      if (local >= 1) {
        y = midY;
        alpha = 1;
      } else {
        const b = bounce(local);
        y = -fs + (midY + fs) * b; // drop from above to midY
        alpha = Math.min(1, local * 2);
      }
      let col;
      if (params.palette === 'rainbow') col = `hsl(${(i * 40) % 360},85%,62%)`;
      else if (params.palette === 'mono') col = rgb(c.fg);
      else col = rgb([c.primary, c.accent, c.info][i % 3]);
      c2d.globalAlpha = alpha;
      c2d.fillStyle = col;
      c2d.fillText(chars[i], cx, y);
      c2d.globalAlpha = 1;
      x += cw;
    }
  }

  function settled(params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const chars = [...(params.text || DEFAULT)];
    const fs = Math.round(Math.min(h * 0.34, (w * 1.4) / Math.max(chars.length, 1)));
    c2d.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
    c2d.textBaseline = 'middle';
    c2d.textAlign = 'center';
    const widths = chars.map((ch) => c2d.measureText(ch).width);
    const totalW = widths.reduce((s, x) => s + x, 0);
    let x = (w - totalW) / 2;
    for (let i = 0; i < chars.length; i++) {
      const cw = widths[i];
      let col;
      if (params.palette === 'rainbow') col = `hsl(${(i * 40) % 360},85%,62%)`;
      else if (params.palette === 'mono') col = rgb(c.fg);
      else col = rgb([c.primary, c.accent, c.info][i % 3]);
      c2d.fillStyle = col;
      c2d.fillText(chars[i], x + cw / 2, h / 2);
      x += cw;
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
      settled(params);
    },
    dispose() {},
  };
}
