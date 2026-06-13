import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// splitflap — a Solari split-flap board. A grid of character cells, each split
// across the middle; to change glyph a cell riffles through the alphabet, the
// top half folding down over the face, settling on its target letter. Cells
// start staggered so the board "clatters" into its message, holds, then flips
// to the next. `text` sets the board contents (lines split on '|', cycling);
// without it, seeded words. `density` = cell size. The flip is a deterministic
// function of `t` (each cell's settle time derived from seed), so a frozen
// frame is stable.

const GLYPHS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-';
const HOLD_SEC = 4.5; // how long a settled message stays before the next
const FLIP_SEC = 0.045; // time per glyph step while riffling

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const DEFAULT_WORDS = ['ARRIVALS', 'ON TIME', 'GATE 7', 'BOARDING', 'DELAYED', 'DEPARTED'];

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function lines(params) {
    const txt = (host?.getAttribute('text') || params.text || '').trim();
    return txt
      ? txt
          .split('|')
          .map((s) => s.toUpperCase().slice(0, 14))
          .filter(Boolean)
      : null;
  }

  function build(params) {
    const msgs = lines(params);
    const key = `${params.seed | 0}|${params.density}|${msgs ? msgs.join('|') : 'seed'}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const cols = msgs
      ? Math.max(...msgs.map((m) => m.length), 6)
      : 6 + Math.round((params.density ?? 0.5) * 8);
    const rows = msgs ? Math.min(msgs.length, 6) : 3 + Math.round((params.density ?? 0.5) * 3);
    // Per-cell stagger so the board doesn't settle all at once.
    const stagger = [];
    for (let r = 0; r < rows; r++) {
      stagger.push([]);
      for (let ci = 0; ci < cols; ci++) stagger[r].push(0.1 + rng() * 0.9 + ci * 0.04);
    }
    // Word sets per row when seeded (no text).
    const wordRows = [];
    if (!msgs) {
      for (let r = 0; r < rows; r++) {
        const set = [];
        for (let i = 0; i < 4; i++) set.push(DEFAULT_WORDS[(rng() * DEFAULT_WORDS.length) | 0]);
        wordRows.push(set);
      }
    }
    cache = { key, cols, rows, stagger, msgs, wordRows };
    return cache;
  }

  function glyphIndex(ch) {
    const i = GLYPHS.indexOf(ch);
    return i < 0 ? 0 : i;
  }

  // The message shown at cycle `cyc` for row r (floored modulo — cyc can be -1).
  function targetFor(c, r, cyc) {
    if (c.msgs) {
      const n = c.msgs.length;
      return c.msgs[(((cyc + r) % n) + n) % n] || '';
    }
    const set = c.wordRows[r];
    return set[((cyc % set.length) + set.length) % set.length];
  }

  function drawCell(ch, x, y, cw, ch2, c, intensity) {
    const cellBg = mix(c.bg && c.bg[3] > 0.01 ? c.bg : [0.08, 0.08, 0.1], [0, 0, 0], 0.3);
    const ink = mix(c.fg || [0.92, 0.92, 0.88], c.warning || [1, 0.9, 0.6], 0.15 * intensity);
    const r = Math.min(cw, ch2) * 0.1;
    // Card body.
    c2d.fillStyle = rgb(cellBg);
    roundRect(c2d, x, y, cw, ch2, r);
    c2d.fill();
    // Centre split line.
    c2d.strokeStyle = rgb([0, 0, 0], 0.55);
    c2d.lineWidth = Math.max(1, ch2 * 0.02);
    c2d.beginPath();
    c2d.moveTo(x, y + ch2 / 2);
    c2d.lineTo(x + cw, y + ch2 / 2);
    c2d.stroke();
    // Glyph.
    if (ch !== ' ') {
      c2d.fillStyle = rgb(ink);
      c2d.font = `700 ${(ch2 * 0.66) | 0}px 'Helvetica Neue', Arial, sans-serif`;
      c2d.textAlign = 'center';
      c2d.textBaseline = 'middle';
      c2d.fillText(ch, x + cw / 2, y + ch2 / 2 + ch2 * 0.02);
    }
  }

  // A folding top flap mid-flip (a horizontal squash of the top half).
  function drawFlap(ch, x, y, cw, ch2, fold, c) {
    const cellBg = mix(c.bg && c.bg[3] > 0.01 ? c.bg : [0.08, 0.08, 0.1], [0, 0, 0], 0.12);
    const halfH = ch2 / 2;
    const fh = Math.max(0.02, Math.abs(Math.cos(fold * Math.PI))) * halfH;
    const top = fold < 0.5 ? y : y + halfH - fh;
    c2d.fillStyle = rgb(mix(cellBg, [1, 1, 1], 0.06));
    c2d.fillRect(x + 1, top, cw - 2, fh);
    c2d.strokeStyle = rgb([0, 0, 0], 0.5);
    c2d.lineWidth = 1;
    c2d.strokeRect(x + 1, top, cw - 2, fh);
  }

  function frame(t, params) {
    const cfg = build(params);
    const c = getColors();
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.06, 0.06, 0.08];
    clearAndFill(c2d, w, h, [bg[0] * 0.5, bg[1] * 0.5, bg[2] * 0.55, 1]);
    const intensity = params.intensity ?? 0.5;
    const { cols, rows, stagger } = cfg;

    const pad = Math.min(w, h) * 0.05;
    const gapX = (w - pad * 2) / cols;
    const gapY = (h - pad * 2) / rows;
    const cw = gapX * 0.86;
    const ch2 = gapY * 0.82;

    const cyc = Math.floor(t / HOLD_SEC);
    const local = t - cyc * HOLD_SEC; // seconds into this message

    for (let r = 0; r < rows; r++) {
      const target = targetFor(cfg, r, cyc);
      const prev = targetFor(cfg, r, cyc - 1);
      for (let ci = 0; ci < cols; ci++) {
        const x = pad + ci * gapX + (gapX - cw) / 2;
        const y = pad + r * gapY + (gapY - ch2) / 2;
        const want = target[ci] || ' ';
        const from = prev[ci] || ' ';
        const settleAt = stagger[r][ci];
        const wi = glyphIndex(want);
        const fi = glyphIndex(from);
        // Number of glyph steps from `from` to `want` (forward through the reel).
        const steps = (wi - fi + GLYPHS.length) % GLYPHS.length;
        const elapsed = local - 0.05;
        const stepsDone = Math.floor(elapsed / FLIP_SEC);
        let shown;
        let fold = 0;
        if (elapsed < 0 || stepsDone >= steps || local > settleAt) {
          shown = want;
        } else {
          shown = GLYPHS[(fi + stepsDone) % GLYPHS.length];
          fold = (elapsed / FLIP_SEC) % 1;
        }
        drawCell(shown, x, y, cw, ch2, c, intensity);
        if (fold > 0) drawFlap(shown, x, y, cw, ch2, fold, c);
      }
    }
  }

  function roundRect(ctx, x, y, rw, rh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, r);
    ctx.arcTo(x + rw, y + rh, x, y + rh, r);
    ctx.arcTo(x, y + rh, x, y, r);
    ctx.arcTo(x, y, x + rw, y, r);
    ctx.closePath();
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(HOLD_SEC - 0.4, params); // a settled board
    },
    dispose() {
      cache = null;
    },
  };
}
