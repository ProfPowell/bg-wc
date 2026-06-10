import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// Truchet tiles — quarter-arc "smith" tiles on a square grid. Each tile carries
// an orientation bit; a diagonal wavefront driven by `t` sweeps across the grid
// and flips tiles as it passes, animating each flip as a quick 90° arc rotation
// (~0.4s) then holding. Strokes use primary/accent on bg. `density` sets the
// tile size (mapped like scandi.js), `intensity` mixes in a second stroke weight
// and an occasional filled-wedge tile. `mode`: arcs (default) | diagonals |
// wedges. Seed determines the initial orientation field; `staticFrame` draws
// that field with no flips.

const WAVE_SPEED = 0.8; // diagonal units the wavefront advances per second
const FLIP_FRAC = 0.32; // fraction of one unit spent rotating (rest holds)

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null; // { key, cell, cols, rows, tiles:[{gx,gy,base,col,heavy,filled}] }

  function readMode() {
    const m = (host.getAttribute('mode') || 'arcs').toLowerCase();
    return m === 'diagonals' || m === 'wedges' ? m : 'arcs';
  }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${params.intensity}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const cell = Math.max(24, h * (0.2 - 0.12 * params.density));
    const cols = Math.ceil(w / cell) + 1;
    const rows = Math.ceil(h / cell) + 1;
    const intensity = params.intensity ?? 0.5;
    const tiles = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        tiles.push({
          gx,
          gy,
          base: rng() < 0.5 ? 0 : 1,
          // Second stroke weight + filled wedges scale with intensity.
          col: rng() < 0.5 ? 0 : 1, // 0=primary, 1=accent
          heavy: rng() < 0.25 + 0.4 * intensity,
          filled: rng() < 0.12 * intensity,
        });
      }
    }
    cache = { key, cell, cols, rows, tiles };
    return cache;
  }

  // Draw one orientation-0 tile centred at the origin's tile box [0,s]×[0,s];
  // callers apply the rotation that realises the flipped orientations.
  function drawTileGeom(s, mode, filled) {
    const r = s / 2;
    if (mode === 'diagonals') {
      // Single corner-to-corner diagonal (90° rotation gives the other one).
      c2d.beginPath();
      c2d.moveTo(0, 0);
      c2d.lineTo(s, s);
      c2d.stroke();
      return;
    }
    if (mode === 'wedges' || filled) {
      // Two opposite filled quarter-discs.
      c2d.beginPath();
      c2d.moveTo(0, 0);
      c2d.arc(0, 0, r, 0, Math.PI / 2);
      c2d.closePath();
      c2d.fill();
      c2d.beginPath();
      c2d.moveTo(s, s);
      c2d.arc(s, s, r, Math.PI, Math.PI * 1.5);
      c2d.closePath();
      c2d.fill();
      if (mode === 'wedges') return;
    }
    // arcs: two quarter arcs joining adjacent edge midpoints.
    c2d.beginPath();
    c2d.arc(0, 0, r, 0, Math.PI / 2);
    c2d.stroke();
    c2d.beginPath();
    c2d.arc(s, s, r, Math.PI, Math.PI * 1.5);
    c2d.stroke();
  }

  function frame(t, params) {
    const { cell, tiles } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const mode = readMode();
    const colA = c.primary || [0.3, 0.5, 1];
    const colB = c.accent || [0.9, 0.3, 0.6];
    const front = t * WAVE_SPEED;
    const baseLW = Math.max(1.5, cell * 0.09);

    for (const tile of tiles) {
      const x = tile.gx * cell;
      const y = tile.gy * cell;
      // Diagonal wavefront: how many flips have reached this tile.
      const d = tile.gx + tile.gy;
      const progress = front - d;
      let rot;
      if (progress <= 0) {
        rot = tile.base * (Math.PI / 2);
      } else {
        const passed = Math.floor(progress);
        const frac = progress - passed;
        const within = smoothstep(0, FLIP_FRAC, frac) * (Math.PI / 2);
        rot = (tile.base + passed) * (Math.PI / 2) + within;
      }

      const col = tile.col ? colB : colA;
      c2d.strokeStyle = rgb(col);
      c2d.fillStyle = rgb(col);
      c2d.lineWidth = tile.heavy ? baseLW * 1.7 : baseLW;
      c2d.lineCap = 'round';

      c2d.save();
      c2d.translate(x + cell / 2, y + cell / 2);
      c2d.rotate(rot);
      c2d.translate(-cell / 2, -cell / 2);
      drawTileGeom(cell, mode, tile.filled);
      c2d.restore();
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
