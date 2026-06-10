// plotter — generative pen-plotter art that draws itself. Each cycle picks a
// seeded composition (flow-field stroke bundles, hatched discs, or a contour
// stack), then reveals the strokes progressively with a visible pen head; the
// finished sheet holds, fades, and a fresh seed loads. Print group.
//
// Distinct from spirograph (single curve family, no progressive draw) and
// flowlines (instant, ambient).

import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss } from '../renderer/tokens.js';

const CYCLE = 30; // s: draw 0..0.8, hold 0.8..0.92, fade 0.92..1
const RES = { low: 0.6, med: 1.0, high: 1.6 }; // stroke-count multiplier

function easeInOut(u) {
  return u * u * (3 - 2 * u);
}

function polyLen(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++)
    l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let cache = null; // { key, strokes, total }

  function build(params, cycleIdx) {
    const key = `${params.seed | 0}|${cycleIdx}|${params.density}|${params.quality}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(((params.seed | 0 || 1) ^ (cycleIdx * 0x85ebca6b)) >>> 0);
    const s = Math.min(w, h);
    const mult = RES[params.quality] || RES.med;
    const motif = ['flow', 'rings', 'contours'][(rng() * 3) | 0];
    const strokes = []; // { pts, ink } ink: 0 main, 1 secondary

    if (motif === 'flow') {
      const k1 = (2 + rng() * 3) / s;
      const k2 = (2 + rng() * 3) / s;
      const k3 = (1 + rng() * 2) / s;
      const ph = rng() * Math.PI * 2;
      const n = Math.round((60 + params.density * 140) * mult);
      for (let i = 0; i < n; i++) {
        let x = rng() * w;
        let y = rng() * h;
        const pts = [[x, y]];
        const steps = 40 + ((rng() * 80) | 0);
        for (let j = 0; j < steps; j++) {
          const a = Math.sin(x * k1 + ph) * 1.8 + Math.cos(y * k2 - x * k3) * 1.8;
          x += Math.cos(a) * s * 0.004;
          y += Math.sin(a) * s * 0.004;
          if (x < 0 || x > w || y < 0 || y > h) break;
          pts.push([x, y]);
        }
        if (pts.length > 4) strokes.push({ pts, ink: rng() < 0.18 ? 1 : 0 });
      }
    } else if (motif === 'rings') {
      const discs = Math.round((4 + params.density * 8) * mult);
      for (let i = 0; i < discs; i++) {
        const cx = rng() * w;
        const cy = rng() * h;
        const R = (0.07 + rng() * 0.15) * s;
        const th = rng() * Math.PI;
        const gap = s * (0.006 + rng() * 0.006);
        const cs = Math.cos(th);
        const sn = Math.sin(th);
        for (let o = -R + gap; o < R; o += gap) {
          const half = Math.sqrt(Math.max(0, R * R - o * o));
          const pts = [];
          for (let j = 0; j <= 12; j++) {
            const v = -half + (2 * half * j) / 12;
            const wob = (rng() - 0.5) * s * 0.0015;
            pts.push([cx + cs * v - sn * (o + wob), cy + sn * v + cs * (o + wob)]);
          }
          strokes.push({ pts, ink: 0 });
        }
        const ring = [];
        for (let j = 0; j <= 40; j++) {
          const a = (j / 40) * Math.PI * 2;
          ring.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
        }
        strokes.push({ pts: ring, ink: 1 });
      }
    } else {
      // contours — a ridge stack rising mid-sheet
      const rows = Math.round((18 + params.density * 26) * mult);
      const bumps = [];
      const bn = 3 + ((rng() * 3) | 0);
      for (let b = 0; b < bn; b++) {
        bumps.push({
          cx: w * (0.2 + rng() * 0.6),
          sg: w * (0.05 + rng() * 0.1),
          amp: h * (0.08 + rng() * 0.18),
        });
      }
      for (let r = 0; r < rows; r++) {
        const y0 = h * (0.12 + (0.76 * r) / rows);
        const env = Math.sin((Math.PI * r) / rows);
        const pts = [];
        for (let j = 0; j <= 120; j++) {
          const x = (j / 120) * w;
          let lift = 0;
          for (const b of bumps) lift += b.amp * Math.exp(-((x - b.cx) ** 2) / (2 * b.sg * b.sg));
          pts.push([x, y0 - lift * env]);
        }
        strokes.push({ pts, ink: r % 6 === 0 ? 1 : 0 });
      }
    }

    let total = 0;
    for (const st of strokes) {
      st.start = total;
      st.len = polyLen(st.pts);
      total += st.len;
    }
    cache = { key, strokes, total };
    return cache;
  }

  function frame(t, params) {
    const c = getColors();
    const cycleIdx = Math.floor(t / CYCLE);
    const p = (t - cycleIdx * CYCLE) / CYCLE;
    const { strokes, total } = build(params, cycleIdx);
    const s = Math.min(w, h);

    clearAndFill(c2d, w, h, c.bg);
    const budget = easeInOut(Math.min(1, p / 0.8)) * total;
    const fade = p > 0.92 ? 1 - (p - 0.92) / 0.08 : 1;
    const inks = [
      rgbaCss([c.fg[0], c.fg[1], c.fg[2]], 0.85 * fade),
      rgbaCss([c.primary[0], c.primary[1], c.primary[2]], 0.9 * fade),
    ];

    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    c2d.lineWidth = Math.max(1, s * 0.0016 * (1 + params.intensity));
    let penX = null;
    let penY = null;
    for (const st of strokes) {
      if (st.start >= budget) break;
      const allow = budget - st.start;
      c2d.beginPath();
      c2d.moveTo(st.pts[0][0], st.pts[0][1]);
      let used = 0;
      let done = true;
      for (let i = 1; i < st.pts.length; i++) {
        const [ax, ay] = st.pts[i - 1];
        const [bx, by] = st.pts[i];
        const seg = Math.hypot(bx - ax, by - ay);
        if (used + seg > allow) {
          const f = (allow - used) / seg;
          penX = ax + (bx - ax) * f;
          penY = ay + (by - ay) * f;
          c2d.lineTo(penX, penY);
          done = false;
          break;
        }
        c2d.lineTo(bx, by);
        used += seg;
      }
      c2d.strokeStyle = inks[st.ink];
      c2d.stroke();
      if (!done) break;
    }

    // Pen head while actively drawing.
    if (p < 0.8 && penX !== null) {
      c2d.beginPath();
      c2d.arc(penX, penY, s * 0.006, 0, Math.PI * 2);
      c2d.fillStyle = inks[1];
      c2d.fill();
      c2d.beginPath();
      c2d.arc(penX, penY, s * 0.011, 0, Math.PI * 2);
      c2d.strokeStyle = inks[0];
      c2d.lineWidth = 1;
      c2d.stroke();
      c2d.lineWidth = Math.max(1, s * 0.0016 * (1 + params.intensity));
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
      frame(CYCLE * 0.85, params); // fully drawn sheet, pre-fade
    },
    dispose() {
      cache = null;
    },
  };
}
