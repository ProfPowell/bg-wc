import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { buildDotPalette, makeFieldCanvas, dotCircle } from './_dots.js';

// Pointillist fields. `field` renders a dense graded stipple once to an
// offscreen canvas and blits it (with a sparse shimmer on top); `contour` and
// `vortex` run a capped particle sim whose dots trace a flow field / swirl
// around hidden vortices and respawn before collapsing.

const MODES = ['field', 'contour', 'vortex'];
const CAP = { low: 600, med: 1500, high: 3000 };

function readMode(host) {
  const m = (host.getAttribute('mode') || 'field').toLowerCase();
  return MODES.includes(m) ? m : 'field';
}

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let sim = null; // { key, items, verts, rng }
  let lastT = 0;

  const field = makeFieldCanvas({
    count: (fw, fh, params) => Math.round(fw * fh * 0.0008 * (0.3 + params.density * 1.5)),
    dotR: (fw, fh) => Math.max(1, Math.min(fw, fh) * 0.0035),
  });

  function buildSim(params, mode) {
    const cap = CAP[params.quality] || CAP.med;
    const n = Math.max(50, Math.round(cap * (0.3 + params.density)));
    const key = `${mode}|${params.seed | 0}|${n}|${w}x${h}`;
    if (sim && sim.key === key) return sim;
    const rng = mulberry32(params.seed | 0 || 1);
    const items = [];
    for (let i = 0; i < n; i++) {
      items.push({ x: rng() * w, y: rng() * h, ci: i, life: (rng() * 200) | 0 });
    }
    const verts = [];
    if (mode === 'vortex') {
      for (let i = 0; i < 4; i++) verts.push([rng() * w, rng() * h, rng() < 0.5 ? 1 : -1]);
    }
    sim = { key, items, verts, rng };
    return sim;
  }

  function flowAngle(x, y, t) {
    return Math.sin(x * 0.006 + t * 0.2) * 1.6 + Math.cos(y * 0.007 - x * 0.004) * 1.6;
  }

  function frame(t, params) {
    const mode = readMode(host);
    const c = getColors();
    const { pal } = buildDotPalette(c, params.intensity);
    const palKey = pal.join(',');
    clearAndFill(c2d, w, h, c.bg);

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    const f = dt * 60; // normalize step to a 60fps reference so motion is speed-aware + framerate-independent

    if (mode === 'field') {
      c2d.drawImage(field.get(w, h, params, palKey, pal), 0, 0);
      const rng = mulberry32((params.seed | 0 || 1) ^ ((t * 2) | 0));
      const dotR = Math.max(1, Math.min(w, h) * 0.0045);
      for (let i = 0; i < 40; i++) {
        dotCircle(c2d, rng() * w, rng() * h, dotR, pal[(rng() * pal.length) | 0]);
      }
      return;
    }

    const s = buildSim(params, mode);
    const dotR = Math.max(1, Math.min(w, h) * 0.0035);
    const n = pal.length;
    for (const p of s.items) {
      if (mode === 'contour') {
        const a = flowAngle(p.x, p.y, t);
        p.x += Math.cos(a) * 1.3 * f;
        p.y += Math.sin(a) * 1.3 * f;
        p.life -= f;
        if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = s.rng() * w;
          p.y = s.rng() * h;
          p.life = 60 + ((s.rng() * 120) | 0);
        }
      } else {
        let vx = 0;
        let vy = 0;
        let near = 1e9;
        for (const v of s.verts) {
          const dx = p.x - v[0];
          const dy = p.y - v[1];
          const d2 = dx * dx + dy * dy + 600; // +600 softens force near a vortex center (avoids singularity)
          near = Math.min(near, d2);
          vx += (-dy / d2) * v[2] * 2600; // 2600 = vortex strength
          vy += (dx / d2) * v[2] * 2600;
        }
        const ang = Math.atan2(vy, vx);
        const sp = Math.min(2.2, Math.hypot(vx, vy));
        p.x += Math.cos(ang) * sp * f;
        p.y += Math.sin(ang) * sp * f;
        p.life -= f;
        if (p.life <= 0 || near < 900 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          // near < 900: respawn before a particle collapses into a vortex (the +600/2600/900 trio defines the stable orbit band)
          p.x = s.rng() * w;
          p.y = s.rng() * h;
          p.life = 120 + ((s.rng() * 180) | 0);
        }
      }
      dotCircle(c2d, p.x, p.y, dotR, pal[p.ci % n]);
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      field.reset();
      sim = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      field.reset();
      sim = null;
    },
  };
}
