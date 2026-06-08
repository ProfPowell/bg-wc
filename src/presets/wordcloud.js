// wordcloud — a drifting, breathing word cloud. Words come from the `text`
// attribute (split on "|" or ","); each gets a size weight, slow drift, and
// a fade cycle so the cloud continually re-forms. Pair with an opaque
// content panel on top. Dataviz group.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss as rgba } from '../renderer/tokens.js';

const DEFAULT =
  'bg-wc|webgl|canvas|shader|theme|tokens|preset|gradient|aurora|plasma|vector|retro|pixels|noise|motion|render|frame|glow|particles|dataviz|surface|ambient';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let words = [];
  let lastKey = '';

  function build(params) {
    const list = (params.text || DEFAULT)
      .split(/[|,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const rand = mulberry32(params.seed || 1);
    words = list.map((word, i) => ({
      word,
      x: 0.08 + rand() * 0.84,
      y: 0.12 + rand() * 0.76,
      weight: 0.4 + rand() * 0.6,
      ph: rand() * 6.28,
      dx: (rand() - 0.5) * 0.01,
      dy: (rand() - 0.5) * 0.01,
      tint: i % 3,
    }));
    lastKey = `${params.seed}|${params.text}`;
  }

  function frame(t, params) {
    const key = `${params.seed}|${params.text}`;
    if (!words.length || key !== lastKey) build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const tints = [c.primary, c.accent, c.info];
    const base = Math.min(w, h);
    c2d.textAlign = 'center';
    c2d.textBaseline = 'middle';

    for (const wd of words) {
      const fs = base * (0.03 + wd.weight * 0.07);
      // slow drift, wrapping
      const x = (((wd.x + wd.dx * t) % 1) + 1) % 1;
      const y = (((wd.y + wd.dy * t) % 1) + 1) % 1;
      // breathing alpha so the cloud re-forms
      const a = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * 0.5 + wd.ph));
      c2d.font = `600 ${fs}px Inter, system-ui, sans-serif`;
      c2d.fillStyle = rgba(tints[wd.tint], a);
      c2d.fillText(wd.word, x * w, y * h);
    }
    c2d.textAlign = 'left';
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
      frame(1.5, params);
    },
    dispose() {
      words = [];
    },
  };
}
