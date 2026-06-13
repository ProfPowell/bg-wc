import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// nixie — a row of Nixie tubes (50s–70s cold-cathode numeric readout). Each
// tube shows a warm-orange numeral built from a stacked-wire digit glyph, with
// the faint unlit "ghost" digits layered behind (the signature depth), a fine
// anode-mesh overlay, a glass cylinder with side glow, and a soft bloom from a
// pre-rendered sprite. The number ticks like a frequency counter / odometer —
// the last digit spins fast, carrying into the ones above. `text` overrides the
// displayed value (digits shown; non-digits blank the tube). `density` = tube
// count, `intensity` = cathode glow. staticFrame: a settled reading.

// Seven-ish stroke segments aren't period-correct; Nixies are full wire digits.
// Each digit is drawn as a polyline path in a 0..1 box.
const DIGITS = {
  0: [
    [0.2, 0.1],
    [0.8, 0.1],
    [0.8, 0.9],
    [0.2, 0.9],
    [0.2, 0.1],
  ],
  1: [
    [0.4, 0.2],
    [0.55, 0.1],
    [0.55, 0.9],
  ],
  2: [
    [0.2, 0.25],
    [0.5, 0.1],
    [0.8, 0.25],
    [0.5, 0.5],
    [0.2, 0.9],
    [0.8, 0.9],
  ],
  3: [
    [0.2, 0.1],
    [0.8, 0.1],
    [0.5, 0.45],
    [0.8, 0.7],
    [0.5, 0.9],
    [0.2, 0.8],
  ],
  4: [
    [0.65, 0.9],
    [0.65, 0.1],
    [0.2, 0.6],
    [0.8, 0.6],
  ],
  5: [
    [0.8, 0.1],
    [0.3, 0.1],
    [0.25, 0.45],
    [0.6, 0.4],
    [0.8, 0.65],
    [0.55, 0.9],
    [0.2, 0.82],
  ],
  6: [
    [0.7, 0.12],
    [0.35, 0.35],
    [0.25, 0.7],
    [0.5, 0.9],
    [0.78, 0.7],
    [0.6, 0.5],
    [0.3, 0.6],
  ],
  7: [
    [0.2, 0.1],
    [0.8, 0.1],
    [0.45, 0.9],
  ],
  8: [
    [0.5, 0.5],
    [0.25, 0.3],
    [0.5, 0.1],
    [0.75, 0.3],
    [0.5, 0.5],
    [0.25, 0.72],
    [0.5, 0.9],
    [0.75, 0.72],
    [0.5, 0.5],
  ],
  9: [
    [0.7, 0.4],
    [0.45, 0.5],
    [0.25, 0.3],
    [0.5, 0.1],
    [0.72, 0.3],
    [0.65, 0.7],
    [0.4, 0.9],
  ],
};

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null;
  let glow = null;
  let glowKey = '';

  function build(params) {
    const txt = (host?.getAttribute('text') || params.text || '').trim();
    const fixedDigits = txt ? txt.replace(/[^0-9 ]/g, '').slice(0, 12) : null;
    const tubes = fixedDigits ? fixedDigits.length : 4 + Math.round((params.density ?? 0.5) * 6);
    const key = `${params.seed | 0}|${params.density}|${fixedDigits || ''}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    // Seeded starting value so the free-running counter shows varied digits
    // immediately (not a row of leading-zero rectangles).
    const rng = mulberry32(params.seed | 0 || 1);
    const base = Math.floor(rng() * Math.pow(10, tubes));
    cache = { key, tubes, fixedDigits, base };
    return cache;
  }

  function ensureGlow(warm) {
    const k = rgb(warm);
    if (glow && glowKey === k) return;
    glowKey = k;
    const S = 96;
    glow = document.createElement('canvas');
    glow.width = S;
    glow.height = S;
    const o = glow.getContext('2d');
    const g = o.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, rgb(warm, 0.5));
    g.addColorStop(0.5, rgb(warm, 0.18));
    g.addColorStop(1, rgb(warm, 0));
    o.fillStyle = g;
    o.fillRect(0, 0, S, S);
  }

  function drawDigit(d, x, y, dw, dh, col, lw, alpha) {
    const path = DIGITS[d];
    if (!path) return;
    c2d.strokeStyle = rgb(col, alpha);
    c2d.lineWidth = lw;
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    c2d.beginPath();
    for (let i = 0; i < path.length; i++) {
      const px = x + path[i][0] * dw;
      const py = y + path[i][1] * dh;
      if (i === 0) c2d.moveTo(px, py);
      else c2d.lineTo(px, py);
    }
    c2d.stroke();
  }

  function frame(t, params) {
    const { tubes, fixedDigits, base } = build(params);
    const c = getColors();
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.04, 0.04, 0.06];
    clearAndFill(c2d, w, h, [bg[0] * 0.7, bg[1] * 0.7, bg[2] * 0.8, 1]);
    const intensity = params.intensity ?? 0.5;
    const warm = c.warning || c.accent || [1, 0.55, 0.15];
    const lit = mix(warm, [1, 0.85, 0.5], 0.25);
    const ghost = mix(warm, bg, 0.82);
    const glass = mix(c.fg || [0.6, 0.65, 0.7], bg, 0.55);
    ensureGlow(warm);

    const pad = Math.min(w, h) * 0.06;
    const tubeW = (w - pad * 2) / tubes;
    const dw = tubeW * 0.62;
    const dh = Math.min(h * 0.5, tubeW * 1.1);
    const y0 = (h - dh) / 2;
    const lw = Math.max(2, dw * 0.12);

    // Counter value: climbs over time; ones digit spins fastest.
    const counter = base + Math.floor(t * 7);

    for (let i = 0; i < tubes; i++) {
      const cx = pad + (i + 0.5) * tubeW;
      const x0 = cx - dw / 2;

      // Glass cylinder.
      c2d.fillStyle = rgb(glass, 0.12);
      c2d.strokeStyle = rgb(glass, 0.4);
      c2d.lineWidth = Math.max(1, dw * 0.03);
      const tw = tubeW * 0.78;
      const th = dh * 1.3;
      roundRect(c2d, cx - tw / 2, y0 - dh * 0.16, tw, th, tw * 0.18);
      c2d.fill();
      c2d.stroke();

      // Which digit this tube shows.
      let digit;
      if (fixedDigits) {
        const ch = fixedDigits[i];
        if (ch === ' ') continue;
        digit = +ch;
      } else {
        const place = tubes - 1 - i; // rightmost ticks fastest
        digit = Math.floor(counter / Math.pow(10, place)) % 10;
      }

      // Ghost digits (all others, faint) for depth.
      for (let d = 0; d < 10; d++) {
        if (d === digit) continue;
        drawDigit(d, x0, y0, dw, dh, ghost, lw * 0.8, 0.06);
      }
      // Glow then the lit digit.
      const gs = dw * 2.4;
      c2d.globalAlpha = 0.5 + 0.4 * intensity;
      c2d.drawImage(glow, cx - gs / 2, y0 + dh / 2 - gs / 2, gs, gs);
      c2d.globalAlpha = 1;
      drawDigit(digit, x0, y0, dw, dh, lit, lw * 1.4, 0.35);
      drawDigit(digit, x0, y0, dw, dh, mix(lit, [1, 1, 1], 0.5), lw, 0.95);

      // Anode mesh: faint diagonal hatch over the tube.
      c2d.strokeStyle = rgb(glass, 0.08);
      c2d.lineWidth = 1;
      c2d.save();
      c2d.beginPath();
      roundRect(c2d, cx - tw / 2, y0 - dh * 0.16, tw, th, tw * 0.18);
      c2d.clip();
      c2d.beginPath();
      for (let g = -th; g < tw + th; g += 5) {
        c2d.moveTo(cx - tw / 2 + g, y0 - dh * 0.16);
        c2d.lineTo(cx - tw / 2 + g - th, y0 - dh * 0.16 + th);
      }
      c2d.stroke();
      c2d.restore();
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
      frame(1.7, params);
    },
    dispose() {
      cache = null;
      glow = null;
    },
  };
}
