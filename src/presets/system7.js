import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

const HARD_BLACK = [0, 0, 0, 1];
const HARD_WHITE = [1, 1, 1, 1];
const MIN_WINDOWS = 2;
const MAX_WINDOWS = 8;
const STIPPLE_TILE = 4; // pattern tile size in CSS px

export function create({ host, c2d, getColors }) {
  let w = 0,
    h = 0;
  let windows = [];
  let lastSeed = -1,
    lastDensity = -1;
  let stipplePattern = null;
  let stippleKey = null;
  let lastT = 0;

  function palette() {
    const useTheme = host.hasAttribute('use-theme');
    if (!useTheme) return { page: HARD_WHITE, chrome: HARD_BLACK };
    const c = getColors();
    const page = c.bg && c.bg[3] > 0.01 ? c.bg : HARD_WHITE;
    const chrome = c.fg || HARD_BLACK;
    return { page, chrome };
  }

  function stippleDensity(intensity) {
    if (intensity < 0.34) return 0.25;
    if (intensity < 0.67) return 0.5;
    return 0.75;
  }

  function buildStipple(params, chrome) {
    const dens = stippleDensity(params.intensity);
    const key = `${dens}|${chrome[0]}|${chrome[1]}|${chrome[2]}`;
    if (key === stippleKey && stipplePattern) return stipplePattern;
    const pc = document.createElement('canvas');
    pc.width = STIPPLE_TILE;
    pc.height = STIPPLE_TILE;
    const pctx = pc.getContext('2d');
    pctx.fillStyle = rgb(chrome);
    if (dens === 0.5) {
      for (let y = 0; y < STIPPLE_TILE; y++) {
        for (let x = 0; x < STIPPLE_TILE; x++) {
          if (((x + y) & 1) === 0) pctx.fillRect(x, y, 1, 1);
        }
      }
    } else if (dens === 0.25) {
      [
        [0, 0],
        [2, 1],
        [1, 2],
        [3, 3],
      ].forEach(([x, y]) => pctx.fillRect(x, y, 1, 1));
    } else {
      for (let y = 0; y < STIPPLE_TILE; y++) {
        for (let x = 0; x < STIPPLE_TILE; x++) {
          if (((x + y) & 1) === 1) pctx.fillRect(x, y, 1, 1);
        }
      }
      [
        [0, 0],
        [2, 2],
      ].forEach(([x, y]) => pctx.fillRect(x, y, 1, 1));
    }
    stipplePattern = c2d.createPattern(pc, 'repeat');
    stippleKey = key;
    return stipplePattern;
  }

  function ensureWindows(params) {
    const seed = params.seed | 0;
    if (seed === lastSeed && params.density === lastDensity && windows.length > 0) return;
    lastSeed = seed;
    lastDensity = params.density;
    const count = Math.max(
      MIN_WINDOWS,
      Math.min(MAX_WINDOWS, Math.round(MIN_WINDOWS + params.density * (MAX_WINDOWS - MIN_WINDOWS)))
    );
    const rng = mulberry32(seed || 1);
    windows = [];
    for (let i = 0; i < count; i++) {
      windows.push({
        x: rng(),
        y: rng(),
        wRel: 0.16 + rng() * 0.18,
        hRel: 0.14 + rng() * 0.14,
        vx: (rng() - 0.5) * 0.04,
        vy: (rng() - 0.5) * 0.03,
        contentLines: 1 + Math.floor(rng() * 2),
      });
    }
  }

  function drawWindow(win, chrome, page) {
    const ww = win.wRel * w;
    const wh = win.hRel * h;
    const x = win.x * w - ww / 2;
    const y = win.y * h - wh / 2;
    const titleH = Math.max(14, Math.floor(wh * 0.12));

    c2d.fillStyle = rgb(page);
    c2d.fillRect(x, y, ww, wh);

    c2d.strokeStyle = rgb(chrome);
    c2d.lineWidth = 1;
    c2d.strokeRect(x + 0.5, y + 0.5, ww - 1, wh - 1);

    const lineY0 = y + 2;
    const lineSpacing = Math.max(2, Math.floor(titleH / 7));
    c2d.fillStyle = rgb(chrome);
    for (let i = 0; i < 6; i++) {
      c2d.fillRect(x + 12, lineY0 + i * lineSpacing, ww - 24, 1);
    }

    const boxSize = Math.max(8, Math.floor(titleH * 0.55));
    const boxY = y + Math.floor((titleH - boxSize) / 2);
    c2d.fillStyle = rgb(page);
    c2d.fillRect(x + 3, boxY, boxSize, boxSize);
    c2d.strokeRect(x + 3 + 0.5, boxY + 0.5, boxSize - 1, boxSize - 1);

    c2d.fillStyle = rgb(chrome);
    c2d.fillRect(x, y + titleH, ww, 1);

    const contentY0 = y + titleH + 4;
    if (stipplePattern) {
      const rowH = Math.floor((wh - titleH - 8) / Math.max(1, win.contentLines + 1));
      for (let i = 0; i < win.contentLines; i++) {
        c2d.fillStyle = stipplePattern;
        c2d.fillRect(x + 6, contentY0 + i * rowH, ww - 12, Math.max(4, rowH - 4));
      }
    }
  }

  function frame(t, params) {
    ensureWindows(params);
    const { page, chrome } = palette();
    buildStipple(params, chrome);

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;

    clearAndFill(c2d, w, h, page);
    c2d.fillStyle = stipplePattern;
    c2d.fillRect(0, 0, w, h);

    for (const win of windows) {
      win.x = (win.x + win.vx * dt + 1) % 1;
      win.y = (win.y + win.vy * dt + 1) % 1;
      drawWindow(win, chrome, page);
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      ensureWindows(params);
      const { page, chrome } = palette();
      buildStipple(params, chrome);
      clearAndFill(c2d, w, h, page);
      c2d.fillStyle = stipplePattern;
      c2d.fillRect(0, 0, w, h);
      for (const win of windows) drawWindow(win, chrome, page);
    },
    dispose() {
      windows = [];
      stipplePattern = null;
      stippleKey = null;
    },
  };
}
