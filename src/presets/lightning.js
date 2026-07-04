// lightning — storm flashes. Strikes fire on a schedule derived from
// floor(t/period): each strike index seeds its own bolt (recursive midpoint
// displacement with a couple of branches), so playback is a pure function
// of t. Between strikes the cloud base pulses faintly. The bolt is drawn in
// fg with an accent glow — dark ink on light themes, white fire on dark.
// density = strike frequency, intensity = flash brightness.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;

  // Build one bolt's polyline set from a strike-specific PRNG.
  function makeBolt(rand) {
    const segs = [];
    function displace(x1, y1, x2, y2, offset, depth, width) {
      if (depth === 0) {
        segs.push({ x1, y1, x2, y2, width });
        return;
      }
      const mx = (x1 + x2) / 2 + (rand() - 0.5) * offset;
      const my = (y1 + y2) / 2 + (rand() - 0.5) * offset * 0.3;
      displace(x1, y1, mx, my, offset / 2, depth - 1, width);
      displace(mx, my, x2, y2, offset / 2, depth - 1, width);
      if (depth === 3 && rand() < 0.6) {
        // a branch peels off toward the ground, shorter and thinner
        const bx = mx + (rand() - 0.5) * 0.3;
        const by = my + 0.2 + rand() * 0.15;
        displace(mx, my, bx, by, offset / 3, depth - 2, width * 0.5);
      }
    }
    const x0 = 0.25 + rand() * 0.5;
    displace(x0, 0, x0 + (rand() - 0.5) * 0.3, 0.85, 0.28, 5, 1);
    return segs;
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const period = 3.2 - params.density * 2.2; // 1.0s..3.2s between strikes
    const idx = Math.floor(t / period);
    const phase = (t - idx * period) / period;

    // Cloud base: a restless glow across the top, always present.
    const mood = 0.04 + 0.03 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 2);
    const cloud = c2d.createLinearGradient(0, 0, 0, h * 0.5);
    cloud.addColorStop(0, rgbaCss(c.fg, mood + 0.06));
    cloud.addColorStop(1, rgbaCss(c.fg, 0));
    c2d.fillStyle = cloud;
    c2d.fillRect(0, 0, w, h);

    // The strike lives in the first ~15% of the cycle, double-flickered.
    if (phase < 0.15) {
      const u = phase / 0.15;
      // Envelope shifted so u=0 is already mid-flash: a frozen t (speed=0,
      // reduced-motion stills, visual baselines) shows the bolt, not an
      // empty sky between strikes.
      const env = Math.min(1, u + 0.35);
      const flicker = Math.max(0, Math.sin(env * Math.PI)) * (u < 0.5 ? 1 : 0.55);
      const rand = mulberry32(((params.seed | 0 || 21) * 2654435761) ^ (idx * 40503));
      const bolt = makeBolt(rand);
      // Sky flash.
      c2d.fillStyle = rgbaCss(c.fg, 0.14 * params.intensity * flicker);
      c2d.fillRect(0, 0, w, h);
      c2d.lineCap = 'round';
      for (const pass of [
        { lw: 7, css: rgbaCss(c.accent, 0.25 * flicker) },
        { lw: 2.2, css: rgbaCss(c.fg, 0.95 * flicker) },
      ]) {
        c2d.strokeStyle = pass.css;
        for (const s of bolt) {
          c2d.lineWidth = pass.lw * s.width * px;
          c2d.beginPath();
          c2d.moveTo(s.x1 * w, s.y1 * h);
          c2d.lineTo(s.x2 * w, s.y2 * h);
          c2d.stroke();
        }
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      // Freeze mid-strike so the still shows the bolt, not an empty sky.
      frame(0.05 * (3.2 - params.density * 2.2), params);
    },
    dispose() {},
  };
}
