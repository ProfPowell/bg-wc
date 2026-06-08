import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss as rgb } from '../renderer/tokens.js';

// Mural-scale curved bands in the Barbara Stauffacher Solomon / Sea Ranch
// supergraphics tradition: thick solid-color stripes with dramatic curves,
// overlapping back-to-front so later bands "cut" into earlier ones. Hard
// edges, no transparency between bands. Reads as architecture-scale paint
// rather than as a layered gradient.

const MIN_BANDS = 2;
const MAX_BANDS = 5;
const SEGS = 36;
const PHASE_DRIFT_PER_S = 0.18; // slow morph; host already speed-scales t

// Per-band "personalities" — amplitude / frequency / cross-viewport tilt.
// Cycled by index so increasing density adds bands with new character.
const PERSONALITIES = [
  { amp: 0.25, freq: 0.6, tilt: 0.0 }, // long gentle wave
  { amp: 0.22, freq: 1.3, tilt: 0.35 }, // tilts up across the viewport
  { amp: 0.2, freq: 0.8, tilt: -0.32 }, // tilts down
  { amp: 0.24, freq: 1.7, tilt: 0.08 }, // tighter zigzag
  { amp: 0.18, freq: 0.4, tilt: 0.22 }, // gentle tilt up
];

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;

  function bandCount(params) {
    return Math.max(
      MIN_BANDS,
      Math.min(MAX_BANDS, Math.round(MIN_BANDS + params.density * (MAX_BANDS - MIN_BANDS)))
    );
  }

  function drawBand(i, n, t, params, c) {
    const palette = [c.primary, c.accent, c.info, c.fg, c.primary];
    const p = PERSONALITIES[i % PERSONALITIES.length];
    const ampScale = 0.7 + 0.6 * params.intensity;
    const amp = h * p.amp * ampScale;
    const baseY = h * ((i + 1) / (n + 1));
    const tiltPx = p.tilt * h;
    const phase = t * PHASE_DRIFT_PER_S + i * 1.1;
    const thick = (h / Math.max(2, n)) * 0.6;
    const color = palette[i % palette.length];

    // Top edge: left to right
    c2d.beginPath();
    const yAt = (u) =>
      baseY + tiltPx * (u - 0.5) + amp * Math.sin(phase + u * p.freq * Math.PI * 2);
    c2d.moveTo(0, yAt(0) - thick);
    for (let s = 1; s <= SEGS; s++) {
      const u = s / SEGS;
      c2d.lineTo(u * w, yAt(u) - thick);
    }
    // Bottom edge: right to left
    for (let s = SEGS; s >= 0; s--) {
      const u = s / SEGS;
      c2d.lineTo(u * w, yAt(u) + thick);
    }
    c2d.closePath();
    c2d.fillStyle = rgb(color);
    c2d.fill();
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const n = bandCount(params);
    // Back-to-front so later (front) bands overlap earlier ones — the
    // signature Sea Ranch look where curves cut into each other.
    for (let i = 0; i < n; i++) drawBand(i, n, t, params, c);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {},
  };
}
