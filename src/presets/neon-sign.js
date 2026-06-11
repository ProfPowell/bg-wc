import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// neon-sign — roadside signage. Tube-outline shapes (an arrow, a starburst, an
// oval frame) plus a tube-script word — "OPEN" by default, overridden via
// `text` (lines split on '|' cycle every few seconds). Effects: bulb-chase
// dots stepping around the arrow, per-segment tube flicker with one seeded
// letter that buzzes, and a soft double-stroke glow. Glow is pre-rendered into
// offscreen layers (wide low-alpha halo strokes under a bright core) and
// composited per frame — no per-frame shadowBlur. `accent` tubes, `warning`
// chase bulbs, near-bg night field. `staticFrame`: everything lit, no flicker.

const WORD_SEC = 6; // seconds each text line stays up

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null; // { key, base, words:[{canvas,buzz}], arrowPath, bulbs }

  function readLines(params) {
    const txt = (host?.getAttribute('text') || params.text || '').trim();
    const lines = txt
      ? txt
          .split('|')
          .map((s) => s.trim())
          .filter(Boolean)
      : ['OPEN'];
    return lines.slice(0, 6);
  }

  // Stroke the current path of `o` three times: halo, mid, core.
  function neonStroke(o, col, width) {
    o.lineCap = 'round';
    o.lineJoin = 'round';
    o.strokeStyle = rgb(col, 0.16);
    o.lineWidth = width * 4.5;
    o.stroke();
    o.strokeStyle = rgb(col, 0.45);
    o.lineWidth = width * 2;
    o.stroke();
    o.strokeStyle = rgb(mix(col, [1, 1, 1], 0.65), 1);
    o.lineWidth = width;
    o.stroke();
  }

  function neonText(o, text, x, y, fs, col, width, skipIdx) {
    o.font = `${fs | 0}px 'Brush Script MT', 'Segoe Script', cursive`;
    o.textAlign = 'left';
    o.textBaseline = 'middle';
    // Per-letter so one letter can live on its own (buzzing) layer.
    let cx = x;
    for (let i = 0; i < text.length; i++) {
      const chW = o.measureText(text[i]).width;
      if (i !== skipIdx) {
        o.beginPath();
        o.strokeStyle = rgb(col, 0.16);
        o.lineWidth = width * 4;
        o.strokeText(text[i], cx, y);
        o.strokeStyle = rgb(col, 0.5);
        o.lineWidth = width * 1.8;
        o.strokeText(text[i], cx, y);
        o.strokeStyle = rgb(mix(col, [1, 1, 1], 0.7), 1);
        o.lineWidth = width * 0.8;
        o.strokeText(text[i], cx, y);
      }
      cx += chW;
    }
  }

  function layer() {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    return [cv, cv.getContext('2d')];
  }

  function build(params, c) {
    const lines = readLines(params);
    const tube = c.accent || [1, 0.3, 0.5];
    const key = `${params.seed | 0}|${lines.join('|')}|${rgb(tube)}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const width = Math.max(2.5, Math.min(w, h) * 0.008);
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.33;

    // BASE layer: oval frame + starburst + arrow outline (everything steady).
    const [baseCv, bo] = layer();
    bo.beginPath();
    bo.ellipse(cx, cy, R * 1.5, R * 0.85, 0, 0, Math.PI * 2);
    neonStroke(bo, tube, width);

    // Starburst at a seeded corner.
    const sx = (rng() < 0.5 ? 0.16 : 0.84) * w;
    const sy = 0.16 * h;
    const sr = Math.min(w, h) * 0.09;
    bo.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      bo.moveTo(sx + Math.cos(a) * sr * 0.35, sy + Math.sin(a) * sr * 0.35);
      bo.lineTo(sx + Math.cos(a) * sr, sy + Math.sin(a) * sr);
    }
    neonStroke(bo, c.info || tube, width * 0.8);

    // Arrow under the oval, pointing in; bulbs march along its outline.
    const ay = cy + R * 1.05;
    const aw = R * 1.5;
    const ah = R * 0.28;
    const arrow = [
      [cx - aw * 0.55, ay - ah / 2],
      [cx + aw * 0.25, ay - ah / 2],
      [cx + aw * 0.25, ay - ah],
      [cx + aw * 0.62, ay],
      [cx + aw * 0.25, ay + ah],
      [cx + aw * 0.25, ay + ah / 2],
      [cx - aw * 0.55, ay + ah / 2],
    ];
    bo.beginPath();
    bo.moveTo(arrow[0][0], arrow[0][1]);
    for (let i = 1; i < arrow.length; i++) bo.lineTo(arrow[i][0], arrow[i][1]);
    bo.closePath();
    neonStroke(bo, c.primary || tube, width * 0.85);

    // Bulb positions: evenly spaced along the arrow outline.
    const ring = [...arrow, arrow[0]];
    const lens = [0];
    let total = 0;
    for (let i = 1; i < ring.length; i++) {
      total += Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]);
      lens.push(total);
    }
    const bulbN = 26;
    const bulbs = [];
    let seg = 1;
    for (let i = 0; i < bulbN; i++) {
      const d = (i / bulbN) * total;
      while (lens[seg] < d) seg++;
      const f = (d - lens[seg - 1]) / (lens[seg] - lens[seg - 1] || 1);
      bulbs.push([
        ring[seg - 1][0] + (ring[seg][0] - ring[seg - 1][0]) * f,
        ring[seg - 1][1] + (ring[seg][1] - ring[seg - 1][1]) * f,
      ]);
    }

    // Word layers: per line, a steady layer + the buzzing letter's own layer.
    const words = [];
    for (const line of lines) {
      const [wc, wo] = layer();
      const [bc, bzo] = layer();
      let fs = R * 0.9;
      wo.font = `${fs | 0}px 'Brush Script MT', 'Segoe Script', cursive`;
      while (fs > 12 && wo.measureText(line).width > R * 2.4) {
        fs *= 0.92;
        wo.font = `${fs | 0}px 'Brush Script MT', 'Segoe Script', cursive`;
      }
      const tw = wo.measureText(line).width;
      const buzzIdx = line.length > 1 ? (rng() * line.length) | 0 : -1;
      neonText(wo, line, cx - tw / 2, cy, fs, tube, width, buzzIdx);
      if (buzzIdx >= 0) {
        // Draw only the buzzing letter at its proper offset.
        bzo.font = wo.font;
        let off = 0;
        for (let i = 0; i < buzzIdx; i++) off += bzo.measureText(line[i]).width;
        neonText(bzo, line[buzzIdx], cx - tw / 2 + off, cy, fs, tube, width, -1);
      }
      words.push({ canvas: wc, buzz: buzzIdx >= 0 ? bc : null, dropSeed: rng() * 1000 });
    }

    cache = { key, base: baseCv, words, bulbs, bulbCol: c.warning || [1, 0.8, 0.3] };
    return cache;
  }

  function nightField(c) {
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.04, 0.04, 0.07];
    clearAndFill(c2d, w, h, [bg[0] * 0.5, bg[1] * 0.5, bg[2] * 0.6, 1]);
  }

  function frame(t, params) {
    const c = getColors();
    const { base, words, bulbs, bulbCol } = build(params, c);
    nightField(c);
    const intensity = params.intensity ?? 0.5;

    // Steady tubes with a faint mains hum.
    const hum = 0.92 + 0.08 * Math.sin(t * 23) * Math.sin(t * 7.7);
    c2d.globalAlpha = (0.7 + 0.3 * intensity) * hum;
    c2d.drawImage(base, 0, 0);

    // Current word + its buzzing letter (seeded dropout).
    const word = words[Math.floor(t / WORD_SEC) % words.length];
    c2d.drawImage(word.canvas, 0, 0);
    if (word.buzz) {
      const n = Math.sin(t * 31 + word.dropSeed) * Math.sin(t * 13.7 + word.dropSeed * 2);
      const on = n > -0.55 ? 1 : 0.15; // mostly lit, sputters out
      c2d.globalAlpha = (0.7 + 0.3 * intensity) * hum * on;
      c2d.drawImage(word.buzz, 0, 0);
    }
    c2d.globalAlpha = 1;

    // Bulb chase around the arrow.
    const step = Math.floor(t * 8);
    const r = Math.max(2, Math.min(w, h) * 0.006);
    for (let i = 0; i < bulbs.length; i++) {
      const lit = (i - step) % 3 === 0;
      c2d.fillStyle = rgb(bulbCol, lit ? 1 : 0.18);
      c2d.beginPath();
      c2d.arc(bulbs[i][0], bulbs[i][1], lit ? r * 1.4 : r, 0, Math.PI * 2);
      c2d.fill();
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
      const c = getColors();
      const { base, words, bulbs, bulbCol } = build(params, c);
      nightField(c);
      c2d.drawImage(base, 0, 0);
      c2d.drawImage(words[0].canvas, 0, 0);
      if (words[0].buzz) c2d.drawImage(words[0].buzz, 0, 0);
      const r = Math.max(2, Math.min(w, h) * 0.006);
      c2d.fillStyle = rgb(bulbCol, 1);
      for (const b of bulbs) {
        c2d.beginPath();
        c2d.arc(b[0], b[1], r, 0, Math.PI * 2);
        c2d.fill();
      }
    },
    dispose() {
      cache = null;
    },
  };
}
