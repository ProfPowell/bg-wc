// terrace — the classical Parrish stage. Dark column silhouettes and an urn
// frame a luminous sky; a balustrade closes the foreground; the light
// breathes gently through the opening. Architecture only, never figures.
// DESIGN NOTE (documented deviation): the sky ramp mixes theme colors
// toward warm/cool anchors, as in cumulus — the theme tints both ends.
// density = column count, intensity = glow strength.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const COOL = [0.08, 0.18, 0.45];
const WARM = [1, 0.82, 0.55];

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let cols = [];
  let urnX = 0.7;
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 103);
    const n = 2 + Math.round(params.density); // 2..3 columns
    cols = [];
    for (let i = 0; i < n; i++) {
      // Columns hug the frame edges, leaving the sky open.
      const side = i % 2 === 0 ? 0.06 + rand() * 0.1 : 0.84 + rand() * 0.1;
      cols.push({ x: side, cw: 0.055 + rand() * 0.02 });
    }
    urnX = 0.3 + rand() * 0.4;
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!cols.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);

    const top = mix(c.primary, COOL, 0.55);
    const hor = mix(c.accent, WARM, 0.5);
    const sky = c2d.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgbCss(top));
    sky.addColorStop(0.7, rgbCss(mix(top, hor, 0.7)));
    sky.addColorStop(1, rgbCss(hor));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    // The breathing glow at the heart of the opening.
    const glowA = (0.1 + params.intensity * 0.14) * (1 + 0.25 * Math.sin(t * 0.2));
    const glow = c2d.createRadialGradient(w * 0.5, h * 0.58, 0, w * 0.5, h * 0.58, s * 0.55);
    glow.addColorStop(0, rgbaCss(mix(hor, [1, 1, 1], 0.5), glowA));
    glow.addColorStop(1, rgbaCss(hor, 0));
    c2d.fillStyle = glow;
    c2d.fillRect(0, 0, w, h);

    // Silhouette ink: near-black derived from fg so it works in any theme.
    const ink = rgbCss(mix(c.fg, [0, 0, 0], 0.55));
    const baluY = h * 0.82;

    for (const col of cols) {
      const cw = col.cw * w;
      const x = col.x * w - cw / 2;
      c2d.fillStyle = ink;
      c2d.fillRect(x, 0, cw, baluY); // shaft
      c2d.fillRect(x - cw * 0.25, 0, cw * 1.5, h * 0.035); // capital
      c2d.fillRect(x - cw * 0.18, h * 0.05, cw * 1.36, h * 0.015); // astragal
      c2d.fillRect(x - cw * 0.25, baluY - h * 0.03, cw * 1.5, h * 0.03); // base
    }

    // Urn on the balustrade.
    const ux = urnX * w;
    const ur = s * 0.045;
    c2d.fillStyle = ink;
    c2d.beginPath();
    c2d.ellipse(ux, baluY - ur * 1.4, ur, ur * 0.85, 0, 0, Math.PI * 2);
    c2d.fill();
    c2d.fillRect(ux - ur * 0.55, baluY - ur * 0.7, ur * 1.1, ur * 0.7); // bowl base
    c2d.fillRect(ux - ur * 0.8, baluY - ur * 2.5, ur * 1.6, ur * 0.18); // lip
    c2d.fillRect(ux - ur * 0.12, baluY - ur * 2.5, ur * 0.24, ur * 1.2); // stem

    // Balustrade: rail, posts, plinth.
    c2d.fillStyle = ink;
    c2d.fillRect(0, baluY, w, h * 0.03);
    const posts = 9;
    for (let k = 0; k <= posts; k++) {
      const bx = (k / posts) * w;
      c2d.fillRect(bx - 2.5 * px, baluY + h * 0.03, 5 * px, h * 0.08);
    }
    c2d.fillRect(0, baluY + h * 0.11, w, h - (baluY + h * 0.11));
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
      cols = [];
    },
  };
}
