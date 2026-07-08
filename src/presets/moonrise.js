// moonrise — calm night. A big low moon with a soft halo, thin luminous
// cloud bands drifting across it, faint seeded stars, and a shimmering
// reflection column below the horizon. Everything glacial.
// DESIGN NOTE (documented deviation): the night ramp mixes the theme
// primary toward a deep-night anchor; the moon face mixes fg toward white.
// density = cloud band count, intensity = halo/reflection strength.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const NIGHT = [0.05, 0.08, 0.2];

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let bands = [];
  let stars = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 109);
    const n = 2 + Math.round(params.density * 2); // 2..4 bands
    bands = [];
    for (let i = 0; i < n; i++) {
      bands.push({
        y: 0.22 + rand() * 0.34,
        th: 0.012 + rand() * 0.02,
        off: rand(),
        v: 0.006 + rand() * 0.008,
        span: 0.35 + rand() * 0.4,
      });
    }
    stars = [];
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: rand(),
        y: rand() * 0.6,
        tw: 0.4 + rand() * 1.4,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!bands.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);
    const horizon = h * 0.72;
    const mx = w * 0.62;
    const my = h * 0.38;
    const mr = s * 0.13;

    const nightTop = mix(c.primary, NIGHT, 0.65);
    const nightHor = mix(c.primary, NIGHT, 0.35);
    const sky = c2d.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, rgbCss(nightTop));
    sky.addColorStop(1, rgbCss(nightHor));
    c2d.fillStyle = sky;
    // Full-canvas opaque base: the sky/water boundary sits at a fractional
    // y, and two partial fills meeting there let the seam row blend with the
    // PREVIOUS frame (a frame-purity leak time-rule catches). Paint the sky
    // over everything, then let the water's soft edge blend into fresh ink.
    c2d.fillRect(0, 0, w, h);
    // The water below is the sky, darker.
    c2d.fillStyle = rgbCss(mix(nightHor, [0, 0, 0], 0.35));
    c2d.fillRect(0, horizon, w, h - horizon);

    // Stars.
    for (const st of stars) {
      const a = 0.25 + 0.3 * Math.sin(t * st.tw + st.phase);
      c2d.fillStyle = rgbaCss(c.fg, Math.max(0.05, a));
      c2d.fillRect(st.x * w, st.y * h, 1.2 * px, 1.2 * px);
    }

    // Halo, then the moon face.
    const moon = mix(c.fg, [1, 1, 1], 0.7);
    const haloA = (0.18 + params.intensity * 0.2) * (1 + 0.12 * Math.sin(t * 0.17));
    const halo = c2d.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2);
    halo.addColorStop(0, rgbaCss(moon, haloA));
    halo.addColorStop(1, rgbaCss(moon, 0));
    c2d.fillStyle = halo;
    c2d.fillRect(0, 0, w, horizon);
    c2d.fillStyle = rgbCss(moon);
    c2d.beginPath();
    c2d.arc(mx, my, mr, 0, Math.PI * 2);
    c2d.fill();
    // Two faint maria to keep it a moon, not a dot.
    c2d.fillStyle = rgbaCss(mix(moon, nightTop, 0.35), 0.6);
    c2d.beginPath();
    c2d.arc(mx - mr * 0.3, my - mr * 0.15, mr * 0.22, 0, Math.PI * 2);
    c2d.arc(mx + mr * 0.22, my + mr * 0.28, mr * 0.16, 0, Math.PI * 2);
    c2d.fill();

    // Luminous cloud bands drifting across.
    for (const b of bands) {
      const bx = (((b.off + t * b.v) % 1.4) - 0.2) * w;
      const by = b.y * h;
      const bw = b.span * w;
      const grad = c2d.createLinearGradient(bx, 0, bx + bw, 0);
      const lum = mix(moon, nightHor, 0.45);
      grad.addColorStop(0, rgbaCss(lum, 0));
      grad.addColorStop(0.5, rgbaCss(lum, 0.5));
      grad.addColorStop(1, rgbaCss(lum, 0));
      c2d.fillStyle = grad;
      c2d.fillRect(bx, by - (b.th * h) / 2, bw, b.th * h);
    }

    // Reflection column: breathing width, broken shimmer.
    const refA = 0.12 + params.intensity * 0.18;
    for (let k = 0; k < 14; k++) {
      const ry = horizon + ((k + 0.5) / 14) * (h - horizon);
      const wob = Math.sin(t * 0.6 + k * 1.7) * mr * 0.25;
      const rw = mr * (1.1 - (k / 14) * 0.5) * (1 + 0.2 * Math.sin(t * 0.3 + k));
      c2d.fillStyle = rgbaCss(moon, refA * (1 - k / 16));
      c2d.fillRect(mx - rw / 2 + wob, ry, rw, (h - horizon) / 22);
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
      bands = [];
      stars = [];
    },
  };
}
