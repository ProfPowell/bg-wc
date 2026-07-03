// cyanotype — botanical sun prints. Seeded fern/sprig/seed-head silhouettes
// exposed white-on-Prussian-blue, each with a soft exposure halo, over a
// paper-edge vignette. DESIGN NOTE: the ground is deliberately the theme
// primary pulled hard toward Prussian blue — a cyanotype IS blue; the theme
// still tints it (documented deviation, like fireflies' dusk treatment).
// The exposure halo breathes with t (pure function). density = specimen
// count, intensity = exposure strength. Silhouettes are fg pulled toward
// white — unexposed paper must read pale regardless of theme.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PRUSSIAN = [0.05, 0.15, 0.35];

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let plants = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 11);
    const n = 2 + Math.round(params.density * 5); // 2..7 specimens
    plants = [];
    for (let i = 0; i < n; i++) {
      plants.push({
        x: 0.12 + rand() * 0.76,
        y: 0.2 + rand() * 0.7,
        len: 0.18 + rand() * 0.22,
        lean: -0.4 + rand() * 0.8,
        kind: (rand() * 3) | 0, // fern / sprig / seed-head
        leaflets: 7 + ((rand() * 6) | 0),
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!plants.length || key !== lastKey) rebuild(params);
  }

  function drawPlant(p, s, whiteCss) {
    const L = p.len * s;
    const a = -Math.PI / 2 + p.lean;
    const tipX = Math.cos(a) * L;
    const tipY = Math.sin(a) * L;
    // Stem.
    c2d.strokeStyle = whiteCss;
    c2d.beginPath();
    c2d.moveTo(0, 0);
    c2d.quadraticCurveTo(tipX * 0.4, tipY * 0.65, tipX, tipY);
    c2d.stroke();
    if (p.kind === 2) {
      // Seed-head: a burst of rays and dots at the tip.
      for (let k = 0; k < 12; k++) {
        const ra = (k / 12) * Math.PI * 2;
        c2d.beginPath();
        c2d.moveTo(tipX, tipY);
        c2d.lineTo(tipX + Math.cos(ra) * L * 0.22, tipY + Math.sin(ra) * L * 0.22);
        c2d.stroke();
        c2d.beginPath();
        c2d.arc(
          tipX + Math.cos(ra) * L * 0.26,
          tipY + Math.sin(ra) * L * 0.26,
          1.6,
          0,
          Math.PI * 2
        );
        c2d.fillStyle = whiteCss;
        c2d.fill();
      }
      return;
    }
    // Fern / sprig leaflets along the stem, mirrored pairs, shrinking to the tip.
    for (let k = 1; k <= p.leaflets; k++) {
      const u = k / (p.leaflets + 1);
      const bx = tipX * u;
      const by = tipY * u * (1 - 0.15 * u);
      const ll = L * (p.kind === 0 ? 0.22 : 0.13) * (1 - u * 0.75);
      for (const side of [-1, 1]) {
        const la = a + side * (p.kind === 0 ? 1.15 : 0.8);
        c2d.beginPath();
        c2d.moveTo(bx, by);
        c2d.quadraticCurveTo(
          bx + Math.cos(la) * ll * 0.6,
          by + Math.sin(la) * ll * 0.6,
          bx + Math.cos(la + side * 0.25) * ll,
          by + Math.sin(la + side * 0.25) * ll
        );
        c2d.stroke();
      }
    }
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const ground = mix(c.primary, PRUSSIAN, 0.72);
    const print = mix(c.fg, [1, 1, 1], 0.85); // unexposed paper — reads white with a whisper of theme
    clearAndFill(c2d, w, h, [...ground, 1]);
    const s = Math.min(w, h);
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.3);
    c2d.lineCap = 'round';

    for (const p of plants) {
      c2d.save();
      c2d.translate(p.x * w, p.y * h);
      // Exposure halo: three widening low-alpha passes under the crisp pass.
      for (const [lw, alpha] of [
        [9 * px, 0.06 * params.intensity * breathe],
        [5 * px, 0.12 * params.intensity * breathe],
        [1.6 * px, 0.9],
      ]) {
        c2d.lineWidth = lw;
        drawPlant(p, s, rgbaCss(print, alpha));
      }
      c2d.restore();
    }

    // Paper-edge vignette: darkened ground at every edge.
    const edge = rgbaCss(mix(ground, [0, 0, 0], 0.5), 0.35);
    for (const [x0, y0, x1, y1] of [
      [0, 0, 0, h],
      [w, 0, w, h],
      [0, 0, w, 0],
      [0, h, w, h],
    ]) {
      const g = c2d.createLinearGradient(
        x0,
        y0,
        x0 === x1 ? x0 + (x0 === 0 ? s * 0.08 : -s * 0.08) : x0,
        y0 === y1 ? y0 + (y0 === 0 ? s * 0.08 : -s * 0.08) : y0
      );
      g.addColorStop(0, edge);
      g.addColorStop(1, rgbaCss(ground, 0));
      c2d.fillStyle = g;
      c2d.fillRect(0, 0, w, h);
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
      plants = [];
    },
  };
}
