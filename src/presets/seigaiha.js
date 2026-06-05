import { clearAndFill } from '../renderer/canvas2d.js';

// Seigaiha (青海波) — the Japanese "blue ocean wave" pattern: a hex-packed field
// of overlapping concentric-ring discs ("bullseyes"), painted back-to-front so
// each disc covers the bottom of the one behind it, giving the woven fish-scale
// look. Two-tone by default (ink rings on the page background), colors from the
// theme. A subtle ripple gently warps each disc's inner ring spacing so the
// field shimmers without the discs changing size (outer radius stays fixed, so
// no gaps open between scales).

const RIPPLE_AMP = 0.18; // how strongly inner rings breathe
const RIPPLE_W = 0.9; // ripple temporal frequency
const RIPPLE_K = 0.0016; // spatial frequency (per device px) → travelling wave

function rgb(v, a = 1) {
  return `rgba(${(v[0] * 255) | 0},${(v[1] * 255) | 0},${(v[2] * 255) | 0},${a})`;
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null; // { key, discs:[{cx,cy}], R, rings }

  function layout(params) {
    const key = `${params.density}|${params.intensity}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    // density: bigger → smaller discs → more scales.
    const R = Math.max(14, h * (0.18 - 0.1 * params.density));
    const rings = Math.round(3 + (params.intensity ?? 0.5) * 2); // 3..5
    const step = R * 1.25; // center spacing → moderate overlap
    const dx = step;
    const dy = step * 0.62; // vertical row spacing (rows nest in the valleys)
    const discs = [];
    let row = 0;
    // Overscan by one disc on every side so edges stay covered.
    for (let cy = -R; cy < h + R; cy += dy, row++) {
      const offset = (row % 2) * (dx / 2);
      for (let cx = -R + offset; cx < w + R; cx += dx) discs.push({ cx, cy });
    }
    cache = { key, discs, R, rings };
    return cache;
  }

  function frame(t, params) {
    const { discs, R, rings } = layout(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const ink = c.primary;
    // Ring "bg" color: the theme bg, or a faint fg wash if bg is transparent so
    // the two-tone still reads.
    const bgRing = c.bg && c.bg[3] > 0.01 ? rgb(c.bg) : rgb(c.fg, 0.12);
    const inkStr = rgb(ink);
    // Discs are pre-sorted top→bottom (build order), so front rows paint last.
    for (const d of discs) {
      const warp = Math.sin(t * RIPPLE_W - (d.cx + d.cy) * RIPPLE_K);
      // Inline the two ring colors as strings for speed.
      drawDiscFast(d.cx, d.cy, R, rings, inkStr, bgRing, ink, warp);
    }
  }

  // One bullseye: concentric rings alternating ink / bg outward (outermost is
  // ink), plus an ink center dot. `warp` bends the inner ring boundaries while
  // the outer edge stays at R, so discs keep their footprint as rings shimmer.
  // Takes prebuilt color strings to avoid re-stringifying for every disc.
  function drawDiscFast(cx, cy, R, rings, inkStr, bgStr, inkTuple, warp) {
    const e = 1 + RIPPLE_AMP * warp;
    for (let k = rings; k >= 1; k--) {
      const rr = R * Math.pow(k / rings, e);
      c2d.fillStyle = k % 2 === 1 ? inkStr : bgStr;
      c2d.beginPath();
      c2d.arc(cx, cy, rr, 0, Math.PI * 2);
      c2d.fill();
    }
    c2d.fillStyle = rgb(inkTuple);
    c2d.beginPath();
    c2d.arc(cx, cy, R * Math.pow(1 / rings, e) * 0.6, 0, Math.PI * 2);
    c2d.fill();
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
