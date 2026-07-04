// video-feedback — the camera pointed at its own monitor. The recursion is
// rendered PURELY: every frame draws N nested monitor frames, each scaled
// and rotated one step further and tinted a step along
// primary→accent→info, with the deeper layers spun further by t. No
// accumulation buffer, so frozen frames are rock stable (the trail-fade
// class of bug cannot exist here by construction). density = layer count,
// intensity = zoom/rotate step.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let jitter = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 59);
    jitter = [];
    for (let i = 0; i < 24; i++) jitter.push((rand() - 0.5) * 0.02);
    lastKey = `${params.seed}`;
  }

  function ensure(params) {
    const key = `${params.seed}`;
    if (!jitter.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const layers = 8 + Math.round(params.density * 8); // 8..16 echoes
    const rotStep = 0.06 + params.intensity * 0.12;
    const scaleStep = 0.86;
    const cx = w / 2;
    const cy = h / 2;
    const baseW = w * 0.86;
    const baseH = h * 0.86;

    for (let i = 0; i < layers; i++) {
      const u = i / Math.max(1, layers - 1);
      const sc = Math.pow(scaleStep, i);
      // Deeper layers have spun further — the echo lags the camera.
      const rot = i * rotStep + t * 0.15 * u + (jitter[i % jitter.length] || 0);
      // Two-stage tint walk: primary → accent → info.
      const col = u < 0.5 ? mix(c.primary, c.accent, u * 2) : mix(c.accent, c.info, (u - 0.5) * 2);
      c2d.save();
      c2d.translate(cx, cy);
      c2d.rotate(rot);
      c2d.scale(sc, sc);
      c2d.strokeStyle = rgbaCss(col, 0.85 - u * 0.3);
      c2d.lineWidth = Math.max(1, 3 * px * (1 - u * 0.5));
      c2d.strokeRect(-baseW / 2, -baseH / 2, baseW, baseH);
      // The scanline bar inside each echo, drifting downward with depth.
      const barY = (-0.5 + ((((i * 0.13 + t * 0.05) % 1) + 1) % 1)) * baseH;
      c2d.fillStyle = rgbaCss(col, 0.18);
      c2d.fillRect(-baseW / 2, barY, baseW, baseH * 0.06);
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
      jitter = [];
    },
  };
}
