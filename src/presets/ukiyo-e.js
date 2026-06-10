// ukiyo-e — woodblock-print waves. Flat-color wave layers with outlined crests,
// scalloped foam edges, and curling foam "claws", drifting in parallax beneath
// a bokashi sky band. Deliberately print-like: flat fills + outlines, no
// gradients inside the water. Japanese group.

import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

const STEPS = 64; // samples across the width per wave path

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let cache = null; // { key, layers }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const n = 3 + (params.density > 0.6 ? 1 : 0);
    const layers = [];
    for (let li = 0; li < n; li++) {
      const harm = [];
      for (let k = 0; k < 3; k++) {
        harm.push({
          amp: (0.25 + rng() * 0.75) / (k + 1),
          freq: (1.5 + rng() * 2) * (k + 1),
          ph: rng() * Math.PI * 2,
        });
      }
      layers.push({
        harm,
        base: 0.42 + ((li + 0.5) / n) * 0.52, // fraction of h, far → near
        drift: 0.01 + 0.022 * (li / n), // u-units/s; nearer drifts faster
        claws: 1 + ((rng() * 2) | 0),
        clawU: [rng(), rng(), rng()],
      });
    }
    cache = { key, layers, n };
    return cache;
  }

  function waveY(L, u) {
    let y = 0;
    for (const hm of L.harm) y += Math.sin(u * Math.PI * 2 * hm.freq + hm.ph) * hm.amp;
    return y / 2;
  }

  // One curling foam claw: nested arcs + spray dots, rotated into the wave.
  function claw(x, y, R, foamCss, outlineCss, s) {
    c2d.save();
    c2d.translate(x, y);
    c2d.rotate(-0.35);
    for (let j = 0; j < 5; j++) {
      const r = R * (1 - j * 0.17);
      c2d.beginPath();
      c2d.arc(0, 0, r, Math.PI * 1.05, Math.PI * 1.85);
      c2d.lineWidth = Math.max(1, s * 0.004 * (1 - j * 0.12));
      c2d.strokeStyle = j % 2 ? outlineCss : foamCss;
      c2d.stroke();
    }
    c2d.fillStyle = foamCss;
    for (let j = 0; j < 6; j++) {
      const a = Math.PI * (1.0 - j * 0.09);
      c2d.beginPath();
      c2d.arc(
        Math.cos(a) * R * 1.18,
        Math.sin(a) * R * 1.18,
        s * 0.004 * (1 - j * 0.1),
        0,
        Math.PI * 2
      );
      c2d.fill();
    }
    c2d.restore();
  }

  function frame(t, params) {
    const c = getColors();
    const { layers, n } = build(params);
    const s = Math.min(w, h);
    clearAndFill(c2d, w, h, c.bg);

    // Bokashi sky band above the horizon.
    if (c.bg[3] > 0.01) {
      const sky = c2d.createLinearGradient(0, 0, 0, h * 0.55);
      sky.addColorStop(0, rgbaCss([c.bg[0], c.bg[1], c.bg[2]], 0));
      const horizon = mix(
        [c.bg[0], c.bg[1], c.bg[2]],
        [c.primary[0], c.primary[1], c.primary[2]],
        0.18
      );
      sky.addColorStop(1, rgbaCss(horizon, 0.9));
      c2d.fillStyle = sky;
      c2d.fillRect(0, 0, w, h * 0.55);
    }

    const foam = rgbCss([c.fg[0], c.fg[1], c.fg[2]]);
    for (let li = 0; li < n; li++) {
      const L = layers[li];
      const depth = li / Math.max(1, n - 1); // 0 far .. 1 near
      const wash = (1 - depth) * (0.6 - 0.35 * params.intensity);
      const water = mix(
        mix([c.primary[0], c.primary[1], c.primary[2]], [c.info[0], c.info[1], c.info[2]], depth),
        [c.bg[0], c.bg[1], c.bg[2]],
        Math.max(0, wash)
      );
      const waterCss = rgbCss(water);
      const outlineCss = rgbCss(mix(water, [0, 0, 0], 0.25 + 0.2 * params.intensity));
      const amp = s * 0.07 * (0.6 + depth * 0.7);
      const baseY = h * L.base + Math.sin(t * 0.25 + li * 1.7) * h * 0.012; // swell
      const scroll = t * L.drift;

      // Flat fill down to the bottom edge.
      c2d.beginPath();
      c2d.moveTo(-4, h + 4);
      for (let k = 0; k <= STEPS; k++) {
        const u = k / STEPS;
        c2d.lineTo(u * w, baseY + waveY(L, u + scroll) * amp);
      }
      c2d.lineTo(w + 4, h + 4);
      c2d.closePath();
      c2d.fillStyle = waterCss;
      c2d.fill();

      // Outlined crest with scalloped foam dots riding the edge.
      c2d.beginPath();
      for (let k = 0; k <= STEPS; k++) {
        const u = k / STEPS;
        const y = baseY + waveY(L, u + scroll) * amp;
        if (k === 0) c2d.moveTo(0, y);
        else c2d.lineTo(u * w, y);
      }
      c2d.lineWidth = Math.max(1, s * 0.0035);
      c2d.strokeStyle = outlineCss;
      c2d.stroke();
      c2d.fillStyle = foam;
      for (let k = 0; k <= STEPS; k += 2) {
        const u = k / STEPS;
        const y = baseY + waveY(L, u + scroll) * amp;
        const r = s * 0.005 * (1 + 0.6 * Math.sin(u * 40 + li * 3));
        c2d.beginPath();
        c2d.arc(u * w, y - r * 0.4, Math.max(0.5, r), 0, Math.PI * 2);
        c2d.fill();
      }

      // Curling claws ride the crest and drift with it.
      for (let ci = 0; ci < L.claws; ci++) {
        const u = (L.clawU[ci] + scroll * 0.6) % 1;
        const x = u * w;
        const y = baseY + waveY(L, u + scroll) * amp;
        claw(x, y - s * 0.01, s * 0.045 * (0.7 + depth * 0.6), foam, outlineCss, s);
      }
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
      cache = null;
    },
  };
}
