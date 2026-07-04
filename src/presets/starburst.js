// starburst — the funk/Motown ray burst. Concentric rings of radiating
// wedge spokes in alternating hot colors, each ring counter-rotating
// against its neighbor around a glowing core. Pure function of t.
// density = spoke count, intensity = ray reach.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, _pxScale }) {
  let w = 1,
    h = 1;
  let rings = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 33);
    rings = [];
    const nr = 3;
    for (let i = 0; i < nr; i++) {
      rings.push({
        spokes: 10 + Math.round(params.density * 14) + ((rand() * 4) | 0),
        r0: 0.1 + i * 0.28,
        speed: 0.02 + rand() * 0.03,
        phase: rand() * Math.PI * 2,
        dir: i % 2 ? -1 : 1,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!rings.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const cx = w * 0.5;
    const cy = h * 0.55;
    const R = Math.max(w, h) * (0.55 + params.intensity * 0.35);
    const pal = [c.primary, c.accent, c.warning];

    rings.forEach((ring, ri) => {
      const rot = ring.phase + t * ring.speed * ring.dir;
      const inner = R * ring.r0;
      const outer = ri === rings.length - 1 ? R : R * rings[ri + 1].r0;
      const halfArc = Math.PI / ring.spokes;
      for (let k = 0; k < ring.spokes; k++) {
        const a = rot + (k / ring.spokes) * Math.PI * 2;
        c2d.fillStyle = rgbCss(pal[(k + ri) % pal.length]);
        c2d.beginPath();
        c2d.moveTo(
          cx + Math.cos(a - halfArc * 0.55) * inner,
          cy + Math.sin(a - halfArc * 0.55) * inner
        );
        c2d.lineTo(
          cx + Math.cos(a - halfArc * 0.55) * outer,
          cy + Math.sin(a - halfArc * 0.55) * outer
        );
        c2d.lineTo(
          cx + Math.cos(a + halfArc * 0.55) * outer,
          cy + Math.sin(a + halfArc * 0.55) * outer
        );
        c2d.lineTo(
          cx + Math.cos(a + halfArc * 0.55) * inner,
          cy + Math.sin(a + halfArc * 0.55) * inner
        );
        c2d.closePath();
        c2d.fill();
      }
    });

    // The hot core.
    const core = c2d.createRadialGradient(cx, cy, 0, cx, cy, R * 0.16);
    core.addColorStop(0, rgbaCss(c.accent, 0.95));
    core.addColorStop(1, rgbaCss(c.accent, 0));
    c2d.fillStyle = core;
    c2d.fillRect(0, 0, w, h);
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
      rings = [];
    },
  };
}
