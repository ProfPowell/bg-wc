// network — connected-dots mesh. Lines drawn between near neighbors.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

// Node count cap per quality. O(n²) link search, so keep modest.
const CAPS = { low: 30, med: 70, high: 120 };

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let nodes = [];
  let lastKey = '';

  function rebuild(params) {
    const cap = CAPS[params.quality] || CAPS.med;
    const n = Math.floor(20 + cap * params.density);
    const rand = mulberry32(params.seed || 3);
    nodes = new Array(n);
    for (let i = 0; i < n; i++) {
      nodes[i] = {
        x: rand(),
        y: rand(),
        vx: (rand() - 0.5) * 0.04,
        vy: (rand() - 0.5) * 0.04,
      };
    }
    lastKey = `${params.seed}|${params.density}|${params.quality}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${params.quality}`;
    if (nodes.length === 0 || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    // Advance positions (normalized units, wrap).
    const speedScale = 0.03 * params.speed;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx * speedScale;
      n.y += n.vy * speedScale;
      if (n.x < 0) n.x += 1;
      else if (n.x > 1) n.x -= 1;
      if (n.y < 0) n.y += 1;
      else if (n.y > 1) n.y -= 1;
    }

    // Link threshold: bigger intensity → longer links.
    const linkDist = 0.12 + params.intensity * 0.18;
    const primary = `${(c.primary[0] * 255) | 0},${(c.primary[1] * 255) | 0},${(c.primary[2] * 255) | 0}`;
    const fg = `${(c.fg[0] * 255) | 0},${(c.fg[1] * 255) | 0},${(c.fg[2] * 255) | 0}`;

    // Lines
    c2d.lineWidth = 1 * px;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x,
          dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkDist * linkDist) {
          const d = Math.sqrt(d2);
          const alpha = (1 - d / linkDist) * 0.6;
          c2d.strokeStyle = `rgba(${primary},${alpha.toFixed(3)})`;
          c2d.beginPath();
          c2d.moveTo(a.x * w, a.y * h);
          c2d.lineTo(b.x * w, b.y * h);
          c2d.stroke();
        }
      }
    }

    // Dots on top
    c2d.fillStyle = `rgba(${fg},0.9)`;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      c2d.beginPath();
      c2d.arc(n.x * w, n.y * h, 2 * px, 0, Math.PI * 2);
      c2d.fill();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      frame(t, params);
    },
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      nodes = [];
    },
  };
}
