// particles — generic colored drift. Honors palette: "theme" | "rainbow" | "mono".

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss } from '../renderer/tokens.js';

const CAPS = { low: 150, med: 500, high: 1500 };

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let parts = [];
  let lastKey = '';
  let lastT = 0;

  function rebuild(params) {
    const cap = CAPS[params.quality] || CAPS.med;
    const n = Math.floor(40 + cap * params.density);
    const rand = mulberry32(params.seed || 11);
    parts = new Array(n);
    for (let i = 0; i < n; i++) {
      const ang = rand() * Math.PI * 2;
      const sp = 0.01 + rand() * 0.05;
      parts[i] = {
        x: rand(),
        y: rand(),
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        r: 1 + rand() * 3,
        hue: rand(), // 0..1
      };
    }
    lastKey = `${params.seed}|${params.density}|${params.quality}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${params.quality}`;
    if (parts.length === 0 || key !== lastKey) rebuild(params);
  }

  function pickColor(p, palette, colors) {
    if (palette === 'rainbow') {
      // hsl 0..360, 70% sat, 60% light
      return `hsl(${(p.hue * 360).toFixed(1)}, 70%, 60%)`;
    }
    if (palette === 'mono') {
      const fg = colors.fg;
      return rgbCss(fg);
    }
    // theme — cycle through primary/accent/info
    const slot = p.hue < 0.34 ? colors.primary : p.hue < 0.67 ? colors.accent : colors.info;
    return rgbCss(slot);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    // Integrate from t (already speed-scaled by the host), never per rAF tick:
    // per-tick steps ignore `speed` and run 2x faster at 120 Hz. A jump or
    // rewind of the time base (staticFrame, reload) draws without advancing.
    let dt = t - lastT;
    lastT = t;
    if (!(dt >= 0) || dt > 1) dt = 0;

    const intMul = (0.5 + params.intensity * 1.5) * 24 * dt;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.x += p.vx * intMul;
      p.y += p.vy * intMul;
      if (p.x < 0) p.x += 1;
      else if (p.x > 1) p.x -= 1;
      if (p.y < 0) p.y += 1;
      else if (p.y > 1) p.y -= 1;
      c2d.fillStyle = pickColor(p, params.palette, c);
      c2d.beginPath();
      c2d.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
      c2d.fill();
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
      frame(0, params);
    },
    dispose() {
      parts = [];
    },
  };
}
