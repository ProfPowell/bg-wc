// spirograph — animated hypotrochoid curves. Three nested curves in the
// theme tints, their inner-gear ratio and pen offset drifting over time so
// the rosette continuously re-forms. Vector group.

import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ c2d, getColors }) {
  let w = 1, h = 1;

  function rgb(c, a) {
    return `rgba(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0},${a})`;
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const cx = w / 2, cy = h / 2;
    const scale = Math.min(w, h) * 0.42;
    const R = 1.0;
    const r = 0.28 + 0.16 * Math.sin(t * 0.08 * params.speed);
    const d = 0.45 + 0.30 * Math.cos(t * 0.06 * params.speed);
    const k = (R - r) / r;
    const loops = Math.round(3 + params.density * 8);     // more loops = denser rosette
    const steps = 360 * loops;
    const spin = t * 0.15 * params.speed;

    const palette = [c.primary, c.accent, c.info];
    c2d.lineWidth = 1.4;
    c2d.lineJoin = 'round';

    for (let pass = 0; pass < 3; pass++) {
      const rr = r + pass * 0.05;
      const kk = (R - rr) / rr;
      const col = palette[pass];
      c2d.strokeStyle = rgb(col, 0.9);
      c2d.shadowColor = rgb(col, 1);
      c2d.shadowBlur = 6 * params.intensity;
      c2d.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = (i / 360) * Math.PI * 2;
        const x = (R - rr) * Math.cos(a + spin) + d * Math.cos(kk * a + spin);
        const y = (R - rr) * Math.sin(a + spin) - d * Math.sin(kk * a + spin);
        const px = cx + x * scale * 0.62;
        const py = cy + y * scale * 0.62;
        if (i) c2d.lineTo(px, py); else c2d.moveTo(px, py);
      }
      c2d.stroke();
    }
    c2d.shadowBlur = 0;
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { frame(t, params); },
    staticFrame(params) { frame(3.0, params); },
    dispose() {},
  };
}
