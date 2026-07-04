// bluenote — the Reid Miles jazz sleeve. A seeded off-grid composition of
// duotone tone blocks, thick rules, and a row of oversized dots; one block
// slides slowly against the grid. primary carries the duotone field,
// accent the dots, fg the rules. Pure function of t.
// density = element count, intensity = duotone depth.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let blocks = [];
  let rules = [];
  let dots = null;
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 31);
    const nb = 2 + Math.round(params.density * 2); // 2..4 tone blocks
    blocks = [];
    for (let i = 0; i < nb; i++) {
      blocks.push({
        x: rand() * 0.6,
        y: rand() * 0.55,
        bw: 0.25 + rand() * 0.4,
        bh: 0.2 + rand() * 0.35,
        tone: 0.25 + rand() * 0.5, // duotone depth position
        slide: i === 0, // the restless block
      });
    }
    const nr = 2 + Math.round(params.density * 3); // 2..5 rules
    rules = [];
    for (let i = 0; i < nr; i++) {
      rules.push({
        horiz: rand() < 0.6,
        at: 0.1 + rand() * 0.8,
        span0: rand() * 0.3,
        span1: 0.6 + rand() * 0.4,
        lw: (3 + rand() * 6) * px,
      });
    }
    dots = {
      y: 0.68 + rand() * 0.22,
      x0: 0.06 + rand() * 0.2,
      n: 3 + ((rand() * 4) | 0),
      r: 0.025 + rand() * 0.02,
      gap: 0.07 + rand() * 0.04,
    };
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!blocks.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const depth = 0.3 + params.intensity * 0.5;

    for (const b of blocks) {
      const slide = b.slide ? Math.sin(t * 0.12) * s * 0.04 : 0;
      c2d.fillStyle = rgbCss(mix(c.primary, c.bg, 1 - depth * b.tone - 0.2));
      c2d.fillRect(b.x * w + slide, b.y * h, b.bw * w, b.bh * h);
    }
    for (const r of rules) {
      c2d.fillStyle = rgbaCss(c.fg, 0.9);
      if (r.horiz) c2d.fillRect(r.span0 * w, r.at * h, (r.span1 - r.span0) * w, r.lw);
      else c2d.fillRect(r.at * w, r.span0 * h, r.lw, (r.span1 - r.span0) * h);
    }
    for (let i = 0; i < dots.n; i++) {
      const pulse = 1 + 0.06 * Math.sin(t * 0.5 + i * 1.3);
      c2d.fillStyle = rgbCss(c.accent);
      c2d.beginPath();
      c2d.arc((dots.x0 + i * dots.gap) * w, dots.y * h, dots.r * s * pulse, 0, Math.PI * 2);
      c2d.fill();
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
      blocks = [];
      rules = [];
      dots = null;
    },
  };
}
