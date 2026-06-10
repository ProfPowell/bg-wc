import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// helix — a DNA-style double helix. Two sine strands a half-turn out of phase
// run down the screen with base-pair rungs between them; dot size and alpha are
// depth-sorted from the strand's z-phase for a pseudo-3D read, and the whole
// figure scrolls slowly along its axis with `t`. `density` = rung frequency,
// `intensity` = depth contrast. Deterministic from `t`.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const cA = c.primary || [0.3, 0.6, 1];
    const cB = c.accent || [0.95, 0.4, 0.6];
    const rung = c.fg || [0.7, 0.7, 0.75];
    const intensity = params.intensity ?? 0.5;
    const density = params.density ?? 0.5;

    const cx = w / 2;
    const radius = Math.min(w, h) * 0.22;
    const turns = 2 + density * 4; // vertical turns across the height
    const freq = (Math.PI * 2 * turns) / h;
    const scroll = t * 0.6;
    const samples = Math.max(40, Math.round(h / 8));
    const dotBase = Math.max(2, Math.min(w, h) * 0.012);

    // Collect points for both strands, plus rungs, then draw back-to-front by z.
    const items = [];
    for (let i = 0; i <= samples; i++) {
      const y = (i / samples) * h;
      const ph = y * freq + scroll;
      const xA = cx + Math.sin(ph) * radius;
      const zA = Math.cos(ph); // [-1,1] depth
      const xB = cx + Math.sin(ph + Math.PI) * radius;
      const zB = Math.cos(ph + Math.PI);
      // Rung every few samples.
      if (i % 3 === 0) {
        items.push({ type: 'rung', x1: xA, x2: xB, y, z: Math.min(zA, zB) });
      }
      items.push({ type: 'dot', x: xA, y, z: zA, col: cA });
      items.push({ type: 'dot', x: xB, y, z: zB, col: cB });
    }
    items.sort((p, q) => p.z - q.z); // far (z=-1) first

    for (const it of items) {
      const depth = 0.5 + 0.5 * it.z; // 0 far, 1 near
      const alpha = (0.25 + 0.75 * depth) * (0.6 + 0.4 * intensity);
      if (it.type === 'rung') {
        c2d.strokeStyle = rgb(rung, alpha * 0.5);
        c2d.lineWidth = Math.max(1, dotBase * 0.4 * depth);
        c2d.beginPath();
        c2d.moveTo(it.x1, it.y);
        c2d.lineTo(it.x2, it.y);
        c2d.stroke();
      } else {
        const r = dotBase * (0.5 + 0.8 * depth);
        c2d.fillStyle = rgb(mix(it.col, [1, 1, 1], depth * 0.15 * intensity), alpha);
        c2d.beginPath();
        c2d.arc(it.x, it.y, r, 0, Math.PI * 2);
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
    dispose() {},
  };
}
