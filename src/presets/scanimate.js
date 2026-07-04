// scanimate — the analog motion-graphics title sweep. Glowing ribbon curves
// (stacked sine harmonics) draw themselves across the frame and fade behind
// their own sweep head, staggered per ribbon; hot core over colored falloff,
// exactly the 70s TV-ident look. The sweep position is (t*rate + phase) mod
// a cycle — pure in t, and mid-sweep at t=0 (frozen-t rule). density =
// ribbon count, intensity = glow width.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const CYCLE = 1.6; // sweep cycle length in normalized x (>1 leaves a gap)
const SEG = 24; // polyline segments per ribbon

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let ribbons = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 47);
    const n = 3 + Math.round(params.density * 2); // 3..5 ribbons
    ribbons = [];
    for (let i = 0; i < n; i++) {
      ribbons.push({
        yc: 0.2 + (i + 0.5) * (0.6 / n),
        f1: 2 + rand() * 3,
        f2: 5 + rand() * 5,
        a1: 0.04 + rand() * 0.05,
        a2: 0.01 + rand() * 0.02,
        rate: 0.08 + rand() * 0.06,
        // Start phases stagger the ribbons AND keep every ribbon mid-sweep
        // somewhere on screen at t=0.
        phase: 0.3 + rand() * 0.6,
        wob: rand() * Math.PI * 2,
        ci: (rand() * 3) | 0,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!ribbons.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.info];
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';

    for (const r of ribbons) {
      const head = (r.phase + t * r.rate) % CYCLE; // sweep head, in x units
      const col = pal[r.ci % pal.length];
      const yOf = (x) =>
        (r.yc +
          r.a1 * Math.sin(x * r.f1 * Math.PI + r.wob + t * 0.2) +
          r.a2 * Math.sin(x * r.f2 * Math.PI - t * 0.3)) *
        h;
      // Draw only behind the head, fading toward the tail.
      for (const pass of [
        { lw: (6 + params.intensity * 8) * px, a: 0.18, tint: col },
        { lw: 2.2 * px, a: 0.95, tint: mix(col, [1, 1, 1], 0.45) },
      ]) {
        c2d.strokeStyle = rgbaCss(pass.tint, pass.a);
        c2d.lineWidth = pass.lw;
        c2d.beginPath();
        let started = false;
        for (let k = 0; k <= SEG; k++) {
          const x = (k / SEG) * Math.min(head, 1);
          const tail = head - x; // distance behind the sweep head
          if (tail > 0.85) continue; // faded out
          const X = x * w;
          const Y = yOf(x);
          if (!started) {
            c2d.moveTo(X, Y);
            started = true;
          } else c2d.lineTo(X, Y);
        }
        c2d.stroke();
      }
      // The sweep head glint.
      if (head <= 1) {
        c2d.fillStyle = rgbaCss(mix(col, [1, 1, 1], 0.6), 0.95);
        c2d.beginPath();
        c2d.arc(head * w, yOf(head), 3.2 * px, 0, Math.PI * 2);
        c2d.fill();
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
      ribbons = [];
    },
  };
}
