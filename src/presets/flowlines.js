import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// Thin parallel curves traced through a slow-evolving 2D vector field —
// the streamline / contour-flow aesthetic (think Cerence AI hero, fluid-
// dynamics visualizations). Lines start at evenly-spaced seed positions
// on the left edge and integrate rightward through a smoothly-varying
// angle field, so they fan, converge, and diverge.

const MIN_LINES = 6;
const MAX_LINES = 24;
const STEP_PX = 3; // integration step along x
const FIELD_T_SCALE = 0.08; // how fast the field morphs

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let lastSeed = -1;
  let lineSeeds = [];

  function lineCount(params) {
    return Math.max(
      MIN_LINES,
      Math.min(MAX_LINES, Math.round(MIN_LINES + params.density * (MAX_LINES - MIN_LINES)))
    );
  }

  function ensure(params) {
    const seed = params.seed | 0;
    if (seed !== lastSeed) {
      lastSeed = seed;
      const rng = mulberry32(seed || 1);
      // Per-line phase + alpha jitter so the bunch reads as a sheaf,
      // not a perfectly parallel comb.
      lineSeeds = [];
      for (let i = 0; i < MAX_LINES; i++) {
        lineSeeds.push({
          alphaJitter: 0.5 + rng() * 0.5,
          phaseOffset: rng() * Math.PI * 2,
        });
      }
    }
  }

  // Vertical component of the unit-vector field at normalized (nx, ny) and
  // virtual time tt. The field is a smooth sum of low-frequency sinusoids;
  // each line follows the local angle, producing fluid-looking streamlines.
  function fieldVy(nx, ny, tt) {
    const a =
      0.6 * Math.sin(nx * 3.0 + tt * 0.9) +
      0.4 * Math.sin(ny * 2.0 + tt * 0.7 + 1.3) +
      0.3 * Math.sin((nx + ny) * 1.5 + tt * 1.1);
    // Wrap to [-1, 1] gently — direct sin sum is already bounded.
    return a;
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const n = lineCount(params);
    const tt = t * FIELD_T_SCALE;
    const baseAlpha = 0.25 + 0.5 * params.intensity;
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    c2d.lineWidth = Math.max(1, h * 0.0018);

    // Spread starting y positions across a tall slice — slightly overshoot
    // top/bottom so curves can wander off-screen and back without a hard cut.
    const startMargin = h * 0.05;
    const startSpan = h - startMargin * 2;

    for (let i = 0; i < n; i++) {
      const seed = lineSeeds[i];
      const u = (i + 0.5) / n;
      let x = -10;
      let y = startMargin + u * startSpan;

      c2d.beginPath();
      c2d.moveTo(x, y);
      while (x < w + 10) {
        const nx = x / w;
        const ny = y / h;
        // dy per dx step — scale so curves don't ricochet vertically.
        const vy = fieldVy(nx, ny, tt + seed.phaseOffset * 0.1);
        x += STEP_PX;
        y += vy * STEP_PX * 0.9;
        c2d.lineTo(x, y);
      }
      c2d.strokeStyle = rgb(c.primary, baseAlpha * seed.alphaJitter);
      c2d.stroke();
    }
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
    dispose() {
      lineSeeds = [];
    },
  };
}
