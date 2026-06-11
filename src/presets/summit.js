import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// summit — mountain dawn. Four to five parallax ridgelines from seeded 1D
// value noise step back into a slow sunrise gradient; translucent mist bands
// drift between the layers and tiny birds occasionally cross the sky. Ridges
// drift at depth-scaled parallax rates; the sun climbs on a very long cycle.
// `density` = ridge count/roughness, `intensity` = atmosphere strength.

const SUN_CYCLE = 90; // seconds for the sun's slow climb

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Seeded 1D value noise (smooth) over a lattice.
function noise1d(seed) {
  const rng = mulberry32(seed);
  const lat = new Float32Array(64);
  for (let i = 0; i < 64; i++) lat[i] = rng();
  return (x) => {
    const i = Math.floor(x) & 63;
    const j = (i + 1) & 63;
    const f = x - Math.floor(x);
    const s = f * f * (3 - 2 * f);
    return lat[i] + (lat[j] - lat[i]) * s;
  };
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const seed = params.seed | 0 || 1;
    const nR = 4 + Math.round((params.density ?? 0.5) * 1); // 4..5 ridges
    const ridges = [];
    for (let i = 0; i < nR; i++) {
      ridges.push({
        n1: noise1d(seed + i * 101),
        n2: noise1d(seed + i * 101 + 7),
        base: 0.42 + (i / nR) * 0.5, // horizon fraction (near = lower)
        amp: 0.1 + (1 - i / nR) * 0.14,
        freq: 2.2 + i * 1.1,
        drift: 0.004 + i * 0.006, // parallax (far slow, near fast)
      });
    }
    const rng = mulberry32(seed + 999);
    const birds = [];
    for (let b = 0; b < 4; b++) {
      birds.push({
        y: 0.12 + rng() * 0.25,
        speed: 0.025 + rng() * 0.02,
        phase: rng(),
        size: 3 + rng() * 3,
        flap: 2 + rng() * 2,
      });
    }
    cache = { key, ridges, birds };
    return cache;
  }

  function frame(t, params) {
    const { ridges, birds } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const intensity = params.intensity ?? 0.5;
    const warm = c.warning || [0.95, 0.65, 0.35];
    const rose = c.accent || [0.9, 0.45, 0.5];
    const deep = mix(
      c.bg && c.bg[3] > 0.01 ? c.bg : [0.1, 0.1, 0.18],
      c.primary || [0.25, 0.3, 0.5],
      0.4
    );

    // Sunrise sky: deep top → rose → warm at the horizon, sun slowly climbing.
    const sunUp = 0.5 + 0.5 * Math.sin((t / SUN_CYCLE) * Math.PI * 2 - Math.PI / 2); // 0..1
    const sky = c2d.createLinearGradient(0, 0, 0, h * 0.8);
    sky.addColorStop(0, rgb(mix(deep, rose, sunUp * 0.25)));
    sky.addColorStop(0.62, rgb(mix(deep, rose, 0.4 + 0.4 * sunUp)));
    sky.addColorStop(1, rgb(mix(rose, warm, 0.5 + 0.5 * sunUp)));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    // The sun: a soft disc climbing from behind the far ridge.
    const sunY = h * (0.62 - 0.3 * sunUp);
    const sunX = w * 0.62;
    const sr = Math.min(w, h) * 0.07;
    const sg = c2d.createRadialGradient(sunX, sunY, 0, sunX, sunY, sr * 3.2);
    sg.addColorStop(0, rgb(mix(warm, [1, 1, 0.92], 0.6), 0.95));
    sg.addColorStop(0.25, rgb(warm, 0.5 * (0.5 + intensity)));
    sg.addColorStop(1, rgb(warm, 0));
    c2d.fillStyle = sg;
    c2d.fillRect(0, 0, w, h);

    // Birds: shallow V pairs flapping across, one at a time mostly.
    c2d.strokeStyle = rgb(mix(deep, [0, 0, 0], 0.5), 0.8);
    c2d.lineWidth = Math.max(1, h * 0.0022);
    c2d.lineCap = 'round';
    for (const b of birds) {
      const bx = ((b.phase + t * b.speed) % 1.3) * w * 1.3 - w * 0.15;
      if (bx < -20 || bx > w + 20) continue;
      const by = b.y * h + Math.sin(t * 0.7 + b.phase * 9) * h * 0.01;
      const fl = Math.sin(t * b.flap * 2) * 0.5 + 0.5;
      c2d.beginPath();
      c2d.moveTo(bx - b.size, by - fl * b.size * 0.6);
      c2d.quadraticCurveTo(bx, by + b.size * 0.3, bx + b.size, by - fl * b.size * 0.6);
      c2d.stroke();
    }

    // Ridges, far to near, darkening forward, with mist bands between.
    for (let i = 0; i < ridges.length; i++) {
      const r = ridges[i];
      const depth = i / (ridges.length - 1); // 0 far → 1 near
      const tone = mix(mix(rose, deep, 0.35 + 0.6 * depth), [0, 0, 0], depth * 0.35);
      c2d.fillStyle = rgb(tone, 0.92);
      c2d.beginPath();
      c2d.moveTo(0, h);
      const off = t * r.drift;
      for (let x = 0; x <= w; x += 4) {
        const u = (x / w) * r.freq + off;
        const y = h * (r.base - (r.n1(u) * 0.7 + r.n2(u * 2.3) * 0.3) * r.amp);
        c2d.lineTo(x, y);
      }
      c2d.lineTo(w, h);
      c2d.closePath();
      c2d.fill();

      // Mist band drifting along this ridge's base.
      if (i < ridges.length - 1) {
        const my = h * (r.base + 0.04);
        const mg = c2d.createLinearGradient(0, my - h * 0.05, 0, my + h * 0.06);
        const mist = mix([1, 1, 1], rose, 0.25);
        const drift = 0.5 + 0.5 * Math.sin(t * 0.05 + i * 1.7);
        mg.addColorStop(0, rgb(mist, 0));
        mg.addColorStop(0.5, rgb(mist, (0.1 + 0.14 * intensity) * (0.6 + 0.4 * drift)));
        mg.addColorStop(1, rgb(mist, 0));
        c2d.fillStyle = mg;
        c2d.fillRect(0, my - h * 0.05, w, h * 0.11);
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
      frame(SUN_CYCLE * 0.3, params); // sun partway up
    },
    dispose() {
      cache = null;
    },
  };
}
