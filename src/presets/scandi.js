import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// Scandinavian / Bauhaus geometric grid: a seed-driven tiling of arc primitives
// (dots, half- and quarter-discs, leaves, squares) with a few curated floral
// motifs (quatrefoil flowers, tulips, sprouts) scattered across it. Colors are
// theme roles softened toward the page background into pastels. Each tile gently
// cross-fades between two palette picks on its own slow cycle, so the grid
// breathes without any layout churn.

const FADE_W = 0.5; // cross-fade temporal frequency
const ROT_W = 0.25; // flower rotation frequency

const PRIMITIVES = ['dot', 'half', 'quarter', 'leaf', 'square'];

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Build the pastel palette: each theme role softened toward bg (or fg if bg is
// transparent) so colors read like the muted reference.
function buildPalette(c, intensity) {
  const base = [c.primary, c.accent, c.info, c.success, c.warning].filter(Boolean);
  const toward = c.bg && c.bg[3] > 0.01 ? c.bg : [1, 1, 1];
  // Higher intensity → less softening → more saturated.
  const amt = 0.55 - 0.3 * (intensity ?? 0.5);
  return base.map((col) => mix(col, toward, amt));
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null; // { key, cols, rows, cell, cells:[...], flowers:[...] }

  // Each cell: { gx, gy, kind, ci:[a,b], phase }. ci indexes the palette.
  // Motifs are recorded separately and their cells are marked occupied.
  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const cell = Math.max(28, h * (0.22 - 0.12 * params.density));
    const cols = Math.ceil(w / cell) + 1;
    const rows = Math.ceil(h / cell) + 1;
    const occupied = new Set();
    const flowers = [];

    // Scatter curated motifs first. Count scales with grid area; intensity
    // raises the motif share.
    const motifKinds = ['flower', 'tulip', 'sprout'];
    const motifCount = Math.round(cols * rows * (0.05 + 0.06 * (params.intensity ?? 0.5)));
    for (let i = 0; i < motifCount; i++) {
      const gx = (rng() * (cols - 1)) | 0;
      const gy = (rng() * (rows - 1)) | 0;
      // Motifs occupy a 2×2 block; skip if any cell is taken.
      let free = true;
      for (let dx = 0; dx < 2 && free; dx++)
        for (let dy = 0; dy < 2; dy++) if (occupied.has(`${gx + dx},${gy + dy}`)) free = false;
      if (!free) continue;
      for (let dx = 0; dx < 2; dx++)
        for (let dy = 0; dy < 2; dy++) occupied.add(`${gx + dx},${gy + dy}`);
      flowers.push({
        kind: motifKinds[(rng() * motifKinds.length) | 0],
        gx,
        gy,
        ci: [(rng() * 8) | 0, (rng() * 8) | 0],
        leaf: (rng() * 8) | 0,
        phase: rng() * Math.PI * 2,
        rot: rng() < 0.5 ? -1 : 1,
      });
    }

    // Fill remaining cells with single primitives.
    const cells = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        if (occupied.has(`${gx},${gy}`)) continue;
        cells.push({
          gx,
          gy,
          kind: PRIMITIVES[(rng() * PRIMITIVES.length) | 0],
          orient: (rng() * 4) | 0,
          ci: [(rng() * 8) | 0, (rng() * 8) | 0],
          phase: rng() * Math.PI * 2,
        });
      }
    }
    cache = { key, cell, cells, flowers };
    return cache;
  }

  // ---- shape helpers (all draw within the box x,y,size with current fillStyle)

  function fillCircle(cx, cy, r) {
    c2d.beginPath();
    c2d.arc(cx, cy, r, 0, Math.PI * 2);
    c2d.fill();
  }

  // Lens / vesica = intersection of two equal circles, via clip.
  function lens(ax, ay, bx, by, r) {
    c2d.save();
    c2d.beginPath();
    c2d.arc(bx, by, r, 0, Math.PI * 2);
    c2d.clip();
    c2d.beginPath();
    c2d.arc(ax, ay, r, 0, Math.PI * 2);
    c2d.fill();
    c2d.restore();
  }

  function drawPrimitive(kind, x, y, s, orient) {
    const cx = x + s / 2;
    const cy = y + s / 2;
    switch (kind) {
      case 'dot':
        fillCircle(cx, cy, s * 0.4);
        break;
      case 'square':
        c2d.fillRect(x + s * 0.12, y + s * 0.12, s * 0.76, s * 0.76);
        break;
      case 'half': {
        // Flat side on one of 4 edges; bulge inward.
        c2d.save();
        c2d.beginPath();
        c2d.rect(x, y, s, s);
        c2d.clip();
        const a0 = (orient * Math.PI) / 2;
        c2d.beginPath();
        c2d.arc(cx, cy, s * 0.5, a0, a0 + Math.PI);
        c2d.fill();
        c2d.restore();
        break;
      }
      case 'quarter': {
        // Pie wedge anchored in one of 4 corners, radius = cell.
        const corners = [
          [x, y],
          [x + s, y],
          [x + s, y + s],
          [x, y + s],
        ];
        const [ax, ay] = corners[orient];
        const start = (orient * Math.PI) / 2 + Math.PI / 2;
        c2d.beginPath();
        c2d.moveTo(ax, ay);
        c2d.arc(ax, ay, s, start, start + Math.PI / 2);
        c2d.closePath();
        c2d.fill();
        break;
      }
      case 'leaf': {
        // Vesica along one of the two diagonals.
        const r = s * 0.92;
        if (orient % 2 === 0) lens(x + s, y, x, y + s, r);
        else lens(x, y, x + s, y + s, r);
        break;
      }
    }
  }

  // ---- curated motifs (2×2 block rooted at cell gx,gy) -----------------------

  function drawFlower(px, py, s, cA, cB, angle) {
    // Quatrefoil: two crossed lenses centred on the block centre.
    const cx = px + s;
    const cy = py + s;
    c2d.save();
    c2d.translate(cx, cy);
    c2d.rotate(angle);
    c2d.translate(-cx, -cy);
    const d = s * 0.5;
    const r = s * 0.78;
    c2d.fillStyle = cA;
    lens(cx - d, cy, cx + d, cy, r); // vertical petals
    c2d.fillStyle = cB;
    lens(cx, cy - d, cx, cy + d, r); // horizontal petals
    c2d.fillStyle = cA;
    fillCircle(cx, cy, s * 0.16); // center
    c2d.restore();
  }

  function drawTulip(px, py, s, cup, leaf) {
    const cx = px + s;
    const stemTop = py + s * 0.75;
    // Stem
    c2d.fillStyle = leaf;
    c2d.fillRect(cx - s * 0.06, stemTop, s * 0.12, s * 1.0);
    // Two leaves off the stem
    lens(cx - s * 0.7, stemTop + s * 0.4, cx, stemTop + s * 0.4, s * 0.7);
    lens(cx, stemTop + s * 0.4, cx + s * 0.7, stemTop + s * 0.4, s * 0.7);
    // Cup: a half-disc (flat top) sitting above the stem.
    c2d.fillStyle = cup;
    c2d.beginPath();
    c2d.arc(cx, stemTop, s * 0.62, 0, Math.PI);
    c2d.fill();
  }

  function drawSprout(px, py, s, leaf) {
    const cx = px + s;
    c2d.fillStyle = leaf;
    c2d.fillRect(cx - s * 0.06, py + s * 0.4, s * 0.12, s * 1.0);
    lens(cx - s * 0.7, py + s * 0.6, cx, py + s * 0.6, s * 0.72);
    lens(cx, py + s * 0.6, cx + s * 0.7, py + s * 0.6, s * 0.72);
  }

  function frame(t, params) {
    const { cell, cells, flowers } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = buildPalette(c, params.intensity);
    const n = pal.length;
    const colorAt = (i, j, phase) => {
      const m = 0.5 + 0.5 * Math.sin(t * FADE_W + phase);
      return rgb(mix(pal[i % n], pal[j % n], m));
    };

    for (const cell0 of cells) {
      const x = cell0.gx * cell;
      const y = cell0.gy * cell;
      c2d.fillStyle = colorAt(cell0.ci[0], cell0.ci[1], cell0.phase);
      drawPrimitive(cell0.kind, x, y, cell, cell0.orient);
    }

    for (const f of flowers) {
      const px = f.gx * cell;
      const py = f.gy * cell;
      const cA = colorAt(f.ci[0], f.ci[1], f.phase);
      const cB = colorAt(f.ci[1], f.leaf, f.phase + 1.5);
      if (f.kind === 'flower')
        drawFlower(px, py, cell, cA, cB, 0.2 * f.rot * Math.sin(t * ROT_W + f.phase));
      else if (f.kind === 'tulip') drawTulip(px, py, cell, cA, cB);
      else drawSprout(px, py, cell, cB);
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
