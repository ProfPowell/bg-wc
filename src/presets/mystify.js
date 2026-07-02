// mystify — the Windows "Mystify" screensaver. Two polygons whose vertices
// bounce around the viewport leave fading trails as they morph. Translucent
// bg fill each frame makes the wake. Retro group.

import { mulberry32 } from '../util/pause.js';
import { rgbCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let shapes = [];
  let rand = mulberry32(1);
  let lastSeed = null;
  let lastT = 0;

  function makeShape(palIdx) {
    const n = 4;
    const pts = [];
    for (let i = 0; i < n; i++) {
      pts.push({
        x: rand(),
        y: rand(),
        vx: (rand() - 0.5) * 0.5,
        vy: (rand() - 0.5) * 0.5,
      });
    }
    return { pts, palIdx };
  }

  function rebuild(params) {
    rand = mulberry32(params.seed || 1);
    const count = 1 + Math.round(params.density * 2); // 1–3 shapes
    shapes = [];
    for (let i = 0; i < count; i++) shapes.push(makeShape(i));
    lastSeed = params.seed;
  }

  function ensure(params) {
    if (!shapes.length || params.seed !== lastSeed) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();

    // Trailing wake: erase alpha instead of compositing a translucent bg
    // fill — the fill stalls on 8-bit rounding at a color that is NOT the
    // bg, burning ghost polylines into the canvas (gl-wc-4vy; same class
    // as matrix's gl-wc-kq9). Erasing decays the wake toward transparent
    // and the host's own background shows through.
    c2d.globalCompositeOperation = 'destination-out';
    c2d.fillStyle = 'rgba(0,0,0,0.08)';
    c2d.fillRect(0, 0, w, h);
    c2d.globalCompositeOperation = 'source-over';

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    const sp = dt;

    const palette = [c.primary, c.accent, c.info];
    c2d.lineWidth = 2 * px;
    c2d.lineJoin = 'round';

    for (const s of shapes) {
      for (const p of s.pts) {
        p.x += p.vx * sp;
        p.y += p.vy * sp;
        if (p.x < 0) {
          p.x = 0;
          p.vx = Math.abs(p.vx);
        } else if (p.x > 1) {
          p.x = 1;
          p.vx = -Math.abs(p.vx);
        }
        if (p.y < 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy);
        } else if (p.y > 1) {
          p.y = 1;
          p.vy = -Math.abs(p.vy);
        }
      }
      // Color cycles slowly through the theme tints.
      const col = palette[(s.palIdx + Math.floor(t * 0.2)) % palette.length];
      c2d.strokeStyle = rgbCss(col);
      c2d.beginPath();
      for (let i = 0; i < s.pts.length; i++) {
        const p = s.pts[i];
        if (i) c2d.lineTo(p.x * w, p.y * h);
        else c2d.moveTo(p.x * w, p.y * h);
      }
      c2d.closePath();
      c2d.stroke();
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
      // No wake — draw the shapes once on a clean field.
      ensure(params);
      const c = getColors();
      const bg = c.bg[3] > 0.01 ? c.bg : [0.02, 0.02, 0.05, 1];
      c2d.fillStyle = rgbCss(bg);
      c2d.fillRect(0, 0, w, h);
      const palette = [c.primary, c.accent, c.info];
      c2d.lineWidth = 2 * px;
      for (const s of shapes) {
        const col = palette[s.palIdx % palette.length];
        c2d.strokeStyle = rgbCss(col);
        c2d.beginPath();
        for (let i = 0; i < s.pts.length; i++) {
          const p = s.pts[i];
          if (i) c2d.lineTo(p.x * w, p.y * h);
          else c2d.moveTo(p.x * w, p.y * h);
        }
        c2d.closePath();
        c2d.stroke();
      }
    },
    dispose() {
      shapes = [];
    },
  };
}
