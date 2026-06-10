import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// hilbert — a Hilbert space-filling curve (order 5–7 by `density`) that traces
// itself: a bright head advances along the curve over each cycle, leaving a
// drawn trail behind it, then the whole curve dissolves and redraws under a
// seed-jittered palette rotation. `intensity` sets the head glow / trail
// contrast. Deterministic — geometry is cached, only the head position and
// palette index advance with `t`.

const CYCLE = 9; // seconds for one full trace + dissolve
const DRAW_FRAC = 0.82; // portion of the cycle spent tracing (rest dissolves)
const HEAD_LEN = 36; // segments in the bright gradient head
const START_PHASE = 0.45; // cycle offset at t=0 so a frozen frame isn't empty

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// (x,y) of distance d along a Hilbert curve filling a 2^order square.
function hilbertXY(d, order) {
  const n = 1 << order;
  let rx,
    ry,
    x = 0,
    y = 0,
    t = d;
  for (let s = 1; s < n; s <<= 1) {
    rx = 1 & (t >> 1);
    ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      const tmp = x;
      x = y;
      y = tmp;
    }
    x += s * rx;
    y += s * ry;
    t >>= 2;
  }
  return [x, y];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const order = 5 + Math.round((params.density ?? 0.5) * 2); // 5..7
    const key = `${order}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const n = 1 << order;
    const total = n * n;
    const side = Math.min(w, h) * 0.92;
    const step = side / (n - 1);
    const ox = (w - side) / 2;
    const oy = (h - side) / 2;
    const pts = new Float32Array(total * 2);
    for (let d = 0; d < total; d++) {
      const [gx, gy] = hilbertXY(d, order);
      pts[d * 2] = ox + gx * step;
      pts[d * 2 + 1] = oy + gy * step;
    }
    cache = { key, pts, total, order, lw: Math.max(1.2, (side / (n - 1)) * 0.5) };
    return cache;
  }

  function render(cyclePos, params) {
    const { pts, total, lw } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const roles = [c.primary, c.accent, c.info, c.success, c.warning].filter(Boolean);
    if (!roles.length) roles.push(c.fg || [0.8, 0.8, 0.8]);
    const intensity = params.intensity ?? 0.5;

    const cycle = Math.floor(cyclePos);
    const local = cyclePos - cycle;
    // Seed-jittered palette rotation per cycle.
    const jit = mulberry32((params.seed | 0) * 2654435761 + cycle * 40503);
    const rot = (cycle + Math.floor(jit() * roles.length)) % roles.length;
    const base = roles[rot % roles.length];
    const headCol = roles[(rot + 1) % roles.length];
    const dim = mix(base, c.bg && c.bg[3] > 0.01 ? c.bg : [0, 0, 0], 0.45 - 0.25 * intensity);

    // Tracing phase draws up to `head`; dissolve phase fades the whole curve out.
    let head;
    let alpha = 1;
    if (local < DRAW_FRAC) {
      head = Math.floor((local / DRAW_FRAC) * (total - 1));
    } else {
      head = total - 1;
      alpha = 1 - (local - DRAW_FRAC) / (1 - DRAW_FRAC);
    }

    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    c2d.globalAlpha = alpha;

    // Drawn trail (dim) up to the head, as one stroke.
    c2d.strokeStyle = rgb(dim);
    c2d.lineWidth = lw;
    c2d.beginPath();
    c2d.moveTo(pts[0], pts[1]);
    for (let i = 1; i <= head; i++) c2d.lineTo(pts[i * 2], pts[i * 2 + 1]);
    c2d.stroke();

    // Bright gradient head: a short window of segments brightening toward the tip.
    const start = Math.max(1, head - HEAD_LEN);
    for (let i = start; i <= head; i++) {
      const f = (i - start) / Math.max(1, head - start);
      c2d.strokeStyle = rgb(mix(base, headCol, f), Math.min(1, 0.4 + 0.6 * f) * alpha);
      c2d.lineWidth = lw * (1 + f * (0.6 + intensity));
      c2d.beginPath();
      c2d.moveTo(pts[(i - 1) * 2], pts[(i - 1) * 2 + 1]);
      c2d.lineTo(pts[i * 2], pts[i * 2 + 1]);
      c2d.stroke();
    }
    c2d.globalAlpha = 1;
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    // Start partway through the trace so a frozen first frame (speed=0) shows a
    // substantial curve rather than an empty grid.
    frame(t, params) {
      render(t / CYCLE + START_PHASE, params);
    },
    staticFrame(params) {
      // A still: show the fully-drawn curve (mid-cycle, no dissolve).
      render(DRAW_FRAC * 0.98, params);
    },
    dispose() {
      cache = null;
    },
  };
}
