import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// cutouts — paper-cut collage. Organic silhouettes (algae fronds, leaves,
// rounded stars, seed/comma forms — each built from chains of quadratic arcs)
// drift slowly across the field and layer over one another, flat-filled in
// theme roles at full saturation with a slight drop offset underneath so each
// form reads as a physically placed piece of cut paper. `density` = piece
// count, `intensity` = drop-shadow strength. Layout seeded; motion from `t`.

function buildShape(kind, rng) {
  // Return a closed list of [x,y] points in unit coords (centred at 0, ~r 0.5),
  // rendered later with quadratic midpoint smoothing.
  const pts = [];
  if (kind === 'star') {
    const arms = 5 + ((rng() * 3) | 0);
    for (let i = 0; i < arms * 2; i++) {
      const a = (i / (arms * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 0.5 : 0.22 + rng() * 0.08;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  } else if (kind === 'leaf') {
    const nodes = 8;
    for (let i = 0; i <= nodes; i++) {
      const s = i / nodes;
      const x = -0.5 + s;
      const wdt = Math.sin(s * Math.PI) * (0.2 + rng() * 0.1);
      pts.push([x, -wdt]);
    }
    for (let i = nodes; i >= 0; i--) {
      const s = i / nodes;
      const x = -0.5 + s;
      const wdt = Math.sin(s * Math.PI) * (0.2 + rng() * 0.1);
      pts.push([x, wdt]);
    }
  } else if (kind === 'algae') {
    // Frond: lobes alternating along a vertical axis (Matisse seaweed).
    const lobes = 4 + ((rng() * 3) | 0);
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < lobes; i++) {
        const s = side === 0 ? i / lobes : 1 - i / lobes;
        const y = -0.5 + s;
        const bulge = (0.1 + 0.16 * Math.sin(s * Math.PI)) * (1 + 0.4 * Math.sin(i * 2.4));
        const x = (side === 0 ? 1 : -1) * bulge * (i % 2 === 0 ? 1.5 : 0.5);
        pts.push([x, y]);
      }
    }
  } else {
    // seed: comma/teardrop with an off-centre tail.
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.32 + 0.18 * Math.cos(a) + 0.06 * Math.sin(a * 2 + rng());
      pts.push([Math.cos(a) * r, Math.sin(a) * r * 1.3]);
    }
  }
  return pts;
}

const KINDS = ['algae', 'leaf', 'star', 'seed'];

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const n = 8 + Math.round((params.density ?? 0.5) * 14);
    const pieces = [];
    for (let i = 0; i < n; i++) {
      pieces.push({
        shape: buildShape(KINDS[(rng() * KINDS.length) | 0], rng),
        size: Math.min(w, h) * (0.16 + rng() * 0.26),
        x: rng() * w,
        y: rng() * h,
        vx: (rng() - 0.5) * 0.012, // drift in canvas-fractions/s
        vy: (rng() - 0.5) * 0.01,
        rot: rng() * Math.PI * 2,
        vr: (rng() - 0.5) * 0.08,
        ci: (rng() * 6) | 0,
        wob: rng() * Math.PI * 2,
      });
    }
    cache = { key, pieces };
    return cache;
  }

  function tracePiece(pts, s) {
    // Quadratic midpoint smoothing around the closed chain.
    c2d.beginPath();
    const n = pts.length;
    const mid = (i) => {
      const a = pts[i % n];
      const b = pts[(i + 1) % n];
      return [((a[0] + b[0]) / 2) * s, ((a[1] + b[1]) / 2) * s];
    };
    const m0 = mid(n - 1);
    c2d.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const m = mid(i);
      c2d.quadraticCurveTo(pts[i][0] * s, pts[i][1] * s, m[0], m[1]);
    }
    c2d.closePath();
  }

  function frame(t, params) {
    const { pieces } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const roles = [c.primary, c.accent, c.info, c.success, c.warning, c.error].filter(Boolean);
    if (!roles.length) roles.push(c.fg || [0.2, 0.2, 0.2]);
    const intensity = params.intensity ?? 0.5;
    const span = Math.max(w, h);

    for (const p of pieces) {
      // Slow drift with wrap; gentle rotation and a breathing wobble.
      const px =
        ((((p.x + p.vx * span * t) % (w + p.size * 2)) + w + p.size * 2) % (w + p.size * 2)) -
        p.size;
      const py =
        ((((p.y + p.vy * span * t) % (h + p.size * 2)) + h + p.size * 2) % (h + p.size * 2)) -
        p.size;
      const rot = p.rot + p.vr * t;
      const wob = 1 + 0.03 * Math.sin(t * 0.4 + p.wob);

      c2d.save();
      c2d.translate(px, py);
      c2d.rotate(rot);
      c2d.scale(wob, 1 / wob);
      // Drop offset underneath, then the flat piece.
      const off = p.size * 0.03;
      c2d.translate(off, off * 1.4);
      tracePiece(p.shape, p.size);
      c2d.fillStyle = rgb([0, 0, 0], 0.12 + 0.18 * intensity);
      c2d.fill();
      c2d.translate(-off, -off * 1.4);
      tracePiece(p.shape, p.size);
      c2d.fillStyle = rgb(roles[p.ci % roles.length]);
      c2d.fill();
      c2d.restore();
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
