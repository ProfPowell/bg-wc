import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { buildDotPalette, makeFieldCanvas, concentricRings, whorl } from './_dots.js';

// Dense dot-art composite: a stipple field base (offscreen, cached) packed with
// concentric dot rosettes and a few whorls, edge to edge like the source
// paintings. Designed as a rich backdrop with page content layered on top.

const ROT_W = 0.1;

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let layout = null; // { key, rings, whorls }

  const field = makeFieldCanvas({
    count: (fw, fh, params) => Math.round(fw * fh * 0.0012 * (0.5 + params.density * 1.2)),
    dotR: (fw, fh) => Math.max(1, Math.min(fw, fh) * 0.003),
  });

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${params.intensity}|${w}x${h}`;
    if (layout && layout.key === key) return layout;
    const rng = mulberry32((params.seed | 0 || 1) ^ 0x9e37);
    const s = Math.min(w, h);
    const rings = [];
    const ringCount = Math.round(6 + params.density * 14 + (params.intensity ?? 0.5) * 6);
    for (let i = 0; i < ringCount; i++) {
      rings.push({
        cx: rng() * w,
        cy: rng() * h,
        rings: 2 + ((rng() * 3) | 0),
        ringGap: s * (0.012 + rng() * 0.02),
        ci: (rng() * 6) | 0,
        dir: rng() < 0.5 ? 1 : -1,
        phase: rng() * Math.PI * 2,
      });
    }
    const whorls = [];
    const whorlCount = Math.round(2 + params.density * 4);
    for (let i = 0; i < whorlCount; i++) {
      whorls.push({
        cx: rng() * w,
        cy: rng() * h,
        turns: 2 + rng() * 2,
        b: s * (0.006 + rng() * 0.01),
        ci: (rng() * 6) | 0,
        dir: rng() < 0.5 ? 1 : -1,
        phase: rng() * Math.PI * 2,
      });
    }
    layout = { key, rings, whorls };
    return layout;
  }

  function frame(t, params) {
    const c = getColors();
    const { pal, highlight } = buildDotPalette(c, params.intensity);
    const palKey = pal.join(',');
    clearAndFill(c2d, w, h, c.bg);
    c2d.drawImage(field.get(w, h, params, palKey, pal), 0, 0);
    const { rings, whorls } = build(params);
    const dotR = Math.max(1, Math.min(w, h) * 0.004);
    for (const r of rings) {
      concentricRings(c2d, r.cx, r.cy, {
        rings: r.rings,
        ringGap: r.ringGap,
        dotR,
        pal,
        highlight,
        ci: r.ci,
        phase: r.phase + t * ROT_W * r.dir,
      });
    }
    for (const sw of whorls) {
      whorl(c2d, sw.cx, sw.cy, {
        turns: sw.turns,
        b: sw.b,
        dotR: dotR * 0.85,
        baseCss: pal[sw.ci % pal.length],
        highlight,
        // rotation direction baked into phase; dir is chirality only
        phase: sw.dir * (sw.phase + t * ROT_W),
        dir: sw.dir,
      });
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      field.reset();
      layout = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      field.reset();
      layout = null;
    },
  };
}
