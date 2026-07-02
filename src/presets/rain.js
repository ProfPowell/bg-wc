// rain — layered rainfall. Angled streaks with depth (near drops are faster,
// longer, brighter) falling to a per-drop ground line, where each landing
// spawns an expanding splash ripple. Streaks and ripples tint the theme info
// color over the theme bg. intensity = storm strength (speed, slant, streak
// length); density = drop count.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

const CAPS = { low: 120, med: 320, high: 700 };

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let drops = [];
  let ripples = [];
  let lastKey = '';
  let lastT = 0;

  function rebuild(params) {
    const cap = CAPS[params.quality] || CAPS.med;
    const n = Math.floor(30 + cap * params.density);
    const rand = mulberry32(params.seed | 0 || 5);
    drops = new Array(n);
    for (let i = 0; i < n; i++) {
      drops[i] = {
        x: rand(),
        y: rand(),
        depth: rand(), // 0 far .. 1 near
        ground: 0.8 + rand() * 0.17, // normalized landing line near the bottom
      };
    }
    ripples = [];
    lastKey = `${params.seed}|${params.density}|${params.quality}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${params.quality}`;
    if (!drops.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    let dt = t - lastT;
    lastT = t;
    if (!(dt >= 0) || dt > 1) dt = 0;

    const storm = 0.3 + params.intensity * 1.4; // fall speed multiplier
    const slant = 0.08 + params.intensity * 0.22; // horizontal drift per unit fall
    c2d.lineCap = 'round';

    for (const d of drops) {
      const fall = (0.5 + d.depth * 0.9) * storm * dt; // normalized units/s
      d.y += fall;
      d.x = (d.x + fall * slant + 1) % 1;
      if (d.y >= d.ground) {
        ripples.push({ x: d.x, y: d.ground, r: 0, max: (6 + d.depth * 18) * px });
        // Respawn at the top, keeping the overshoot; wrap in case a large
        // clamped dt pushed the drop more than one ground-length past.
        while (d.y >= d.ground) d.y -= d.ground;
      }
      const len = (5 + d.depth * 16) * (0.6 + params.intensity) * px;
      c2d.strokeStyle = rgbaCss(c.info, 0.2 + d.depth * 0.55);
      c2d.lineWidth = (0.7 + d.depth * 0.9) * px;
      c2d.beginPath();
      c2d.moveTo(d.x * w, d.y * h);
      // Streak tail leans harder than the drift (`slant * 3`): visual tuning
      // so the storm reads angled rather than merely drifting sideways.
      c2d.lineTo(d.x * w - len * slant * 3, d.y * h - len);
      c2d.stroke();
    }

    // Splash ripples: flattened expanding ellipses fading out by radius.
    c2d.lineWidth = 1 * px;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += (30 + 60 * params.intensity) * px * dt;
      const a = 1 - rp.r / rp.max;
      if (a <= 0) {
        ripples.splice(i, 1);
        continue;
      }
      c2d.strokeStyle = rgbaCss(c.info, a * 0.45);
      c2d.beginPath();
      c2d.ellipse(rp.x * w, rp.y * h, rp.r, rp.r * 0.28, 0, 0, Math.PI * 2);
      c2d.stroke();
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
      drops = [];
      ripples = [];
    },
  };
}
