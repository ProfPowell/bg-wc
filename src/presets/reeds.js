import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// reeds — cattails and tall grasses swaying in the wind. Seeded blades rooted
// at the bottom edge, each a quadratic curve whose tip deflects with a
// travelling wind gust (a phase sweeping across x, its magnitude ebbing on a
// slow envelope so gusts arrive and pass). 2–3 depth layers (back paler and
// shorter, softened toward bg like scandi); a few cattail heads / seed tufts on
// the tallest stalks. `density` = blade count, `intensity` = wind strength.
// staticFrame: a still, gently leaned field.

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
    const layers = [];
    const nLayers = 3;
    for (let L = 0; L < nLayers; L++) {
      const depth = L / (nLayers - 1); // 0 back → 1 front
      const count = Math.round((14 + density * 46) * (0.6 + depth * 0.7));
      const blades = [];
      for (let i = 0; i < count; i++) {
        const tall = (0.32 + rng() * 0.4) * (0.6 + depth * 0.7);
        blades.push({
          x: rng() * w,
          height: h * tall,
          lean: (rng() - 0.5) * 0.5,
          phase: rng() * Math.PI * 2,
          stiff: 0.6 + rng() * 0.8, // tip flexibility
          wdt: (1.5 + depth * 3) * (0.7 + rng() * 0.6),
          tuft: rng() < 0.22 + depth * 0.12, // cattail head
          ci: (rng() * 3) | 0,
        });
      }
      blades.sort((a, b) => a.x - b.x);
      layers.push({ depth, blades });
    }
    cache = { key, layers };
    return cache;
  }

  function frame(t, params) {
    const { layers } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const toward = c.bg && c.bg[3] > 0.01 ? c.bg : [0.9, 0.92, 0.85];
    const greens = [
      c.success || [0.4, 0.6, 0.3],
      c.primary || [0.35, 0.55, 0.4],
      c.info || [0.5, 0.65, 0.45],
    ];
    const tuftCol = c.warning || [0.7, 0.55, 0.3];
    const intensity = params.intensity ?? 0.5;
    // Wind: a base sway plus a travelling gust whose strength ebbs.
    const gustEnv = 0.5 + 0.5 * Math.sin(t * 0.27);
    const wind = (0.4 + 0.9 * intensity) * (0.4 + gustEnv);

    for (const layer of layers) {
      const fade = 0.45 + layer.depth * 0.55;
      for (const b of layer.blades) {
        // Gust phase travels left→right across the field.
        const gust = Math.sin(t * 1.6 - (b.x / w) * 5 + b.phase);
        const sway = (b.lean + gust * wind * b.stiff) * b.height * 0.5;
        const rootX = b.x;
        const rootY = h;
        const tipX = rootX + sway;
        const tipY = h - b.height;
        const ctrlX = rootX + sway * 0.35;
        const ctrlY = h - b.height * 0.5;
        const col = mix(greens[b.ci % 3], toward, (1 - fade) * 0.7);
        c2d.strokeStyle = rgb(col, fade);
        c2d.lineWidth = b.wdt;
        c2d.lineCap = 'round';
        c2d.beginPath();
        c2d.moveTo(rootX, rootY);
        c2d.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
        c2d.stroke();
        if (b.tuft) {
          // Cattail head: a fat capsule at the tip.
          c2d.fillStyle = rgb(mix(tuftCol, toward, (1 - fade) * 0.6), fade);
          c2d.save();
          c2d.translate(tipX, tipY);
          c2d.rotate(Math.atan2(tipX - ctrlX, ctrlY - tipY));
          const cw = b.wdt * 2.4;
          const ch = b.height * 0.16;
          c2d.beginPath();
          c2d.ellipse(0, ch * 0.4, cw, ch, 0, 0, Math.PI * 2);
          c2d.fill();
          c2d.restore();
        }
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
      frame(0.4, params);
    },
    dispose() {
      cache = null;
    },
  };
}
