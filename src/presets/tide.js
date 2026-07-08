// tide — a breathing shoreline seen flat-on. The sea holds the upper frame;
// two or three translucent wave sheets advance and retreat on offset sin(t)
// cycles, each trailing a bright foam edge and a darker wet-sand stain.
// DESIGN NOTE (documented deviation): sand mixes the theme warning toward a
// sand anchor; the sea derives from info. density = sheet count,
// intensity = sheet opacity.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const SAND = [0.93, 0.85, 0.68];

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let sheets = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 131);
    const n = 2 + Math.round(params.density); // 2..3 sheets
    sheets = [];
    for (let i = 0; i < n; i++) {
      sheets.push({
        base: 0.4 + i * 0.14, // resting edge (fraction of h)
        amp: 0.06 + rand() * 0.06,
        wv: 0.16 + rand() * 0.1,
        phase: rand() * Math.PI * 2,
        f: 2 + rand() * 3, // edge waviness across x
        fphase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!sheets.length || key !== lastKey) rebuild(params);
  }

  function edgeY(sheet, x, t) {
    return (
      sheet.base +
      sheet.amp * Math.sin(t * sheet.wv + sheet.phase) +
      0.02 * Math.sin((x / w) * sheet.f * Math.PI * 2 + sheet.fphase + t * 0.1)
    );
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();

    // Sand ground with a wet band near the sea.
    const sand = mix(c.warning, SAND, 0.55);
    c2d.fillStyle = rgbCss(sand);
    c2d.fillRect(0, 0, w, h);
    const wet = mix(sand, mix(c.info, c.bg, 0.3), 0.35);
    const wetG = c2d.createLinearGradient(0, h * 0.35, 0, h * 0.75);
    wetG.addColorStop(0, rgbCss(wet));
    wetG.addColorStop(1, rgbaCss(wet, 0));
    c2d.fillStyle = wetG;
    c2d.fillRect(0, 0, w, h);

    // The sea behind everything.
    const sea = mix(c.info, c.bg, 0.15);
    c2d.fillStyle = rgbCss(sea);
    c2d.fillRect(0, 0, w, h * 0.32);

    // Sheets from back to front.
    const op = 0.25 + params.intensity * 0.3;
    const foam = mix([1, 1, 1], sea, 0.15);
    for (let i = sheets.length - 1; i >= 0; i--) {
      const sh = sheets[i];
      const steps = 24;
      c2d.beginPath();
      c2d.moveTo(0, 0);
      for (let k = 0; k <= steps; k++) {
        const x = (k / steps) * w;
        c2d.lineTo(x, edgeY(sh, x, t) * h);
      }
      c2d.lineTo(w, 0);
      c2d.closePath();
      c2d.fillStyle = rgbaCss(mix(sea, [1, 1, 1], i * 0.12), op);
      c2d.fill();
      // Foam edge.
      c2d.strokeStyle = rgbaCss(foam, 0.75);
      c2d.lineWidth = (1.6 + i * 0.6) * px;
      c2d.beginPath();
      for (let k = 0; k <= steps; k++) {
        const x = (k / steps) * w;
        const y = edgeY(sh, x, t) * h;
        if (k === 0) c2d.moveTo(x, y);
        else c2d.lineTo(x, y);
      }
      c2d.stroke();
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
      sheets = [];
    },
  };
}
