import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// Bauhaus — grid composition of primary geometric forms (circles, half-discs,
// quarter arcs, triangles, bars) in the spirit of Bauhaus poster studies.
// Theme roles at FULL saturation (no pastel softening — scandi already owns the
// soft look). Cells slide/rotate into place on staggered cycles then hold, and a
// few cells recompose at a time (each cycle picks a fresh shape/colour/orient).
// `density` = grid resolution, `intensity` = fill vs. outline ratio. 2×2 feature
// blocks are scattered first with the occupied-cell pattern from scandi.js.

const TRANS_SEC = 0.7; // seconds an element spends sliding into place

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Cheap stable hash → [0,1). Used to repick a cell's shape each cycle without
// allocating a PRNG per cell per frame.
function hash(a, b) {
  let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const KINDS = ['circle', 'half', 'quarter', 'triangle', 'bar', 'ring'];

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const cell = Math.max(56, h * (0.34 - 0.2 * params.density));
    const cols = Math.ceil(w / cell) + 1;
    const rows = Math.ceil(h / cell) + 1;
    const occupied = new Set();
    const features = [];

    // Scatter 2×2 feature blocks first (scandi's occupied-cell pattern).
    const featCount = Math.round(cols * rows * 0.06) + 1;
    for (let i = 0; i < featCount; i++) {
      const gx = (rng() * (cols - 1)) | 0;
      const gy = (rng() * (rows - 1)) | 0;
      let free = true;
      for (let dx = 0; dx < 2 && free; dx++)
        for (let dy = 0; dy < 2; dy++) if (occupied.has(`${gx + dx},${gy + dy}`)) free = false;
      if (!free) continue;
      for (let dx = 0; dx < 2; dx++)
        for (let dy = 0; dy < 2; dy++) occupied.add(`${gx + dx},${gy + dy}`);
      features.push(mkCell(rng, gx, gy, 2));
    }

    const cells = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        if (occupied.has(`${gx},${gy}`)) continue;
        cells.push(mkCell(rng, gx, gy, 1));
      }
    }
    cache = { key, cell, cells, features };
    return cache;
  }

  function mkCell(rng, gx, gy, span) {
    return {
      gx,
      gy,
      span,
      cseed: ((gx + 1) * 73856093) ^ ((gy + 1) * 19349663),
      period: 7 + rng() * 9, // recompose period (s)
      phase: rng(), // de-sync the cycles → only a few transition at once
      dir: rng() * Math.PI * 2, // slide-in direction
    };
  }

  // Build the path for one shape inside box [x, x+s] (no fill/stroke).
  function pathFor(kind, x, y, s, orient) {
    const cx = x + s / 2;
    const cy = y + s / 2;
    c2d.beginPath();
    switch (kind) {
      case 'circle':
      case 'ring':
        c2d.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
        break;
      case 'half': {
        const a0 = (orient * Math.PI) / 2;
        c2d.arc(cx, cy, s * 0.46, a0, a0 + Math.PI);
        c2d.closePath();
        break;
      }
      case 'quarter': {
        const corners = [
          [x, y],
          [x + s, y],
          [x + s, y + s],
          [x, y + s],
        ];
        const [ax, ay] = corners[orient];
        const start = (orient * Math.PI) / 2 + Math.PI / 2;
        c2d.moveTo(ax, ay);
        c2d.arc(ax, ay, s * 0.92, start, start + Math.PI / 2);
        c2d.closePath();
        break;
      }
      case 'triangle': {
        const pts = [
          [x, y],
          [x + s, y],
          [x + s, y + s],
          [x, y + s],
        ];
        c2d.moveTo(...pts[orient % 4]);
        c2d.lineTo(...pts[(orient + 1) % 4]);
        c2d.lineTo(...pts[(orient + 2) % 4]);
        c2d.closePath();
        break;
      }
      case 'bar': {
        const thick = s * 0.34;
        if (orient % 2 === 0) c2d.rect(x + s * 0.06, cy - thick / 2, s * 0.88, thick);
        else c2d.rect(cx - thick / 2, y + s * 0.06, thick, s * 0.88);
        break;
      }
    }
  }

  function drawCell(cellObj, cell, t, roles, intensity, lineW) {
    const cyclePos = t / cellObj.period + cellObj.phase;
    const cycle = Math.floor(cyclePos);
    const localSec = (cyclePos - cycle) * cellObj.period;
    const p = smoothstep(0, TRANS_SEC, localSec);

    const r1 = hash(cellObj.cseed, cycle);
    const r2 = hash(cellObj.cseed + 101, cycle);
    const r3 = hash(cellObj.cseed + 202, cycle);
    const r4 = hash(cellObj.cseed + 303, cycle);
    const kind = KINDS[(r1 * KINDS.length) | 0];
    const col = roles[(r2 * roles.length) | 0];
    const orient = (r3 * 4) | 0;
    // Rings always read as outline; otherwise fill share scales with intensity.
    const fill = kind !== 'ring' && r4 < intensity;

    const s = cell * cellObj.span;
    const x0 = cellObj.gx * cell;
    const y0 = cellObj.gy * cell;
    const cx = x0 + s / 2;
    const cy = y0 + s / 2;

    c2d.save();
    c2d.globalAlpha = p;
    // Slide in along dir, easing rotation out as it settles.
    const off = (1 - p) * s * 0.55;
    c2d.translate(cx + Math.cos(cellObj.dir) * off, cy + Math.sin(cellObj.dir) * off);
    c2d.rotate((1 - p) * (r4 - 0.5) * 1.2);
    c2d.translate(-cx, -cy);

    pathFor(kind, x0, y0, s, orient);
    if (fill) {
      c2d.fillStyle = rgb(col);
      c2d.fill();
    } else {
      c2d.strokeStyle = rgb(col);
      c2d.lineWidth = lineW * cellObj.span;
      c2d.lineJoin = 'round';
      c2d.stroke();
    }
    c2d.restore();
  }

  function frame(t, params) {
    const { cell, cells, features } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const roles = [c.primary, c.accent, c.info, c.success, c.warning, c.error, c.fg].filter(
      Boolean
    );
    if (!roles.length) roles.push([0.1, 0.1, 0.1]);
    const intensity = params.intensity ?? 0.5;
    const lineW = Math.max(2, cell * 0.06);

    for (const cellObj of cells) drawCell(cellObj, cell, t, roles, intensity, lineW);
    for (const f of features) drawCell(f, cell, t, roles, intensity, lineW);
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
