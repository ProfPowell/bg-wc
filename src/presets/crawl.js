// crawl — a Star Wars-style perspective text crawl. Lines (split on "|")
// recede upward toward a vanishing line, shrinking and fading. Set the
// copy with the `text` attribute. Text group.

import { clearAndFill } from '../renderer/canvas2d.js';

const DEFAULT =
  'A long time ago|in a codebase|far, far away…||bg-wc renders|text in the|graphics layer.';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let scroll = 0;
  let lastT = 0;

  function rgb(c, a) {
    return `rgba(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0},${a})`;
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const lines = (params.text || DEFAULT).split('|');
    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;

    const lineGap = h * 0.13;
    const total = lines.length * lineGap + h; // loop length
    scroll = (scroll + dt * params.speed * h * 0.1) % total;

    const baseFs = h * 0.075;
    c2d.textAlign = 'center';
    c2d.textBaseline = 'middle';

    const horizon = h * 0.12; // vanishing line near the top
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      // dist: distance the line has travelled up from the bottom.
      const dist = scroll - i * lineGap;
      if (dist < 0 || dist > total - h * 0.2) continue;
      const p = dist / (h - horizon); // 0 bottom → ~1 at horizon
      if (p > 1) continue;
      // Perspective compression: ease toward the horizon, shrink + fade.
      const y = h - dist * (1 - p * 0.55);
      if (y < horizon) continue;
      const scale = Math.max(0.15, 1 - p * 0.8);
      const alpha = Math.min(1, (1 - p) * 1.4) * (params.intensity * 0.4 + 0.6);
      const fs = baseFs * scale;
      c2d.font = `700 ${fs}px "Arial Black", Arial, sans-serif`;
      let col;
      if (params.palette === 'rainbow') col = `hsla(${(i * 40) % 360},85%,62%,${alpha})`;
      else if (params.palette === 'mono') col = rgb(c.fg, alpha);
      else col = rgb(c.primary, alpha); // classic single tint (set primary to gold)
      c2d.fillStyle = col;
      c2d.fillText(line, w / 2, y);
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
      scroll = h * 0.5;
      frame(0, params);
    },
    dispose() {},
  };
}
