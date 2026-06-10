// kintsugi — gold-repaired cracks across a dark stone slab. Seeded branching
// veins grow in, hold while a highlight pulse travels each vein, then fade and
// a fresh network reseeds. Vein polylines cached per seed|cycle|density|size;
// frame() only animates reveal length and shimmer. Japanese group.

import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss } from '../renderer/tokens.js';

const CYCLE = 26; // s: grow → hold → fade → reseed
const SEGS = { low: 36, med: 64, high: 110 };

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function smoothstep(e0, e1, x) {
  const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
}

// Momentum random walk with recursive branching; pushes polylines into `out`.
function growVein(rng, x, y, ang, len, step, depth, out) {
  const pts = [[x, y]];
  for (let i = 0; i < len; i++) {
    ang += (rng() - 0.5) * 0.55;
    x += Math.cos(ang) * step;
    y += Math.sin(ang) * step;
    pts.push([x, y]);
    if (depth > 0 && rng() < 0.045) {
      const turn = (rng() < 0.5 ? 1 : -1) * (0.5 + rng() * 0.6);
      growVein(rng, x, y, ang + turn, Math.round(len * 0.45), step * 0.85, depth - 1, out);
    }
  }
  out.push(pts);
}

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let cache = null; // { key, veins }
  let speck = null; // { key, canvas } faint stone speckle

  function build(params, cycleIdx) {
    const key = `${params.seed | 0}|${cycleIdx}|${params.density}|${params.quality}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(((params.seed | 0 || 1) ^ (cycleIdx * 0x9e3779b9)) >>> 0);
    const segs = SEGS[params.quality] || SEGS.med;
    const count = Math.max(2, Math.round(2 + params.density * 7));
    const s = Math.min(w, h);
    const veins = [];
    for (let i = 0; i < count; i++) {
      const side = (rng() * 4) | 0;
      const u = rng();
      const x = side === 0 ? u * w : side === 1 ? w : side === 2 ? u * w : 0;
      const y = side === 0 ? 0 : side === 1 ? u * h : side === 2 ? h : u * h;
      const ang = Math.atan2(h / 2 - y, w / 2 - x) + (rng() - 0.5) * 0.8;
      growVein(rng, x, y, ang, segs, s * 0.016, 2, veins);
    }
    cache = { key, veins };
    return cache;
  }

  function speckle(seed) {
    const key = `${seed}|${w}x${h}`;
    if (speck && speck.key === key) return speck.canvas;
    const off = (speck && speck.canvas) || document.createElement('canvas');
    off.width = w;
    off.height = h;
    const g = off.getContext('2d');
    g.clearRect(0, 0, w, h);
    const rng = mulberry32((seed || 1) ^ 0x5f3759df);
    g.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 1200; i++) {
      g.fillRect(rng() * w, rng() * h, 1.5, 1.5);
    }
    speck = { key, canvas: off };
    return off;
  }

  function frame(t, params) {
    const c = getColors();
    const cycleIdx = Math.floor(t / CYCLE);
    const p = (t - cycleIdx * CYCLE) / CYCLE; // 0..1 in cycle
    const { veins } = build(params, cycleIdx);
    const s = Math.min(w, h);

    // Slab: theme bg pulled toward black so the gold reads.
    const slab = mix([c.bg[0], c.bg[1], c.bg[2]], [0, 0, 0], 0.55);
    clearAndFill(c2d, w, h, c.bg[3] > 0.01 ? [slab[0], slab[1], slab[2], 1] : c.bg);
    if (c.bg[3] > 0.01) c2d.drawImage(speckle(params.seed | 0), 0, 0);

    const gold = c.warning || c.accent || c.primary;
    const goldHi = mix([gold[0], gold[1], gold[2]], [1, 1, 1], 0.5);
    const reveal = smoothstep(0, 0.5, p);
    const fadeA = 1 - smoothstep(0.85, 1, p);
    const n = veins.length;

    c2d.lineJoin = 'round';
    c2d.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const pts = veins[i];
      const vr = Math.min(1, Math.max(0, reveal * 1.3 - (i / Math.max(1, n)) * 0.3));
      const upto = Math.max(2, Math.round(pts.length * vr));
      if (upto < 2) continue;

      // glow → mid → core passes
      const passes = [
        [s * 0.012, rgbaCss(gold, (0.1 + 0.25 * params.intensity) * fadeA)],
        [s * 0.004, rgbaCss(gold, 0.7 * fadeA)],
        [s * 0.0018, rgbaCss(goldHi, 0.9 * fadeA)],
      ];
      for (const [lw, style] of passes) {
        c2d.beginPath();
        c2d.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < upto; k++) c2d.lineTo(pts[k][0], pts[k][1]);
        c2d.lineWidth = lw;
        c2d.strokeStyle = style;
        c2d.stroke();
      }

      // Traveling highlight pulse along the revealed vein.
      const pos = (t * 0.08 + i * 0.37) % 1;
      const k = Math.min(upto - 1, Math.round(pos * (upto - 1)));
      const [px, py] = pts[k];
      c2d.beginPath();
      c2d.arc(px, py, s * 0.006, 0, Math.PI * 2);
      c2d.fillStyle = rgbaCss(goldHi, 0.8 * fadeA * params.intensity);
      c2d.fill();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
      speck = null;
    },
    frame,
    staticFrame(params) {
      frame(CYCLE * 0.6, params); // mid-hold: fully grown, shimmering
    },
    dispose() {
      cache = null;
      speck = null;
    },
  };
}
