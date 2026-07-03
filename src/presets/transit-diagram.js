// transit-diagram — the Beck/Vignelli map. Seeded routes walk the canvas in
// 0/45/90-degree grid-snapped segments; stations tick every other vertex,
// interchanges ring the shared ones, and little trains run each line —
// train position is (t * v + phase) mod route length, a pure function of t.
// Route colors cycle primary/accent/info/success/warning; fg for stations
// and the faint graticule. density = route count, intensity = line weight.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

const DIRS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let routes = [];
  let interchanges = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 15);
    const grid = 10 + Math.round((1 - params.density) * 6); // grid cells across
    const nRoutes = 3 + Math.round(params.density * 3); // 3..6 lines
    routes = [];
    const visits = new Map(); // "gx,gy" -> count across routes
    for (let i = 0; i < nRoutes; i++) {
      let gx = (rand() * grid) | 0;
      let gy = 0;
      let dir = 2; // heading down-ish
      const pts = [[gx, gy]];
      for (let s = 0; s < grid * 2; s++) {
        // Beck rule: turn at most 45 degrees at a time.
        const turn = rand() < 0.4 ? (rand() < 0.5 ? -1 : 1) : 0;
        dir = (dir + turn + 8) % 8;
        const run = 1 + ((rand() * 3) | 0);
        gx = Math.max(0, Math.min(grid, gx + DIRS[dir][0] * run));
        gy = Math.max(0, Math.min(grid, gy + DIRS[dir][1] * run));
        const key = `${gx},${gy}`;
        visits.set(key, (visits.get(key) || 0) + 1);
        pts.push([gx, gy]);
        if (gy >= grid) break;
      }
      routes.push({ pts, grid, speed: 0.05 + rand() * 0.05, phase: rand() });
    }
    interchanges = [...visits.entries()]
      .filter(([, n]) => n > 1)
      .map(([k]) => k.split(',').map(Number));
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!routes.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.info, c.success, c.warning];
    const lw = (4 + params.intensity * 4) * px;
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';

    // Faint graticule.
    c2d.strokeStyle = rgbaCss(c.fg, 0.07);
    c2d.lineWidth = 1 * px;
    const g0 = routes[0].grid;
    for (let i = 0; i <= g0; i++) {
      c2d.beginPath();
      c2d.moveTo((i / g0) * w, 0);
      c2d.lineTo((i / g0) * w, h);
      c2d.stroke();
      c2d.beginPath();
      c2d.moveTo(0, (i / g0) * h);
      c2d.lineTo(w, (i / g0) * h);
      c2d.stroke();
    }

    const toXY =
      (grid) =>
      ([gx, gy]) => [(gx / grid) * w * 0.92 + w * 0.04, (gy / grid) * h * 0.92 + h * 0.04];

    routes.forEach((r, i) => {
      const map = toXY(r.grid);
      const col = pal[i % pal.length];
      c2d.strokeStyle = rgbCss(col);
      c2d.lineWidth = lw;
      c2d.beginPath();
      r.pts.forEach((p, k) => {
        const [x, y] = map(p);
        if (k === 0) c2d.moveTo(x, y);
        else c2d.lineTo(x, y);
      });
      c2d.stroke();

      // Station ticks every other vertex.
      c2d.fillStyle = rgbCss(c.bg);
      c2d.strokeStyle = rgbaCss(c.fg, 0.9);
      c2d.lineWidth = 1.6 * px;
      r.pts.forEach((p, k) => {
        if (k % 2 === 0) return;
        const [x, y] = map(p);
        c2d.beginPath();
        c2d.arc(x, y, lw * 0.45, 0, Math.PI * 2);
        c2d.fill();
        c2d.stroke();
      });

      // The train: distance along the polyline, pure in t.
      const lens = [];
      let total = 0;
      for (let k = 1; k < r.pts.length; k++) {
        const [ax, ay] = map(r.pts[k - 1]);
        const [bx, by] = map(r.pts[k]);
        const L = Math.hypot(bx - ax, by - ay);
        lens.push(L);
        total += L;
      }
      if (total > 0) {
        let d = ((t * r.speed + r.phase) % 1) * total;
        for (let k = 0; k < lens.length; k++) {
          if (d <= lens[k]) {
            const [ax, ay] = map(r.pts[k]);
            const [bx, by] = map(r.pts[k + 1]);
            const u = lens[k] ? d / lens[k] : 0;
            c2d.fillStyle = rgbCss(c.fg);
            c2d.beginPath();
            c2d.arc(ax + (bx - ax) * u, ay + (by - ay) * u, lw * 0.55, 0, Math.PI * 2);
            c2d.fill();
            break;
          }
          d -= lens[k];
        }
      }
    });

    // Interchange rings.
    const map0 = toXY(routes[0].grid);
    c2d.strokeStyle = rgbaCss(c.fg, 0.9);
    c2d.lineWidth = 2 * px;
    c2d.fillStyle = rgbCss(c.bg);
    for (const p of interchanges) {
      const [x, y] = map0(p);
      c2d.beginPath();
      c2d.arc(x, y, lw * 0.8, 0, Math.PI * 2);
      c2d.fill();
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
      routes = [];
      interchanges = [];
    },
  };
}
