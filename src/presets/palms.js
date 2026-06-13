import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// palms — palm trees swaying against a tropical sky. Each palm is a curved
// tapered trunk topped by a crown of feather fronds (a midrib quadratic with
// leaflets combed off each side); the crown sways in a breeze and individual
// fronds flex. Distant palms are smaller and hazier (parallax) over a sunset
// gradient. `mode`: silhouette (dark palms on a vivid sunset, default) | lit
// (sunlit green fronds on a daytime sky). `density` = palm count, `intensity`
// = breeze strength. Deterministic from `t`.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function readMode() {
    return (host?.getAttribute('mode') || 'silhouette').toLowerCase() === 'lit'
      ? 'lit'
      : 'silhouette';
  }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const n = 2 + Math.round((params.density ?? 0.5) * 4);
    const palms = [];
    for (let i = 0; i < n; i++) {
      const depth = i / Math.max(1, n - 1) + (rng() - 0.5) * 0.15; // back→front-ish
      palms.push({
        x: (0.08 + rng() * 0.84) * w,
        depth: Math.min(1, Math.max(0, depth)),
        trunkH: (0.4 + rng() * 0.35) * h,
        lean: (rng() - 0.5) * 0.5,
        fronds: 6 + ((rng() * 4) | 0),
        bend: 0.4 + rng() * 0.4,
        phase: rng() * Math.PI * 2,
        swayR: 0.5 + rng() * 0.5,
      });
    }
    palms.sort((a, b) => a.depth - b.depth); // far first
    cache = { key, palms };
    return cache;
  }

  // One feather frond from (bx,by) at base angle `ang`, length L, drooping.
  function drawFrond(bx, by, ang, L, droop, wdt, col) {
    const segs = 10;
    // Midrib: a quadratic arc curving downward under gravity.
    const ctrlX = bx + Math.cos(ang) * L * 0.5;
    const ctrlY = by + Math.sin(ang) * L * 0.5;
    const endX = bx + Math.cos(ang) * L * 0.7;
    const endY = by + Math.sin(ang) * L * 0.7 + droop * L;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const mx = (1 - u) * (1 - u) * bx + 2 * (1 - u) * u * ctrlX + u * u * endX;
      const my = (1 - u) * (1 - u) * by + 2 * (1 - u) * u * ctrlY + u * u * endY;
      pts.push([mx, my]);
    }
    // Midrib stroke.
    c2d.strokeStyle = rgb(col);
    c2d.lineCap = 'round';
    c2d.lineWidth = wdt;
    c2d.beginPath();
    c2d.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c2d.lineTo(pts[i][0], pts[i][1]);
    c2d.stroke();
    // Leaflets combed off both sides, longest mid-frond.
    c2d.lineWidth = Math.max(1, wdt * 0.55);
    c2d.beginPath();
    for (let i = 1; i < pts.length - 1; i++) {
      const u = i / segs;
      const [px, py] = pts[i];
      const [qx, qy] = pts[i + 1];
      const tx = qx - px;
      const ty = qy - py;
      const tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl;
      const ny = tx / tl;
      const leafL = L * 0.16 * Math.sin(u * Math.PI);
      c2d.moveTo(px, py);
      c2d.lineTo(px + nx * leafL + tx * 0.6, py + ny * leafL + ty * 0.6);
      c2d.moveTo(px, py);
      c2d.lineTo(px - nx * leafL + tx * 0.6, py - ny * leafL + ty * 0.6);
    }
    c2d.stroke();
  }

  function frame(t, params) {
    const { palms } = build(params);
    const c = getColors();
    const mode = readMode();
    const intensity = params.intensity ?? 0.5;
    const bgc =
      c.bg && c.bg[3] > 0.01 ? c.bg : mode === 'lit' ? [0.55, 0.78, 0.92] : [0.12, 0.1, 0.2];

    // Sky gradient.
    clearAndFill(c2d, w, h, bgc);
    const sky = c2d.createLinearGradient(0, 0, 0, h);
    if (mode === 'lit') {
      const top = c.info || [0.4, 0.7, 0.95];
      const horizon = mix(bgc, c.warning || [0.95, 0.85, 0.6], 0.4);
      sky.addColorStop(0, rgb(mix(bgc, top, 0.7)));
      sky.addColorStop(1, rgb(horizon));
    } else {
      const top = mix(bgc, c.primary || [0.3, 0.2, 0.45], 0.6);
      const mid = c.accent || [0.95, 0.45, 0.4];
      const horizon = c.warning || [1, 0.75, 0.35];
      sky.addColorStop(0, rgb(top));
      sky.addColorStop(0.55, rgb(mix(top, mid, 0.7)));
      sky.addColorStop(1, rgb(horizon));
    }
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    // Sun disc low on the horizon (silhouette mode).
    if (mode === 'silhouette') {
      const sx = w * 0.5;
      const sy = h * 0.72;
      const sr = Math.min(w, h) * 0.16;
      const g = c2d.createRadialGradient(sx, sy, 0, sx, sy, sr * 2.4);
      g.addColorStop(0, rgb(mix(c.warning || [1, 0.85, 0.5], [1, 1, 0.9], 0.4), 0.95));
      g.addColorStop(0.3, rgb(c.warning || [1, 0.8, 0.4], 0.5));
      g.addColorStop(1, rgb(c.warning || [1, 0.8, 0.4], 0));
      c2d.fillStyle = g;
      c2d.fillRect(0, 0, w, h);
    }

    const breeze = (0.4 + 0.9 * intensity) * (0.6 + 0.4 * Math.sin(t * 0.4));

    for (const p of palms) {
      const fade = 0.4 + p.depth * 0.6;
      const scale = 0.5 + p.depth * 0.7;
      const baseX = p.x;
      const baseY = h + h * 0.02;
      const th = p.trunkH * scale;
      const sway = Math.sin(t * p.swayR + p.phase) * breeze * 0.12;
      // Trunk: a leaning curve up to the crown.
      const topX = baseX + (p.lean + sway) * th * 0.5;
      const topY = baseY - th;
      const ink =
        mode === 'lit'
          ? mix(c.success || [0.25, 0.45, 0.2], [0, 0, 0], 0.1)
          : mix(c.fg || [0.08, 0.06, 0.1], [0, 0, 0], 0.55);
      const trunkCol = mode === 'lit' ? mix(c.warning || [0.6, 0.45, 0.3], [0, 0, 0], 0.2) : ink;
      const col = mix(ink, bgc, (1 - fade) * 0.6);
      const trunk = mix(trunkCol, bgc, (1 - fade) * 0.6);

      c2d.strokeStyle = rgb(trunk, fade);
      c2d.lineWidth = Math.max(2, th * 0.04);
      c2d.lineCap = 'round';
      c2d.beginPath();
      c2d.moveTo(baseX, baseY);
      c2d.quadraticCurveTo(baseX + (p.lean + sway) * th * 0.3, baseY - th * 0.5, topX, topY);
      c2d.stroke();

      // Crown of fronds radiating, each flexing slightly out of phase.
      const L = th * 0.7;
      for (let f = 0; f < p.fronds; f++) {
        const base = -Math.PI * 0.5 + (f / (p.fronds - 1) - 0.5) * Math.PI * 1.5;
        const flex = Math.sin(t * p.swayR * 1.6 + p.phase + f) * breeze * 0.1;
        drawFrond(
          topX,
          topY,
          base + flex + sway * 0.5,
          L,
          p.bend * 0.5,
          Math.max(1.5, th * 0.02),
          col
        );
      }
      // Coconut cluster.
      c2d.fillStyle = rgb(trunk, fade);
      for (let k = 0; k < 3; k++) {
        c2d.beginPath();
        c2d.arc(topX + (k - 1) * th * 0.04, topY + th * 0.03, th * 0.025, 0, Math.PI * 2);
        c2d.fill();
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(1.2, params);
    },
    dispose() {
      cache = null;
    },
  };
}
