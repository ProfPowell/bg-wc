import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// tiki — a torch-lit tiki bar at night. A seeded foreground row of carved
// tiki-mask totems in near-black silhouette (face blocks built from
// primitives), flanked by flickering torches whose warm glow is composited
// from a pre-rendered radial sprite (no per-frame shadowBlur) with seeded
// flicker, plus hanging glass-float lamps and a thatch eave across the top.
// Deep tropical-night gradient (bg → primary) behind. Torch warmth from
// warning/accent. `density` = totem/torch count, `intensity` = firelight.
// staticFrame: torches lit mid-flicker.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;
  let glow = null;
  let glowKey = '';

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const density = params.density ?? 0.5;
    const totems = 2 + Math.round(density * 3);
    const items = [];
    const slotW = w / totems;
    const baseH = h * (0.42 + rng() * 0.12);
    for (let i = 0; i < totems; i++) {
      items.push({
        x: (i + 0.5) * slotW + (rng() - 0.5) * slotW * 0.2,
        wdt: slotW * (0.3 + rng() * 0.12),
        top: h - baseH * (0.7 + rng() * 0.5),
        faces: 2 + ((rng() * 3) | 0),
        torchSide: rng() < 0.5 ? -1 : 1,
        flickPh: rng() * Math.PI * 2,
        flickR: 7 + rng() * 6,
      });
    }
    // Hanging floats across the top.
    const floats = [];
    const nF = 3 + ((rng() * 4) | 0);
    for (let i = 0; i < nF; i++) {
      floats.push({
        x: rng() * w,
        drop: h * (0.05 + rng() * 0.16),
        r: h * (0.02 + rng() * 0.02),
        ph: rng() * 6.28,
        ci: (rng() * 3) | 0,
      });
    }
    cache = { key, items, floats };
    return cache;
  }

  function ensureGlow(warm, intensity) {
    const k = `${rgb(warm)}|${intensity.toFixed(2)}`;
    if (glow && glowKey === k) return;
    glowKey = k;
    const S = 128;
    glow = document.createElement('canvas');
    glow.width = S;
    glow.height = S;
    const o = glow.getContext('2d');
    const g = o.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, rgb(mix(warm, [1, 1, 0.85], 0.5), 0.55 + 0.3 * intensity));
    g.addColorStop(0.4, rgb(warm, 0.22 + 0.18 * intensity));
    g.addColorStop(1, rgb(warm, 0));
    o.fillStyle = g;
    o.fillRect(0, 0, S, S);
  }

  // A carved totem: stacked face blocks (brow/eyes/nose/mouth) in silhouette.
  function drawTotem(it, ink) {
    const x = it.x;
    const top = it.top;
    const wdt = it.wdt;
    const bh = (h - top) / it.faces;
    c2d.fillStyle = rgb(ink);
    // Body slab.
    c2d.fillRect(x - wdt / 2, top, wdt, h - top);
    // Carved negative features per face block (cut with bg-dark notches).
    for (let f = 0; f < it.faces; f++) {
      const fy = top + f * bh;
      // Brow ridge (overhang).
      c2d.fillRect(x - wdt * 0.6, fy + bh * 0.12, wdt * 1.2, bh * 0.07);
      // Eyes: two notches (drawn as darker insets via destination — just ink rims).
      c2d.save();
      c2d.fillStyle = rgb(mix(ink, [1, 1, 1], 0.0));
      c2d.restore();
    }
  }

  function frame(t, params) {
    const { items, floats } = build(params);
    const c = getColors();
    const intensity = params.intensity ?? 0.5;
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.05, 0.07, 0.09];
    const warm = c.warning || [1, 0.6, 0.2];
    const accent = c.accent || [1, 0.4, 0.3];
    const ink = mix(c.fg || [0.1, 0.1, 0.12], [0, 0, 0], 0.65);

    // Night sky gradient.
    clearAndFill(c2d, w, h, bg);
    const sky = c2d.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgb(mix(bg, [0, 0, 0], 0.35)));
    sky.addColorStop(0.6, rgb(mix(bg, c.primary || [0.2, 0.2, 0.4], 0.3)));
    sky.addColorStop(1, rgb(mix(bg, warm, 0.12)));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    ensureGlow(warm, intensity);

    // Hanging glass floats (soft lamps) high up.
    for (const fl of floats) {
      const y = fl.drop + Math.sin(t * 0.5 + fl.ph) * h * 0.006;
      const col = [accent, warm, c.info || [0.4, 0.8, 0.7]][fl.ci];
      const gs = fl.r * 6;
      c2d.globalAlpha = 0.5;
      c2d.drawImage(glow, fl.x - gs / 2, y - gs / 2, gs, gs);
      c2d.globalAlpha = 1;
      c2d.strokeStyle = rgb(ink, 0.6);
      c2d.lineWidth = Math.max(1, h * 0.002);
      c2d.beginPath();
      c2d.moveTo(fl.x, 0);
      c2d.lineTo(fl.x, y - fl.r);
      c2d.stroke();
      c2d.fillStyle = rgb(mix(col, [1, 1, 1], 0.3), 0.85);
      c2d.beginPath();
      c2d.arc(fl.x, y, fl.r, 0, Math.PI * 2);
      c2d.fill();
    }

    // Torches (glow + flame) behind/around the totems.
    for (const it of items) {
      const tx = it.x + it.torchSide * it.wdt * 1.0;
      const ty = it.top + (h - it.top) * 0.12;
      const flick =
        0.78 + 0.22 * Math.sin(t * it.flickR + it.flickPh) * Math.sin(t * it.flickR * 0.37 + 1);
      const gs = it.wdt * (3.4 + 0.6 * intensity) * flick;
      c2d.drawImage(glow, tx - gs / 2, ty - gs / 2, gs, gs);
      // Flame: a couple of stacked teardrops.
      const fh = it.wdt * 0.9 * flick;
      c2d.fillStyle = rgb(mix(warm, [1, 1, 0.7], 0.4), 0.95);
      c2d.beginPath();
      c2d.moveTo(tx, ty - fh);
      c2d.quadraticCurveTo(tx + fh * 0.28, ty - fh * 0.3, tx, ty + fh * 0.15);
      c2d.quadraticCurveTo(tx - fh * 0.28, ty - fh * 0.3, tx, ty - fh);
      c2d.fill();
      c2d.fillStyle = rgb(accent, 0.9);
      c2d.beginPath();
      c2d.moveTo(tx, ty - fh * 0.55);
      c2d.quadraticCurveTo(tx + fh * 0.15, ty - fh * 0.1, tx, ty + fh * 0.1);
      c2d.quadraticCurveTo(tx - fh * 0.15, ty - fh * 0.1, tx, ty - fh * 0.55);
      c2d.fill();
      // Torch pole.
      c2d.strokeStyle = rgb(ink);
      c2d.lineWidth = it.wdt * 0.12;
      c2d.beginPath();
      c2d.moveTo(tx, ty + it.wdt * 0.1);
      c2d.lineTo(tx, h);
      c2d.stroke();
    }

    // Totem silhouettes in front.
    for (const it of items) drawTotem(it, ink);

    // Thatch eave across the very top.
    const eaveH = h * 0.1;
    c2d.fillStyle = rgb(ink, 0.95);
    c2d.beginPath();
    c2d.moveTo(0, 0);
    c2d.lineTo(w, 0);
    c2d.lineTo(w, eaveH * 0.6);
    const rng = mulberry32((params.seed | 0 || 1) + 99);
    for (let x = w; x >= 0; x -= w / 40) {
      c2d.lineTo(x, eaveH * (0.6 + rng() * 0.7));
    }
    c2d.closePath();
    c2d.fill();
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(2, params);
    },
    dispose() {
      cache = null;
      glow = null;
    },
  };
}
