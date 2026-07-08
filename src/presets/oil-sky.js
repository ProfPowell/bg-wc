// oil-sky — a skyscape in visible strokes. Horizontal banded brushwork,
// warm at the horizon rising to cool at the zenith, every stroke a short
// rounded dab with seeded misalignment and its own faint shimmer. Distinct
// from `brushstroke` (abstract swirl field): this one paints a SKY.
// DESIGN NOTE (documented deviation): band tones mix theme colors toward
// warm/cool anchors — the theme tints the whole canvas.
// density = strokes per band, intensity = stroke contrast.

import { mulberry32 } from '../util/pause.js';
import { rgbCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const COOL = [0.12, 0.2, 0.42];
const WARM = [1, 0.78, 0.5];
const BANDS = 5;

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let strokes = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 107);
    const per = Math.floor(26 + params.density * 40); // strokes per band
    strokes = [];
    for (let b = 0; b < BANDS; b++) {
      for (let k = 0; k < per; k++) {
        strokes.push({
          band: b,
          x: rand() * 1.1 - 0.05,
          y: (b + rand()) / BANDS,
          len: 0.05 + rand() * 0.09,
          lw: (4 + rand() * 6) * px,
          tilt: (rand() - 0.5) * 0.12,
          tone: rand(), // where this dab sits between band color and its lightened kin
          phase: rand() * Math.PI * 2,
          w2: 0.3 + rand() * 0.8,
        });
      }
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!strokes.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();

    // Underpainting: the smooth ramp the dabs sit on.
    const top = mix(c.primary, COOL, 0.5);
    const hor = mix(c.accent, WARM, 0.45);
    const base = c2d.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, rgbCss(top));
    base.addColorStop(1, rgbCss(hor));
    c2d.fillStyle = base;
    c2d.fillRect(0, 0, w, h);

    const contrast = 0.2 + params.intensity * 0.35;
    c2d.lineCap = 'round';
    for (const st of strokes) {
      const bandMix = st.band / (BANDS - 1); // 0 = zenith band, 1 = horizon
      const bandCol = mix(top, hor, bandMix);
      const lit = mix(bandCol, [1, 1, 1], contrast * st.tone);
      const shaded = mix(bandCol, COOL, contrast * (1 - st.tone) * 0.5);
      const col = st.tone > 0.5 ? lit : shaded;
      const shimmer = 1 + 0.06 * Math.sin(t * st.w2 + st.phase);
      c2d.strokeStyle = rgbCss(col);
      c2d.lineWidth = st.lw * shimmer;
      const x = st.x * w;
      const y = st.y * h;
      const L = st.len * w;
      c2d.beginPath();
      c2d.moveTo(x, y);
      c2d.lineTo(x + L, y + L * st.tilt);
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
    },
  };
}
