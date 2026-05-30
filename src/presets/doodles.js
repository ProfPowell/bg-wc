// doodles — hand-drawn bullet-journal marginalia. Sketch icons draw themselves
// stroke-by-stroke at the page margins, hold, then fade; new ones spawn to keep
// a small population alive. Clears to transparent so it overlays any substrate
// (paper/dot-grid surface). Canvas2D. Pattern group.
//
// Icon families are selected with the `mode` attribute (same convention as
// `mosaic`): a space/comma-separated list of `planner`, `botanical`,
// `geometric`. Absent/empty/unknown -> all three.

import { mulberry32 } from '../util/pause.js';

// --- Icon library ----------------------------------------------------------
// Each icon is an array of strokes; each stroke is an array of [x,y] points in
// a normalized 0..1 box. Curves are densified into polylines so a single
// length-based reveal works uniformly across every icon.

function star() {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 0.48 : 0.2;
    pts.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r]);
  }
  return [pts];
}
function arrow() {
  return [
    [[0.1, 0.5], [0.85, 0.5]],
    [[0.6, 0.3], [0.88, 0.5], [0.6, 0.7]],
  ];
}
function check() {
  return [[[0.2, 0.55], [0.42, 0.78], [0.82, 0.25]]];
}
function heart() {
  const p = [];
  for (let i = 0; i <= 24; i++) {
    const t = (Math.PI * 2 * i) / 24;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    p.push([0.5 + x / 40, 0.5 - y / 40]);
  }
  return [p];
}
function sprig() {
  return [
    [[0.5, 0.95], [0.5, 0.08]],
    [[0.5, 0.62], [0.28, 0.46]],
    [[0.5, 0.5], [0.72, 0.34]],
    [[0.5, 0.38], [0.3, 0.24]],
  ];
}
function box() {
  return [[[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8], [0.2, 0.2]]];
}
function triangle() {
  return [[[0.5, 0.15], [0.85, 0.82], [0.15, 0.82], [0.5, 0.15]]];
}
function divider() {
  return [
    [[0.08, 0.5], [0.92, 0.5]],
    [[0.08, 0.42], [0.08, 0.58]],
    [[0.92, 0.42], [0.92, 0.58]],
  ];
}
function dottedUnderline() {
  const strokes = [];
  for (let i = 0; i < 5; i++) {
    const x = 0.08 + i * 0.19;
    strokes.push([[x, 0.55], [x + 0.1, 0.55]]);
  }
  return strokes;
}
function sparkle() {
  // 4-point sparkle (distinct from the 5-point star).
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? 0.46 : 0.12;
    pts.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r]);
  }
  return [pts];
}
function banner() {
  // Ribbon with swallowtail notches at both ends.
  return [
    [[0.1, 0.38], [0.9, 0.38], [0.82, 0.5], [0.9, 0.62], [0.1, 0.62], [0.18, 0.5], [0.1, 0.38]],
  ];
}
function leaf() {
  return [
    [[0.5, 0.95], [0.68, 0.66], [0.6, 0.32], [0.5, 0.06], [0.4, 0.32], [0.32, 0.66], [0.5, 0.95]],
    [[0.5, 0.88], [0.5, 0.16]], // midrib
  ];
}
function vine() {
  const main = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    main.push([0.5 + 0.22 * Math.sin(t * Math.PI * 2.2), 0.92 - t * 0.84]);
  }
  return [main, [[0.5, 0.62], [0.28, 0.52]], [[0.5, 0.38], [0.72, 0.28]]];
}
function circle() {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i * Math.PI * 2) / 24;
    pts.push([0.5 + Math.cos(a) * 0.4, 0.5 + Math.sin(a) * 0.4]);
  }
  return [pts];
}
function dotCluster() {
  // Three small dots, each a short closed loop so it reveals quickly as a dot.
  return [[0.35, 0.4], [0.6, 0.55], [0.45, 0.7]].map(([cx, cy]) => {
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      pts.push([cx + Math.cos(a) * 0.07, cy + Math.sin(a) * 0.07]);
    }
    return pts;
  });
}

const FAMILIES = {
  planner: [star, arrow, check, dottedUnderline, sparkle, banner],
  botanical: [sprig, heart, leaf, vine],
  geometric: [box, triangle, divider, circle, dotCluster],
};
const ALL = ['planner', 'botanical', 'geometric'];

function parseMode(raw) {
  if (!raw) return ALL;
  const names = String(raw)
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((n) => FAMILIES[n]);
  return names.length ? names : ALL;
}
function poolFor(families) {
  const out = [];
  for (const f of families) out.push(...FAMILIES[f]);
  return out;
}

// Exported for unit testing (pure, deterministic).
export { parseMode, poolFor, FAMILIES };

// --- Geometry helpers ------------------------------------------------------

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
function strokeLen(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += dist(points[i - 1], points[i]);
  return len;
}

// Draw the first `frac` (0..1) of a device-space polyline.
function drawPartial(c2d, points, frac) {
  const total = strokeLen(points);
  if (total <= 0) return;
  let budget = frac * total;
  c2d.beginPath();
  c2d.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const seg = dist(points[i - 1], points[i]);
    if (budget >= seg) {
      c2d.lineTo(points[i][0], points[i][1]);
      budget -= seg;
    } else {
      const u = budget / seg;
      const x = points[i - 1][0] + (points[i][0] - points[i - 1][0]) * u;
      const y = points[i - 1][1] + (points[i][1] - points[i - 1][1]) * u;
      c2d.lineTo(x, y);
      break;
    }
  }
  c2d.stroke();
}

