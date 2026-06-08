// sinescroll — the Amiga demoscene sine scroller. A single line of big type
// scrolls right to left while each character bobs along a sine path, color
// cycling as it goes. Set the string with `text`. Text group.

import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss as rgb } from '../renderer/tokens.js';

const DEFAULT = 'GREETINGS FROM GL-WC ★ READS THE THEME ★ SCROLLS FOREVER ★    ';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let offset = 0;
  let lastT = 0;

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const text = params.text || DEFAULT;
    const fs = Math.round(h * 0.32);
    c2d.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
    c2d.textBaseline = 'middle';
    c2d.textAlign = 'left';

    const chars = [...text];
    const widths = chars.map((ch) => c2d.measureText(ch).width);
    const unit = widths.reduce((s, x) => s + x, 0) || 1;

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    offset = (offset + dt * 140) % unit;

    const midY = h / 2;
    const amp = h * (0.1 + params.intensity * 0.16);
    const freq = 0.9 + params.density * 1.6;

    let x = -offset;
    let gi = 0;
    while (x < w) {
      for (let k = 0; k < chars.length; k++) {
        const cw = widths[k];
        if (x + cw > 0 && x < w && chars[k] !== ' ') {
          const phase = (x / w) * Math.PI * 2 * freq + t * 3.0;
          const y = midY + Math.sin(phase) * amp;
          let col;
          if (params.palette === 'mono') col = rgb(c.fg);
          else if (params.palette === 'theme') col = rgb([c.primary, c.accent, c.info][gi % 3]);
          else col = `hsl(${(gi * 28 + t * 60) % 360},85%,62%)`; // rainbow default for the demoscene vibe
          c2d.fillStyle = col;
          c2d.fillText(chars[k], x, y);
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
