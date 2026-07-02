// fireflies — dusk meadow of drifting glow-pulses. Each fly wanders a gentle
// sin flow field and pulses on its own cycle; glow is drawn in passes (wide
// faint halo under a crisp core — the asteroids idiom, no shadowBlur). Warm
// theme warning color; a few "answering" flies pulse in accent. intensity =
// glow reach + wander speed; density = fly count.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

const CAPS = { low: 25, med: 60, high: 120 };

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let flies = [];
  let lastKey = '';
  let lastT = 0;

  function rebuild(params) {
    const cap = CAPS[params.quality] || CAPS.med;
    const n = Math.floor(8 + cap * params.density);
    const rand = mulberry32(params.seed | 0 || 9);
    flies = new Array(n);
    for (let i = 0; i < n; i++) {
      flies[i] = {
        x: rand(),
        y: rand(),
        drift: rand() * Math.PI * 2,
        freq: 0.35 + rand() * 0.5, // pulse cycles per second
        phase: rand() * Math.PI * 2,
        r: (1.2 + rand() * 1.4) * px,
        accent: rand() < 0.18, // the rare answering fly
      };
    }
    lastKey = `${params.seed}|${params.density}|${params.quality}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${params.quality}`;
    if (!flies.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    let dt = t - lastT;
    lastT = t;
    if (!(dt >= 0) || dt > 1) dt = 0;

    const speed = 0.02 + params.intensity * 0.05; // normalized units/s
    for (const f of flies) {
      const a = Math.sin(f.x * 5 + t * 0.25 + f.drift) * 2 + Math.cos(f.y * 4 - f.drift);
      f.x = (f.x + Math.cos(a) * speed * dt + 1) % 1;
      f.y = (f.y + Math.sin(a) * speed * dt * 0.6 + 1) % 1;

      const pulse = Math.max(0, Math.sin(t * f.freq * Math.PI * 2 + f.phase));
      const b = pulse * pulse * pulse; // sharp attack, long dark gap
      if (b < 0.02) continue;
      const col = f.accent ? c.accent : c.warning;
      const cx = f.x * w;
      const cy = f.y * h;
      const glowR = f.r * (5 + 4 * params.intensity);
      c2d.fillStyle = rgbaCss(col, 0.08 * b); // wide halo
      c2d.beginPath();
      c2d.arc(cx, cy, glowR, 0, Math.PI * 2);
      c2d.fill();
      c2d.fillStyle = rgbaCss(col, 0.25 * b); // mid halo
      c2d.beginPath();
      c2d.arc(cx, cy, glowR * 0.45, 0, Math.PI * 2);
      c2d.fill();
      c2d.fillStyle = rgbaCss(col, 0.95 * b); // core
      c2d.beginPath();
      c2d.arc(cx, cy, f.r, 0, Math.PI * 2);
      c2d.fill();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      flies = [];
    },
  };
}
