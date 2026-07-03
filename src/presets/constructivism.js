// constructivism — Lissitzky/Malevich field. One dominant diagonal wedge and a
// squadron of floating planes (bars, rects, circles) composed along a rotated
// axis; the minor planes drift on slow orbits, all derived from t. primary is
// the revolutionary red lead, fg the ink bars, accent/info the supporting
// planes, over a warm paper bg.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

const AXIS = -0.42; // the composition's rotation, radians

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let planes = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 4);
    const n = 6 + Math.round(params.density * 8); // 6..14 planes
    planes = [];
    for (let i = 0; i < n; i++) {
      planes.push({
        u: rand() * 1.4 - 0.2, // position along the axis
        v: (rand() - 0.5) * 0.9, // offset perpendicular to it
        kind: rand() < 0.25 ? 'circle' : rand() < 0.6 ? 'bar' : 'rect',
        size: 0.04 + rand() * 0.13,
        aspect: 0.15 + rand() * 0.5,
        ci: (rand() * 3) | 0,
        outline: rand() < 0.3,
        wobble: 0.008 + rand() * 0.02,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!planes.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const cos = Math.cos(AXIS);
    const sin = Math.sin(AXIS);
    const toXY = (u, v) => [w * 0.1 + (u * cos - v * sin) * w, h * 0.75 + (u * sin + v * cos) * h];

    // The dominant wedge: a long triangle beating along the axis.
    const [wx, wy] = toXY(-0.05, 0.02);
    const [tx, ty] = toXY(0.95 + 0.01 * Math.sin(t * 0.3), -0.03);
    const half = s * (0.05 + params.intensity * 0.06);
    c2d.fillStyle = rgbCss(c.primary);
    c2d.beginPath();
    c2d.moveTo(wx - Math.sin(AXIS) * half, wy + Math.cos(AXIS) * half);
    c2d.lineTo(wx + Math.sin(AXIS) * half, wy - Math.cos(AXIS) * half);
    c2d.lineTo(tx, ty);
    c2d.closePath();
    c2d.fill();

    // A large restrained circle outline crossing the wedge.
    const [ox, oy] = toXY(0.42, -0.18);
    c2d.strokeStyle = rgbaCss(c.fg, 0.85);
    c2d.lineWidth = 3 * px;
    c2d.beginPath();
    c2d.arc(ox, oy, s * 0.2, 0, Math.PI * 2);
    c2d.stroke();

    const pal = [c.fg, c.accent, c.info];
    for (const p of planes) {
      const dv = p.v + p.wobble * Math.sin(t * 0.35 + p.phase);
      const [x, y] = toXY(p.u, dv);
      const col = pal[p.ci % pal.length];
      c2d.save();
      c2d.translate(x, y);
      c2d.rotate(AXIS);
      if (p.kind === 'circle') {
        c2d.fillStyle = rgbCss(col);
        c2d.beginPath();
        c2d.arc(0, 0, p.size * s * 0.5, 0, Math.PI * 2);
        c2d.fill();
      } else if (p.kind === 'bar') {
        c2d.fillStyle = rgbCss(col);
        c2d.fillRect(
          (-p.size * s) / 2,
          (-p.size * s * p.aspect) / 8,
          p.size * s,
          (p.size * s * p.aspect) / 4
        );
      } else if (p.outline) {
        c2d.strokeStyle = rgbCss(col);
        c2d.lineWidth = 2 * px;
        c2d.strokeRect(
          (-p.size * s) / 2,
          (-p.size * s * p.aspect) / 2,
          p.size * s,
          p.size * s * p.aspect
        );
      } else {
        c2d.fillStyle = rgbCss(col);
        c2d.fillRect(
          (-p.size * s) / 2,
          (-p.size * s * p.aspect) / 2,
          p.size * s,
          p.size * s * p.aspect
        );
      }
      c2d.restore();
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
      planes = [];
    },
  };
}
