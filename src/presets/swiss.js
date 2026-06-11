import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// swiss — International Typographic Style. A strict modular grid (hairlines at
// low alpha) carries a few asymmetrically placed elements: oversized numerals,
// thick rules, and flat planes of primary / accent / error-red. Motion is
// restrained by design: each element slides along a grid axis between two
// seeded alignments on a long, staggered cycle — one element moving at a time —
// and a thin rule occasionally sweeps the page. `density` = grid columns,
// `intensity` = how much ink. System geometric sans only.

const CYCLE = 18; // seconds for a full slide round-trip per element

function ease(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${params.intensity}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const cols = 5 + Math.round((params.density ?? 0.5) * 7); // 5..12
    const rows = Math.max(4, Math.round((cols * h) / w));
    const ink = params.intensity ?? 0.5;

    const els = [];
    // Flat planes (2–3): span a few cells, slide along one axis.
    const planes = 2 + (rng() < ink ? 1 : 0);
    for (let i = 0; i < planes; i++) {
      const cw = 1 + ((rng() * (cols / 3)) | 0);
      const ch = 1 + ((rng() * (rows / 3)) | 0);
      const axis = rng() < 0.5 ? 'x' : 'y';
      const a = [(rng() * (cols - cw)) | 0, (rng() * (rows - ch)) | 0];
      const b = a.slice();
      if (axis === 'x') b[0] = (rng() * (cols - cw)) | 0;
      else b[1] = (rng() * (rows - ch)) | 0;
      els.push({ kind: 'plane', a, b, cw, ch, ci: i % 3, slot: els.length });
    }
    // Oversized numerals (1–2): seeded digits.
    const nums = 1 + (rng() < 0.6 ? 1 : 0);
    for (let i = 0; i < nums; i++) {
      const a = [(rng() * (cols - 2)) | 0, (rng() * (rows - 3)) | 0];
      const b = [a[0], (rng() * (rows - 3)) | 0];
      els.push({
        kind: 'numeral',
        a,
        b,
        digit: String((rng() * 10) | 0),
        big: i === 0,
        slot: els.length,
      });
    }
    // Thick rules (2): horizontal or vertical bars.
    for (let i = 0; i < 2; i++) {
      const horiz = rng() < 0.5;
      const a = [(rng() * cols) | 0, (rng() * rows) | 0];
      const b = horiz ? [(rng() * cols) | 0, a[1]] : [a[0], (rng() * rows) | 0];
      const span = 2 + ((rng() * 3) | 0);
      els.push({ kind: 'rule', a, b, horiz, span, slot: els.length });
    }
    cache = { key, cols, rows, els, sweepPhase: rng() };
    return cache;
  }

  // Where element `el` sits right now: slides a→b→a, but only during its own
  // slot window so a single element moves at a time.
  function posOf(el, t, count) {
    const cyc = t / CYCLE;
    const phase = (cyc + el.slot / count) % 1;
    // Each element gets a 1/count-wide moving window per half cycle.
    const winW = 1 / (count * 2);
    const goWin = el.slot / count / 2;
    const backWin = 0.5 + goWin;
    let f = 0;
    if (phase >= goWin && phase < goWin + winW) f = ease((phase - goWin) / winW);
    else if (phase >= goWin + winW && phase < backWin) f = 1;
    else if (phase >= backWin && phase < backWin + winW) f = 1 - ease((phase - backWin) / winW);
    return [el.a[0] + (el.b[0] - el.a[0]) * f, el.a[1] + (el.b[1] - el.a[1]) * f];
  }

  function frame(t, params) {
    const { cols, rows, els, sweepPhase } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const fg = c.fg || [0.1, 0.1, 0.1];
    const planesCols = [c.primary, c.accent, c.error].filter(Boolean);
    if (!planesCols.length) planesCols.push(fg);
    const cw = w / cols;
    const ch = h / rows;
    const ink = params.intensity ?? 0.5;

    // Grid hairlines.
    c2d.strokeStyle = rgb(fg, 0.1 + 0.08 * ink);
    c2d.lineWidth = 1;
    c2d.beginPath();
    for (let i = 1; i < cols; i++) {
      c2d.moveTo(i * cw, 0);
      c2d.lineTo(i * cw, h);
    }
    for (let j = 1; j < rows; j++) {
      c2d.moveTo(0, j * ch);
      c2d.lineTo(w, j * ch);
    }
    c2d.stroke();

    const n = els.length;
    for (const el of els) {
      const [gx, gy] = posOf(el, t, n);
      const x = gx * cw;
      const y = gy * ch;
      if (el.kind === 'plane') {
        c2d.fillStyle = rgb(planesCols[el.ci % planesCols.length]);
        c2d.fillRect(x, y, el.cw * cw, el.ch * ch);
      } else if (el.kind === 'numeral') {
        const fs = (el.big ? 3.4 : 2.1) * ch;
        c2d.fillStyle = rgb(fg, 0.85 + 0.15 * ink);
        c2d.font = `700 ${fs | 0}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
        c2d.textBaseline = 'top';
        c2d.textAlign = 'left';
        c2d.fillText(el.digit, x, y);
      } else {
        c2d.fillStyle = rgb(fg);
        const thick = Math.max(3, ch * 0.16);
        if (el.horiz) c2d.fillRect(x, y, el.span * cw, thick);
        else c2d.fillRect(x, y, thick, el.span * ch);
      }
    }

    // Occasional thin rule sweeping the page (one brief pass per cycle).
    const sw = ((t / CYCLE + sweepPhase) % 1) / 0.2;
    if (sw < 1) {
      c2d.strokeStyle = rgb(fg, 0.6);
      c2d.lineWidth = 1.5;
      const sx = ease(sw) * w;
      c2d.beginPath();
      c2d.moveTo(sx, 0);
      c2d.lineTo(sx, h);
      c2d.stroke();
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
