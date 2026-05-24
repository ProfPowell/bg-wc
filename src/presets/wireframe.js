// wireframe — a slowly rotating wireframe globe (latitude / longitude grid)
// with an equatorial trench and a surface dish, evoking the rotating "plans"
// schematic. Back-facing lines dim by depth. Vector group.

import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ c2d, getColors }) {
  let w = 1, h = 1;

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.34;
    const ay = t * 0.4 * params.speed;
    const ax = 0.45;
    const cay = Math.cos(ay), say = Math.sin(ay);
    const cax = Math.cos(ax), sax = Math.sin(ax);

    const pr = (c.primary[0] * 255) | 0, pg = (c.primary[1] * 255) | 0, pb = (c.primary[2] * 255) | 0;

    // theta = polar (0..PI), phi = azimuth (0..2PI) → screen + depth z
    function proj(theta, phi) {
      const st = Math.sin(theta), ct = Math.cos(theta);
      let x = st * Math.cos(phi), y = ct, z = st * Math.sin(phi);
      const x1 = x * cay + z * say;
      const z1 = -x * say + z * cay;
      const y2 = y * cax - z1 * sax;
      const z2 = y * sax + z1 * cax;
      return [cx + x1 * R, cy + y2 * R, z2];
    }

    function strokePath(pts) {
      // Split into front (z>=0) and back (z<0) for depth fade.
      c2d.lineWidth = 1.4;
      let prev = null;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (prev) {
          const zAvg = (prev[2] + p[2]) * 0.5;
          const a = zAvg > 0 ? 0.95 : 0.28;        // back faces dim
          c2d.strokeStyle = `rgba(${pr},${pg},${pb},${a})`;
          c2d.beginPath();
          c2d.moveTo(prev[0], prev[1]);
          c2d.lineTo(p[0], p[1]);
          c2d.stroke();
        }
        prev = p;
      }
    }

    const latN = 8, lonN = 14, seg = 48;
    c2d.shadowColor = `rgb(${pr},${pg},${pb})`;
    c2d.shadowBlur = 5 * params.intensity;

    // Latitude circles
    for (let i = 1; i < latN; i++) {
      const theta = (Math.PI * i) / latN;
      const pts = [];
      for (let s = 0; s <= seg; s++) pts.push(proj(theta, (s / seg) * Math.PI * 2));
      strokePath(pts);
    }
    // Longitude half-circles
    for (let j = 0; j < lonN; j++) {
      const phi = (Math.PI * 2 * j) / lonN;
      const pts = [];
      for (let s = 0; s <= seg; s++) pts.push(proj((s / seg) * Math.PI, phi));
      strokePath(pts);
    }

    // Equatorial trench (a bold ring at theta = PI/2)
    {
      const pts = [];
      for (let s = 0; s <= seg; s++) pts.push(proj(Math.PI / 2 + 0.04, (s / seg) * Math.PI * 2));
      c2d.lineWidth = 2.4;
      let prev = null;
      const ar = (c.accent[0] * 255) | 0, ag = (c.accent[1] * 255) | 0, ab = (c.accent[2] * 255) | 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (prev) {
          const zAvg = (prev[2] + p[2]) * 0.5;
          c2d.strokeStyle = `rgba(${ar},${ag},${ab},${zAvg > 0 ? 1 : 0.3})`;
          c2d.beginPath(); c2d.moveTo(prev[0], prev[1]); c2d.lineTo(p[0], p[1]); c2d.stroke();
        }
        prev = p;
      }
    }

    // Surface dish (small circle near the upper-front)
    {
      const center = proj(0.7, 0.6 - ay);   // rides with rotation
      if (center[2] > 0) {
        c2d.strokeStyle = `rgb(${pr},${pg},${pb})`;
        c2d.lineWidth = 1.6;
        c2d.beginPath();
        c2d.arc(center[0], center[1], R * 0.12, 0, Math.PI * 2);
        c2d.stroke();
      }
    }
    c2d.shadowBlur = 0;
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { frame(t, params); },
    staticFrame(params) { frame(0.6, params); },
    dispose() {},
  };
}
