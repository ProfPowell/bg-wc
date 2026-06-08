// matrix — falling digital rain. Each column drops a stream of glyphs; a
// translucent bg fill each frame leaves fading trails, and the leading
// glyph is drawn bright. The 90s hacker aesthetic. Canvas2D.

import { mulberry32 } from '../util/pause.js';

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌ0123456789:.=*+-<>';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let cols = 0;
  let fontSize = 16;
  let drops = []; // y pixel position of each column head
  let rand = mulberry32(1);
  let lastSeed = null;
  let lastDensity = null;
  let lastT = 0;

  function rebuild(params) {
    lastDensity = params.density;
    // density → glyph size (denser = smaller glyphs = more columns)
    fontSize = Math.round(22 - params.density * 12);
    fontSize = Math.max(9, fontSize);
    cols = Math.max(1, Math.ceil(w / fontSize));
    drops = new Array(cols);
    for (let i = 0; i < cols; i++) drops[i] = Math.floor(rand() * -(h / fontSize));
  }

  function ensure(params) {
    if (params.seed !== lastSeed) {
      rand = mulberry32(params.seed || 1);
      lastSeed = params.seed;
      rebuild(params);
    } else if (params.density !== lastDensity) {
      // Density changed (without a new seed): rebuild columns, keep the stream.
      rebuild(params);
    }
    if (!drops.length) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();

    // Trailing fade: translucent bg fill (fall back to near-black if the
    // theme bg is transparent, since trails need something to fade into).
    const bg = c.bg[3] > 0.01 ? c.bg : [0.02, 0.04, 0.02, 1];
    c2d.globalCompositeOperation = 'source-over';
    c2d.fillStyle = `rgba(${(bg[0] * 255) | 0},${(bg[1] * 255) | 0},${(bg[2] * 255) | 0},0.10)`;
    c2d.fillRect(0, 0, w, h);

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;

    const head = c.fg || [0.8, 1, 0.8, 1];
    const trail = c.primary;
    const headStyle = `rgb(${Math.min(255, head[0] * 255 + 80) | 0},${Math.min(255, head[1] * 255 + 80) | 0},${Math.min(255, head[2] * 255 + 80) | 0})`;
    const trailStyle = `rgb(${(trail[0] * 255) | 0},${(trail[1] * 255) | 0},${(trail[2] * 255) | 0})`;

    c2d.font = `${fontSize}px ui-monospace, monospace`;
    c2d.textBaseline = 'top';

    // Advance roughly fontSize per step; host already speed-scales dt.
    const step = 14 * dt; // rows per frame
    for (let i = 0; i < cols; i++) {
      const x = i * fontSize;
      const yRow = drops[i];
      const y = yRow * fontSize;
      const ch = GLYPHS[(rand() * GLYPHS.length) | 0];
      // trail glyph
      c2d.fillStyle = trailStyle;
      c2d.fillText(ch, x, y);
      // bright head one row above the new position
      c2d.fillStyle = headStyle;
      c2d.fillText(GLYPHS[(rand() * GLYPHS.length) | 0], x, y + fontSize);

      drops[i] += step;
      if (drops[i] * fontSize > h && rand() > 0.975) drops[i] = 0;
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      rebuild({ density: lastDensity ?? 0.5, seed: lastSeed ?? 1 });
    },
    frame(t, params) {
      frame(t, params);
    },
    staticFrame(params) {
      // Single still: scatter glyph columns at random heights.
      ensure(params);
      const c = getColors();
      const bg = c.bg[3] > 0.01 ? c.bg : [0.02, 0.04, 0.02, 1];
      c2d.fillStyle = `rgb(${(bg[0] * 255) | 0},${(bg[1] * 255) | 0},${(bg[2] * 255) | 0})`;
      c2d.fillRect(0, 0, w, h);
      const r = mulberry32(params.seed || 1);
      const trail = c.primary;
      c2d.font = `${fontSize}px ui-monospace, monospace`;
      c2d.textBaseline = 'top';
      c2d.fillStyle = `rgb(${(trail[0] * 255) | 0},${(trail[1] * 255) | 0},${(trail[2] * 255) | 0})`;
      for (let i = 0; i < cols; i++) {
        const tail = 3 + ((r() * 12) | 0);
        const head = (r() * (h / fontSize)) | 0;
        for (let k = 0; k < tail; k++) {
          c2d.globalAlpha = 1 - k / tail;
          c2d.fillText(GLYPHS[(r() * GLYPHS.length) | 0], i * fontSize, (head - k) * fontSize);
        }
      }
      c2d.globalAlpha = 1;
    },
    dispose() {
      drops = [];
    },
  };
}
