import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// hieroglyph — columns of glyph-like marks carving in top to bottom. The glyph
// set is a small invented vocabulary of primitive forms (eye, bird, wave,
// looped cross, reed, sun, serpent — drawn procedurally, not a real script or
// font). Columns are separated by rules; glyphs chisel in sequentially down
// each column with a brief reveal pop and an inset shadow so they read as
// carved. The sandstone field (bg softened toward warning, with speckle) is
// cached offscreen. `density` = column count, `intensity` = carve contrast.

const GLYPHS = ['eye', 'bird', 'wave', 'loop', 'reed', 'sun', 'serpent'];
const CARVE_SEC = 0.5; // reveal time per glyph
const START_OFF = 9; // clock offset so a frozen first frame shows carved columns

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function sandstone(rng, c) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const o = cv.getContext('2d');
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.85, 0.74, 0.55];
    const sand = mix(bg, c.warning || [0.85, 0.65, 0.35], 0.22);
    o.fillStyle = rgb(sand);
    o.fillRect(0, 0, w, h);
    // Speckle + faint horizontal strata.
    for (let i = 0; i < w * h * 0.0012; i++) {
      o.fillStyle = rgb(rng() < 0.5 ? [0, 0, 0] : [1, 1, 1], 0.04 + rng() * 0.05);
      o.fillRect(rng() * w, rng() * h, 1.5, 1.5);
    }
    o.fillStyle = rgb([0, 0, 0], 0.03);
    for (let y = 0; y < h; y += 7 + rng() * 18) o.fillRect(0, y, w, 1 + rng() * 2);
    return cv;
  }

  // Draw one glyph centred in a cell of size s (stroke set by caller).
  function glyphPath(kind, s) {
    const u = s / 2;
    c2d.beginPath();
    switch (kind) {
      case 'eye':
        c2d.moveTo(-u * 0.8, 0);
        c2d.quadraticCurveTo(0, -u * 0.7, u * 0.8, 0);
        c2d.quadraticCurveTo(0, u * 0.7, -u * 0.8, 0);
        c2d.moveTo(u * 0.26, 0);
        c2d.arc(0, 0, u * 0.26, 0, Math.PI * 2);
        break;
      case 'bird':
        c2d.moveTo(-u * 0.7, u * 0.6);
        c2d.lineTo(-u * 0.1, -u * 0.1);
        c2d.lineTo(u * 0.55, u * 0.05);
        c2d.lineTo(u * 0.1, u * 0.6);
        c2d.closePath();
        c2d.moveTo(-u * 0.1, -u * 0.1);
        c2d.lineTo(-u * 0.05, -u * 0.5);
        c2d.moveTo(u * 0.22, -u * 0.52);
        c2d.arc(0, -u * 0.52, u * 0.22, 0, Math.PI * 2);
        c2d.moveTo(-u * 0.22, -u * 0.52);
        c2d.lineTo(-u * 0.5, -u * 0.42);
        break;
      case 'wave':
        for (let r = 0; r < 2; r++) {
          const y = -u * 0.25 + r * u * 0.5;
          c2d.moveTo(-u * 0.8, y);
          for (let i = 0; i < 4; i++) {
            c2d.lineTo(-u * 0.8 + (i + 0.5) * u * 0.4, y - u * 0.22);
            c2d.lineTo(-u * 0.8 + (i + 1) * u * 0.4, y);
          }
        }
        break;
      case 'loop':
        c2d.moveTo(0, u * 0.75);
        c2d.lineTo(0, -u * 0.05);
        c2d.moveTo(u * 0.32, -u * 0.4);
        c2d.arc(0, -u * 0.4, u * 0.32, 0, Math.PI * 2);
        c2d.moveTo(-u * 0.5, u * 0.12);
        c2d.lineTo(u * 0.5, u * 0.12);
        break;
      case 'reed':
        c2d.moveTo(0, u * 0.75);
        c2d.lineTo(0, -u * 0.7);
        c2d.quadraticCurveTo(u * 0.5, -u * 0.65, u * 0.42, -u * 0.2);
        c2d.quadraticCurveTo(u * 0.1, -u * 0.35, 0, -u * 0.3);
        break;
      case 'sun':
        c2d.moveTo(u * 0.5, 0);
        c2d.arc(0, 0, u * 0.5, 0, Math.PI * 2);
        c2d.moveTo(u * 0.14, 0);
        c2d.arc(0, 0, u * 0.14, 0, Math.PI * 2);
        break;
      case 'serpent':
        c2d.moveTo(-u * 0.7, u * 0.5);
        c2d.quadraticCurveTo(-u * 0.3, -u * 0.5, 0, 0);
        c2d.quadraticCurveTo(u * 0.3, u * 0.5, u * 0.6, -u * 0.3);
        c2d.moveTo(u * 0.72, -u * 0.36);
        c2d.arc(u * 0.64, -u * 0.36, u * 0.09, 0, Math.PI * 2);
        break;
    }
  }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const c = getColors();
    const stone = sandstone(rng, c);
    const cols = 4 + Math.round((params.density ?? 0.5) * 8);
    const colW = w / cols;
    const cell = Math.min(colW * 0.72, h * 0.085);
    const rows = Math.floor((h * 0.92) / (cell * 1.25));
    const glyphs = [];
    for (let ci = 0; ci < cols; ci++) {
      const colDelay = rng() * 3;
      for (let ri = 0; ri < rows; ri++) {
        glyphs.push({
          kind: GLYPHS[(rng() * GLYPHS.length) | 0],
          x: (ci + 0.5) * colW,
          y: h * 0.05 + (ri + 0.5) * cell * 1.25,
          at: colDelay + ri * (0.4 + rng() * 0.3), // top-to-bottom carve order
          rot: (rng() - 0.5) * 0.06,
        });
      }
    }
    cache = { key, stone, glyphs, cols, colW, cell };
    return cache;
  }

  function frame(t0, params) {
    const t = t0 + START_OFF;
    const { stone, glyphs, cols, colW, cell } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    c2d.drawImage(stone, 0, 0);
    const intensity = params.intensity ?? 0.5;
    const carve = mix([0, 0, 0], c.fg || [0.2, 0.15, 0.1], 0.3);

    // Column rules.
    c2d.strokeStyle = rgb(carve, 0.25);
    c2d.lineWidth = Math.max(1, cell * 0.05);
    c2d.beginPath();
    for (let ci = 0; ci <= cols; ci++) {
      c2d.moveTo(ci * colW, h * 0.03);
      c2d.lineTo(ci * colW, h * 0.97);
    }
    c2d.stroke();

    const lw = Math.max(1.5, cell * 0.09);
    for (const g of glyphs) {
      const p = Math.min(1, Math.max(0, (t - g.at) / CARVE_SEC));
      if (p <= 0) continue;
      c2d.save();
      c2d.translate(g.x, g.y);
      c2d.rotate(g.rot);
      const pop = 1 + (1 - p) * 0.25; // chisel "settle"
      c2d.scale(pop, pop);
      c2d.globalAlpha = p;
      // Inset highlight below-right, then the carved groove.
      c2d.lineCap = 'round';
      c2d.lineJoin = 'round';
      c2d.translate(lw * 0.45, lw * 0.45);
      glyphPath(g.kind, cell);
      c2d.strokeStyle = rgb([1, 1, 1], 0.3 + 0.2 * intensity);
      c2d.lineWidth = lw;
      c2d.stroke();
      c2d.translate(-lw * 0.45, -lw * 0.45);
      glyphPath(g.kind, cell);
      c2d.strokeStyle = rgb(carve, 0.55 + 0.35 * intensity);
      c2d.lineWidth = lw;
      c2d.stroke();
      c2d.restore();
    }
    c2d.globalAlpha = 1;
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(60, params); // wall fully carved
    },
    dispose() {
      cache = null;
    },
  };
}
