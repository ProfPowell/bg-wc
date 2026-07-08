// gilded — a Klimt-adjacent gold-leaf field. A seeded patchwork of motifs —
// arc spirals, concentric squares, fleck clusters — in layered gold tones
// (accent and warning pulled toward white and toward the ground), each
// patch shimmering on its own slow clock. density = patch fineness,
// intensity = shimmer depth.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let patches = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 151);
    const s = Math.min(w, h);
    const cell = Math.max(44, s * (0.24 - params.density * 0.1));
    patches = [];
    for (let y = 0; y < h + cell; y += cell) {
      for (let x = 0; x < w + cell; x += cell) {
        patches.push({
          x: x + (rand() - 0.5) * cell * 0.2,
          y: y + (rand() - 0.5) * cell * 0.2,
          size: cell * (0.7 + rand() * 0.5),
          kind: (rand() * 3) | 0, // spiral / squares / flecks
          tone: (rand() * 3) | 0,
          w2: 0.15 + rand() * 0.35,
          phase: rand() * Math.PI * 2,
          turns: 2.2 + rand() * 1.6,
        });
      }
    }
    lastKey = `${params.seed}|${params.density}|${w}x${h}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${w}x${h}`;
    if (!patches.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();

    const ground = mix(c.primary, c.bg, 0.7);
    c2d.fillStyle = rgbCss(ground);
    c2d.fillRect(0, 0, w, h);

    const golds = [
      mix(c.accent, [1, 1, 1], 0.35),
      mix(c.accent, ground, 0.25),
      mix(c.warning, [1, 1, 1], 0.25),
    ];
    const depth = 0.25 + params.intensity * 0.3;

    for (const p of patches) {
      const gold = golds[p.tone];
      const a = 1 - depth + depth * (0.5 + 0.5 * Math.sin(t * p.w2 + p.phase));
      const r = p.size / 2;
      if (p.kind === 0) {
        // Arc spiral.
        c2d.strokeStyle = rgbaCss(gold, a);
        c2d.lineWidth = 1.6 * px;
        c2d.beginPath();
        const steps = 40;
        for (let k = 0; k <= steps; k++) {
          const u = k / steps;
          const ang = u * p.turns * Math.PI * 2;
          const rr = r * 0.85 * u;
          const X = p.x + Math.cos(ang) * rr;
          const Y = p.y + Math.sin(ang) * rr;
          if (k === 0) c2d.moveTo(X, Y);
          else c2d.lineTo(X, Y);
        }
        c2d.stroke();
      } else if (p.kind === 1) {
        // Concentric squares.
        c2d.strokeStyle = rgbaCss(gold, a);
        c2d.lineWidth = 1.4 * px;
        for (let k = 0; k < 4; k++) {
          const rr = r * 0.85 * (1 - k * 0.22);
          c2d.strokeRect(p.x - rr, p.y - rr, rr * 2, rr * 2);
        }
      } else {
        // Fleck cluster.
        c2d.fillStyle = rgbaCss(gold, a);
        for (let k = 0; k < 9; k++) {
          const ang = (k / 9) * Math.PI * 2 + p.phase;
          const rr = r * (0.15 + (0.55 * ((k * 37) % 9)) / 9);
          c2d.beginPath();
          c2d.arc(
            p.x + Math.cos(ang) * rr,
            p.y + Math.sin(ang) * rr,
            (1.5 + (k % 3)) * px,
            0,
            Math.PI * 2
          );
          c2d.fill();
        }
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      patches = [];
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      patches = [];
    },
  };
}
