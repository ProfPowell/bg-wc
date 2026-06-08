import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// 70s "groovy pipe" routes: bundles of parallel theme-colored stripes that run
// as one continuous path, take rounded corners and tight U-turns, and end by
// spiraling inward to a concentric bullseye target. Layouts are seed-driven and
// scale by `density` — from a clean edge-hugging frame (sparse) to a dense
// all-over tangle. The bundle draws itself on (a snaking reveal), holds, then
// retracts and loops.
//
// Core trick: instead of computing offset parallel curves, we stroke ONE
// sampled polyline repeatedly with decreasing line widths (outermost →
// innermost). Each pass is a different color, so they nest into perfectly
// parallel touching stripes — and the nesting stays correct around U-turns and
// the terminal spiral for free.

const DRAW_S = 4.5; // seconds to draw the bundle fully on
const HOLD_S = 4.0; // seconds held fully drawn
const OUT_S = 3.5; // seconds to retract
const GAP_S = 0.4; // empty beat before redrawing

// Mix a color toward white / black. amt in [0..1].
function lighten(c, amt) {
  return [c[0] + (1 - c[0]) * amt, c[1] + (1 - c[1]) * amt, c[2] + (1 - c[2]) * amt];
}
function darken(c, amt) {
  return [c[0] * (1 - amt), c[1] * (1 - amt), c[2] * (1 - amt)];
}

function smoothstep(x) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

// Build the ordered stripe list (outermost → innermost) from the theme. Core is
// primary/accent/info; we pad with auto-derived tints so the bundle is full and
// legible even on a 3-color theme. Count scales 4..6 with intensity.
function buildStripes(c, intensity) {
  const count = Math.round(4 + (intensity ?? 0.5) * 2); // 4..6
  const out = [c.primary, c.accent, c.info];
  if (count >= 4) out.unshift(darken(c.primary, 0.25)); // dark casing-side ring
  if (count >= 5) out.push(lighten(c.info, 0.4)); // bright inner ring
  if (count >= 6) out.splice(out.length - 1, 0, lighten(c.accent, 0.3));
  return out;
}

// Round a sharp polyline into a finely-sampled smooth one: each interior vertex
// becomes a quadratic bend of radius `r`. Returns { pts, len } where len is the
// exact summed length (so the dash-based draw-on reveal is accurate).
function roundPolyline(raw, r, segs) {
  if (raw.length < 3) {
    const pts = raw.slice();
    return { pts, len: polyLen(pts) };
  }
  const pts = [raw[0]];
  for (let i = 1; i < raw.length - 1; i++) {
    const A = raw[i - 1];
    const B = raw[i];
    const C = raw[i + 1];
    const ba = [A[0] - B[0], A[1] - B[1]];
    const bc = [C[0] - B[0], C[1] - B[1]];
    const lba = Math.hypot(ba[0], ba[1]) || 1;
    const lbc = Math.hypot(bc[0], bc[1]) || 1;
    const cut = Math.min(r, lba * 0.5, lbc * 0.5);
    const P = [B[0] + (ba[0] / lba) * cut, B[1] + (ba[1] / lba) * cut];
    const Q = [B[0] + (bc[0] / lbc) * cut, B[1] + (bc[1] / lbc) * cut];
    pts.push(P);
    for (let s = 1; s <= segs; s++) {
      const u = s / (segs + 1);
      const mx = (1 - u) * (1 - u) * P[0] + 2 * (1 - u) * u * B[0] + u * u * Q[0];
      const my = (1 - u) * (1 - u) * P[1] + 2 * (1 - u) * u * B[1] + u * u * Q[1];
      pts.push([mx, my]);
    }
    pts.push(Q);
  }
  pts.push(raw[raw.length - 1]);
  return { pts, len: polyLen(pts) };
}

function polyLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++)
    L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Generate the route set for the given seed / density / size. Each route is a
