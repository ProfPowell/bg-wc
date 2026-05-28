import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';

const ACCENT_TILE_THRESHOLD = 0.85;

export function create({ host, c2d, getColors }) {
  let w = 0, h = 0;
  let lastSeed = -1, lastMode = '', lastDensity = -1;
  let state = null;
  let lastT = 0;

  function modeOf() {
    const m = (host.getAttribute('mode') || 'isometric').toLowerCase();
    return ['isometric', 'flat', 'sparse', 'stacked', 'blocks'].includes(m) ? m : 'isometric';
  }

  function rebuild(params) {
    const mode = modeOf();
    const seed = params.seed | 0;
    const rng = mulberry32(seed || 1);
    const density = params.density;

    if (mode === 'isometric') {
      const cols = Math.max(6, Math.floor(8 + density * 12));
      const tiles = [];
      for (let i = -2; i < cols; i++) {
        for (let j = -2; j < cols; j++) {
          tiles.push({ i, j, pulsePhase: rng() * Math.PI * 2, hue: rng() });
        }
      }
      state = { mode, tiles, cols };
    } else if (mode === 'flat') {
      const layers = [];
      for (let L = 0; L < 4; L++) {
        const count = Math.max(4, Math.floor(8 + density * 12 - L * 2));
        const items = [];
        const size = 0.04 + L * 0.04;
        for (let i = 0; i < count; i++) {
          items.push({ x: rng(), y: rng(), size, alpha: 0.06 + L * 0.05 });
        }
        layers.push({ items, parallax: 1 - L * 0.25 });
      }
      state = { mode, layers };
    } else if (mode === 'sparse') {
      const step = Math.max(40, Math.floor(140 - density * 80));
      const pulses = [];
      const pulseCount = Math.max(2, Math.floor(2 + density * 6));
      for (let i = 0; i < pulseCount; i++) {
        pulses.push({ next: rng() * 4, ttl: 0, cx: 0, cy: 0, color: rng() < 0.5 ? 'primary' : 'accent' });
      }
      state = { mode, step, pulses, rng };
    } else if (mode === 'stacked') {
      const stacks = [];
      const count = Math.max(4, Math.floor(6 + density * 14));
      for (let i = 0; i < count; i++) {
        stacks.push({
          x: (i + 0.5) / count,
          height: 3 + Math.floor(rng() * 5),
          phase: rng() * 6,
          color: ['primary', 'accent', 'info'][Math.floor(rng() * 3)],
        });
      }
      state = { mode, stacks };
    } else if (mode === 'blocks') {
      // Grid-aligned squares clustered toward viewport edges, single hue with
      // three shade levels. Every cell breathes at its own rate; a diagonal
      // wave periodically brightens a sweeping strip so the eye sees motion
      // without the composition changing.
      const cols = Math.max(8, Math.floor(10 + density * 8));   // 10-18
      const rows = Math.max(6, Math.floor(7 + density * 5));    // 7-12
      const cells = [];
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          // Edge bias: cells near any edge are far more likely to fill;
          // center cells are usually empty so the eye reads a frame, not a wash.
          const ex = Math.min(col, cols - 1 - col) / (cols / 2);
          const ey = Math.min(r, rows - 1 - r) / (rows / 2);
          const edgeDist = Math.min(ex, ey);
          const fillProb = 0.15 + (1 - edgeDist) * 0.55;
          if (rng() >= fillProb) continue;
          cells.push({
            col,
            row: r,
            shade: rng() < 0.4 ? 2 : rng() < 0.6 ? 1 : 0, // mostly mid/dark, some light
            phase: rng() * Math.PI * 2,
            // Varied breathing frequencies — some quick (~3s), some slow (~18s).
            pulseFreq: 0.35 + rng() * 1.7,
            // Diagonal coordinate 0..1 used by the wave sweep.
            wavePos: (col / cols + r / rows) * 0.5,
            merge: rng() < 0.18 && col < cols - 1 && r < rows - 1 ? 2 : 1,
          });
        }
      }
      state = { mode, cells, cols, rows };
    }
    lastMode = mode;
    lastSeed = seed;
    lastDensity = density;
  }

  function ensure(params) {
    const mode = modeOf();
    if (
      !state ||
      mode !== lastMode ||
      (params.seed | 0) !== lastSeed ||
      params.density !== lastDensity
    ) {
      rebuild(params);
    }
  }

  function rgb(v, a = 1) {
    return `rgba(${(v[0] * 255) | 0},${(v[1] * 255) | 0},${(v[2] * 255) | 0},${a})`;
  }

  function drawIso(t, params, c) {
    const tileW = Math.min(w, h) / Math.max(6, state.cols * 0.9);
    const tileH = tileW * 0.55;
    const drift = (t * 0.05) % 1;
    const intensity = params.intensity;
    c2d.lineWidth = 1;
    for (const tile of state.tiles) {
      const cx = (tile.i - tile.j) * tileW * 0.95 + w / 2 + drift * tileW;
      const cy = (tile.i + tile.j) * tileH * 0.95 + h / 2 - drift * tileH * 0.5;
      if (cx < -tileW * 2 || cx > w + tileW * 2 || cy < -tileH * 2 || cy > h + tileH * 2) continue;
      c2d.beginPath();
      c2d.moveTo(cx, cy - tileH);
      c2d.lineTo(cx + tileW, cy);
      c2d.lineTo(cx, cy + tileH);
      c2d.lineTo(cx - tileW, cy);
      c2d.closePath();
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.6 + tile.pulsePhase);
      const baseAlpha = 0.04 + 0.06 * intensity;
      c2d.fillStyle = rgb(c.primary, baseAlpha * (0.6 + 0.4 * pulse));
      c2d.fill();
      c2d.strokeStyle = rgb(c.fg, 0.08 + 0.06 * intensity);
      c2d.stroke();
      if (tile.hue > ACCENT_TILE_THRESHOLD) {
        c2d.fillStyle = rgb(c.accent, baseAlpha * 1.4 * pulse);
        c2d.fill();
      }
    }
  }

  function drawFlat(t, params, c) {
    for (let L = 0; L < state.layers.length; L++) {
      const layer = state.layers[L];
      const drift = (t * 0.04 * layer.parallax) % 1;
      const color = L % 3 === 0 ? c.primary : L % 3 === 1 ? c.accent : c.info;
      for (const it of layer.items) {
        const sz = it.size * Math.min(w, h);
        const x = ((it.x + drift) % 1) * w;
        const y = it.y * h;
        c2d.fillStyle = rgb(color, it.alpha * (0.5 + 0.5 * params.intensity));
        c2d.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
    }
  }

  function drawSparse(t, dt, params, c) {
    const step = state.step;
    const rng = state.rng;
    c2d.strokeStyle = rgb(c.fg, 0.06 + 0.04 * params.intensity);
    c2d.lineWidth = 1;
    c2d.beginPath();
    for (let x = step; x < w; x += step) {
      c2d.moveTo(x, 0); c2d.lineTo(x, h);
    }
    for (let y = step; y < h; y += step) {
      c2d.moveTo(0, y); c2d.lineTo(w, y);
    }
    c2d.stroke();
    for (const p of state.pulses) {
      p.next -= dt;
      if (p.next <= 0 && p.ttl <= 0) {
        p.cx = Math.floor(rng() * Math.floor(w / step)) * step;
        p.cy = Math.floor(rng() * Math.floor(h / step)) * step;
        p.ttl = 1.2;
        p.next = 1.5 + rng() * 3;
      }
      if (p.ttl > 0) {
        p.ttl -= dt;
        const a = Math.sin((1 - p.ttl / 1.2) * Math.PI) * params.intensity * 0.45;
        c2d.fillStyle = rgb(p.color === 'primary' ? c.primary : c.accent, a);
        c2d.fillRect(p.cx + 1, p.cy + 1, step - 2, step - 2);
      }
    }
  }

  function drawStacked(t, params, c) {
    const bw = w / state.stacks.length * 0.7;
    const bh = bw;
    for (const s of state.stacks) {
      const cycle = ((t + s.phase) * 0.4) % (s.height + 1.5);
      const visible = Math.min(s.height, Math.floor(cycle));
      const x = s.x * w - bw / 2;
      const color = s.color === 'primary' ? c.primary : s.color === 'accent' ? c.accent : c.info;
      for (let i = 0; i < visible; i++) {
        const y = h - (i + 1) * bh - 8;
        c2d.fillStyle = rgb(color, 0.18 + 0.18 * params.intensity);
        c2d.fillRect(x, y, bw, bh - 2);
        c2d.strokeStyle = rgb(c.fg, 0.12);
        c2d.strokeRect(x, y, bw, bh - 2);
      }
    }
  }

  function drawBlocks(t, params, c) {
    const cellW = w / state.cols;
    const cellH = h / state.rows;
    // Three shade alphas (light / mid / dark) applied to primary, against
    // whatever bg the host provides — typical Pint usage is dark-navy bg
    // with light-teal primary, so the alpha steps read as a tonal range.
    const shadeAlpha = [0.32, 0.58, 0.85];
    const intMul = 0.7 + 0.3 * params.intensity;
    // Diagonal wave sweeps across the grid every ~12s at speed=1, lifting
    // the brightness of cells in its path.
    const wavePhase = t * 0.5;

    for (const cell of state.cells) {
      // Per-cell breathing — varies brightness in a band around the cell's
      // base shade; varied freq means cells don't pulse in unison.
      const breath = 0.78 + 0.22 * Math.sin(t * cell.pulseFreq + cell.phase);
      // Diagonal wave bump — additive, only when the wave's crest is over
      // this cell. The Math.max keeps it non-negative so dim cells only
      // ever brighten, never go below their breath baseline.
      const waveBoost = Math.max(0, Math.sin(wavePhase - cell.wavePos * Math.PI * 2)) * 0.35;
      const presence = Math.min(1.1, breath + waveBoost);

      const alpha = Math.min(1, shadeAlpha[cell.shade] * presence * intMul);
      c2d.fillStyle = rgb(c.primary, alpha);
      const x = cell.col * cellW;
      const y = cell.row * cellH;
      const sz = cell.merge;
      // Inset by 1px to keep crisp grid spacing between adjacent cells.
      c2d.fillRect(x + 1, y + 1, cellW * sz - 2, cellH * sz - 2);
    }
  }

  function frame(t, params) {
    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    if (state.mode === 'isometric') drawIso(t, params, c);
    else if (state.mode === 'flat') drawFlat(t, params, c);
    else if (state.mode === 'sparse') drawSparse(t, dt, params, c);
    else if (state.mode === 'stacked') drawStacked(t, params, c);
    else if (state.mode === 'blocks') drawBlocks(t, params, c);
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame,
    staticFrame(params) { frame(0, params); },
    dispose() {
      state = null;
    },
  };
}
