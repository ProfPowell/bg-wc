import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// crochet — granny squares. Each square crochets itself: concentric rounds of
// scallop "stitches" (lobed bumps along the round's edge) loop in stitch by
// stitch, round by round, and finished squares tile into an afghan; yarn
// colour rotates through theme roles per round, per the classic scrap-yarn
// look. Squares start on a staggered schedule so the blanket builds across
// the page. `density` = square size, `intensity` = yarn saturation.

const ROUND_SEC = 1.6; // seconds to loop one round
const ROUNDS = 4;
const START_OFF = 10; // clock offset so a frozen first frame shows a worked afghan

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const sq = Math.max(60, Math.min(w, h) * (0.3 - 0.16 * (params.density ?? 0.5)));
    const cols = Math.ceil(w / sq) + 1;
    const rows = Math.ceil(h / sq) + 1;
    const squares = [];
    // Diagonal-ish staggered start order with jitter.
    for (let gy = 0; gy < rows; gy++)
      for (let gx = 0; gx < cols; gx++)
        squares.push({
          gx,
          gy,
          start: (gx + gy) * 0.7 + rng() * 0.6,
          cols: [0, 1, 2, 3].map(() => (rng() * 5) | 0),
        });
    cache = { key, sq, squares };
    return cache;
  }

  // One round: a ring of scallop lobes at radius r (round index ri), revealed
  // up to fraction `f` of the way around.
  function drawRound(cx, cy, r, f, col, lw, ri) {
    if (f <= 0) return;
    const lobes = 8 + ri * 4;
    const lobeR = (r * Math.PI * 2) / lobes / 2.4;
    const upTo = Math.floor(lobes * f);
    c2d.strokeStyle = rgb(col);
    c2d.lineWidth = lw;
    c2d.lineCap = 'round';
    for (let i = 0; i <= upTo && i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2 - Math.PI / 2;
      // Square-ify the ring: push lobes outward toward the corners so rounds
      // read as granny-square rounds, not circles.
      const sqf = 1 + 0.28 * Math.pow(Math.abs(Math.sin(2 * (a + Math.PI / 4))), 2);
      const rr = r * sqf;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      const partial = i === upTo ? (lobes * f) % 1 : 1;
      c2d.beginPath();
      c2d.arc(x, y, lobeR, a - Math.PI * 0.9, a - Math.PI * 0.9 + Math.PI * 1.8 * partial);
      c2d.stroke();
    }
  }

  function frame(t0, params) {
    const t = t0 + START_OFF;
    const { sq, squares } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const toward = c.bg && c.bg[3] > 0.01 ? c.bg : [1, 1, 1];
    const base = [c.primary, c.accent, c.info, c.warning, c.success].filter(Boolean);
    while (base.length < 5) base.push(c.fg || [0.6, 0.5, 0.5]);
    const intensity = params.intensity ?? 0.5;
    const yarn = base.map((col) => mix(col, toward, 0.45 - 0.3 * intensity));
    const lw = Math.max(1.5, sq * 0.03);

    for (const s of squares) {
      const cx = (s.gx + 0.5) * sq;
      const cy = (s.gy + 0.5) * sq;
      const local = (t - s.start) / ROUND_SEC; // rounds completed (fractional)
      if (local <= 0) continue;
      // Centre ring first.
      c2d.fillStyle = rgb(yarn[s.cols[0] % yarn.length]);
      c2d.beginPath();
      c2d.arc(cx, cy, sq * 0.05 * Math.min(1, local * 3), 0, Math.PI * 2);
      c2d.fill();
      for (let ri = 0; ri < ROUNDS; ri++) {
        const rf = Math.min(1, Math.max(0, local - ri));
        if (rf <= 0) break;
        const r = sq * (0.1 + 0.095 * (ri + 1));
        drawRound(cx, cy, r, rf, yarn[s.cols[ri] % yarn.length], lw, ri);
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
      // An afghan well underway: most squares complete.
      const { squares } = build(params);
      const maxStart = squares.reduce((m, s) => Math.max(m, s.start), 0);
      frame(maxStart + ROUNDS * ROUND_SEC, params);
    },
    dispose() {
      cache = null;
    },
  };
}
