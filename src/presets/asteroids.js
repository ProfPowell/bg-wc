// asteroids — drifting, rotating wireframe rocks (Atari Asteroids). Glowing
// closed polylines on a dark field, wrapping at the edges. Vector group.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ c2d, getColors }) {
  let w = 1, h = 1;
  let rocks = [];
  let rand = mulberry32(1);
  let lastKey = '';

  function rebuild(params) {
    const n = Math.floor(5 + params.density * 16);
    rand = mulberry32(params.seed || 1);
    rocks = new Array(n);
    for (let i = 0; i < n; i++) {
      const verts = 8 + ((rand() * 5) | 0);
      const base = 0.03 + rand() * 0.06;        // radius as fraction of min(w,h)
      const shape = [];
      for (let v = 0; v < verts; v++) {
        const a = (v / verts) * Math.PI * 2;
        const rr = base * (0.6 + rand() * 0.6);
        shape.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      rocks[i] = {
        x: rand(), y: rand(),
        vx: (rand() - 0.5) * 0.05, vy: (rand() - 0.5) * 0.05,
        rot: rand() * Math.PI * 2, vrot: (rand() - 0.5) * 0.6,
        shape,
      };
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!rocks.length || key !== lastKey) rebuild(params);
  }

  function rgb(c) { return `rgb(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0})`; }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const minDim = Math.min(w, h);
    const c1 = c.primary;
    const glow = params.intensity;
    c2d.lineJoin = 'round';

    // Advance + build all rock outlines into a single path (device space),
    // then stroke once for the glow pass and once crisp — no shadowBlur.
    const sp = params.speed * 0.4;
    c2d.beginPath();
    for (const rk of rocks) {
      rk.x = (rk.x + rk.vx * sp + 1) % 1;
      rk.y = (rk.y + rk.vy * sp + 1) % 1;
      rk.rot += rk.vrot * params.speed * 0.01;
      c2d.save();
      c2d.translate(rk.x * w, rk.y * h);
      c2d.rotate(rk.rot);
      c2d.scale(minDim, minDim);
      for (let i = 0; i < rk.shape.length; i++) {
        const [x, y] = rk.shape[i];
        if (i) c2d.lineTo(x, y); else c2d.moveTo(x, y);
      }
      c2d.closePath();
      c2d.restore();          // restore before stroke so lineWidth isn't scaled
    }
    if (glow > 0.05) {
      c2d.strokeStyle = `rgba(${(c1[0] * 255) | 0},${(c1[1] * 255) | 0},${(c1[2] * 255) | 0},${(0.18 * glow).toFixed(3)})`;
      c2d.lineWidth = 4;
      c2d.stroke();
    }
    c2d.strokeStyle = rgb(c1);
    c2d.lineWidth = 1.6;
    c2d.stroke();
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { frame(t, params); },
    staticFrame(params) { frame(0, params); },
    dispose() { rocks = []; },
  };
}
