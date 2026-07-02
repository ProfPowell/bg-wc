import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import {
  buildDotPalette,
  concentricRings,
  phyllotaxis,
  doubleSpiral,
  whorl,
  dotCircle,
} from './_dots.js';

// Aboriginal / pointillist dotwork: discrete dotted structures scattered on a
// theme-bg field, each gently rotating on its own slow cycle. `mode` picks the
// structure; layout is seed-cached and only dot angles recompute per frame.

const ROT_W = 0.15; // base rotation frequency
const MODES = ['rings', 'spiral', 'double', 'whorl', 'waterholes'];
const DETAIL = { low: 0.55, med: 1, high: 1.6 }; // dots-per-structure multiplier

function readMode(host) {
  const m = (host.getAttribute('mode') || 'rings').toLowerCase();
  return MODES.includes(m) ? m : 'rings';
}

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params, mode) {
    const key = `${mode}|${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const s = Math.min(w, h);
    const count = Math.max(3, Math.round(w * h * 0.000018 * (0.4 + params.density * 1.4)));
    const motifs = [];
    for (let i = 0; i < count; i++) {
      motifs.push({
        cx: rng() * w,
        cy: rng() * h,
        scale: (0.5 + rng()) * s * (mode === 'waterholes' ? 0.05 : 0.07),
        turns: 2 + rng() * 2,
        dir: rng() < 0.5 ? 1 : -1,
        ci: (rng() * 6) | 0,
        phase: rng() * Math.PI * 2,
        spin: 0.4 + rng() * 0.8,
      });
    }
    const paths = [];
    if (mode === 'waterholes') {
      for (let i = 0; i < motifs.length - 1; i++) {
        const a = motifs[i];
        const b = motifs[i + 1];
        paths.push({
          ax: a.cx,
          ay: a.cy,
          bx: b.cx,
          by: b.cy,
          mx: (a.cx + b.cx) / 2 + (rng() - 0.5) * s * 0.3,
          my: (a.cy + b.cy) / 2 + (rng() - 0.5) * s * 0.3,
        });
      }
    }
    cache = { key, motifs, paths };
    return cache;
  }

  function frame(t, params) {
    const mode = readMode(host);
    const { motifs, paths } = build(params, mode);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const { pal, highlight } = buildDotPalette(c, params.intensity);
    const detail = DETAIL[params.quality] || DETAIL.med;
    const dotR = Math.max(1, Math.min(w, h) * 0.0045);
    const rings = 2 + Math.round((params.intensity ?? 0.5) * 3); // 2..5

    // Connecting meander paths first (under the rosettes).
    for (const p of paths) {
      const steps = 28;
      for (let st = 0; st <= steps; st++) {
        const u = st / steps;
        const x = (1 - u) * (1 - u) * p.ax + 2 * (1 - u) * u * p.mx + u * u * p.bx;
        const y = (1 - u) * (1 - u) * p.ay + 2 * (1 - u) * u * p.my + u * u * p.by;
        dotCircle(c2d, x, y, dotR * 0.8, highlight);
      }
    }

    for (const m of motifs) {
      // Rotation direction lives in the phase (see the _dots.js motif
      // contract); helpers only take `dir` where it means chirality.
      const spin = t * ROT_W * m.spin;
      const common = { dotR, pal, highlight, ci: m.ci };
      if (mode === 'spiral') {
        phyllotaxis(c2d, m.cx, m.cy, {
          ...common,
          phase: m.phase + spin * m.dir,
          dir: m.dir,
          n: Math.round(140 * detail),
          scale: m.scale * 0.5,
        });
      } else if (mode === 'double') {
        doubleSpiral(c2d, m.cx, m.cy, {
          ...common,
          phase: m.dir * (m.phase + spin),
          arms: 2,
          n: Math.round(90 * detail),
          b: m.scale * 0.35,
        });
      } else if (mode === 'whorl') {
        whorl(c2d, m.cx, m.cy, {
          ...common,
          phase: m.dir * (m.phase + spin),
          dir: m.dir,
          baseCss: pal[m.ci % pal.length],
          turns: m.turns,
          b: m.scale * 0.12,
        });
      } else {
        // rings (default) and waterholes both draw rosettes
        concentricRings(c2d, m.cx, m.cy, {
          ...common,
          phase: m.phase + spin * m.dir,
          rings,
          ringGap: m.scale * 0.18,
        });
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
      frame(0, params);
    },
    dispose() {
      cache = null;
    },
  };
}
