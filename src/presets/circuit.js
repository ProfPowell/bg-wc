import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// Circuit — PCB aesthetic. Traces routed on a 45°-constrained grid by seeded
// randomized walkers, scattered pads (annular rings), vias, and IC footprints
// (rectangles with pin stubs). The layout is precomputed in build() and cached
// like scandi.js. Signal pulses (short bright dashes) travel the traces: spawn
// rate scales with `density`, glow strength with `intensity`. Traces are primary
// dimmed toward bg, pulses are accent, pads are fg at low alpha. `staticFrame`
// draws traces + pads with no pulses.

const DIRS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];
const PULSE_SPEED = 140; // px/s a pulse travels along a trace

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
    const g = Math.max(16, Math.min(w, h) * 0.055);
    const cols = Math.max(2, Math.round(w / g));
    const rows = Math.max(2, Math.round(h / g));
    const density = params.density ?? 0.5;

    const traces = [];
    const pads = [];
    const vias = [];
    const ics = [];
    const node = (gx, gy) => [gx * g, gy * g];

    const traceCount = Math.round(cols * rows * (0.05 + 0.1 * density)) + 4;
    for (let i = 0; i < traceCount; i++) {
      let gx = (rng() * cols) | 0;
      let gy = (rng() * rows) | 0;
      let dir = (rng() * 8) | 0;
      const len = 4 + ((rng() * 10) | 0);
      const pts = [node(gx, gy)];
      for (let s = 0; s < len; s++) {
        if (rng() < 0.35) dir = (dir + (rng() < 0.5 ? 1 : 7)) % 8; // ±45° turn
        const ngx = gx + DIRS[dir][0];
        const ngy = gy + DIRS[dir][1];
        if (ngx < 0 || ngx > cols || ngy < 0 || ngy > rows) {
          dir = (dir + 4) % 8; // bounce off the edge
          continue;
        }
        gx = ngx;
        gy = ngy;
        pts.push(node(gx, gy));
      }
      if (pts.length < 2) continue;
      // Cumulative arc length for pulse positioning.
      const cum = [0];
      let total = 0;
      for (let k = 1; k < pts.length; k++) {
        total += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        cum.push(total);
      }
      traces.push({ pts, cum, total, phase: rng() * total });
      pads.push({ x: pts[0][0], y: pts[0][1], r: g * 0.32 });
      pads.push({ x: pts[pts.length - 1][0], y: pts[pts.length - 1][1], r: g * 0.32 });
      if (rng() < 0.4) {
        const m = (rng() * pts.length) | 0;
        vias.push({ x: pts[m][0], y: pts[m][1] });
      }
    }

    // A few IC footprints occupying small rectangular blocks.
    const icCount = Math.round(1 + cols * rows * 0.01 * (0.5 + density));
    for (let i = 0; i < icCount; i++) {
      const gx = (rng() * (cols - 3)) | 0;
      const gy = (rng() * (rows - 2)) | 0;
      const wc = 2 + ((rng() * 2) | 0);
      const hc = 1 + ((rng() * 2) | 0);
      ics.push({ x: gx * g, y: gy * g, w: wc * g, h: hc * g, pins: 3 + ((rng() * 3) | 0) });
    }

    cache = { key, g, traces, pads, vias, ics, density };
    return cache;
  }

  // Stroke the portion of a trace between arc-lengths d0..d1 (handles corners).
  function strokeRange(trace, d0, d1) {
    const { pts, cum } = trace;
    c2d.beginPath();
    let started = false;
    for (let k = 0; k < pts.length - 1; k++) {
      const segA = cum[k];
      const segB = cum[k + 1];
      const a = Math.max(d0, segA);
      const b = Math.min(d1, segB);
      if (b <= a) continue;
      const segLen = segB - segA || 1;
      const ta = (a - segA) / segLen;
      const tb = (b - segA) / segLen;
      const [x0, y0] = pts[k];
      const [x1, y1] = pts[k + 1];
      const ax = x0 + (x1 - x0) * ta;
      const ay = y0 + (y1 - y0) * ta;
      const bx = x0 + (x1 - x0) * tb;
      const by = y0 + (y1 - y0) * tb;
      if (!started) {
        c2d.moveTo(ax, ay);
        started = true;
      }
      c2d.lineTo(bx, by);
    }
    if (started) c2d.stroke();
  }

  function drawLayout(c, layout) {
    const { g, traces, pads, vias, ics } = layout;
    clearAndFill(c2d, w, h, c.bg);
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.05, 0.07, 0.06];
    const traceCol = mix(c.primary || [0.3, 0.7, 0.5], bg, 0.45);
    const fg = c.fg || [0.8, 0.85, 0.8];

    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    c2d.lineWidth = Math.max(1.5, g * 0.12);
    c2d.strokeStyle = rgb(traceCol);
    for (const tr of traces) {
      c2d.beginPath();
      c2d.moveTo(tr.pts[0][0], tr.pts[0][1]);
      for (let k = 1; k < tr.pts.length; k++) c2d.lineTo(tr.pts[k][0], tr.pts[k][1]);
      c2d.stroke();
    }

    // IC footprints — outlined rectangle with short pin stubs along long edges.
    c2d.lineWidth = Math.max(1.5, g * 0.1);
    for (const ic of ics) {
      c2d.strokeStyle = rgb(traceCol);
      c2d.strokeRect(ic.x, ic.y, ic.w, ic.h);
      c2d.beginPath();
      for (let p = 0; p < ic.pins; p++) {
        const px = ic.x + (ic.w * (p + 0.5)) / ic.pins;
        c2d.moveTo(px, ic.y);
        c2d.lineTo(px, ic.y - g * 0.4);
        c2d.moveTo(px, ic.y + ic.h);
        c2d.lineTo(px, ic.y + ic.h + g * 0.4);
      }
      c2d.stroke();
    }

    // Vias — small filled dots.
    c2d.fillStyle = rgb(fg, 0.3);
    for (const v of vias) {
      c2d.beginPath();
      c2d.arc(v.x, v.y, g * 0.12, 0, Math.PI * 2);
      c2d.fill();
    }

    // Pads — annular rings (filled ring + hole) at low alpha.
    for (const pad of pads) {
      c2d.fillStyle = rgb(fg, 0.22);
      c2d.beginPath();
      c2d.arc(pad.x, pad.y, pad.r, 0, Math.PI * 2);
      c2d.fill();
      c2d.fillStyle = rgb(bg, 1);
      c2d.beginPath();
      c2d.arc(pad.x, pad.y, pad.r * 0.5, 0, Math.PI * 2);
      c2d.fill();
    }
  }

  function frame(t, params) {
    const layout = build(params);
    const c = getColors();
    drawLayout(c, layout);

    const intensity = params.intensity ?? 0.5;
    const density = params.density ?? 0.5;
    const accent = c.accent || [0.95, 0.4, 0.6];
    const dash = Math.max(10, layout.g * 0.9);
    const gap = dash * 4; // spacing between repeats on a trace
    const pulsesPerTrace = 1 + Math.round(density * 3);

    c2d.lineCap = 'round';
    c2d.lineWidth = Math.max(2, layout.g * 0.16);
    c2d.strokeStyle = rgb(accent);
    c2d.shadowColor = rgb(accent);
    c2d.shadowBlur = 4 + intensity * 16;

    for (const tr of layout.traces) {
      const span = tr.total + gap;
      for (let p = 0; p < pulsesPerTrace; p++) {
        const d = (t * PULSE_SPEED + tr.phase + (p * span) / pulsesPerTrace) % span;
        if (d > tr.total) continue; // pulse is in the inter-repeat gap
        strokeRange(tr, d, Math.min(tr.total, d + dash));
      }
    }
    c2d.shadowBlur = 0;
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      drawLayout(getColors(), build(params));
    },
    dispose() {
      cache = null;
    },
  };
}
