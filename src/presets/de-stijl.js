import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// de-stijl — Mondrian composition via recursive seeded splits. The canvas is
// partitioned into rectangles by a binary split tree; most cells are bg/white,
// a few carry a theme role at full strength. The black rule lines (the split
// boundaries) periodically redraw themselves with a brief draw-on sweep, and the
// coloured cells slowly cross-fade between two role picks, so the composition
// breathes without churning its topology. `density` = partition depth,
// `intensity` = share of coloured (vs. white) cells.

const FADE_W = 0.4; // cross-fade frequency for coloured cells

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${params.intensity}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const density = params.density ?? 0.5;
    const intensity = params.intensity ?? 0.5;
    const minCell = Math.max(40, Math.min(w, h) * (0.26 - 0.16 * density));
    const maxDepth = 3 + Math.round(density * 4);

    const leaves = [];
    const lines = []; // split boundaries → black rule lines

    // Recursively split a box. A split that fits adds a rule-line segment.
    function split(x, y, bw, bh, depth) {
      const canSplit = depth < maxDepth && bw > minCell * 1.6 && bh > minCell * 1.6 && rng() < 0.82;
      if (!canSplit) {
        // Leaf: mostly white/bg, some a theme role.
        const colored = rng() < 0.18 + 0.5 * intensity;
        leaves.push({
          x,
          y,
          w: bw,
          h: bh,
          ci: colored ? [(rng() * 5) | 0, (rng() * 5) | 0] : -1,
          phase: rng() * Math.PI * 2,
        });
        return;
      }
      const vertical = bw > bh ? rng() < 0.7 : rng() < 0.3;
      const f = 0.34 + rng() * 0.32; // split fraction
      if (vertical) {
        const sx = x + bw * f;
        lines.push({ x1: sx, y1: y, x2: sx, y2: y + bh, phase: rng(), period: 5 + rng() * 7 });
        split(x, y, bw * f, bh, depth + 1);
        split(sx, y, bw * (1 - f), bh, depth + 1);
      } else {
        const sy = y + bh * f;
        lines.push({ x1: x, y1: sy, x2: x + bw, y2: sy, phase: rng(), period: 5 + rng() * 7 });
        split(x, y, bw, bh * f, depth + 1);
        split(x, sy, bw, bh * (1 - f), depth + 1);
      }
    }
    split(0, 0, w, h, 0);
    cache = { key, leaves, lines };
    return cache;
  }

  function frame(t, params) {
    const { leaves, lines } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const roles = [c.primary, c.accent, c.info, c.warning, c.success].filter(Boolean);
    if (!roles.length) roles.push(c.fg || [0.1, 0.1, 0.1]);
    const n = roles.length;
    const white = c.bg && c.bg[3] > 0.01 ? c.bg : [1, 1, 1];

    for (const lf of leaves) {
      if (lf.ci === -1) {
        c2d.fillStyle = rgb(white);
      } else {
        const m = 0.5 + 0.5 * Math.sin(t * FADE_W + lf.phase);
        c2d.fillStyle = rgb(mix(roles[lf.ci[0] % n], roles[lf.ci[1] % n], m));
      }
      c2d.fillRect(lf.x, lf.y, lf.w, lf.h);
    }

    // Black rule lines with a periodic draw-on reveal.
    const ink = c.fg || [0.05, 0.05, 0.05];
    c2d.strokeStyle = rgb(ink);
    c2d.lineCap = 'square';
    c2d.lineWidth = Math.max(3, Math.min(w, h) * 0.012);
    for (const ln of lines) {
      const prog = (t / ln.period + ln.phase) % 1;
      const rev = Math.min(1, prog / 0.18); // draws on over first 18% of cycle
      c2d.beginPath();
      c2d.moveTo(ln.x1, ln.y1);
      c2d.lineTo(ln.x1 + (ln.x2 - ln.x1) * rev, ln.y1 + (ln.y2 - ln.y1) * rev);
      c2d.stroke();
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
