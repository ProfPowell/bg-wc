// stars — slow-drifting starfield. intensity > 0.5 enables a parallax layer.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

const CAPS = { low: 80, med: 220, high: 500 };

export function create({ c2d, getColors, getParams: _getParams }) {
  let w = 1,
    h = 1;
  let stars = [];
  let lastSeed = null;
  let lastDensity = null;
  let lastIntensity = null;
  let lastQuality = null;

  function rebuild(params) {
    const cap = CAPS[params.quality] || CAPS.med;
    const n = Math.floor(20 + cap * params.density);
    const rand = mulberry32(params.seed || 1);
    const parallax = params.intensity > 0.5;
    stars = new Array(n);
    for (let i = 0; i < n; i++) {
      const layer = parallax && i < n * 0.3 ? 1 : 0;
      stars[i] = {
        x: rand(),
        y: rand(),
        r: 0.3 + rand() * (layer ? 1.6 : 1.0),
        v: (0.01 + rand() * 0.04) * (layer ? 2.4 : 1.0),
        tw: rand() * Math.PI * 2, // twinkle phase
        twr: 0.5 + rand() * 0.5, // twinkle rate
        layer,
      };
    }
    lastSeed = params.seed;
    lastDensity = params.density;
    lastIntensity = params.intensity;
    lastQuality = params.quality;
  }

  function ensure(params) {
    if (
      stars.length === 0 ||
      params.seed !== lastSeed ||
      params.density !== lastDensity ||
      params.intensity !== lastIntensity ||
      params.quality !== lastQuality
    ) {
      rebuild(params);
    }
  }

  function draw(t, params) {
    ensure(params);
    const c = getColors();
    c2d.globalCompositeOperation = 'source-over';
    clearAndFill(c2d, w, h, c.bg);

    const fg = `${(c.fg[0] * 255) | 0},${(c.fg[1] * 255) | 0},${(c.fg[2] * 255) | 0}`;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const y = (((s.y + t * s.v) % 1) + 1) % 1;
      const x = s.x;
      const twinkle = 0.5 + 0.5 * Math.sin(t * s.twr * 1.5 + s.tw);
      const a = (0.4 + 0.6 * twinkle) * (s.layer ? 1.0 : 0.85);
      c2d.fillStyle = `rgba(${fg},${a.toFixed(3)})`;
      c2d.beginPath();
      c2d.arc(x * w, y * h, s.r * (s.layer ? 1.4 : 1), 0, Math.PI * 2);
      c2d.fill();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      draw(t, params);
    },
    staticFrame(params) {
      draw(0, params);
    },
    dispose() {
      stars = [];
    },
  };
}
