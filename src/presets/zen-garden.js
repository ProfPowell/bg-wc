// zen-garden — raked karesansui sand. A straight rake field with an almost
// imperceptible breathing waver, seeded stones, and concentric furrows combed
// around each stone over a cleared disc. Grooves are low-alpha fg strokes on
// the theme bg; stones blend fg toward bg. Nearly still by design — time only
// breathes the waver. intensity = groove contrast; density = rake spacing and
// stone count. Furrows are drawn as single low-alpha grooves, not the spec's
// paired highlight/shadow relief — a deliberate simplification.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let stones = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 3);
    const n = 2 + Math.round(params.density * 4); // 2..6 stones
    stones = new Array(n);
    for (let i = 0; i < n; i++) {
      stones[i] = {
        x: 0.12 + rand() * 0.76,
        y: 0.15 + rand() * 0.7,
        r: 0.03 + rand() * 0.05, // fraction of min(w, h)
        squash: 0.6 + rand() * 0.35,
        rot: rand() * Math.PI,
        rings: 3 + ((rand() * 3) | 0),
      };
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!stones.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const groove = rgbaCss(c.fg, 0.1 + params.intensity * 0.25);
    const gap = s * (0.028 - params.density * 0.012);
    c2d.lineWidth = 1 * px;
    c2d.strokeStyle = groove;

    // Straight rake field with a slow breathing waver.
    const waver = s * 0.004;
    for (let y = gap * 0.5; y < h; y += gap) {
      c2d.beginPath();
      for (let x = 0; x <= w; x += 8 * px) {
        const yy = y + Math.sin((x * 0.012) / px + t * 0.25 + y * 0.05) * waver;
        if (x === 0) c2d.moveTo(x, yy);
        else c2d.lineTo(x, yy);
      }
      c2d.stroke();
    }

    // Stones: clear a disc, comb concentric furrows, set the stone on top.
    for (const st of stones) {
      const cx = st.x * w;
      const cy = st.y * h;
      const r = st.r * s;
      const maxR = r + st.rings * gap * 0.8;
      // Clear the disc: paint bg when opaque, punch out when transparent.
      const punch = !(c.bg && c.bg[3] > 0.01);
      if (punch) {
        c2d.save();
        c2d.globalCompositeOperation = 'destination-out';
        c2d.fillStyle = 'rgba(0,0,0,1)';
      } else {
        c2d.fillStyle = rgbaCss(c.bg, c.bg[3]);
      }
      c2d.beginPath();
      c2d.arc(cx, cy, maxR + gap * 0.4, 0, Math.PI * 2);
      c2d.fill();
      if (punch) c2d.restore();

      c2d.strokeStyle = groove;
      for (let k = 1; k <= st.rings; k++) {
        c2d.beginPath();
        c2d.arc(cx, cy, r + k * gap * 0.8, 0, Math.PI * 2);
        c2d.stroke();
      }
      c2d.fillStyle = rgbCss(mix(c.fg, c.bg, 0.35));
      c2d.beginPath();
      c2d.ellipse(cx, cy, r, r * st.squash, st.rot, 0, Math.PI * 2);
      c2d.fill();
      c2d.strokeStyle = rgbaCss(c.fg, 0.5);
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
      stones = [];
    },
  };
}
