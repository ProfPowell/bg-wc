import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// morris — a Morris-style wallpaper: a bilaterally-mirrored acanthus/vine motif
// built from quadratic curves, tiled across the page. Each tile draws itself on
// (its stems reveal by arc length), then once grown it breathes — the leaves
// pulse gently. Colours are theme roles softened toward the page background into
// pastels, like scandi.js. `density` = tile size, `intensity` = palette strength.

const CYCLE = 11; // seconds: draw-on + settle before re-reveal
const DRAW_FRAC = 0.55; // portion of the cycle spent drawing on

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Sample a quadratic Bézier into `seg` points (inclusive of both ends).
function quad(p0, p1, p2, seg, out) {
  for (let i = 0; i <= seg; i++) {
    const s = i / seg;
    const u = 1 - s;
    out.push([
      u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0],
      u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1],
    ]);
  }
}

// Build the unit-coord motif once: stem polylines + leaf anchors. Mirroring and
// tiling happen at draw time via transforms.
function buildMotif() {
  const stems = [];
  const a = [];
  quad([0.5, 1.0], [0.18, 0.72], [0.5, 0.5], 16, a);
  quad([0.5, 0.5], [0.82, 0.3], [0.5, 0.02], 16, a);
  stems.push(a);
  const b = [];
  quad([0.5, 0.62], [0.78, 0.62], [0.86, 0.4], 12, b);
  stems.push(b);
  const c = [];
  quad([0.5, 0.4], [0.2, 0.42], [0.12, 0.62], 12, c);
  stems.push(c);

  // Cumulative arc length across all stems for the reveal.
  let total = 0;
  const lens = [];
  for (const st of stems) {
    const cum = [0];
    for (let i = 1; i < st.length; i++) {
      total += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]);
      cum.push(total);
    }
    lens.push(cum);
  }
  // Leaves anchored at parametric points, with the arc-length at which they appear.
  const leaves = [
    { x: 0.5, y: 0.5, ang: -0.5, size: 0.16, at: 0.34 },
    { x: 0.86, y: 0.4, ang: 0.6, size: 0.13, at: 0.62 },
    { x: 0.12, y: 0.62, ang: 2.2, size: 0.13, at: 0.62 },
    { x: 0.5, y: 0.04, ang: -1.57, size: 0.11, at: 0.95 },
  ];
  return { stems, lens, total, leaves };
}

const MOTIF = buildMotif();

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const density = params.density ?? 0.5;
    const tile = Math.max(120, Math.min(w, h) * (0.55 - 0.3 * density));
    const key = `${params.seed | 0}|${density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const cols = Math.ceil(w / tile) + 1;
    const rows = Math.ceil(h / tile) + 1;
    const tiles = [];
    for (let gy = 0; gy < rows; gy++)
      for (let gx = 0; gx < cols; gx++) tiles.push({ gx, gy, phase: rng(), ci: (rng() * 4) | 0 });
    cache = { key, tile, tiles };
    return cache;
  }

  function palette(c, intensity) {
    const base = [c.primary, c.accent, c.info, c.success, c.warning].filter(Boolean);
    const toward = c.bg && c.bg[3] > 0.01 ? c.bg : [1, 1, 1];
    const amt = 0.5 - 0.28 * intensity;
    return base.map((col) => mix(col, toward, amt));
  }

  // Stroke the motif stems up to fraction `r` of total arc length, scaled to s.
  function drawStems(s, r) {
    const limit = r * MOTIF.total;
    for (let si = 0; si < MOTIF.stems.length; si++) {
      const st = MOTIF.stems[si];
      const cum = MOTIF.lens[si];
      c2d.beginPath();
      c2d.moveTo(st[0][0] * s, st[0][1] * s);
      for (let i = 1; i < st.length; i++) {
        if (cum[i] <= limit) {
          c2d.lineTo(st[i][0] * s, st[i][1] * s);
        } else {
          // Partial last segment.
          const segLen = cum[i] - cum[i - 1] || 1;
          const f = Math.max(0, (limit - cum[i - 1]) / segLen);
          if (f > 0)
            c2d.lineTo(
              (st[i - 1][0] + (st[i][0] - st[i - 1][0]) * f) * s,
              (st[i - 1][1] + (st[i][1] - st[i - 1][1]) * f) * s
            );
          break;
        }
      }
      c2d.stroke();
    }
  }

  function drawLeaf(lf, s, grow, breath) {
    const sz = lf.size * s * grow * breath;
    if (sz <= 0.5) return;
    c2d.save();
    c2d.translate(lf.x * s, lf.y * s);
    c2d.rotate(lf.ang);
    // Teardrop via two quadratic sides.
    c2d.beginPath();
    c2d.moveTo(0, 0);
    c2d.quadraticCurveTo(sz * 0.9, -sz * 0.5, sz * 1.7, 0);
    c2d.quadraticCurveTo(sz * 0.9, sz * 0.5, 0, 0);
    c2d.fill();
    c2d.restore();
  }

  function drawMotif(s, r, t, stemCol, leafCol) {
    c2d.strokeStyle = rgb(stemCol);
    c2d.lineWidth = Math.max(1.5, s * 0.018);
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    drawStems(s, r);
    c2d.fillStyle = rgb(leafCol);
    for (const lf of MOTIF.leaves) {
      const grow = Math.min(1, Math.max(0, (r - lf.at) / 0.12));
      if (grow <= 0) continue;
      const breath = 1 + 0.08 * Math.sin(t * 0.6 + lf.x * 6);
      drawLeaf(lf, s, grow, breath);
    }
  }

  function frame(t, params) {
    const { tile, tiles } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = palette(c, params.intensity ?? 0.5);
    const n = pal.length || 1;

    for (const tl of tiles) {
      const local = (t / CYCLE + tl.phase) % 1;
      const r = Math.min(1, local / DRAW_FRAC);
      const stemCol = pal[(tl.ci + 2) % n];
      const leafCol = pal[tl.ci % n];
      const ox = tl.gx * tile;
      const oy = tl.gy * tile;
      // Bilateral mirror: draw the motif and its horizontal reflection.
      for (const flip of [1, -1]) {
        c2d.save();
        c2d.translate(ox + (flip === 1 ? 0 : tile), oy);
        c2d.scale(flip, 1);
        drawMotif(tile, r, t, stemCol, leafCol);
        c2d.restore();
      }
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
      frame(CYCLE * DRAW_FRAC, params); // fully grown still
    },
    dispose() {
      cache = null;
    },
  };
}
