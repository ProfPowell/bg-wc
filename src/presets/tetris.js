// tetris — falling tetrominoes that stack and line-clear, ambient.
// Pieces drop on a grid scaled to host dimensions, colors pulled from the
// theme palette. When the player would top out, the well resets so the
// effect runs forever.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

const SHAPES = [
  [[1, 1, 1, 1]], // I
  [
    [1, 1],
    [1, 1],
  ], // O
  [
    [0, 1, 0],
    [1, 1, 1],
  ], // T
  [
    [1, 0, 0],
    [1, 1, 1],
  ], // J
  [
    [0, 0, 1],
    [1, 1, 1],
  ], // L
  [
    [0, 1, 1],
    [1, 1, 0],
  ], // S
  [
    [1, 1, 0],
    [0, 1, 1],
  ], // Z
];

const COLS = 12;

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let cell = 1;
  let rows = 1;
  let grid = null; // rows × COLS of color index | null
  let active = null; // { shape, x, y, color }
  let rand = mulberry32(1);
  let lastSeed = null;
  let lastT = 0;
  let fallAcc = 0;

  function resetGrid() {
    grid = Array.from({ length: rows }, () => new Array(COLS).fill(null));
  }

  function recalcLayout() {
    cell = w / COLS;
    const nextRows = Math.max(4, Math.floor(h / cell));
    if (nextRows !== rows) {
      rows = nextRows;
      resetGrid();
      active = null;
    } else if (!grid) {
      resetGrid();
    }
  }

  function palette(c) {
    return [
      c.primary,
      c.accent,
      c.info,
      c.success || c.primary,
      c.warning || c.accent,
      c.error || c.info,
    ];
  }

  function spawn(pal) {
    const shape = SHAPES[(rand() * SHAPES.length) | 0];
    const x = Math.max(
      0,
      Math.min(COLS - shape[0].length, (rand() * (COLS - shape[0].length + 1)) | 0)
    );
    return { shape, x, y: -shape.length, color: pal[(rand() * pal.length) | 0] };
  }

  function canPlace(piece, dy) {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const gy = piece.y + r + dy;
        const gx = piece.x + c;
        if (gx < 0 || gx >= COLS || gy >= rows) return false;
        if (gy >= 0 && grid[gy][gx]) return false;
      }
    }
    return true;
  }

  function lock(piece) {
    let toppedOut = false;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const gy = piece.y + r,
          gx = piece.x + c;
        if (gy < 0) {
          toppedOut = true;
          continue;
        }
        grid[gy][gx] = piece.color;
      }
    }
    return toppedOut;
  }

  function clearLines() {
    for (let r = rows - 1; r >= 0; r--) {
      if (grid[r].every((cell) => cell)) {
        grid.splice(r, 1);
        grid.unshift(new Array(COLS).fill(null));
        r++; // re-check this row index after shift
      }
    }
  }

  function drawCell(rgba, gx, gy) {
    const r = (rgba[0] * 255) | 0;
    const g = (rgba[1] * 255) | 0;
    const b = (rgba[2] * 255) | 0;
    const x = gx * cell;
    const y = gy * cell;
    c2d.fillStyle = `rgb(${r},${g},${b})`;
    c2d.fillRect(x, y, cell - 1, cell - 1);
    // Brighter top edge / darker bottom for a faux-bevel.
    c2d.fillStyle = `rgba(255,255,255,0.25)`;
    c2d.fillRect(x, y, cell - 1, Math.max(1, cell * 0.12));
    c2d.fillStyle = `rgba(0,0,0,0.18)`;
    c2d.fillRect(x, y + cell - 1 - Math.max(1, cell * 0.12), cell - 1, Math.max(1, cell * 0.12));
  }

  function frame(t, params) {
    if (params.seed !== lastSeed) {
      rand = mulberry32(params.seed || 1);
      lastSeed = params.seed;
    }
    recalcLayout();

    const c = getColors();
    const pal = palette(c);
    clearAndFill(c2d, w, h, c.bg);

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;

    // Fall rate scales with speed; density makes pieces fall faster too.
    const interval = 0.12 / (0.4 + params.speed * 0.8 + params.density * 0.4);
    fallAcc += dt;

    while (fallAcc >= interval) {
      fallAcc -= interval;
      if (!active) {
        active = spawn(pal);
        if (!canPlace(active, 0)) {
          // Can't even spawn — wipe and start fresh.
          resetGrid();
        }
        continue;
      }
      if (canPlace(active, 1)) {
        active.y += 1;
      } else {
        const topped = lock(active);
        clearLines();
        active = null;
        if (topped) resetGrid();
      }
    }

    // Draw stack
    for (let r = 0; r < rows; r++) {
      for (let cc = 0; cc < COLS; cc++) {
        const v = grid[r][cc];
        if (v) drawCell(v, cc, r);
      }
    }
    // Draw active piece
    if (active) {
      for (let r = 0; r < active.shape.length; r++) {
        for (let cc = 0; cc < active.shape[r].length; cc++) {
          if (active.shape[r][cc]) drawCell(active.color, active.x + cc, active.y + r);
        }
      }
    }
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
      // Single still — pre-fill the lower half with random colored cells.
      const c = getColors();
      const pal = palette(c);
      const r = mulberry32(params.seed || 1);
      recalcLayout();
      clearAndFill(c2d, w, h, c.bg);
      for (let row = (rows * 0.55) | 0; row < rows; row++) {
        for (let col = 0; col < COLS; col++) {
          if (r() > 0.35) drawCell(pal[(r() * pal.length) | 0], col, row);
        }
      }
    },
    dispose() {
      grid = null;
      active = null;
    },
  };
}
