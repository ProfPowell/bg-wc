// peacock — the deco plume fan. Gold-ribbed feather curves rising from the
// lower centre, each ending in a concentric eye (accent/info/primary); the
// whole fan sways as one. The midnight ground derives from primary toward
// the theme bg, so it deepens rather than fixes. density = plume count,
// intensity = gold brightness.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let plumes = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 149);
    const n = 7 + Math.round(params.density * 4); // 7..11 plumes
    plumes = [];
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1); // 0..1 across the fan
      plumes.push({
        angle: -Math.PI / 2 + (u - 0.5) * Math.PI * 0.85,
        len: 0.5 + rand() * 0.2 + (0.5 - Math.abs(u - 0.5)) * 0.25, // centre plumes taller
        bow: (u - 0.5) * 0.35 + (rand() - 0.5) * 0.06,
        eye: 0.032 + rand() * 0.012,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!plumes.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);
    const ox = w * 0.5;
    const oy = h * 1.02;

    c2d.fillStyle = rgbCss(mix(c.primary, c.bg, 0.62));
    c2d.fillRect(0, 0, w, h);

    const gold = mix(c.accent, [1, 1, 1], 0.2 + params.intensity * 0.25);
    const sway = 0.05 * Math.sin(t * 0.22) + 0.02 * Math.sin(t * 0.13 + 1);
    c2d.lineCap = 'round';

    for (const p of plumes) {
      const a = p.angle + sway;
      const L = p.len * s;
      const tipX = ox + Math.cos(a) * L + p.bow * L * -Math.sin(a);
      const tipY = oy + Math.sin(a) * L + p.bow * L * Math.cos(a);
      const cxp = ox + Math.cos(a) * L * 0.55 + p.bow * L * 0.8 * -Math.sin(a);
      const cyp = oy + Math.sin(a) * L * 0.55 + p.bow * L * 0.8 * Math.cos(a);
      // Rib.
      c2d.strokeStyle = rgbaCss(gold, 0.9);
      c2d.lineWidth = 2 * px;
      c2d.beginPath();
      c2d.moveTo(ox, oy);
      c2d.quadraticCurveTo(cxp, cyp, tipX, tipY);
      c2d.stroke();
      // Barbs: short gold ticks along the rib.
      c2d.lineWidth = 1 * px;
      for (let k = 2; k <= 8; k++) {
        const u = k / 10;
        const bx = (1 - u) * (1 - u) * ox + 2 * (1 - u) * u * cxp + u * u * tipX;
        const by = (1 - u) * (1 - u) * oy + 2 * (1 - u) * u * cyp + u * u * tipY;
        const na = a + Math.PI / 2;
        const bl = s * 0.018 * (1 - u * 0.4);
        c2d.strokeStyle = rgbaCss(gold, 0.45);
        c2d.beginPath();
        c2d.moveTo(bx - Math.cos(na) * bl, by - Math.sin(na) * bl);
        c2d.lineTo(bx + Math.cos(na) * bl, by + Math.sin(na) * bl);
        c2d.stroke();
      }
      // The eye: concentric ovals, deco-flat.
      const er = p.eye * s;
      const eyeA = Math.atan2(tipY - cyp, tipX - cxp);
      c2d.save();
      c2d.translate(tipX, tipY);
      c2d.rotate(eyeA + Math.PI / 2);
      for (const [rr, col] of [
        [1.8, gold],
        [1.35, c.info],
        [0.9, c.accent],
        [0.45, c.primary],
      ]) {
        c2d.fillStyle = rgbCss(rr === 1.8 ? gold : mix(col, c.bg, 0.1));
        c2d.beginPath();
        c2d.ellipse(0, 0, er * rr * 0.75, er * rr, 0, 0, Math.PI * 2);
        c2d.fill();
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
      plumes = [];
    },
  };
}
