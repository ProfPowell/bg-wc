// fireworks — Star Wars-arcade vector fireballs. Bursts spawn across the
// field; each is a ring of radial spark lines that expand outward and fade,
// drawn in a bright theme tint. No shadowBlur — each burst is one batched
// path stroked twice (wide glow + crisp). Vector group.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ c2d, getColors }) {
  let w = 1, h = 1;
  let bursts = [];
  let rand = mulberry32(1);
  let lastSeed = null;
  let lastT = 0;
  let spawnAcc = 0;
  let cycle = 0;

  function makeBurst(palette) {
    const spikes = 8 + ((rand() * 8) | 0);
    const dirs = [];
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + rand() * 0.2;
      dirs.push([Math.cos(a), Math.sin(a), 0.7 + rand() * 0.6]); // dir + length factor
    }
    return {
      x: 0.1 + rand() * 0.8,
      y: 0.1 + rand() * 0.8,
      born: 0,
      life: 0.9 + rand() * 0.8,
      color: palette[(cycle++) % palette.length],
      dirs,
    };
  }

  function ensure(params) {
    if (params.seed !== lastSeed) { rand = mulberry32(params.seed || 1); lastSeed = params.seed; bursts = []; }
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;

    const palette = [c.primary, c.accent, c.info,
      c.success || c.primary, c.warning || c.accent, c.error || c.info];
    const cap = Math.floor(3 + params.density * 10);
    const rate = 1.5 + params.intensity * 4;       // bursts/sec
    spawnAcc += rate * dt;
    while (spawnAcc >= 1) {
      spawnAcc -= 1;
      if (bursts.length < cap) { const b = makeBurst(palette); b.born = t; bursts.push(b); }
    }

    const minDim = Math.min(w, h);
    c2d.lineCap = 'round';
    const glow = params.intensity;

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      const age = (t - b.born) / b.life;            // 0..1
      if (age >= 1) { bursts.splice(i, 1); continue; }
      const ease = 1 - (1 - age) * (1 - age);       // ease-out expansion
      const inner = ease * minDim * 0.18;
      const reach = minDim * (0.06 + ease * 0.16);
      const alpha = (1 - age);
      const cx = b.x * w, cy = b.y * h;

      // Build all spark segments into one path.
      c2d.beginPath();
      for (const [dx, dy, lf] of b.dirs) {
        const r0 = inner, r1 = inner + reach * lf;
        c2d.moveTo(cx + dx * r0, cy + dy * r0);
        c2d.lineTo(cx + dx * r1, cy + dy * r1);
      }
      const cr = (b.color[0] * 255) | 0, cg = (b.color[1] * 255) | 0, cb = (b.color[2] * 255) | 0;
      if (glow > 0.05) {
        c2d.strokeStyle = `rgba(${cr},${cg},${cb},${(alpha * 0.22 * glow).toFixed(3)})`;
        c2d.lineWidth = 4.5;
        c2d.stroke();
      }
      c2d.strokeStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
      c2d.lineWidth = 1.8;
      c2d.stroke();
      // bright core dot early in life
      if (age < 0.3) {
        c2d.fillStyle = `rgba(255,255,255,${((0.3 - age) / 0.3).toFixed(3)})`;
        c2d.beginPath();
        c2d.arc(cx, cy, 2.5, 0, Math.PI * 2);
        c2d.fill();
      }
    }
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { frame(t, params); },
    staticFrame(params) {
      // A scatter of mid-life bursts for the still frame.
      const c = getColors();
      const r = mulberry32(params.seed || 1);
      clearAndFill(c2d, w, h, c.bg);
      const palette = [c.primary, c.accent, c.info];
      const minDim = Math.min(w, h);
      c2d.lineCap = 'round'; c2d.lineWidth = 1.8;
      for (let k = 0; k < 6; k++) {
        const cx = r() * w, cy = r() * h;
        const spikes = 10;
        const col = palette[k % palette.length];
        c2d.strokeStyle = `rgba(${(col[0] * 255) | 0},${(col[1] * 255) | 0},${(col[2] * 255) | 0},0.85)`;
        c2d.beginPath();
        for (let i = 0; i < spikes; i++) {
          const a = (i / spikes) * Math.PI * 2;
          const r0 = minDim * 0.05, r1 = minDim * (0.12 + r() * 0.06);
          c2d.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
          c2d.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        }
        c2d.stroke();
      }
    },
    dispose() { bursts = []; },
  };
}
