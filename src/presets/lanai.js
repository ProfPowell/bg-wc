import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// lanai — a mid-century pool patio. A kidney-shape pool sits on a terrazzo deck
// with an animated caustic ripple sheen on the water, amoeba/palette-shape
// stepping stones scattered on the deck, a starburst sun overhead, and palm-
// frond shadows raking across from one side and swaying. Palm-Springs sky band
// up top. Combines the atomic-ranch leisure motifs into a scene; distinct from
// breezeblock (a wall, not a poolside). `intensity` = ripple/sun strength,
// `density` = stone/detail count. Deterministic from `t`.

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const density = params.density ?? 0.5;
    // Kidney pool: a blob outline as a closed set of points with a concave dent.
    const cx = w * 0.5;
    const cy = h * 0.6;
    const R = Math.min(w, h) * 0.32;
    const poolPts = [];
    const N = 28;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      // Base ellipse wider than tall, with a concave kidney dent on one side.
      let rr = R * (1 + 0.35 * Math.cos(a)); // wider left-right
      const dent = Math.exp(-Math.pow((a - Math.PI * 0.5) / 0.5, 2)) * R * 0.55;
      rr -= dent;
      poolPts.push([cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr * 0.8]);
    }
    // Stepping stones (amoeba blobs) on the deck, avoiding the pool centre.
    const stones = [];
    const nS = 4 + Math.round(density * 6);
    for (let i = 0; i < nS; i++) {
      const sx = rng() * w;
      const sy = h * (0.18 + rng() * 0.78);
      if (Math.hypot(sx - cx, (sy - cy) / 0.7) < R * 1.3) continue; // keep off the pool
      const lobes = [];
      const lc = 6 + ((rng() * 3) | 0);
      for (let k = 0; k < lc; k++) lobes.push(0.7 + rng() * 0.5);
      stones.push({
        x: sx,
        y: sy,
        r: Math.min(w, h) * (0.04 + rng() * 0.04),
        lobes,
        rot: rng() * 6.28,
        ci: (rng() * 3) | 0,
      });
    }
    cache = { key, cx, cy, R, poolPts, stones };
    return cache;
  }

  function blobPath(cxp, cyp, r, lobes, rot) {
    c2d.beginPath();
    const n = lobes.length;
    for (let i = 0; i <= n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const rr = r * lobes[i % n];
      const x = cxp + Math.cos(a) * rr;
      const y = cyp + Math.sin(a) * rr * 0.8;
      if (i === 0) c2d.moveTo(x, y);
      else {
        const pa = rot + ((i - 0.5) / n) * Math.PI * 2;
        const pr = r * ((lobes[(i - 1) % n] + lobes[i % n]) / 2) * 1.08;
        c2d.quadraticCurveTo(cxp + Math.cos(pa) * pr, cyp + Math.sin(pa) * pr * 0.8, x, y);
      }
    }
    c2d.closePath();
  }

  function frame(t, params) {
    const { cx, cy, R, poolPts, stones } = build(params);
    const c = getColors();
    const intensity = params.intensity ?? 0.5;
    const deckCol = mix(
      c.bg && c.bg[3] > 0.01 ? c.bg : [0.93, 0.88, 0.78],
      c.warning || [0.85, 0.7, 0.4],
      0.12
    );
    const water = c.info || [0.2, 0.6, 0.75];
    const accent = c.accent || [0.95, 0.45, 0.4];

    // Deck.
    clearAndFill(c2d, w, h, deckCol);
    // Palm-Springs sky band across the top.
    const sky = c2d.createLinearGradient(0, 0, 0, h * 0.32);
    sky.addColorStop(0, rgb(mix(deckCol, c.primary || [0.4, 0.6, 0.9], 0.5)));
    sky.addColorStop(1, rgb(deckCol, 0));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h * 0.32);

    // Terrazzo speckle on the deck.
    const rng = mulberry32((params.seed | 0 || 1) + 7);
    c2d.globalAlpha = 0.5;
    for (let i = 0; i < (w * h) / 4000; i++) {
      c2d.fillStyle = rgb(rng() < 0.5 ? accent : water, 0.18);
      c2d.fillRect(rng() * w, rng() * h, 3, 3);
    }
    c2d.globalAlpha = 1;

    // Sunburst.
    const sunX = w * 0.82;
    const sunY = h * 0.16;
    const sr = Math.min(w, h) * 0.1;
    c2d.strokeStyle = rgb(mix(c.warning || [1, 0.8, 0.3], [1, 1, 1], 0.3), 0.6 + 0.3 * intensity);
    c2d.lineWidth = Math.max(1.5, sr * 0.03);
    c2d.lineCap = 'round';
    c2d.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = t * 0.05 + (i / 24) * Math.PI * 2;
      const inner = sr * (i % 2 ? 0.5 : 0.7);
      const outer = sr * (i % 2 ? 0.85 : 1.15);
      c2d.moveTo(sunX + Math.cos(a) * inner, sunY + Math.sin(a) * inner);
      c2d.lineTo(sunX + Math.cos(a) * outer, sunY + Math.sin(a) * outer);
    }
    c2d.stroke();
    c2d.fillStyle = rgb(c.warning || [1, 0.8, 0.3], 0.9);
    c2d.beginPath();
    c2d.arc(sunX, sunY, sr * 0.35, 0, Math.PI * 2);
    c2d.fill();

    // Stepping stones.
    for (const s of stones) {
      blobPath(s.x, s.y, s.r, s.lobes, s.rot);
      c2d.fillStyle = rgb(mix(deckCol, [accent, water, c.warning || [0.9, 0.8, 0.4]][s.ci], 0.4));
      c2d.fill();
    }

    // The pool: fill the kidney shape, clip, and animate caustic ripples in it.
    c2d.save();
    c2d.beginPath();
    c2d.moveTo(poolPts[0][0], poolPts[0][1]);
    for (let i = 1; i < poolPts.length; i++) {
      const p = poolPts[i];
      const prev = poolPts[i - 1];
      c2d.quadraticCurveTo(prev[0], prev[1], (prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2);
    }
    c2d.closePath();
    // Pool tile rim.
    c2d.strokeStyle = rgb(mix(water, [1, 1, 1], 0.5));
    c2d.lineWidth = Math.max(3, R * 0.04);
    c2d.stroke();
    c2d.fillStyle = rgb(water);
    c2d.fill();
    c2d.clip();
    // Water gradient (deeper centre).
    const wg = c2d.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.3);
    wg.addColorStop(0, rgb(mix(water, [0, 0, 0.1], 0.25)));
    wg.addColorStop(1, rgb(mix(water, [1, 1, 1], 0.2)));
    c2d.fillStyle = wg;
    c2d.fillRect(0, 0, w, h);
    // Caustic ripples: bright wavy strokes drifting.
    c2d.strokeStyle = rgb([1, 1, 1], 0.18 + 0.22 * intensity);
    c2d.lineWidth = Math.max(1.5, R * 0.02);
    for (let j = 0; j < 9; j++) {
      c2d.beginPath();
      const yy = cy - R + (j / 8) * R * 2;
      for (let x = cx - R * 1.6; x <= cx + R * 1.6; x += 8) {
        const y =
          yy +
          Math.sin(x * 0.05 + t * 1.6 + j) * R * 0.05 +
          Math.sin(x * 0.13 - t * 1.1) * R * 0.03;
        if (x === cx - R * 1.6) c2d.moveTo(x, y);
        else c2d.lineTo(x, y);
      }
      c2d.stroke();
    }
    c2d.restore();

    // Palm-frond shadows raking across the deck from the left, swaying.
    const sway = Math.sin(t * 0.5) * 0.12 + 0.2;
    c2d.strokeStyle = rgb([0, 0, 0], 0.1 + 0.06 * intensity);
    c2d.lineCap = 'round';
    for (let fr = 0; fr < 3; fr++) {
      const ox = -w * 0.05;
      const oy = h * (0.1 + fr * 0.18);
      const ang = sway + fr * 0.15 + Math.sin(t * 0.4 + fr) * 0.04;
      const L = w * 0.85;
      c2d.lineWidth = Math.max(2, h * 0.01);
      c2d.beginPath();
      c2d.moveTo(ox, oy);
      c2d.lineTo(ox + Math.cos(ang) * L, oy + Math.sin(ang) * L);
      c2d.stroke();
      c2d.lineWidth = Math.max(1, h * 0.006);
      c2d.beginPath();
      for (let i = 1; i < 16; i++) {
        const u = i / 16;
        const px = ox + Math.cos(ang) * L * u;
        const py = oy + Math.sin(ang) * L * u;
        const ll = h * 0.05 * Math.sin(u * Math.PI);
        c2d.moveTo(px, py);
        c2d.lineTo(px + Math.cos(ang + 1.3) * ll, py + Math.sin(ang + 1.3) * ll);
        c2d.moveTo(px, py);
        c2d.lineTo(px + Math.cos(ang - 1.3) * ll, py + Math.sin(ang - 1.3) * ll);
      }
      c2d.stroke();
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
      frame(1, params);
    },
    dispose() {
      cache = null;
    },
  };
}
