// incoming — wireframe ships warp toward you from a vanishing point, the
// view from a gunner's turret. Each ship spawns small near center, scales up
// and drifts outward along its bearing, then resets. TIE-style silhouette:
// a central pod with two side panels. Vector group.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ c2d, getColors }) {
  let w = 1, h = 1;
  let ships = [];
  let rand = mulberry32(1);
  let lastSeed = null;
  let lastT = 0;

  function spawn() {
    const ang = rand() * Math.PI * 2;
    return {
      ang,
      bearing: rand() * Math.PI * 2,    // drift direction
      z: 0.02 + rand() * 0.1,           // 0 (far) → 1 (close)
      vz: 0.15 + rand() * 0.35,
      drift: 0.02 + rand() * 0.05,
      roll: rand() * Math.PI * 2,
    };
  }

  function ensure(params, n) {
    if (params.seed !== lastSeed) { rand = mulberry32(params.seed || 1); lastSeed = params.seed; ships = []; }
    while (ships.length < n) ships.push(spawn());
    if (ships.length > n) ships.length = n;
  }

  function rgb(c, a) { return `rgba(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0},${a})`; }

  // Draw a TIE-style wireframe at unit scale; caller sets transform.
  function ship(s, stroke) {
    c2d.strokeStyle = stroke;
    // central pod
    c2d.beginPath();
    c2d.arc(0, 0, 0.18, 0, Math.PI * 2);
    c2d.stroke();
    c2d.beginPath();
    c2d.arc(0, 0, 0.08, 0, Math.PI * 2);
    c2d.stroke();
    // wing struts
    c2d.beginPath();
    c2d.moveTo(-0.18, 0); c2d.lineTo(-0.42, 0);
    c2d.moveTo(0.18, 0);  c2d.lineTo(0.42, 0);
    c2d.stroke();
    // hex side panels
    for (const sx of [-1, 1]) {
      c2d.beginPath();
      const px = sx * 0.62;
      c2d.moveTo(px, -0.5);
      c2d.lineTo(px - sx * 0.2, -0.28);
      c2d.lineTo(px - sx * 0.2, 0.28);
      c2d.lineTo(px, 0.5);
      c2d.lineTo(px + sx * 0.12, 0.28);
      c2d.lineTo(px + sx * 0.12, -0.28);
      c2d.closePath();
      c2d.stroke();
    }
  }

  function frame(t, params) {
    const cap = Math.floor(4 + params.density * 14);
    ensure(params, cap);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;

    const cx = w / 2, cy = h / 2;
    const minDim = Math.min(w, h);
    const primary = c.primary;
    c2d.lineWidth = 1.5;
    c2d.lineJoin = 'round';
    c2d.shadowColor = rgb(primary, 1);

    // Painter's order: far ships first.
    ships.sort((a, b) => a.z - b.z);
    for (const s of ships) {
      s.z += s.vz * params.speed * dt;
      const dist = (s.z * s.z) * 0.75;           // accelerating outward
      const x = cx + Math.cos(s.bearing) * dist * w;
      const y = cy + Math.sin(s.bearing) * dist * h;
      const scale = minDim * 0.06 * s.z;
      const alpha = Math.min(1, s.z * 2.2);
      if (s.z > 1.1 || x < -minDim || x > w + minDim || y < -minDim || y > h + minDim) {
        Object.assign(s, spawn());
        continue;
      }
      c2d.shadowBlur = 5 * params.intensity * s.z;
      c2d.save();
      c2d.translate(x, y);
      c2d.rotate(s.roll);
      c2d.scale(scale, scale);
      ship(s, rgb(primary, alpha));
      c2d.restore();
    }

    // Turret crosshair, locked to center.
    c2d.shadowBlur = 0;
    c2d.strokeStyle = rgb(c.accent, 0.85);
    c2d.lineWidth = 1.5;
    const ch = minDim * 0.06;
    c2d.beginPath();
    c2d.arc(cx, cy, ch, 0, Math.PI * 2);
    c2d.moveTo(cx - ch * 1.6, cy); c2d.lineTo(cx - ch * 0.5, cy);
    c2d.moveTo(cx + ch * 0.5, cy); c2d.lineTo(cx + ch * 1.6, cy);
    c2d.moveTo(cx, cy - ch * 1.6); c2d.lineTo(cx, cy - ch * 0.5);
    c2d.moveTo(cx, cy + ch * 0.5); c2d.lineTo(cx, cy + ch * 1.6);
    c2d.stroke();
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { frame(t, params); },
    staticFrame(params) { lastT = 0; frame(0.5, params); },
    dispose() { ships = []; },
  };
}
