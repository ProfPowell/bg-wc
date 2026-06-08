// vectormap — a movement map. Nodes sit on a faint dot-grid "continent";
// arcs connect them and packets travel along the arcs, like flight paths or
// network traffic. Deterministic via seed. Dataviz group.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss as rgba } from '../renderer/tokens.js';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let nodes = [];
  let routes = [];
  let lastKey = '';

  function build(params) {
    const rand = mulberry32(params.seed || 1);
    const n = Math.round(6 + params.density * 10);
    nodes = Array.from({ length: n }, () => ({
      x: 0.08 + rand() * 0.84,
      y: 0.12 + rand() * 0.76,
      r: 2 + rand() * 3,
      ph: rand() * 6.28,
    }));
    routes = [];
    const m = Math.round(n * 1.4);
    for (let i = 0; i < m; i++) {
      const a = (rand() * n) | 0;
      let b = (rand() * n) | 0;
      if (b === a) b = (b + 1) % n;
      routes.push({ a, b, off: rand(), spd: 0.2 + rand() * 0.5, bow: (rand() - 0.5) * 0.3 });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function frame(t, params) {
    const key = `${params.seed}|${params.density}`;
    if (!nodes.length || key !== lastKey) build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    // faint continent dot-grid
    c2d.fillStyle = rgba(c.fg, 0.06);
    const step = 26;
    for (let gx = step; gx < w; gx += step)
      for (let gy = step; gy < h; gy += step) {
        c2d.fillRect(gx, gy, 1.5, 1.5);
      }

    // arcs (batched) + traveling packets
    c2d.lineWidth = 1;
    const packets = [];
    c2d.strokeStyle = rgba(c.primary, 0.25);
    c2d.beginPath();
    for (const rt of routes) {
      const A = nodes[rt.a],
        B = nodes[rt.b];
      const ax = A.x * w,
        ay = A.y * h,
        bx = B.x * w,
        by = B.y * h;
      const mx = (ax + bx) / 2 + (by - ay) * rt.bow;
      const my = (ay + by) / 2 - (bx - ax) * rt.bow;
      c2d.moveTo(ax, ay);
      c2d.quadraticCurveTo(mx, my, bx, by);
      const u = (t * rt.spd + rt.off) % 1;
      const px = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * bx;
      const py = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * by;
      packets.push([px, py]);
    }
    c2d.stroke();

    // packets
    c2d.fillStyle = rgba(c.accent, 0.95);
    for (const [px, py] of packets) {
      c2d.beginPath();
      c2d.arc(px, py, 2.4, 0, Math.PI * 2);
      c2d.fill();
    }

    // nodes (pulsing)
    for (const nd of nodes) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 1.5 + nd.ph);
      c2d.fillStyle = rgba(c.info, 0.9);
      c2d.beginPath();
      c2d.arc(nd.x * w, nd.y * h, nd.r, 0, Math.PI * 2);
      c2d.fill();
      c2d.strokeStyle = rgba(c.info, 0.4 * pulse);
      c2d.lineWidth = 1.2;
      c2d.beginPath();
      c2d.arc(nd.x * w, nd.y * h, nd.r + 4 + pulse * 6, 0, Math.PI * 2);
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
      frame(0.3, params);
    },
    dispose() {
      nodes = [];
      routes = [];
    },
  };
}
