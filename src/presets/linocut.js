// linocut — carved-block print. Bold seeded organic shapes (blobs, leaves,
// suns) with rough jittered edges, flat-filled in the theme inks, carrying
// interior gouge marks cut back to the paper. The whole sheet is rendered
// once to an offscreen canvas (vertically tileable) and rolls slowly like a
// print cylinder. Print group.

import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0,
    h = 0;
  let sheet = null; // { key, canvas }

  // Rough closed blob path: jittered radii, straight segments read as carved.
  function blobPath(g, rng, R) {
    const n = 11;
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = ((i % n) / n) * Math.PI * 2;
      const rad = R * (0.72 + ((((i % n) * 7919) % 13) / 13) * 0.5) * (0.94 + rng() * 0.12);
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x + (rng() - 0.5) * R * 0.06, y + (rng() - 0.5) * R * 0.06);
    }
    g.closePath();
  }

  function leafPath(g, rng, R) {
    g.beginPath();
    g.moveTo(0, -R);
    g.quadraticCurveTo(R * (0.7 + rng() * 0.2), 0, 0, R);
    g.quadraticCurveTo(-R * (0.7 + rng() * 0.2), 0, 0, -R);
    g.closePath();
  }

  function sunPath(g, rng, R) {
    const rays = 9 + ((rng() * 4) | 0);
    g.beginPath();
    for (let i = 0; i < rays * 2; i++) {
      const a = (i / (rays * 2)) * Math.PI * 2;
      const rad = (i % 2 ? R : R * 0.55) * (0.95 + rng() * 0.1);
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
  }

  // Draw one shape (with gouges) at a given y offset — called at y-h, y, y+h
  // so the sheet tiles vertically for the cylinder roll.
  function drawShape(g, sh, dy, fillCss, paperBg, s, intensity) {
    g.save();
    g.translate(sh.cx, sh.cy + dy);
    g.rotate(sh.rot);
    const rng = mulberry32(sh.jseed);
    if (sh.kind === 0) blobPath(g, rng, sh.R);
    else if (sh.kind === 1) leafPath(g, rng, sh.R);
    else sunPath(g, rng, sh.R);
    g.fillStyle = fillCss;
    g.fill();
    // Gouge marks: curved hatches cut back to paper, clipped to the shape.
    g.save();
    g.clip();
    g.strokeStyle = paperBg;
    g.lineCap = 'butt';
    g.lineWidth = Math.max(1.5, s * 0.004);
    const gouges = Math.round(4 + intensity * 9);
    for (let j = 0; j < gouges; j++) {
      const r = sh.R * (0.15 + j * (0.8 / gouges));
      const a0 = rng() * Math.PI * 2;
      g.beginPath();
      g.arc((rng() - 0.5) * sh.R * 0.4, (rng() - 0.5) * sh.R * 0.4, r, a0, a0 + 0.9 + rng() * 0.5);
      g.stroke();
    }
    g.restore();
    g.restore();
  }

  function buildSheet(params, c, palKey) {
    const key = `${params.seed | 0}|${params.density}|${params.intensity}|${palKey}|${w}x${h}`;
    if (sheet && sheet.key === key) return sheet.canvas;
    const off = (sheet && sheet.canvas) || document.createElement('canvas');
    off.width = w;
    off.height = h;
    const g = off.getContext('2d');
    clearAndFill(g, w, h, c.bg);

    const rng = mulberry32(params.seed | 0 || 1);
    const s = Math.min(w, h);
    const soften = (1 - params.intensity) * 0.35;
    const inkMain = rgbCss(
      mix([c.primary[0], c.primary[1], c.primary[2]], [c.bg[0], c.bg[1], c.bg[2]], soften)
    );
    const inkAlt = rgbCss(
      mix([c.accent[0], c.accent[1], c.accent[2]], [c.bg[0], c.bg[1], c.bg[2]], soften)
    );
    const paperBg = c.bg[3] > 0.01 ? rgbCss([c.bg[0], c.bg[1], c.bg[2]]) : 'rgba(0,0,0,0)';

    // Background field texture: short rough strokes in the dark ink.
    const inkDark = rgbaCss(
      mix([c.fg[0], c.fg[1], c.fg[2]], [c.bg[0], c.bg[1], c.bg[2]], soften),
      0.07
    );
    g.strokeStyle = inkDark;
    g.lineWidth = Math.max(1, s * 0.0018);
    const fieldStrokes = Math.round(80 + params.intensity * 140);
    for (let i = 0; i < fieldStrokes; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const len = s * (0.012 + rng() * 0.02);
      const a = (rng() - 0.5) * 0.5;
      for (const dy of [-h, 0, h]) {
        g.beginPath();
        g.moveTo(x, y + dy);
        g.lineTo(x + Math.cos(a) * len, y + dy + Math.sin(a) * len);
        g.stroke();
      }
    }

    const count = Math.round(5 + params.density * 9);
    for (let i = 0; i < count; i++) {
      const sh = {
        kind: (rng() * 3) | 0,
        cx: rng() * w,
        cy: rng() * h,
        R: (0.09 + rng() * 0.15) * s,
        rot: rng() * Math.PI * 2,
        jseed: (rng() * 0xffffffff) >>> 0,
      };
      const fill = i % 3 === 2 ? inkAlt : inkMain;
      for (const dy of [-h, 0, h]) drawShape(g, sh, dy, fill, paperBg, s, params.intensity);
    }

    sheet = { key, canvas: off };
    return off;
  }

  function frame(t, params) {
    const c = getColors();
    const palKey = [c.primary, c.accent, c.bg, c.fg].map((x) => rgbCss([x[0], x[1], x[2]])).join();
    const off = buildSheet(params, c, palKey);
    const roll = (((t * h * 0.012) % h) + h) % h; // slow cylinder roll
    c2d.clearRect(0, 0, w, h);
    c2d.drawImage(off, 0, roll - h);
    c2d.drawImage(off, 0, roll);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      sheet = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      sheet = null;
    },
  };
}
