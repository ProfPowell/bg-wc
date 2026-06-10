import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// boids — classic Reynolds flocking. 150–400 agents (by `density`) steered by
// separation / alignment / cohesion, with neighbour lookups accelerated by a
// spatial hash grid. Each boid is drawn as a tapered streak from its tail to its
// head, coloured fg→primary by speed. Edges wrap. `intensity` = streak length /
// trail emphasis. State advances from dt (derived from the speed-scaled `t`), so
// motion already honours `speed`.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let boids = null;
  let lastT = 0;
  let key = '';

  function init(params) {
    const k = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (boids && k === key) return;
    key = k;
    const rng = mulberry32(params.seed | 0 || 1);
    const n = Math.round(150 + (params.density ?? 0.5) * 250);
    const speed = Math.min(w, h) * 0.12;
    boids = [];
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      boids.push({
        x: rng() * w,
        y: rng() * h,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
      });
    }
    lastT = 0;
  }

  function step(dt) {
    const R = Math.min(w, h) * 0.1; // perception radius
    const R2 = R * R;
    const maxSpeed = Math.min(w, h) * 0.16;
    const cell = R;
    const gw = Math.max(1, Math.ceil(w / cell));
    const gh = Math.max(1, Math.ceil(h / cell));
    const grid = new Map();
    const idx = (cx, cy) => cx + cy * gw;
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      const ci = idx(
        Math.min(gw - 1, Math.max(0, (b.x / cell) | 0)),
        Math.min(gh - 1, Math.max(0, (b.y / cell) | 0))
      );
      let arr = grid.get(ci);
      if (!arr) grid.set(ci, (arr = []));
      arr.push(i);
    }

    for (const b of boids) {
      let sx = 0,
        sy = 0, // separation
        ax = 0,
        ay = 0, // alignment
        cx = 0,
        cy = 0, // cohesion
        count = 0;
      const gcx = Math.min(gw - 1, Math.max(0, (b.x / cell) | 0));
      const gcy = Math.min(gh - 1, Math.max(0, (b.y / cell) | 0));
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gcx + dx,
            ny = gcy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const arr = grid.get(idx(nx, ny));
          if (!arr) continue;
          for (const j of arr) {
            const o = boids[j];
            if (o === b) continue;
            const ddx = b.x - o.x;
            const ddy = b.y - o.y;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 > R2 || d2 === 0) continue;
            sx += ddx / d2;
            sy += ddy / d2;
            ax += o.vx;
            ay += o.vy;
            cx += o.x;
            cy += o.y;
            count++;
          }
        }
      }
      if (count > 0) {
        b.vx += sx * 40 + (ax / count - b.vx) * 0.05 + (cx / count - b.x) * 0.0006;
        b.vy += sy * 40 + (ay / count - b.vy) * 0.05 + (cy / count - b.y) * 0.0006;
      }
      // Clamp speed.
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const mn = maxSpeed * 0.4;
      if (sp > maxSpeed) {
        b.vx = (b.vx / sp) * maxSpeed;
        b.vy = (b.vy / sp) * maxSpeed;
      } else if (sp < mn) {
        b.vx = (b.vx / sp) * mn;
        b.vy = (b.vy / sp) * mn;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 0) b.x += w;
      else if (b.x >= w) b.x -= w;
      if (b.y < 0) b.y += h;
      else if (b.y >= h) b.y -= h;
    }
  }

  function draw(params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const fg = c.fg || [0.85, 0.85, 0.9];
    const prim = c.primary || [0.3, 0.6, 1];
    const maxSpeed = Math.min(w, h) * 0.16;
    const streak = (0.06 + 0.12 * (params.intensity ?? 0.5)) * Math.min(w, h);
    const lw = Math.max(1, Math.min(w, h) * 0.004);
    c2d.lineCap = 'round';
    c2d.lineWidth = lw;
    for (const b of boids) {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      const ux = b.vx / sp;
      const uy = b.vy / sp;
      const len = streak * (0.5 + 0.5 * Math.min(1, sp / maxSpeed));
      c2d.strokeStyle = rgb(mix(fg, prim, Math.min(1, sp / maxSpeed)));
      c2d.beginPath();
      c2d.moveTo(b.x - ux * len, b.y - uy * len);
      c2d.lineTo(b.x, b.y);
      c2d.stroke();
    }
  }

  function frame(t, params) {
    init(params);
    let dt = t - lastT;
    lastT = t;
    if (!(dt > 0) || dt > 0.1) dt = 0.016; // clamp on first frame / long gaps
    step(dt);
    draw(params);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      boids = null;
    },
    frame,
    staticFrame(params) {
      init(params);
      draw(params);
    },
    dispose() {
      boids = null;
    },
  };
}
