// wireframe — a slowly rotating wireframe globe (latitude / longitude grid)
// with an accent equatorial trench and a surface dish: the rotating "plans"
// schematic. Back-facing segments dim.
//
// Perf: all front-facing segments are batched into one path and all
// back-facing into another, so the whole globe is ~4 stroke() calls per
// frame (plus the equator and dish), not one per segment. No shadowBlur —
// a wider translucent pass fakes the phosphor glow far more cheaply. The
// ~900 projected points and the segment accumulators are pooled/reused across
// frames so a steady globe allocates nothing per frame.

import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1; // scale stroke widths so they aren't thin on hi-DPI
  let w = 1,
    h = 1;

  // Reused per-frame buffers. The point pool hands out [x,y,z] arrays that are
  // consumed (copied into the flat segment lists) within the same frame, so a
  // single frame-reset is enough; the pool grows to the frame's point count
  // once, then is reused.
  const ptPool = [];
  let ptN = 0;
  function getPt(x, y, z) {
    let a = ptPool[ptN];
    if (!a) a = ptPool[ptN] = [0, 0, 0];
    a[0] = x;
    a[1] = y;
    a[2] = z;
    ptN++;
    return a;
  }
  const front = []; // flat [x0,y0,x1,y1, …]
  const back = [];
  const ef = [];
  const eb = [];
  const pts = [];

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    ptN = 0;
    front.length = 0;
    back.length = 0;

    const cx = w / 2,
      cy = h / 2;
    const R = Math.min(w, h) * 0.34;
    const ay = t * 0.4;
    const ax = 0.45;
    const cay = Math.cos(ay),
      say = Math.sin(ay);
    const cax = Math.cos(ax),
      sax = Math.sin(ax);

    const pr = (c.primary[0] * 255) | 0,
      pg = (c.primary[1] * 255) | 0,
      pb = (c.primary[2] * 255) | 0;
    const ar = (c.accent[0] * 255) | 0,
      ag = (c.accent[1] * 255) | 0,
      ab = (c.accent[2] * 255) | 0;

    function proj(theta, phi) {
      const st = Math.sin(theta),
        ct = Math.cos(theta);
      const x = st * Math.cos(phi),
        y = ct,
        z = st * Math.sin(phi);
      const x1 = x * cay + z * say;
      const z1 = -x * say + z * cay;
      const y2 = y * cax - z1 * sax;
      const z2 = y * sax + z1 * cax;
      return getPt(cx + x1 * R, cy + y2 * R, z2);
    }

    function addLine(p) {
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1],
          b = p[i];
        const arr = (a[2] + b[2]) * 0.5 > 0 ? front : back;
        arr.push(a[0], a[1], b[0], b[1]);
      }
    }
    function strokeSegs(arr, style, lw) {
      if (!arr.length) return;
      c2d.strokeStyle = style;
      c2d.lineWidth = lw * px;
      c2d.beginPath();
      for (let i = 0; i < arr.length; i += 4) {
        c2d.moveTo(arr[i], arr[i + 1]);
        c2d.lineTo(arr[i + 2], arr[i + 3]);
      }
      c2d.stroke();
    }

    const latN = 8,
      lonN = 14,
      seg = 40;
    for (let i = 1; i < latN; i++) {
      const theta = (Math.PI * i) / latN;
      pts.length = 0;
      for (let s = 0; s <= seg; s++) pts.push(proj(theta, (s / seg) * Math.PI * 2));
      addLine(pts);
    }
    for (let j = 0; j < lonN; j++) {
      const phi = (Math.PI * 2 * j) / lonN;
      pts.length = 0;
      for (let s = 0; s <= seg; s++) pts.push(proj((s / seg) * Math.PI, phi));
      addLine(pts);
    }

    const glow = params.intensity;
    // back (behind), then front glow, then crisp front.
    strokeSegs(back, `rgba(${pr},${pg},${pb},0.22)`, 1.2);
    if (glow > 0.05) strokeSegs(front, `rgba(${pr},${pg},${pb},${(0.18 * glow).toFixed(3)})`, 4.0);
    strokeSegs(front, `rgba(${pr},${pg},${pb},0.95)`, 1.4);

    // Equatorial trench — a bold accent ring, batched front/back too.
    {
      pts.length = 0;
      for (let s = 0; s <= seg; s++) pts.push(proj(Math.PI / 2 + 0.04, (s / seg) * Math.PI * 2));
      ef.length = 0;
      eb.length = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
          b = pts[i];
        ((a[2] + b[2]) * 0.5 > 0 ? ef : eb).push(a[0], a[1], b[0], b[1]);
      }
      strokeSegs(eb, `rgba(${ar},${ag},${ab},0.3)`, 1.8);
      strokeSegs(ef, `rgba(${ar},${ag},${ab},1)`, 2.4);
    }

    // Surface dish (front only).
    const center = proj(0.7, 0.6 - ay);
    if (center[2] > 0) {
      c2d.strokeStyle = `rgb(${pr},${pg},${pb})`;
      c2d.lineWidth = 1.6 * px;
      c2d.beginPath();
      c2d.arc(center[0], center[1], R * 0.12, 0, Math.PI * 2);
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
      frame(0.6, params);
    },
    dispose() {
      ptPool.length = 0;
      front.length = back.length = ef.length = eb.length = pts.length = 0;
    },
  };
}
