import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// migration — birds migrating high in an autumn sky. Several V-skeins at
// different altitudes drift across a graded autumn gradient; each skein gently
// undulates, the lead bird trading off every so often, and far skeins are
// smaller and paler (parallax). Distinct from boids (no swarm steering — these
// hold formation) and from summit (birds are the subject here, over a plain
// autumn sky, no terrain). `density` = flock/bird count, `intensity` = sky
// saturation. Deterministic from `t`.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const density = params.density ?? 0.5;
    const skeins = [];
    const n = 3 + Math.round(density * 4); // 3..7 skeins
    for (let i = 0; i < n; i++) {
      const depth = rng(); // 0 far → 1 near
      const perSide = 3 + Math.round(density * 6 * (0.5 + depth * 0.7));
      skeins.push({
        depth,
        y: (0.12 + rng() * 0.5) * h, // altitude (high in the sky)
        speed: (0.018 + rng() * 0.02) * (0.5 + depth), // px-fraction/s, near faster
        dir: rng() < 0.5 ? 1 : -1,
        phase: rng(),
        perSide,
        spread: (0.4 + rng() * 0.4) * (0.6 + depth * 0.8),
        undR: 0.2 + rng() * 0.3,
        undPh: rng() * Math.PI * 2,
        flap: 3 + rng() * 3,
      });
    }
    skeins.sort((a, b) => a.depth - b.depth); // far first
    cache = { key, skeins };
    return cache;
  }

  // A single bird: a shallow V chevron, wings flapping (open ↔ folded).
  function drawBird(x, y, s, flap, col, alpha) {
    const wing = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(flap)); // 0 folded → 1 spread
    c2d.strokeStyle = rgb(col, alpha);
    c2d.lineWidth = Math.max(1, s * 0.22);
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    c2d.beginPath();
    c2d.moveTo(x - s, y - s * wing * 0.6);
    c2d.quadraticCurveTo(x - s * 0.3, y + s * 0.1, x, y - s * 0.12);
    c2d.quadraticCurveTo(x + s * 0.3, y + s * 0.1, x + s, y - s * wing * 0.6);
    c2d.stroke();
  }

  function frame(t, params) {
    const { skeins } = build(params);
    const c = getColors();
    const intensity = params.intensity ?? 0.5;
    const teal = c.info || [0.35, 0.6, 0.62];
    const gold = c.warning || [0.85, 0.65, 0.3];
    const dusk = c.accent || [0.78, 0.4, 0.35];
    const bgc = c.bg && c.bg[3] > 0.01 ? c.bg : [0.95, 0.9, 0.8];

    // Autumn sky: teal high → gold mid → dusk low (saturation by intensity).
    clearAndFill(c2d, w, h, bgc);
    const sat = 0.45 + 0.5 * intensity;
    const sky = c2d.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgb(mix(bgc, teal, sat * 0.7)));
    sky.addColorStop(0.55, rgb(mix(bgc, gold, sat * 0.6)));
    sky.addColorStop(1, rgb(mix(bgc, dusk, sat * 0.85)));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    const inkBase = mix(c.fg || [0.15, 0.12, 0.1], [0, 0, 0], 0.4);

    for (const sk of skeins) {
      const fade = 0.3 + sk.depth * 0.7;
      const s = (3 + sk.depth * 9) * (0.6 + 0.5 * intensity);
      const col = mix(inkBase, mix(gold, dusk, 0.5), (1 - fade) * 0.5);
      // Lead position sweeps across (wrapping); the V trails behind it.
      const span = w + 2 * w * 0.3;
      const lead = ((sk.phase + t * sk.speed) % 1) * span - w * 0.3;
      const lx = sk.dir > 0 ? lead : w - lead;
      const ly = sk.y + Math.sin(t * sk.undR + sk.undPh) * h * 0.04;
      const dx = -sk.dir * s * 2.4 * sk.spread; // step back along the V
      const dy = s * 1.6 * sk.spread; // and down to each side

      // Lead bird, then symmetric wings of the skein.
      drawBird(lx, ly, s, t * sk.flap, col, fade);
      for (let k = 1; k <= sk.perSide; k++) {
        const off = k - 0.15 * Math.sin(t * 0.5 + k); // slight ragged trailing
        // small per-bird flap phase offset so the skein ripples
        const fp = t * sk.flap + k * 0.5;
        drawBird(lx + dx * off, ly + dy * off, s, fp, col, fade);
        drawBird(lx + dx * off, ly - dy * off, s, fp + 0.3, col, fade);
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(3, params);
    },
    dispose() {
      cache = null;
    },
  };
}
