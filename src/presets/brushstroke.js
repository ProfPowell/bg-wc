// brushstroke — impasto flow field. Short directional ribbon strokes follow a
// smooth angular field with seeded swirl centers (the Starry-Night motion);
// each stroke carries a lighter top edge for paint relief. Strokes sway with
// t (pure function — no accumulation), so frozen frames are stable stills.
// density = stroke count, intensity = stroke length/weight.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let strokes = [];
  let swirls = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 6);
    swirls = [];
    for (let i = 0; i < 3; i++) {
      swirls.push({
        x: rand(),
        y: rand() * 0.7,
        r: 0.15 + rand() * 0.2,
        dir: rand() < 0.5 ? 1 : -1,
      });
    }
    const n = Math.floor(300 + params.density * 900);
    strokes = [];
    for (let i = 0; i < n; i++) {
      strokes.push({
        x: rand(),
        y: rand(),
        ci: (rand() * 3) | 0,
        jitter: rand() * Math.PI * 2,
        len: 0.7 + rand() * 0.6,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!strokes.length || key !== lastKey) rebuild(params);
  }

  // Angular field: gentle horizontal drift plus circular flow near each swirl.
  function fieldAngle(x, y, t) {
    let a = Math.sin(y * 4.2) * 0.6 + Math.sin(t * 0.15) * 0.15;
    for (const s of swirls) {
      const dx = x - s.x;
      const dy = y - s.y;
      const d = Math.hypot(dx, dy);
      const infl = Math.exp(-(d * d) / (s.r * s.r));
      a += s.dir * infl * (Math.atan2(dy, dx) + Math.PI / 2 - a);
    }
    return a;
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.info];
    const L = (8 + params.intensity * 12) * px;
    c2d.lineCap = 'round';

    for (const st of strokes) {
      const a = fieldAngle(st.x, st.y, t) + 0.1 * Math.sin(t * 0.5 + st.jitter);
      const col = pal[st.ci % pal.length];
      const x = st.x * w;
      const y = st.y * h;
      const dx = Math.cos(a) * L * st.len;
      const dy = Math.sin(a) * L * st.len;
      // Body stroke.
      c2d.strokeStyle = rgbCss(col);
      c2d.lineWidth = 3 * px;
      c2d.beginPath();
      c2d.moveTo(x - dx / 2, y - dy / 2);
      c2d.lineTo(x + dx / 2, y + dy / 2);
      c2d.stroke();
      // Impasto highlight: a thinner, lighter pass offset one pixel "above".
      c2d.strokeStyle = rgbCss(mix(col, [1, 1, 1], 0.35));
      c2d.lineWidth = 1 * px;
      c2d.beginPath();
      c2d.moveTo(x - dx / 2 - Math.sin(a) * px, y - dy / 2 + Math.cos(a) * px * -1);
      c2d.lineTo(x + dx / 2 - Math.sin(a) * px, y + dy / 2 + Math.cos(a) * px * -1);
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
      strokes = [];
      swirls = [];
    },
  };
}
