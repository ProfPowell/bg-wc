import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// blueprint — drafting on blue grid paper. 2–3 seeded drawings each run a draft
// sequence on their own cycle: the outline rectangle draws on, then centrelines,
// then dimension lines with arrowheads and tick labels, hold, then fade — all
// derived from `t` so the still is deterministic. `density` = grid fineness,
// `intensity` = line brightness. Colours: a blue ground tinted from the theme,
// light drafting lines from fg.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const draws = [];
    const n = 2 + ((rng() * 2) | 0);
    for (let i = 0; i < n; i++) {
      const dw = Math.min(w, h) * (0.22 + rng() * 0.2);
      const dh = Math.min(w, h) * (0.16 + rng() * 0.2);
      draws.push({
        x: rng() * (w - dw) + dw * 0.1,
        y: rng() * (h - dh) + dh * 0.1,
        w: dw,
        h: dh,
        phase: rng(),
        period: 9 + rng() * 6,
      });
    }
    cache = { key, draws };
    return cache;
  }

  function arrowLine(x1, y1, x2, y2, head) {
    c2d.beginPath();
    c2d.moveTo(x1, y1);
    c2d.lineTo(x2, y2);
    c2d.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    for (const [ex, ey, dir] of [
      [x1, y1, a],
      [x2, y2, a + Math.PI],
    ]) {
      c2d.beginPath();
      c2d.moveTo(ex, ey);
      c2d.lineTo(ex + Math.cos(dir + 0.4) * head, ey + Math.sin(dir + 0.4) * head);
      c2d.moveTo(ex, ey);
      c2d.lineTo(ex + Math.cos(dir - 0.4) * head, ey + Math.sin(dir - 0.4) * head);
      c2d.stroke();
    }
  }

  function frame(t, params) {
    const { draws } = build(params);
    const c = getColors();
    const intensity = params.intensity ?? 0.5;
    const density = params.density ?? 0.5;
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.05, 0.09, 0.18];
    const blue = c.info || c.primary || [0.3, 0.5, 0.9];
    const ground = mix(bg, blue, 0.55);
    const ink = mix(c.fg || [0.9, 0.95, 1], ground, 0.1);

    // Blue ground + grid paper.
    c2d.clearRect(0, 0, w, h);
    c2d.fillStyle = rgb(ground);
    c2d.fillRect(0, 0, w, h);
    const gstep = Math.max(12, Math.min(w, h) * (0.06 - 0.035 * density));
    c2d.strokeStyle = rgb(mix(ground, ink, 0.18));
    c2d.lineWidth = 1;
    c2d.beginPath();
    for (let x = 0; x <= w; x += gstep) {
      c2d.moveTo(x, 0);
      c2d.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += gstep) {
      c2d.moveTo(0, y);
      c2d.lineTo(w, y);
    }
    c2d.stroke();

    const lw = Math.max(1, Math.min(w, h) * 0.003);
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    c2d.font = `${Math.max(9, Math.min(w, h) * 0.025) | 0}px monospace`;

    for (const d of draws) {
      const local = (t / d.period + d.phase) % 1;
      // Stages: 0–0.25 rect, 0.25–0.45 centrelines, 0.45–0.7 dimensions, hold, fade.
      const alpha = (local > 0.85 ? 1 - (local - 0.85) / 0.15 : 1) * (0.5 + 0.5 * intensity);
      c2d.strokeStyle = rgb(ink, alpha);
      c2d.fillStyle = rgb(ink, alpha);
      c2d.lineWidth = lw;

      // Rectangle draws on by perimeter fraction.
      const rp = Math.min(1, local / 0.25);
      drawRectReveal(d.x, d.y, d.w, d.h, rp);

      if (local > 0.25) {
        const cp = Math.min(1, (local - 0.25) / 0.2);
        c2d.setLineDash([6, 5]);
        c2d.beginPath();
        c2d.moveTo(d.x, d.y + d.h / 2);
        c2d.lineTo(d.x + d.w * cp, d.y + d.h / 2);
        c2d.moveTo(d.x + d.w / 2, d.y);
        c2d.lineTo(d.x + d.w / 2, d.y + d.h * cp);
        c2d.stroke();
        c2d.setLineDash([]);
      }
      if (local > 0.45) {
        const dp = Math.min(1, (local - 0.45) / 0.25);
        const off = Math.min(w, h) * 0.04;
        const head = Math.max(4, Math.min(w, h) * 0.012);
        // Horizontal dimension below the rect.
        arrowLine(d.x, d.y + d.h + off, d.x + d.w * dp, d.y + d.h + off, head);
        if (dp > 0.99) {
          c2d.fillText(`${Math.round(d.w)}`, d.x + d.w / 2 - 12, d.y + d.h + off - 4);
          c2d.fillText(`${Math.round(d.h)}`, d.x + d.w + off - 6, d.y + d.h / 2);
        }
      }
    }
  }

  function drawRectReveal(x, y, rw, rh, p) {
    const peri = 2 * (rw + rh);
    let rem = peri * p;
    const segs = [
      [x, y, x + rw, y],
      [x + rw, y, x + rw, y + rh],
      [x + rw, y + rh, x, y + rh],
      [x, y + rh, x, y],
    ];
    c2d.beginPath();
    for (const [x1, y1, x2, y2] of segs) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (rem <= 0) break;
      const f = Math.min(1, rem / len);
      c2d.moveTo(x1, y1);
      c2d.lineTo(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f);
      rem -= len;
    }
    c2d.stroke();
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(3, params); // a few seconds in: drawings partway through their drafts
    },
    dispose() {
      cache = null;
    },
  };
}
