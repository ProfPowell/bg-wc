import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';
import { fixedStep } from './_clock.js';

// radar — a PPI scope. A sweep arm rotates from `t`, leaving a trailing phosphor
// wedge on an offscreen persistence layer that decays once per 1/60 s tick of
// speed-scaled `t` (see _clock.js); range rings and a crosshair sit under it,
// and seeded blips flare bright when the arm crosses them, then fade until the
// next pass. `density` = blip count, `intensity` = phosphor brightness. The
// persistence layer is a function of elapsed time, but it is still per-frame
// state, so this is excluded from the visual still baseline.

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let glow = null; // offscreen phosphor persistence
  let gctx = null;
  let blips = null;
  let key = '';
  let lastA = 0;
  const clock = fixedStep(60);

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

  // One 1/60 s tick of the phosphor layer at sim time `st`: decay, paint the
  // sweep edge, flare and fade the blips. Mutates the persistence layer only.
  function tick(st, params, c) {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.46;
    const accent = c.accent || [0.3, 1, 0.5];
    const intensity = params.intensity ?? 0.5;

    const ang = (st * 0.9) % (Math.PI * 2);

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
      // True if the sweep passed angle `a` between lastA and ang this tick.
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
  }

  // Compose: bg, range rings + crosshair, then the phosphor layer on top.
  // Pure — reads the persistence layer, never writes it.
  function compose(c) {
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.46;
    const prim = c.primary || [0.2, 0.8, 0.4];
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

  function frame(t, params) {
    ensureGlow();
    build(params);
    const c = getColors();
    const n = clock.advance(t);
    for (let i = 0; i < n; i++) tick(clock.time - (n - 1 - i) / clock.hz, params, c);
    compose(c);
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
      // A settled still: a fresh phosphor layer with ~2.5 s of sweep so the
      // wedge and a few lit blips are visible, independent of the live clock.
      ensureGlow();
      build(params);
      gctx.clearRect(0, 0, w, h);
      lastA = 0;
      const c = getColors();
      for (let i = 1; i <= 150; i++) tick(i / clock.hz, params, c);
      clock.reset();
      compose(c);
    },
    dispose() {
      glow = null;
      gctx = null;
      blips = null;
    },
  };
}
