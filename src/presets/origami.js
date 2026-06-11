import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// origami — sheets fold into forms. Each figure is a hand-authored crease
// script over a unit square pre-split into polygons: every step folds a subset
// of polygons across a crease line, animated with pseudo-3D foreshortening
// (the component perpendicular to the crease scales by cos(π·p·amt)) and a
// brightness change on the folded face. Faint crease guides draw first, the
// figure folds step by step center-stage, holds, then fades while the next
// begins. Paper in softened primary/accent per figure on a quiet bg.

const GUIDE_SEC = 1.6;
const START_OFF = 4.4; // clock offset so a frozen first frame lands mid-fold
const STEP_SEC = 1.4;
const HOLD_SEC = 3.2;
const FADE_SEC = 1.4;

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function ease(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

// Figures: polys in [-0.5, 0.5]² unit coords; steps fold `group` poly indices
// across the line through `o` along unit direction `d`, to fraction `amt` of a
// half-turn (1 = fully over, ~0.5 = standing edge-on).
const SQ2 = Math.SQRT1_2;
const FIGURES = [
  {
    // "bird" — four diagonal quadrants folding into an angular crane-ish form.
    polys: [
      [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0, 0],
      ], // top
      [
        [0.5, -0.5],
        [0.5, 0.5],
        [0, 0],
      ], // right
      [
        [0.5, 0.5],
        [-0.5, 0.5],
        [0, 0],
      ], // bottom
      [
        [-0.5, 0.5],
        [-0.5, -0.5],
        [0, 0],
      ], // left
    ],
    steps: [
      { o: [0, 0], d: [0, 1], group: [3], amt: 1 }, // left wing over
      { o: [0, 0], d: [SQ2, SQ2], group: [0], amt: 1 }, // head down the diagonal
      { o: [0, 0], d: [1, 0], group: [2], amt: 0.55 }, // tail lifts edge-on
    ],
  },
  {
    // "boat" — bottom folds up, prow corners tuck, deck folds down.
    polys: [
      [
        [-0.5, -0.5],
        [0.5, -0.5],
        [0.5, 0],
        [-0.5, 0],
      ], // top rect
      [
        [-0.5, 0],
        [0, 0],
        [-0.5, 0.5],
      ], // bottom-left tri
      [
        [0.5, 0],
        [0, 0],
        [0.5, 0.5],
      ], // bottom-right tri
      [
        [-0.5, 0.5],
        [0.5, 0.5],
        [0, 0],
      ], // bottom-middle tri
    ],
    steps: [
      { o: [0, 0], d: [1, 0], group: [1, 2, 3], amt: 1 }, // hull up
      { o: [-0.25, 0], d: [SQ2, -SQ2], group: [1], amt: 1 }, // left prow tuck
      { o: [0.25, 0], d: [SQ2, SQ2], group: [2], amt: 1 }, // right prow tuck
      { o: [0, -0.25], d: [1, 0], group: [0], amt: 1 }, // deck down
    ],
  },
  {
    // "butterfly" — wing tips fold in, both wings rise edge-on.
    polys: [
      [
        [-0.5, -0.5],
        [-0.25, -0.5],
        [-0.25, 0.5],
        [-0.5, 0.5],
      ],
      [
        [-0.25, -0.5],
        [0, -0.5],
        [0, 0.5],
        [-0.25, 0.5],
      ],
      [
        [0, -0.5],
        [0.25, -0.5],
        [0.25, 0.5],
        [0, 0.5],
      ],
      [
        [0.25, -0.5],
        [0.5, -0.5],
        [0.5, 0.5],
        [0.25, 0.5],
      ],
    ],
    steps: [
      { o: [-0.25, 0], d: [0, 1], group: [0], amt: 0.85 },
      { o: [0.25, 0], d: [0, 1], group: [3], amt: 0.85 },
      { o: [0, 0], d: [0, 1], group: [0, 1], amt: 0.45 },
      { o: [0, 0], d: [0, 1], group: [2, 3], amt: 0.45 },
    ],
  },
];

// Fold one point across the crease (o, d) at angle fraction p·amt.
function foldPoint(pt, o, d, cosv) {
  const qx = pt[0] - o[0];
  const qy = pt[1] - o[1];
  const par = qx * d[0] + qy * d[1];
  const px = qx - par * d[0];
  const py = qy - par * d[1];
  return [o[0] + par * d[0] + px * cosv, o[1] + par * d[1] + py * cosv];
}

// Evaluate the figure with steps 0..k-1 complete and step k at progress p.
// Returns [{pts, shade}] in unit coords.
function evalFigure(fig, kDone, p) {
  const polys = fig.polys.map((poly) => ({ pts: poly.map((q) => q.slice()), shade: 1 }));
  for (let s = 0; s < fig.steps.length; s++) {
    if (s > kDone) break;
    const prog = s < kDone ? 1 : p;
    const st = fig.steps[s];
    const cosv = Math.cos(Math.PI * prog * st.amt);
    for (const gi of st.group) {
      const poly = polys[gi];
      poly.pts = poly.pts.map((q) => foldPoint(q, st.o, st.d, cosv));
      // Foreshortened faces dim; a face folded fully over flips slightly darker.
      poly.shade *= 0.68 + 0.32 * Math.abs(cosv);
      if (cosv < 0) poly.shade *= 0.9;
    }
  }
  return polys;
}

