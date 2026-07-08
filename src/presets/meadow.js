// meadow — dusk grassland. Three parallax layers of curved grass blades
// swaying gently against a warm gradient, seed heads catching the last
// light. Nearer layers are darker and sway more. DESIGN NOTE (documented
// deviation): the dusk ramp mixes theme colors toward a warm anchor.
// density = blades per layer, intensity = sway depth.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const DUSK = [1, 0.72, 0.45];
const LAYERS = 3;

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let layers = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 127);
    layers = [];
    for (let l = 0; l < LAYERS; l++) {
      const blades = [];
      const n = Math.floor(30 + params.density * 50);
      for (let k = 0; k < n; k++) {
        blades.push({
          x: rand() * 1.05 - 0.025,
          len: 0.12 + rand() * 0.16 + l * 0.05,
          curve: (rand() - 0.5) * 0.5,
          swayW: 0.4 + rand() * 0.5,
          phase: rand() * Math.PI * 2,
          seedHead: rand() < 0.12,
        });
      }
      layers.push({ baseY: 0.78 + l * 0.09, blades });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!layers.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);

    const top = mix(c.primary, c.bg, 0.35);
    const low = mix(c.accent, DUSK, 0.45);
    const sky = c2d.createLinearGradient(0, 0, 0, h * 0.9);
    sky.addColorStop(0, rgbCss(top));
    sky.addColorStop(1, rgbCss(low));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    const swayAmp = (0.015 + params.intensity * 0.02) * s;
    c2d.lineCap = 'round';
    layers.forEach((layer, l) => {
      const depth = l / (LAYERS - 1); // 0 far, 1 near
      const col = mix(mix(c.fg, [0, 0, 0], 0.3), low, 0.55 - depth * 0.45);
      const lw = (1 + depth * 1.6) * px;
      for (const b of layer.blades) {
        const bx = b.x * w;
        const by = layer.baseY * h;
        const L = b.len * s;
        // A shared breeze plus per-blade jitter; nearer layers move more.
        const sway =
          swayAmp *
          (0.5 + depth) *
          (Math.sin(t * 0.3 + bx * 0.01) * 0.6 + Math.sin(t * b.swayW + b.phase) * 0.4);
        const tipX = bx + b.curve * L + sway;
        const tipY = by - L;
        c2d.strokeStyle = rgbCss(col);
        c2d.lineWidth = lw;
        c2d.beginPath();
        c2d.moveTo(bx, by);
        c2d.quadraticCurveTo(bx + (b.curve * L) / 2, by - L * 0.55, tipX, tipY);
        c2d.stroke();
        if (b.seedHead) {
          c2d.fillStyle = rgbaCss(mix(c.warning, low, 0.3), 0.9);
          c2d.beginPath();
          c2d.arc(tipX, tipY, (1.4 + depth) * px, 0, Math.PI * 2);
          c2d.fill();
        }
      }
    });
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
      layers = [];
    },
  };
}
