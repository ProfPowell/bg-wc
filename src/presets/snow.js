// snow — falling flakes with slight horizontal drift.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

const CAPS = { low: 60, med: 180, high: 400 };

export function create({ c2d, getColors }) {
  let w = 1, h = 1;
  let flakes = [];
  let lastKey = '';

  function rebuild(params) {
    const cap = CAPS[params.quality] || CAPS.med;
    const n = Math.floor(15 + cap * params.density);
    const rand = mulberry32(params.seed || 7);
    flakes = new Array(n);
    for (let i = 0; i < n; i++) {
      flakes[i] = {
        x: rand(),
        y: rand(),
        r: 1 + rand() * 2.5,
        v: 0.04 + rand() * 0.10,
        drift: rand() * Math.PI * 2,
        driftAmp: 0.005 + rand() * 0.02,
      };
    }
    lastKey = `${params.seed}|${params.density}|${params.quality}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${params.quality}`;
    if (flakes.length === 0 || key !== lastKey) rebuild(params);
  }

  function draw(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const fg = `${(c.fg[0] * 255) | 0},${(c.fg[1] * 255) | 0},${(c.fg[2] * 255) | 0}`;
    const fall = t * (0.5 + params.intensity);
    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      const y = ((f.y + fall * f.v) % 1 + 1) % 1;
      const x = ((f.x + Math.sin(fall + f.drift) * f.driftAmp) % 1 + 1) % 1;
      const a = 0.55 + 0.4 * Math.sin(t * 0.7 + f.drift);
      c2d.fillStyle = `rgba(${fg},${a.toFixed(3)})`;
      c2d.beginPath();
      c2d.arc(x * w, y * h, f.r, 0, Math.PI * 2);
      c2d.fill();
    }
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { draw(t, params); },
    staticFrame(params) { draw(0, params); },
    dispose() { flakes = []; },
  };
}
