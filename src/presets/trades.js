// trades — a busy trading terminal. Columns of ticker rows scroll upward,
// prices tick, rows flash green (up) / red (down), with a candlestick strip
// along the bottom. Deterministic via seed. Dataviz group.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

const SYMS = [
  'AAPL',
  'MSFT',
  'NVDA',
  'TSLA',
  'AMZN',
  'META',
  'GOOG',
  'AMD',
  'INTC',
  'NFLX',
  'BABA',
  'ORCL',
  'CRM',
  'UBER',
  'SHOP',
  'SQ',
  'PYPL',
  'SNAP',
  'RBLX',
  'COIN',
];

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;
  let rand = mulberry32(1);
  let rows = [];
  let candles = [];
  let lastSeed = null;

  function build(params) {
    rand = mulberry32(params.seed || 1);
    rows = SYMS.map((s) => ({
      sym: s,
      price: 20 + rand() * 400,
      drift: (rand() - 0.5) * 0.6,
      phase: rand() * 6.28,
    }));
    candles = [];
    let p = 100;
    for (let i = 0; i < 60; i++) {
      const o = p,
        cl = p + (rand() - 0.5) * 14;
      candles.push({
        o,
        c: cl,
        hi: Math.max(o, cl) + rand() * 6,
        lo: Math.min(o, cl) - rand() * 6,
      });
      p = cl;
    }
    lastSeed = params.seed;
  }

  function frame(t, params) {
    if (!rows.length || params.seed !== lastSeed) build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const up = `rgb(${(c.success ? c.success : c.primary).map((v) => (v * 255) | 0).join(',')})`;
    const down = `rgb(${(c.error ? c.error : c.accent).map((v) => (v * 255) | 0).join(',')})`;
    const fg = `rgb(${c.fg.map((v) => (v * 255) | 0).join(',')})`;

    const cols = Math.max(3, Math.round(3 + params.density * 4));
    const colW = w / cols;
    const fs = Math.max(11, Math.min(18, h / 26));
    c2d.font = `${fs}px ui-monospace, monospace`;
    c2d.textBaseline = 'middle';

    const rowH = fs * 1.5;
    const chartH = h * 0.26;
    const areaH = h - chartH;
    const speed = 18 * params.speed;

    for (let col = 0; col < cols; col++) {
      const x = col * colW + 8;
      const scroll = (t * speed * (1 + col * 0.08)) % rowH;
      const n = Math.ceil(areaH / rowH) + 1;
      for (let i = 0; i < n; i++) {
        const idx = (i + col * 7 + Math.floor((t * speed) / rowH)) % rows.length;
        const r = rows[idx];
        if (!r) continue;
        const y = areaH - (i * rowH - scroll);
        if (y < -rowH || y > areaH) continue;
        const tick = Math.sin(t * 0.8 + r.phase) + r.drift;
        const chg = tick * 2.4;
        const price = (r.price * (1 + tick * 0.02)).toFixed(2);
        const col2 = chg >= 0 ? up : down;
        // occasional flash
        if (Math.sin(t * 3 + idx) > 0.96) {
          c2d.fillStyle = chg >= 0 ? up : down;
          c2d.globalAlpha = 0.18;
          c2d.fillRect(col * colW, y - rowH / 2, colW, rowH);
          c2d.globalAlpha = 1;
        }
        c2d.fillStyle = fg;
        c2d.fillText(r.sym.padEnd(5), x, y);
        c2d.fillStyle = col2;
        c2d.fillText(
          `${price} ${chg >= 0 ? '▲' : '▼'}${Math.abs(chg).toFixed(1)}%`,
          x + fs * 3.4,
          y
        );
      }
      // column divider
      c2d.strokeStyle = `rgba(${c.fg.map((v) => (v * 255) | 0).join(',')},0.08)`;
      c2d.lineWidth = 1;
      c2d.beginPath();
      c2d.moveTo(col * colW, 0);
      c2d.lineTo(col * colW, areaH);
      c2d.stroke();
    }

    // candlestick strip
    const cw = w / candles.length;
    const baseY = areaH + chartH * 0.5;
    const scale = chartH / 80;
    const shift = Math.floor(t * 4) % candles.length;
    c2d.lineWidth = 1;
    for (let i = 0; i < candles.length; i++) {
      const k = (i + shift) % candles.length;
      const cd = candles[k];
      if (!cd) continue;
      const cx = i * cw + cw / 2;
      const isUp = cd.c >= cd.o;
      c2d.strokeStyle = c2d.fillStyle = isUp ? up : down;
      c2d.beginPath();
      c2d.moveTo(cx, baseY - (cd.hi - 100) * scale);
      c2d.lineTo(cx, baseY - (cd.lo - 100) * scale);
      c2d.stroke();
      const yA = baseY - (cd.o - 100) * scale,
        yB = baseY - (cd.c - 100) * scale;
      c2d.fillRect(cx - cw * 0.3, Math.min(yA, yB), cw * 0.6, Math.max(2, Math.abs(yB - yA)));
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
      frame(0, params);
    },
    dispose() {
      rows = [];
      candles = [];
    },
  };
}