// grid random walk (axis-aligned, rounded corners) ending in an inward spiral.
function buildRoutes(seed, density, w, h, bundleW) {
  const rng = mulberry32(seed | 0 || 1);
  const cell = Math.max(bundleW * 1.8, h * 0.16);
  const cols = Math.max(3, Math.round(w / cell));
  const rows = Math.max(3, Math.round(h / cell));
  const ox = (w - cols * cell) / 2 + cell / 2;
  const oy = (h - rows * cell) / 2 + cell / 2;
  const node = (gx, gy) => [ox + gx * cell, oy + gy * cell];

  const routeCount = density < 0.34 ? 1 : density < 0.67 ? 2 : 3;
  const turnProb = 0.25 + density * 0.45;
  const steps = Math.round(10 + density * 9);
  const framed = density < 0.34;
  const r = cell * 0.5;

  const routes = [];
  for (let rIdx = 0; rIdx < routeCount; rIdx++) {
    // Sparse layouts start in a corner and hug the walls (a frame); denser ones
    // start anywhere and wander.
    let gx = framed ? (rng() < 0.5 ? 0 : cols - 1) : 1 + ((rng() * (cols - 2)) | 0);
    let gy = framed ? (rng() < 0.5 ? 0 : rows - 1) : 1 + ((rng() * (rows - 2)) | 0);
    let d = DIRS[(rng() * 4) | 0];
    const raw = [node(gx, gy)];

    for (let s = 0; s < steps; s++) {
      // Turn (90°) with turnProb, biased to keep the same rotational sense so
      // two turns in a row make the signature U-bend. Always turn at a wall.
      const atWall = gx + d[0] < 0 || gx + d[0] >= cols || gy + d[1] < 0 || gy + d[1] >= rows;
      if (atWall || rng() < turnProb) {
        const left = [d[1], -d[0]];
        const right = [-d[1], d[0]];
        const cand = [left, right].filter(
          (nd) => gx + nd[0] >= 0 && gx + nd[0] < cols && gy + nd[1] >= 0 && gy + nd[1] < rows
        );
        if (cand.length) d = cand[(rng() * cand.length) | 0];
      }
      gx += d[0];
      gy += d[1];
      raw.push(node(gx, gy));
    }

    // Terminal spiral: wind inward to a bullseye centered ahead of the last
    // node along the travel direction.
    const last = raw[raw.length - 1];
    const R0 = cell * 1.15;
    const cx = last[0] + d[0] * R0;
    const cy = last[1] + d[1] * R0;
    const spin = rng() < 0.5 ? 1 : -1;
    const turns = 2.25;
    const theta0 = Math.atan2(last[1] - cy, last[0] - cx);
    const rMin = bundleW * 0.55;
    const N = 64;
    for (let i = 1; i <= N; i++) {
      const a = i / N;
      const ang = theta0 + a * turns * Math.PI * 2 * spin;
      const rad = R0 * (1 - a) + rMin * a;
      raw.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
    }

    const { pts, len } = roundPolyline(raw, r, 10);
    const path = new Path2D();
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
    routes.push({ path, len, hole: [cx, cy] });
  }
  return routes;
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null; // { key, routes, bundleW }

  function ensure(params) {
    const bundleW = Math.max(8, h * 0.07);
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (!cache || cache.key !== key) {
      cache = { key, bundleW, routes: buildRoutes(params.seed | 0, params.density, w, h, bundleW) };
    }
    return cache;
  }

  // Triangle reveal: draw on, hold full, retract, brief empty beat, repeat.
  function revealAt(t) {
    const cycle = DRAW_S + HOLD_S + OUT_S + GAP_S;
    const p = ((t % cycle) + cycle) % cycle;
    if (p < DRAW_S) return smoothstep(p / DRAW_S);
    if (p < DRAW_S + HOLD_S) return 1;
    if (p < DRAW_S + HOLD_S + OUT_S) return smoothstep(1 - (p - DRAW_S - HOLD_S) / OUT_S);
    return 0;
  }

  function drawRoute(route, stripes, bundleW, reveal, c) {
    if (reveal <= 0) return;
    const K = stripes.length;
    const solid = reveal >= 1;
    if (solid) c2d.setLineDash([]);
    else c2d.setLineDash([route.len, route.len]);
    c2d.lineDashOffset = solid ? 0 : route.len * (1 - reveal);

    // Casing in the page bg color, slightly wider than the bundle, so where
    // routes cross they stay separate instead of merging. Fall back to a faint
    // fg line if the theme bg is transparent.
    const casing = c.bg && c.bg[3] > 0.01 ? rgb(c.bg, 1) : rgb(c.fg, 0.15);
    c2d.strokeStyle = casing;
    c2d.lineWidth = bundleW + Math.max(2, bundleW * 0.18);
    c2d.stroke(route.path);

    // Nested stripes: widest (outermost) first, each narrower pass painting the
    // next ring on top. Equal ring thickness across the bundle.
    for (let i = 0; i < K; i++) {
      c2d.strokeStyle = rgb(stripes[i], 1);
      c2d.lineWidth = bundleW * ((K - i) / K);
      c2d.stroke(route.path);
    }

    // Punch the bg "hole" at the spiral center once the terminus is drawn.
    if (reveal > 0.9 && c.bg && c.bg[3] > 0.01) {
      c2d.setLineDash([]);
      const a = smoothstep((reveal - 0.9) / 0.1);
      c2d.fillStyle = rgb(c.bg, a);
      c2d.beginPath();
      c2d.arc(route.hole[0], route.hole[1], bundleW * 0.32, 0, Math.PI * 2);
      c2d.fill();
    }
  }

  function frame(t, params) {
    const { routes, bundleW } = ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const stripes = buildStripes(c, params.intensity);
    const reveal = revealAt(t);
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    for (const route of routes) drawRoute(route, stripes, bundleW, reveal, c);
    c2d.setLineDash([]);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      const { routes, bundleW } = ensure(params);
      const c = getColors();
      clearAndFill(c2d, w, h, c.bg);
      const stripes = buildStripes(c, params.intensity);
      c2d.lineCap = 'round';
      c2d.lineJoin = 'round';
      for (const route of routes) drawRoute(route, stripes, bundleW, 1, c);
      c2d.setLineDash([]);
    },
    dispose() {
      cache = null;
    },
  };
}
