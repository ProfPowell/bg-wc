// cumulus — the Parrish sky. Stacked billowing cloud masses, each a seeded
// cluster of soft discs shaded bright-top/shadow-bottom with a warm rim on
// the sun side, drifting glacially across a saturated two-stop sky.
// DESIGN NOTE (documented deviation, cyanotype precedent): the sky ramp
// mixes theme colors toward fixed warm/cool anchors — Parrish light IS a
// deep ultramarine-to-gold ramp; the theme still tints both ends.
// density = cloud count, intensity = rim-light strength.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const COOL = [0.08, 0.18, 0.45]; // ultramarine anchor
const WARM = [1, 0.82, 0.55]; // gold anchor

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let masses = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 101);
    const n = 3 + Math.round(params.density * 2); // 3..5 masses
    masses = [];
    for (let i = 0; i < n; i++) {
      const puffs = [];
      const nb = 6 + ((rand() * 6) | 0);
      for (let k = 0; k < nb; k++) {
        puffs.push({
          dx: (rand() - 0.5) * 0.22,
          dy: (rand() - 0.5) * 0.07 - k * 0.004,
          r: 0.035 + rand() * 0.05,
        });
      }
      // Flat base: sort puffs so lower ones render first and clip a common floor.
      puffs.sort((a, b) => b.dy - a.dy);
      masses.push({
        y: 0.18 + rand() * 0.42,
        off: rand(),
        v: 0.008 + rand() * 0.012,
        scale: 0.7 + rand() * 0.7,
        puffs,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!masses.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);

    // The Parrish ramp: cool zenith to warm horizon.
    const top = mix(c.primary, COOL, 0.55);
    const hor = mix(c.accent, WARM, 0.45);
    const sky = c2d.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgbCss(top));
    sky.addColorStop(0.75, rgbCss(mix(top, hor, 0.65)));
    sky.addColorStop(1, rgbCss(hor));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    const rim = 0.35 + params.intensity * 0.45;
    for (const m of masses) {
      const mx = (((m.off + t * m.v) % 1.3) - 0.15) * w;
      const my = m.y * h;
      const breathe = 1 + 0.08 * Math.sin(t * 0.13 + m.phase);
      for (const p of m.puffs) {
        const x = mx + p.dx * s * m.scale * 2.2;
        const y = my + p.dy * s * m.scale * 2.2;
        const r = p.r * s * m.scale;
        // Body: bright top fading to sky-shadow bottom.
        const g = c2d.createLinearGradient(0, y - r, 0, y + r);
        g.addColorStop(0, rgbCss(mix([1, 1, 1], top, 0.08)));
        g.addColorStop(0.7, rgbCss(mix([1, 1, 1], top, 0.3)));
        g.addColorStop(1, rgbCss(mix(top, hor, 0.5)));
        c2d.fillStyle = g;
        c2d.beginPath();
        c2d.arc(x, y, r, 0, Math.PI * 2);
        c2d.fill();
        // Warm rim on the sun (lower-left) side.
        c2d.strokeStyle = rgbaCss(hor, rim * breathe * 0.5);
        c2d.lineWidth = Math.max(1.5, r * 0.12) * px;
        c2d.beginPath();
        c2d.arc(x, y, r * 0.97, Math.PI * 0.45, Math.PI * 1.05);
        c2d.stroke();
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
      masses = [];
    },
  };
}