// Seeded Fisher-Yates over the three figures (engine-independent, unlike a
// random sort comparator).
function figureOrder(seed) {
  const rng = mulberry32(seed);
  const order = [0, 1, 2];
  for (let i = order.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;

  function figDuration(fig) {
    return GUIDE_SEC + fig.steps.length * STEP_SEC + HOLD_SEC + FADE_SEC;
  }

  function frame(t0, params) {
    const t = t0 + START_OFF;
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const order = figureOrder(params.seed | 0 || 1);

    const total = order.reduce((s, i) => s + figDuration(FIGURES[i]), 0);
    let tt = ((t % total) + total) % total;
    let figIdx = 0;
    while (tt >= figDuration(FIGURES[order[figIdx]])) {
      tt -= figDuration(FIGURES[order[figIdx]]);
      figIdx++;
    }
    const fig = FIGURES[order[figIdx]];

    const toward = c.bg && c.bg[3] > 0.01 ? c.bg : [1, 1, 1];
    const baseCols = [c.primary, c.accent, c.info].filter(Boolean);
    const paper = mix(baseCols[figIdx % baseCols.length] || [0.6, 0.6, 0.7], toward, 0.35);
    const ink = c.fg || [0.3, 0.3, 0.35];

    const scale = Math.min(w, h) * 0.42;
    const cx = w / 2;
    const cy = h / 2;
    const X = (q) => cx + q[0] * scale;
    const Y = (q) => cy + q[1] * scale;

    // Phase within this figure.
    let alpha = 1;
    let kDone = 0;
    let p = 0;
    let guide = 1;
    if (tt < GUIDE_SEC) {
      guide = tt / GUIDE_SEC;
    } else if (tt < GUIDE_SEC + fig.steps.length * STEP_SEC) {
      const st = (tt - GUIDE_SEC) / STEP_SEC;
      kDone = Math.floor(st);
      p = ease(st - kDone);
    } else if (tt < GUIDE_SEC + fig.steps.length * STEP_SEC + HOLD_SEC) {
      kDone = fig.steps.length;
      p = 0;
    } else {
      kDone = fig.steps.length;
      p = 0;
      alpha = 1 - (tt - GUIDE_SEC - fig.steps.length * STEP_SEC - HOLD_SEC) / FADE_SEC;
    }

    c2d.globalAlpha = Math.max(0, alpha);

    // Crease guides draw on first (and stay faint underneath).
    c2d.strokeStyle = rgb(ink, 0.25);
    c2d.lineWidth = 1;
    c2d.setLineDash([5, 5]);
    for (let s = 0; s < fig.steps.length; s++) {
      const st = fig.steps[s];
      const r = Math.min(1, guide * fig.steps.length - s);
      if (r <= 0) continue;
      const L = 0.75 * r;
      c2d.beginPath();
      c2d.moveTo(
        X([st.o[0] - st.d[0] * L, st.o[1] - st.d[1] * L]),
        Y([st.o[0] - st.d[0] * L, st.o[1] - st.d[1] * L])
      );
      c2d.lineTo(
        X([st.o[0] + st.d[0] * L, st.o[1] + st.d[1] * L]),
        Y([st.o[0] + st.d[0] * L, st.o[1] + st.d[1] * L])
      );
      c2d.stroke();
    }
    c2d.setLineDash([]);

    // The paper.
    const polys = evalFigure(fig, kDone, p);
    for (const poly of polys) {
      c2d.fillStyle = rgb([paper[0] * poly.shade, paper[1] * poly.shade, paper[2] * poly.shade]);
      c2d.strokeStyle = rgb(mix(paper, ink, 0.4), 0.6);
      c2d.lineWidth = Math.max(1, scale * 0.006);
      c2d.lineJoin = 'round';
      c2d.beginPath();
      c2d.moveTo(X(poly.pts[0]), Y(poly.pts[0]));
      for (let i = 1; i < poly.pts.length; i++) c2d.lineTo(X(poly.pts[i]), Y(poly.pts[i]));
      c2d.closePath();
      c2d.fill();
      c2d.stroke();
    }
    c2d.globalAlpha = 1;
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      // A finished figure mid-hold (recompute the seeded order to find the
      // first figure's fold count, so the still lands inside its hold phase).
      const order = figureOrder(params.seed | 0 || 1);
      frame(GUIDE_SEC + FIGURES[order[0]].steps.length * STEP_SEC + 0.5, params);
    },
    dispose() {},
  };
}
