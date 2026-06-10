import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// delaunay — a seeded point set triangulated ONCE (Bowyer–Watson) and then left
// topologically fixed; each frame the points drift on small Lissajous orbits and
// the cached triangles are redrawn with the warped vertices, so the mesh ripples
// without the per-frame cost of retriangulation. Facets are filled with a flat
// theme-role mix chosen by centroid position. `density` = point count,
// `intensity` = facet colour contrast.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Circumcircle test: does p lie inside the circumcircle of triangle a,b,c?
// The incircle determinant is only sign-correct for a CCW triangle, so swap two
// vertices first if the winding is CW — otherwise the predicate inverts and the
// Bowyer–Watson sweep flags nothing (producing an empty triangulation).
function inCircumcircle(ax, ay, bx, by, cx, cy, px, py) {
  if ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax) < 0) {
    const tx = bx,
      ty = by;
    bx = cx;
    by = cy;
    cx = tx;
    cy = ty;
  }
  const adx = ax - px,
    ady = ay - py;
  const bdx = bx - px,
    bdy = by - py;
  const cdx = cx - px,
    cdy = cy - py;
  const ab = adx * bdy - bdx * ady;
  const bc = bdx * cdy - cdx * bdy;
  const ca = cdx * ady - adx * cdy;
  const al = adx * adx + ady * ady;
  const bl = bdx * bdx + bdy * bdy;
  const cl = cdx * cdx + cdy * cdy;
  return al * bc + bl * ca + cl * ab > 0;
}

// Bowyer–Watson on the given points; returns triangles as index triples.
function triangulate(px, py) {
  const n = px.length;
  // Super-triangle enclosing all points (indices n, n+1, n+2 into extended arrays).
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    if (px[i] < minX) minX = px[i];
    if (py[i] < minY) minY = py[i];
    if (px[i] > maxX) maxX = px[i];
    if (py[i] > maxY) maxY = py[i];
  }
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const dmax = Math.max(dx, dy) * 20;
  const mx = (minX + maxX) / 2;
  const my = (minY + maxY) / 2;
  const X = px.slice();
  const Y = py.slice();
  X.push(mx - dmax, mx, mx + dmax);
  Y.push(my - dmax, my + dmax, my - dmax);
  const s0 = n,
    s1 = n + 1,
    s2 = n + 2;

  let tris = [[s0, s1, s2]];
  for (let i = 0; i < n; i++) {
    const bad = [];
    for (let ti = 0; ti < tris.length; ti++) {
      const [a, b, cc] = tris[ti];
      if (inCircumcircle(X[a], Y[a], X[b], Y[b], X[cc], Y[cc], X[i], Y[i])) bad.push(ti);
    }
    // Boundary edges of the bad-triangle polygon (edges not shared by two bad tris).
    const edges = [];
    for (const ti of bad) {
      const [a, b, cc] = tris[ti];
      for (const e of [
        [a, b],
        [b, cc],
        [cc, a],
      ]) {
        let shared = false;
        for (const tj of bad) {
          if (tj === ti) continue;
          const tr = tris[tj];
          if (tr.includes(e[0]) && tr.includes(e[1])) {
            shared = true;
            break;
          }
        }
        if (!shared) edges.push(e);
      }
    }
    const badSet = new Set(bad);
    tris = tris.filter((_, ti) => !badSet.has(ti));
    for (const e of edges) tris.push([e[0], e[1], i]);
  }
  // Drop triangles touching the super-triangle vertices.
  return tris.filter((tr) => tr[0] < n && tr[1] < n && tr[2] < n);
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const density = params.density ?? 0.5;
    const count = Math.round(24 + density * 120);
    const margin = Math.max(w, h) * 0.08;
    const bx = new Float64Array(count);
    const by = new Float64Array(count);
    const orbit = []; // per-point Lissajous params
    for (let i = 0; i < count; i++) {
      bx[i] = -margin + rng() * (w + 2 * margin);
      by[i] = -margin + rng() * (h + 2 * margin);
      const amp = Math.min(w, h) * (0.01 + rng() * 0.03);
      orbit.push({
        ax: amp,
        ay: amp * (0.6 + rng() * 0.8),
        fx: 0.2 + rng() * 0.6,
        fy: 0.2 + rng() * 0.6,
        px: rng() * Math.PI * 2,
        py: rng() * Math.PI * 2,
      });
    }
    const tris = triangulate(Array.from(bx), Array.from(by));
    cache = { key, bx, by, orbit, tris, count };
    return cache;
  }

  function frame(t, params) {
    const { bx, by, orbit, tris, count } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const roles = [c.primary, c.accent, c.info, c.success, c.warning].filter(Boolean);
    if (!roles.length) roles.push(c.fg || [0.4, 0.5, 0.7]);
    const n = roles.length;
    const intensity = params.intensity ?? 0.5;
    const toward = c.bg && c.bg[3] > 0.01 ? c.bg : [0, 0, 0];

    // Warp each vertex along its orbit.
    const x = new Float64Array(count);
    const y = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const o = orbit[i];
      x[i] = bx[i] + Math.sin(t * o.fx + o.px) * o.ax;
      y[i] = by[i] + Math.cos(t * o.fy + o.py) * o.ay;
    }

    c2d.lineJoin = 'round';
    c2d.lineWidth = 1;
    for (const tr of tris) {
      const ax = x[tr[0]],
        ay = y[tr[0]];
      const bxx = x[tr[1]],
        byy = y[tr[1]];
      const cx = x[tr[2]],
        cy = y[tr[2]];
      const ccx = (ax + bxx + cx) / 3;
      const ccy = (ay + byy + cy) / 3;
      // Centroid → two role picks blended; intensity controls how far from a
      // mid-tone the facet drifts.
      const u = ccx / Math.max(1, w);
      const v = ccy / Math.max(1, h);
      const idx = (((u * 2.3 + v * 1.7) * n) | 0) % n;
      const idx2 = (idx + 1) % n;
      const blend = 0.5 + 0.5 * Math.sin((u + v) * 6.28);
      let col = mix(roles[idx], roles[idx2], blend);
      col = mix(toward, col, 0.5 + 0.5 * intensity);

      c2d.fillStyle = rgb(col);
      c2d.strokeStyle = rgb(col);
      c2d.beginPath();
      c2d.moveTo(ax, ay);
      c2d.lineTo(bxx, byy);
      c2d.lineTo(cx, cy);
      c2d.closePath();
      c2d.fill();
      c2d.stroke(); // seam-fill cracks between facets
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      cache = null;
    },
  };
}
