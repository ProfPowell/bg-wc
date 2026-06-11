import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// drip — action painting. Flung-paint arcs (smooth seeded splines stroked with
// speed-varying width) land on an offscreen canvas that is never cleared,
// each throw finished with droplet spatter; successive throws alternate theme
// roles, layering like an accumulating Pollock. A cached canvas-weave texture
// sits underneath. When coverage saturates, a slow whitewash veils the canvas
// and the painting starts over. Throws animate on incrementally (per-frame
// state), so this preset is load-only in the visual baseline; `staticFrame`
// lays down a finished composition in one go. `density` = throw rate,
// `intensity` = paint opacity/width.

const THROW_SEC = 0.7; // seconds for one throw to land
const WASH_SEC = 4; // whitewash duration

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let paint = null; // accumulation canvas (never cleared)
  let pctx = null;
  let weave = null;
  let rng = mulberry32(1);
  let throwN = 0; // throws completed (drives palette + saturation)
  let cur = null; // active throw { pts, cum, total, col, width, done }
  let lastT = 0;
  let nextAt = 0;
  let washing = 0; // >0 while whitewashing (counts down seconds)
  let seeded = false;

  function ensureLayers(params) {
    if (paint && paint.width === w && paint.height === h && seeded) return;
    paint = document.createElement('canvas');
    paint.width = w;
    paint.height = h;
    pctx = paint.getContext('2d');
    weave = document.createElement('canvas');
    weave.width = w;
    weave.height = h;
    const o = weave.getContext('2d');
    const wr = mulberry32(11);
    // Canvas weave: fine cross-hatch threads.
    for (let y = 0; y < h; y += 3) {
      o.fillStyle = `rgba(0,0,0,${0.02 + wr() * 0.025})`;
      o.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 3) {
      o.fillStyle = `rgba(255,255,255,${0.02 + wr() * 0.02})`;
      o.fillRect(x, 0, 1, h);
    }
    rng = mulberry32(params.seed | 0 || 1);
    throwN = 0;
    cur = null;
    lastT = 0;
    nextAt = 0.2;
    washing = 0;
    seeded = true;
  }

  // Build one flung arc: a few control points swept across the canvas, sampled
  // into a dense polyline via Catmull-Rom-ish midpoint smoothing.
  function makeThrow(c, params) {
    const roles = [c.primary, c.accent, c.info, c.warning, c.error, c.fg].filter(Boolean);
    const col = roles[throwN % roles.length] || [0.1, 0.1, 0.1];
    const n = 3 + ((rng() * 3) | 0);
    const ctrl = [];
    const dir = rng() * Math.PI * 2;
    let x = w * (0.2 + rng() * 0.6);
    let y = h * (0.2 + rng() * 0.6);
    for (let i = 0; i < n; i++) {
      ctrl.push([x, y]);
      const step = Math.min(w, h) * (0.2 + rng() * 0.35);
      x += Math.cos(dir + (rng() - 0.5) * 1.6) * step;
      y += Math.sin(dir + (rng() - 0.5) * 1.6) * step;
    }
    // Smooth by repeated corner cutting, then accumulate arc length.
    let pts = ctrl;
    for (let it = 0; it < 3; it++) {
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      out.push(pts[pts.length - 1]);
      pts = out;
    }
    const cum = [0];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      cum.push(total);
    }
    const intensity = params.intensity ?? 0.5;
    return {
      pts,
      cum,
      total,
      col,
      width: Math.max(2, Math.min(w, h) * (0.006 + rng() * 0.012)) * (0.7 + 0.6 * intensity),
      alpha: 0.75 + 0.25 * intensity,
      drawn: 0, // arc length already painted
    };
  }

  // Paint the segment of the active throw between arc lengths d0..d1.
  function paintSegment(th, d0, d1) {
    pctx.strokeStyle = rgb(th.col, th.alpha);
    pctx.lineCap = 'round';
    let seg = 1;
    while (seg < th.cum.length && th.cum[seg] < d0) seg++;
    let prev = null;
    for (; seg < th.cum.length && th.cum[seg - 1] < d1; seg++) {
      const a = th.pts[seg - 1];
      const b = th.pts[seg];
      // Width varies inversely with local spacing (slow = fat pooling).
      const len = th.cum[seg] - th.cum[seg - 1] || 1;
      const speedF = Math.min(2, th.total / th.cum.length / len + 0.4);
      pctx.lineWidth = th.width * speedF;
      pctx.beginPath();
      pctx.moveTo((prev || a)[0], (prev || a)[1]);
      pctx.lineTo(b[0], b[1]);
      pctx.stroke();
      prev = b;
    }
  }

  function spatter(th) {
    // Droplets near the tail end of the throw.
    const end = th.pts[th.pts.length - 1];
    pctx.fillStyle = rgb(th.col, th.alpha);
    const nd = 5 + ((rng() * 9) | 0);
    for (let i = 0; i < nd; i++) {
      const a = rng() * Math.PI * 2;
      const d = rng() * rng() * Math.min(w, h) * 0.12;
      pctx.beginPath();
      pctx.arc(
        end[0] + Math.cos(a) * d,
        end[1] + Math.sin(a) * d,
        th.width * (0.2 + rng() * 0.5),
        0,
        Math.PI * 2
      );
      pctx.fill();
    }
  }

  function step(dt, c, params) {
    if (washing > 0) {
      const bgw = c.bg && c.bg[3] > 0.01 ? c.bg : [1, 1, 1];
      pctx.fillStyle = rgb(bgw, Math.min(0.08, dt * 1.2));
      pctx.fillRect(0, 0, w, h);
      washing -= dt;
      return;
    }
    nextAt -= dt;
    if (!cur && nextAt <= 0) {
      cur = makeThrow(c, params);
    }
    if (cur) {
      const rate = cur.total / THROW_SEC;
      const to = Math.min(cur.total, cur.drawn + rate * dt);
      if (to > cur.drawn) paintSegment(cur, cur.drawn, to);
      cur.drawn = to;
      if (cur.drawn >= cur.total) {
        spatter(cur);
        cur = null;
        throwN++;
        nextAt = (0.4 + rng() * 1.6) * (1.4 - (params.density ?? 0.5));
        const cap = 26 + Math.round((params.density ?? 0.5) * 30);
        if (throwN >= cap) {
          throwN = 0;
          washing = WASH_SEC;
        }
      }
    }
  }

  function composite(c) {
    clearAndFill(c2d, w, h, c.bg);
    c2d.drawImage(weave, 0, 0);
    c2d.drawImage(paint, 0, 0);
  }

  function frame(t, params) {
    ensureLayers(params);
    let dt = t - lastT;
    lastT = t;
    if (!(dt >= 0)) dt = 0;
    dt = Math.min(dt, 0.1);
    const c = getColors();
    step(dt, c, params);
    composite(c);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      seeded = false;
    },
    frame,
    staticFrame(params) {
      ensureLayers(params);
      const c = getColors();
      // Lay down a finished composition instantly.
      const throws = 10 + Math.round((params.density ?? 0.5) * 12);
      for (let i = 0; i < throws; i++) {
        const th = makeThrow(c, params);
        paintSegment(th, 0, th.total);
        spatter(th);
        throwN++;
      }
      composite(c);
    },
    dispose() {
      paint = null;
      pctx = null;
      weave = null;
      seeded = false;
    },
  };
}
