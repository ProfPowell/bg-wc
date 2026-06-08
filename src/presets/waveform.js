// waveform — stacked waveform ridgelines (the "Unknown Pleasures" plot): a
// column of horizontal traces, each a noisy pulse that bulges in the middle
// and scrolls, near rows occluding far ones. Contour + waveform in one.
// Dataviz group.

import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss as rgba } from '../renderer/tokens.js';

export function create({ c2d, getColors }) {
  let w = 1,
    h = 1;

  function hash(x) {
    return (Math.sin(x * 127.1) * 43758.5453) % 1;
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const lines = Math.round(14 + params.density * 26);
    const padX = w * 0.1,
      plotW = w - padX * 2;
    const top = h * 0.12,
      bottom = h * 0.9;
    const gap = (bottom - top) / lines;
    const amp = gap * (2.2 + params.intensity * 3.0);
    const samples = 90;

    // Draw far (top) to near (bottom); fill under each to occlude the line behind.
    for (let i = 0; i < lines; i++) {
      const baseY = top + i * gap;
      const seedRow = i * 13.13;
      c2d.beginPath();
      for (let s = 0; s <= samples; s++) {
        const u = s / samples;
        const x = padX + u * plotW;
        // central bulge envelope
        const env = Math.exp(-Math.pow((u - 0.5) * 3.2, 2));
        // noisy ridge, scrolling
        let n = 0;
        n += Math.sin(u * 18 + t * 1.2 + seedRow) * 0.5;
        n += Math.sin(u * 41 - t * 0.8 + seedRow * 2.0) * 0.3;
        n += (hash(Math.floor(u * 60) + seedRow + Math.floor(t * 6)) || 0) * 0.4;
        const y = baseY - Math.abs(n) * env * amp;
        if (s) c2d.lineTo(x, y);
        else c2d.moveTo(x, y);
      }
      // close down to baseline to fill (occlusion)
      c2d.lineTo(padX + plotW, baseY + 2);
      c2d.lineTo(padX, baseY + 2);
      c2d.closePath();
      c2d.fillStyle = rgba(c.bg[3] > 0.01 ? c.bg : [0, 0, 0, 1], 1);
      c2d.fill();
      // stroke the ridge
      const tint = i % 7 === 0 ? c.accent : c.primary;
      c2d.strokeStyle = rgba(tint, 0.9);
      c2d.lineWidth = 1.3;
      c2d.stroke();
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
    dispose() {},
  };
}
