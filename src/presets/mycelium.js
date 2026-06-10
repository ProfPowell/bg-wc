import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// mycelium — branching filament growth. Walker tips curve under seeded noise,
// split into new branches, and thin with depth; each step is painted onto an
// offscreen canvas that is NEVER cleared, so the network accumulates, and the
// offscreen is composited over the background every frame. When coverage
// saturates the growth restarts with a fresh palette rotation. `density` =
// branching rate / tip count, `intensity` = filament brightness. State advances
// per frame (dt-driven), so it is excluded from the visual still baseline.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let off = null; // offscreen accumulation canvas
  let octx = null;
  let tips = [];
  let steps = 0;
  let cap = 1;
  let gen = 0;
  let lastT = 0;
  let rng = mulberry32(1);

  function reseed(params) {
    rng = mulberry32((params.seed | 0 || 1) + gen * 1013904223);
    if (octx) octx.clearRect(0, 0, w, h);
    tips = [];
    const roots = 2 + Math.round((params.density ?? 0.5) * 4);
    for (let i = 0; i < roots; i++) {
      const edge = (rng() * 4) | 0;
      let x, y, a;
      if (edge === 0) ((x = rng() * w), (y = 0), (a = Math.PI * 0.5));
      else if (edge === 1) ((x = w), (y = rng() * h), (a = Math.PI));
      else if (edge === 2) ((x = rng() * w), (y = h), (a = -Math.PI * 0.5));
      else ((x = 0), (y = rng() * h), (a = 0));
      tips.push({ x, y, a, depth: 0, width: Math.max(1.5, Math.min(w, h) * 0.006) });
    }
    steps = 0;
    cap = (w * h) / 220; // saturation budget in steps, scales with area
  }

  function ensureOff() {
    if (off && off.width === w && off.height === h) return;
    off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    octx = off.getContext('2d');
  }

  function grow(params, c) {
    const stepLen = Math.max(2, Math.min(w, h) * 0.01);
    const density = params.density ?? 0.5;
    const intensity = params.intensity ?? 0.5;
    const roles = [c.primary, c.accent, c.info, c.success].filter(Boolean);
    const col = roles[(gen + 0) % roles.length] || [0.6, 0.8, 0.6];
    const toward = c.bg && c.bg[3] > 0.01 ? c.bg : [0, 0, 0];
    octx.lineCap = 'round';
    // Advance every tip one step per frame.
    const next = [];
    for (const tp of tips) {
      // Curve heading with seeded value noise.
      tp.a += (rng() - 0.5) * 0.5;
      const nx = tp.x + Math.cos(tp.a) * stepLen;
      const ny = tp.y + Math.sin(tp.a) * stepLen;
      octx.strokeStyle = rgb(
        mix(toward, col, 0.4 + 0.6 * intensity),
        Math.max(0.2, 1 - tp.depth * 0.03)
      );
      octx.lineWidth = tp.width;
      octx.beginPath();
      octx.moveTo(tp.x, tp.y);
      octx.lineTo(nx, ny);
      octx.stroke();
      steps++;
      tp.x = nx;
      tp.y = ny;
      tp.depth++;
      tp.width = Math.max(0.6, tp.width * 0.992);
      // Terminate off-canvas or too deep; otherwise keep, and occasionally branch.
      const alive = tp.x > -10 && tp.x < w + 10 && tp.y > -10 && tp.y < h + 10 && tp.depth < 240;
      if (alive) {
        next.push(tp);
        if (rng() < 0.04 + 0.06 * density && tp.width > 1) {
          next.push({
            x: tp.x,
            y: tp.y,
            a: tp.a + (rng() < 0.5 ? 1 : -1) * (0.4 + rng() * 0.5),
            depth: tp.depth,
            width: tp.width * 0.8,
          });
        }
      }
    }
    tips = next;
    if (tips.length === 0 || steps > cap) {
      gen++;
      reseed(params);
    }
  }

  function frame(t, params) {
    ensureOff();
    if (tips.length === 0 && steps === 0) reseed(params);
    let dt = t - lastT;
    lastT = t;
    // Run a few growth steps per frame (more at higher speed via dt).
    const iters = Math.max(1, Math.min(6, Math.round((dt > 0 && dt < 0.2 ? dt : 0.016) * 90)));
    const c = getColors();
    for (let i = 0; i < iters; i++) grow(params, c);
    clearAndFill(c2d, w, h, c.bg);
    c2d.drawImage(off, 0, 0);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      off = null;
      octx = null;
      tips = [];
      steps = 0;
      gen = 0;
    },
    frame,
    staticFrame(params) {
      ensureOff();
      if (tips.length === 0 && steps === 0) reseed(params);
      const c = getColors();
      // Grow a settled network for the still.
      for (let i = 0; i < 400 && tips.length; i++) grow(params, c);
      clearAndFill(c2d, w, h, c.bg);
      c2d.drawImage(off, 0, 0);
    },
    dispose() {
      off = null;
      octx = null;
      tips = [];
    },
  };
}
