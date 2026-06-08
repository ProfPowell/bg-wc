import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;

  function ribbonCount(params) {
    return Math.max(3, Math.min(8, Math.round(3 + params.density * 5)));
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const n = ribbonCount(params);
    const amp = h * (0.05 + 0.2 * params.intensity);
    const bandHeight = h / (n + 1);
    const palette = [c.primary, c.accent, c.info];

    for (let i = 0; i < n; i++) {
      const phase = t * 0.4 + i * 0.7;
      const baseY = bandHeight * (i + 1);

      const topY = (x) => baseY + Math.sin(phase + x * 1.6) * amp - bandHeight * 0.35;
      const botY = (x) => baseY + Math.sin(phase + 0.4 + x * 1.6) * amp + bandHeight * 0.35;

      c2d.beginPath();
      const segs = 24;
      c2d.moveTo(0, topY(0));
      for (let s = 1; s <= segs; s++) {
        const x = (s / segs) * w;
        c2d.lineTo(x, topY(s / segs));
      }
      for (let s = segs; s >= 0; s--) {
        const x = (s / segs) * w;
        c2d.lineTo(x, botY(s / segs));
      }
      c2d.closePath();

      const color = palette[i % palette.length];
      c2d.fillStyle = rgb(color, 0.18 + 0.08 * params.intensity);
      c2d.fill();

      // Crisp top edge — keeps it geometric, not gradient
      c2d.beginPath();
      c2d.moveTo(0, topY(0));
      for (let s = 1; s <= segs; s++) {
        const x = (s / segs) * w;
        c2d.lineTo(x, topY(s / segs));
      }
      c2d.strokeStyle = rgb(c.fg, 0.18);
      c2d.lineWidth = Math.max(1.5, h * 0.0025);
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
    dispose() {},
  };
}
