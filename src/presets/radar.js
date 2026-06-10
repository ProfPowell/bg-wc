import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// radar — a PPI scope. A sweep arm rotates from `t`, leaving a trailing phosphor
// wedge on an offscreen persistence layer that decays each frame; range rings
// and a crosshair sit under it, and seeded blips flare bright when the arm
// crosses them, then fade until the next pass. `density` = blip count,
// `intensity` = phosphor brightness. The persistence layer carries per-frame
// state, so this is excluded from the visual still baseline.

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let glow = null; // offscreen phosphor persistence
  let gctx = null;
  let blips = null;
  let key = '';
  let lastA = 0;

  function ensureGlow() {
    if (glow && glow.width === w && glow.height === h) return;
    glow = document.createElement('canvas');
    glow.width = w;
    glow.height = h;
    gctx = glow.getContext('2d');
  }

  function build(params) {
    const k = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (blips && k === key) return;
    key = k;
    const rng = mulberry32(params.seed | 0 || 1);
    const n = Math.round(6 + (params.density ?? 0.5) * 26);
    const R = Math.min(w, h) * 0.46;
    blips = [];
    for (let i = 0; i < n; i++) {
      blips.push({ ang: rng() * Math.PI * 2, r: (0.15 + rng() * 0.82) * R, lit: 0 });
    }
  }

  function frame(t, params) {
    ensureGlow();
    build(params);
    const c = getColors();
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.46;
    const accent = c.accent || [0.3, 1, 0.5];
    const prim = c.primary || [0.2, 0.8, 0.4];
    const intensity = params.intensity ?? 0.5;

    const ang = (t * 0.9) % (Math.PI * 2);

    // Decay the phosphor layer toward transparent.
    gctx.globalCompositeOperation = 'destination-out';
    gctx.fillStyle = `rgba(0,0,0,${0.04 + 0.05 * (1 - intensity)})`;
    gctx.fillRect(0, 0, w, h);
    gctx.globalCompositeOperation = 'source-over';

    // Paint the leading sweep edge into the phosphor layer.
    gctx.strokeStyle = rgb(accent, 0.5 + 0.5 * intensity);
    gctx.lineWidth = Math.max(1.5, R * 0.01);
    gctx.beginPath();
    gctx.moveTo(cx, cy);
    gctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
    gctx.stroke();

    // Flare blips as the arm crosses them; record decay.
    const crossed = (a) => {
      // True if the sweep passed angle `a` between lastA and ang this frame.
      let d = a - lastA;
      while (d < 0) d += Math.PI * 2;
      let s = ang - lastA;
      while (s < 0) s += Math.PI * 2;
      return d <= s + 1e-3;
    };
    for (const b of blips) {
      if (crossed(b.ang)) b.lit = 1;
      else b.lit *= 0.97;
      if (b.lit > 0.02) {
        const bx = cx + Math.cos(b.ang) * b.r;
        const by = cy + Math.sin(b.ang) * b.r;
        gctx.fillStyle = rgb(accent, b.lit);
        gctx.beginPath();
        gctx.arc(bx, by, Math.max(2, R * 0.012) * (0.6 + b.lit), 0, Math.PI * 2);
        gctx.fill();
      }
    }
    lastA = ang;

    // Compose: bg, range rings + crosshair, then the phosphor layer on top.
    clearAndFill(c2d, w, h, c.bg);
    c2d.strokeStyle = rgb(prim, 0.35);
    c2d.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      c2d.beginPath();
      c2d.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
      c2d.stroke();
    }
    c2d.beginPath();
    c2d.moveTo(cx - R, cy);
    c2d.lineTo(cx + R, cy);
    c2d.moveTo(cx, cy - R);
    c2d.lineTo(cx, cy + R);
    c2d.stroke();
    c2d.drawImage(glow, 0, 0);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      glow = null;
      gctx = null;
      blips = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      glow = null;
      gctx = null;
      blips = null;
    },
  };
}