const CAPS = { low: 3, med: 5, high: 8 };

export function create({ host, c2d, getColors }) {
  let w = 1,
    h = 1;
  let rand = mulberry32(7);
  let lastSeed = null;
  let instances = [];
  let lastT = 0;
  let spawnAccum = 0;

  function activePool() {
    return poolFor(parseMode(host.getAttribute('mode')));
  }

  // Pick a margin-biased position (device px): reject points in the central
  // clear rectangle, but fall back gracefully on small viewports.
  function marginPoint(s) {
    const cx0 = w * 0.22,
      cx1 = w * 0.78,
      cy0 = h * 0.26,
      cy1 = h * 0.74;
    for (let i = 0; i < 6; i++) {
      const x = s + rand() * (w - 2 * s);
      const y = s + rand() * (h - 2 * s);
      if (x < cx0 || x > cx1 || y < cy0 || y > cy1) return [x, y];
    }
    return [s + rand() * (w - 2 * s), s + rand() * (h - 2 * s)];
  }

  function spawn(now, pool, color) {
    if (!pool.length) return;
    const icon = pool[(rand() * pool.length) | 0]();
    const s = (26 + rand() * 30) * (0.8 + rand() * 0.4);
    const [px, py] = marginPoint(s);
    const jitter = s * 0.04;
    // Bake jittered device-space strokes once at spawn time.
    const strokes = icon.map((stroke) =>
      stroke.map(([nx, ny]) => [
        px + (nx - 0.5) * s + (rand() - 0.5) * jitter,
        py + (ny - 0.5) * s + (rand() - 0.5) * jitter,
      ])
    );
    const drawDur = 0.6 + rand() * 0.6;
    instances.push({
      strokes,
      lens: strokes.map(strokeLen),
      born: now,
      drawDur,
      holdDur: 1.2 + rand() * 1.6,
      fadeDur: 0.7,
      lineWidth: Math.max(1.4, s * 0.045) * (0.85 + rand() * 0.4),
      color,
    });
  }

  function drawInstance(inst, age) {
    const drawEnd = inst.drawDur;
    const holdEnd = drawEnd + inst.holdDur;
    const fadeEnd = holdEnd + inst.fadeDur;
    if (age >= fadeEnd) return false; // dead
    let alpha = 1;
    let p = 1;
    if (age < drawEnd) p = age / drawEnd;
    else if (age > holdEnd) alpha = 1 - (age - holdEnd) / inst.fadeDur;

    const total = inst.lens.reduce((a, b) => a + b, 0) || 1;
    let budget = p * total;

    c2d.save();
    c2d.globalAlpha = Math.max(0, alpha);
    c2d.strokeStyle = inst.color;
    c2d.lineWidth = inst.lineWidth;
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    for (let i = 0; i < inst.strokes.length; i++) {
      if (budget <= 0) break;
      const len = inst.lens[i];
      const frac = len > 0 ? Math.min(1, budget / len) : 1;
      drawPartial(c2d, inst.strokes[i], frac);
      budget -= len;
    }
    c2d.restore();
    return true;
  }

  function inkColor(c) {
    const r = (c.fg[0] * 255) | 0;
    const g = (c.fg[1] * 255) | 0;
    const b = (c.fg[2] * 255) | 0;
    return `rgb(${r},${g},${b})`;
  }

  function frame(t, params) {
    if (params.seed !== lastSeed) {
      rand = mulberry32(params.seed || 7);
      lastSeed = params.seed;
    }
    const c = getColors();
    const color = inkColor(c);
    const cap = CAPS[params.quality] || CAPS.med;
    const target = Math.max(1, Math.round(cap * (0.4 + params.density)));

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;

    // Spawn rate scales with intensity; throttled so doodles appear staggered.
    const rate = 0.3 + params.intensity * 1.2; // per second
    spawnAccum += rate * dt;
    const pool = activePool();
    while (spawnAccum >= 1 && instances.length < target) {
      spawn(t, pool, color);
      spawnAccum -= 1;
    }

    c2d.clearRect(0, 0, w, h);
    instances = instances.filter((inst) => drawInstance(inst, t - inst.born));
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      frame(t, params);
    },
    staticFrame(params) {
      // Reduced-motion: a fixed, fully-drawn, seeded scatter of marginalia.
      const c = getColors();
      const color = inkColor(c);
      const r = mulberry32(params.seed || 7);
      const saved = rand;
      rand = r; // marginPoint/spawn use module-closure `rand`
      c2d.clearRect(0, 0, w, h);
      instances = [];
      const n = Math.max(2, Math.round((CAPS[params.quality] || CAPS.med) * (0.4 + params.density)));
      const pool = activePool();
      for (let i = 0; i < n; i++) {
        spawn(0, pool, color);
      }
      for (const inst of instances) drawInstance(inst, inst.drawDur); // p=1, alpha=1
      rand = saved;
    },
    dispose() {
      instances = [];
    },
  };
}
