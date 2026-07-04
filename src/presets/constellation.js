// constellation — a charted sky. A seeded twinkling star field, plus a few
// constellation figures: star chains joined by thin lines, the brightest
// star ringed like a catalog plate. Stars and lines are drawn in fg, so on
// light themes the preset reads as an ink star chart. Pure function of t.
// density = star count and figure count, intensity = twinkle depth.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let stars = [];
  let figures = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 19);
    const n = Math.floor(90 + params.density * 220);
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: rand(),
        y: rand(),
        r: (0.5 + rand() * 1.3) * px,
        tw: 0.5 + rand() * 2.2,
        phase: rand() * Math.PI * 2,
      });
    }
    figures = [];
    const nf = 2 + Math.round(params.density * 2);
    for (let f = 0; f < nf; f++) {
      // A figure is a short random walk of bright stars.
      let x = 0.15 + rand() * 0.7;
      let y = 0.12 + rand() * 0.6;
      const pts = [[x, y]];
      const steps = 4 + ((rand() * 4) | 0);
      for (let s = 0; s < steps; s++) {
        x = Math.min(0.95, Math.max(0.05, x + (rand() - 0.5) * 0.22));
        y = Math.min(0.85, Math.max(0.05, y + (rand() - 0.5) * 0.18));
        pts.push([x, y]);
      }
      figures.push({ pts, bright: (rand() * pts.length) | 0, phase: rand() * Math.PI * 2 });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!stars.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    // A faint zenith glow gives the sky depth.
    const glow = c2d.createRadialGradient(
      w * 0.5,
      h * 0.25,
      0,
      w * 0.5,
      h * 0.25,
      Math.max(w, h) * 0.7
    );
    glow.addColorStop(0, rgbaCss(c.primary, 0.08));
    glow.addColorStop(1, rgbaCss(c.primary, 0));
    c2d.fillStyle = glow;
    c2d.fillRect(0, 0, w, h);

    const depth = 0.25 + params.intensity * 0.5;
    for (const s of stars) {
      const a = 0.35 + depth * Math.sin(t * s.tw + s.phase) * 0.5 + depth * 0.5;
      c2d.fillStyle = rgbaCss(c.fg, Math.max(0.08, Math.min(1, a)));
      c2d.beginPath();
      c2d.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      c2d.fill();
    }

    for (const f of figures) {
      c2d.strokeStyle = rgbaCss(c.fg, 0.35);
      c2d.lineWidth = 1 * px;
      c2d.beginPath();
      f.pts.forEach(([x, y], i) => {
        if (i === 0) c2d.moveTo(x * w, y * h);
        else c2d.lineTo(x * w, y * h);
      });
      c2d.stroke();
      f.pts.forEach(([x, y], i) => {
        const bright = i === f.bright;
        const pulse = bright ? 0.15 * Math.sin(t * 0.8 + f.phase) : 0;
        c2d.fillStyle = rgbaCss(c.accent, 0.85 + pulse);
        c2d.beginPath();
        c2d.arc(x * w, y * h, (bright ? 2.6 : 1.7) * px, 0, Math.PI * 2);
        c2d.fill();
        if (bright) {
          c2d.strokeStyle = rgbaCss(c.accent, 0.5);
          c2d.beginPath();
          c2d.arc(x * w, y * h, 6 * px, 0, Math.PI * 2);
          c2d.stroke();
        }
      });
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
      stars = [];
      figures = [];
    },
  };
}
