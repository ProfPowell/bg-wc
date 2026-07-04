// laser-show — Laserium. Colored beams sweep as lissajous fans through
// haze: each projector fans a sheaf of lines between two endpoints that
// trace their own slow curves. Beams are theme colors (never bare fg), so
// the show reads on light grounds as colored ink. Pure function of t.
// density = projector count, intensity = beam brightness.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

const FAN = 12; // lines per beam sheaf

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let beams = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 43);
    const n = 2 + Math.round(params.density * 2); // 2..4 projectors
    beams = [];
    for (let i = 0; i < n; i++) {
      beams.push({
        ox: 0.15 + rand() * 0.7, // projector on the floor line
        fa: 0.21 + rand() * 0.3, // lissajous frequencies for the two ends
        fb: 0.13 + rand() * 0.24,
        pa: rand() * Math.PI * 2,
        pb: rand() * Math.PI * 2,
        ci: (rand() * 3) | 0,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!beams.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.info];

    // Haze rises from the floor.
    const haze = c2d.createLinearGradient(0, h, 0, h * 0.3);
    haze.addColorStop(0, rgbaCss(c.primary, 0.1));
    haze.addColorStop(1, rgbaCss(c.primary, 0));
    c2d.fillStyle = haze;
    c2d.fillRect(0, 0, w, h);

    c2d.lineCap = 'round';
    for (const b of beams) {
      const col = pal[b.ci % pal.length];
      const ox = b.ox * w;
      const oy = h * 0.96;
      // Two sweeping endpoints along the ceiling region.
      const e1x = w * (0.5 + 0.45 * Math.sin(t * b.fa + b.pa));
      const e1y = h * (0.12 + 0.15 * Math.sin(t * b.fb * 1.7 + b.pb));
      const e2x = w * (0.5 + 0.45 * Math.sin(t * b.fa + b.pa + 0.55));
      const e2y = h * (0.12 + 0.15 * Math.sin(t * b.fb * 1.7 + b.pb + 0.7));
      const alpha = 0.05 + params.intensity * 0.08;
      for (let k = 0; k < FAN; k++) {
        const u = k / (FAN - 1);
        c2d.strokeStyle = rgbaCss(col, alpha * (0.6 + 0.4 * Math.sin(u * Math.PI)));
        c2d.lineWidth = 1.4 * px;
        c2d.beginPath();
        c2d.moveTo(ox, oy);
        c2d.lineTo(e1x + (e2x - e1x) * u, e1y + (e2y - e1y) * u);
        c2d.stroke();
      }
      // The hot center line of the sheaf.
      c2d.strokeStyle = rgbaCss(col, 0.85);
      c2d.lineWidth = 2 * px;
      c2d.beginPath();
      c2d.moveTo(ox, oy);
      c2d.lineTo((e1x + e2x) / 2, (e1y + e2y) / 2);
      c2d.stroke();
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
      beams = [];
    },
  };
}
