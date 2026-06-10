// sakura — cherry-blossom petals on the wind. Three depth layers; each petal
// is a notched-teardrop path with per-petal flutter (rotation + sway
// oscillators) riding a global gust field that occasionally surges. Petal
// color blends theme primary toward white per layer. Japanese group.
//
// Distinct from snow/confetti: gusts, flutter physics, depth parallax.

import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss } from '../renderer/tokens.js';

const CAP = { low: 60, med: 140, high: 260 };
const LAYER_ALPHA = [0.35, 0.6, 0.92]; // far → near

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Time-varying gust strength, 0..~1, with occasional surges.
function gust(t) {
  const g = Math.sin(t * 0.13) + Math.sin(t * 0.071 + 2.0);
  return Math.max(0, g) * g * 0.25;
}

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let cache = null; // { key, petals }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${params.quality}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const cap = CAP[params.quality] || CAP.med;
    const count = Math.max(12, Math.round(cap * (0.3 + params.density)));
    const petals = [];
    for (let i = 0; i < count; i++) {
      const depth = i % 3; // 0 far, 2 near
      petals.push({
        depth,
        x0: rng(),
        y0: rng(),
        size: (0.008 + rng() * 0.009) * (0.6 + depth * 0.45),
        vy: (0.025 + rng() * 0.03) * (0.5 + depth * 0.45),
        swayF: 0.4 + rng() * 0.7,
        swayPh: rng() * Math.PI * 2,
        swayAmp: 0.01 + rng() * 0.03,
        spinF: 0.5 + rng() * 1.2,
        spinPh: rng() * Math.PI * 2,
        whiten: rng() * 0.3,
      });
    }
    cache = { key, petals };
    return cache;
  }

  // Notched cherry petal in local coords, tip at +y, size = half-length.
  function petalPath(s) {
    c2d.beginPath();
    c2d.moveTo(0, s);
    c2d.bezierCurveTo(s * 0.85, s * 0.35, s * 0.7, -s * 0.55, s * 0.18, -s * 0.8);
    c2d.quadraticCurveTo(0, -s * 0.55, -s * 0.18, -s * 0.8); // the notch
    c2d.bezierCurveTo(-s * 0.7, -s * 0.55, -s * 0.85, s * 0.35, 0, s);
    c2d.closePath();
  }

  function frame(t, params) {
    const c = getColors();
    const { petals } = build(params);
    const s = Math.min(w, h);
    clearAndFill(c2d, w, h, c.bg);

    const g = gust(t);
    const base = [c.primary[0], c.primary[1], c.primary[2]];
    for (const p of petals) {
      const depthF = 0.4 + p.depth * 0.3;
      const y = ((p.y0 + t * p.vy) % 1.15) * h * 1.15 - h * 0.075;
      const drift = t * (0.005 + g * 0.06) * depthF;
      const sway = Math.sin(t * p.swayF + p.swayPh) * p.swayAmp;
      const x = (((p.x0 + drift + sway) % 1.2) + 1.2) % 1.2;
      const rot = Math.sin(t * p.spinF + p.spinPh) * 1.2 + g * 0.8;

      // Soften toward white per layer + per petal; intensity holds saturation.
      const whiten = Math.min(1, p.whiten + (2 - p.depth) * 0.18 + (1 - params.intensity) * 0.35);
      const col = mix(base, [1, 1, 1], whiten);

      c2d.save();
      c2d.translate(x * w * 1.2 - w * 0.1, y);
      c2d.rotate(rot);
      // Flutter: petals foreshorten as they tumble.
      c2d.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(t * p.spinF * 1.7 + p.spinPh)));
      petalPath(s * p.size * (0.8 + params.intensity * 0.4));
      c2d.fillStyle = rgbaCss(col, LAYER_ALPHA[p.depth]);
      c2d.fill();
      c2d.restore();
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
