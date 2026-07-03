// screenprint — off-register pulls. A seeded grid of bold motifs (star, ring,
// blob), each stamped three times in primary/accent/info with per-stamp
// registration error; layers darken where they overlap (multiply), and the
// last layer prints through a coarse halftone screen. The press drifts a
// hair with t (pure function of t). density = motif grid, intensity =
// misregistration.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let motifs = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 13);
    const s = Math.min(w, h);
    const cell = Math.max(90, s * (0.5 - params.density * 0.24));
    motifs = [];
    for (let iy = 0; iy * cell < h + cell; iy++) {
      for (let ix = 0; ix * cell < w + cell; ix++) {
        motifs.push({
          x: ix * cell + cell / 2,
          y: iy * cell + cell / 2,
          r: cell * (0.26 + rand() * 0.1),
          kind: (rand() * 3) | 0,
          rot: rand() * Math.PI,
          mis: [
            [(rand() - 0.5) * 10, (rand() - 0.5) * 10],
            [(rand() - 0.5) * 10, (rand() - 0.5) * 10],
            [(rand() - 0.5) * 10, (rand() - 0.5) * 10],
          ],
          phase: rand() * Math.PI * 2,
        });
      }
    }
    lastKey = `${params.seed}|${params.density}|${w}x${h}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${w}x${h}`;
    if (!motifs.length || key !== lastKey) rebuild(params);
  }

  function motifPath(kind, r, rot) {
    c2d.beginPath();
    if (kind === 0) {
      // five-point star
      for (let k = 0; k < 10; k++) {
        const rad = k % 2 ? r * 0.45 : r;
        const a = rot + (k / 10) * Math.PI * 2 - Math.PI / 2;
        if (k === 0) c2d.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else c2d.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      c2d.closePath();
    } else if (kind === 1) {
      // fat ring
      c2d.arc(0, 0, r, 0, Math.PI * 2);
      c2d.arc(0, 0, r * 0.55, 0, Math.PI * 2, true);
    } else {
      // soft blob: four-lobe bezier
      c2d.moveTo(0, -r);
      c2d.bezierCurveTo(r * 1.1, -r * 0.9, r * 0.9, r * 1.1, 0, r * 0.9);
      c2d.bezierCurveTo(-r * 1.2, r * 0.8, -r * 0.8, -r, 0, -r);
      c2d.closePath();
    }
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const inks = [c.primary, c.accent, c.info];
    const mis = 0.4 + params.intensity;

    for (const m of motifs) {
      for (let layer = 0; layer < 3; layer++) {
        const drift = Math.sin(t * 0.25 + m.phase + layer) * 1.2 * px;
        c2d.save();
        c2d.translate(m.x + m.mis[layer][0] * mis * px + drift, m.y + m.mis[layer][1] * mis * px);
        c2d.globalCompositeOperation = 'multiply';
        c2d.fillStyle = rgbaCss(inks[layer], 0.8);
        if (layer === 2) {
          // Halftone pull: clip to the motif and print a dot screen.
          motifPath(m.kind, m.r, m.rot);
          c2d.clip();
          const dot = 5 * px;
          for (let yy = -m.r; yy <= m.r; yy += dot * 2) {
            for (let xx = -m.r; xx <= m.r; xx += dot * 2) {
              c2d.beginPath();
              c2d.arc(xx + ((yy / (dot * 2)) % 2 ? dot : 0), yy, dot * 0.6, 0, Math.PI * 2);
              c2d.fill();
            }
          }
        } else {
          motifPath(m.kind, m.r, m.rot);
          c2d.fill();
        }
        c2d.restore();
      }
    }
    c2d.globalCompositeOperation = 'source-over';
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      motifs = [];
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      motifs = [];
    },
  };
}
