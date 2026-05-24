// scatter — a scatter plot of many vector glyphs (triangle / square / circle
// / cross / diamond) in a few drifting clusters, with axes. Glyph shape marks
// the series; color marks the cluster. Dataviz group.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ c2d, getColors }) {
  let w = 1, h = 1;
  let pts = [];
  let lastKey = '';

  function build(params) {
    const rand = mulberry32(params.seed || 1);
    const clusters = 3;
    const centers = Array.from({ length: clusters }, () => ({ x: 0.2 + rand() * 0.6, y: 0.2 + rand() * 0.6 }));
    const n = Math.round(60 + params.density * 240);
    pts = new Array(n);
    for (let i = 0; i < n; i++) {
      const cl = (rand() * clusters) | 0;
      const cen = centers[cl];
      const ang = rand() * 6.28, rad = rand() * 0.18;
      pts[i] = {
        bx: cen.x + Math.cos(ang) * rad,
        by: cen.y + Math.sin(ang) * rad,
        ph: rand() * 6.28,
        amp: 0.005 + rand() * 0.02,
        cl,
        shape: (rand() * 5) | 0,
        sz: 3 + rand() * 4,
      };
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function rgba(c, a) { return `rgba(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0},${a})`; }

  function glyph(shape, x, y, s) {
    switch (shape) {
      case 0: c2d.moveTo(x, y - s); c2d.lineTo(x + s, y + s); c2d.lineTo(x - s, y + s); c2d.closePath(); break;        // triangle
      case 1: c2d.rect(x - s, y - s, s * 2, s * 2); break;                                                            // square
      case 2: c2d.moveTo(x + s, y); c2d.arc(x, y, s, 0, Math.PI * 2); break;                                          // circle
      case 3: c2d.moveTo(x - s, y); c2d.lineTo(x + s, y); c2d.moveTo(x, y - s); c2d.lineTo(x, y + s); break;          // cross
      default: c2d.moveTo(x, y - s); c2d.lineTo(x + s, y); c2d.lineTo(x, y + s); c2d.lineTo(x - s, y); c2d.closePath(); // diamond
    }
  }

  function frame(t, params) {
    const key = `${params.seed}|${params.density}`;
    if (!pts.length || key !== lastKey) build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    // axes
    c2d.strokeStyle = rgba(c.fg, 0.18); c2d.lineWidth = 1;
    c2d.beginPath();
    c2d.moveTo(w * 0.08, h * 0.06); c2d.lineTo(w * 0.08, h * 0.94); c2d.lineTo(w * 0.96, h * 0.94);
    c2d.stroke();

    const clusterCols = [c.primary, c.accent, c.info];
    // Batch one path per cluster, stroke once (filled-ish via stroke for vector look).
    for (let cl = 0; cl < 3; cl++) {
      c2d.beginPath();
      for (const p of pts) {
        if (p.cl !== cl) continue;
        const x = (0.08 + (p.bx * 0.86 + Math.sin(t * 0.6 + p.ph) * p.amp)) * w;
        const y = (0.06 + (p.by * 0.86 + Math.cos(t * 0.5 + p.ph) * p.amp)) * h;
        glyph(p.shape, x, y, p.sz);
      }
      c2d.strokeStyle = rgba(clusterCols[cl], 0.85);
      c2d.lineWidth = 1.4;
      c2d.stroke();
    }
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { frame(t, params); },
    staticFrame(params) { frame(0, params); },
    dispose() { pts = []; },
  };
}
