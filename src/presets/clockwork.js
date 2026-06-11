import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// clockwork — a meshing gear train. A seeded chain of gears with trapezoid
// teeth on circles; tooth counts come from a shared module so meshing pairs
// are correctly ratio-locked (w2 = −w1·n1/n2) and phase-aligned at the contact
// point, plus one escapement wheel that ticks in discrete steps with a small
// recoil. Brass tones from `warning`/`accent` on a dark field. `density` =
// gear count, `intensity` = brass brightness.

const BASE_W = 0.35; // first gear angular velocity (rad/s)
const TICKS_PER_SEC = 2; // escapement rate

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
    const count = 3 + Math.round((params.density ?? 0.5) * 3); // 3..6 gears
    const module = Math.min(w, h) / 34; // tooth size; teeth = r / module
    const gears = [];

    // First gear.
    let g0 = {
      x: w * (0.3 + rng() * 0.2),
      y: h * (0.35 + rng() * 0.3),
      r: Math.min(w, h) * (0.14 + rng() * 0.08),
      omega: BASE_W,
      phase: rng() * Math.PI * 2,
      spokes: 4 + ((rng() * 2) | 0),
      tone: rng(),
    };
    g0.teeth = Math.max(8, Math.round(g0.r / module));
    gears.push(g0);

    for (let i = 1; i < count; i++) {
      const prev = gears[i - 1];
      const r = Math.min(w, h) * (0.07 + rng() * 0.12);
      const teeth = Math.max(8, Math.round(r / module));
      // Place around prev at a seeded angle, biased to stay on canvas.
      let ang = rng() * Math.PI * 2;
      for (let tries = 0; tries < 8; tries++) {
        const x = prev.x + Math.cos(ang) * (prev.r + r);
        const y = prev.y + Math.sin(ang) * (prev.r + r);
        if (x > r * 0.4 && x < w - r * 0.4 && y > r * 0.4 && y < h - r * 0.4) break;
        ang = rng() * Math.PI * 2;
      }
      const x = prev.x + Math.cos(ang) * (prev.r + r);
      const y = prev.y + Math.sin(ang) * (prev.r + r);
      const omega = (-prev.omega * prev.teeth) / teeth; // ratio lock
      // Phase-align: at the contact angle, prev's tooth must meet this gap.
      // Tooth phase of prev at contact (in tooth units), at t=0:
      const aPrev = ang; // contact direction from prev
      const aThis = ang + Math.PI; // contact direction from this gear
      const prevToothPos = ((aPrev - prev.phase) * prev.teeth) / (Math.PI * 2);
      // Want this gear's tooth position at contact ≡ prevToothPos + 0.5 (mod 1).
      const phase = aThis - ((prevToothPos + 0.5) * Math.PI * 2) / teeth;
      gears.push({ x, y, r, teeth, omega, phase, spokes: 3 + ((rng() * 3) | 0), tone: rng() });
    }

    // Escapement wheel: tucked into remaining space, saw teeth, steps + recoil.
    const er = Math.min(w, h) * 0.09;
    const esc = {
      x: w * (rng() < 0.5 ? 0.82 : 0.14),
      y: h * (0.18 + rng() * 0.2),
      r: er,
      teeth: 15,
      stepAngle: (Math.PI * 2) / 15,
      tone: rng(),
    };
    cache = { key, gears, esc };
    return cache;
  }

  // Trapezoid-tooth gear path at rotation `rot` (body outline incl. teeth).
  function gearPath(g, rot) {
    const pitch = (Math.PI * 2) / g.teeth;
    const root = g.r;
    const tip = g.r * 1.13;
    c2d.beginPath();
    for (let i = 0; i < g.teeth; i++) {
      const a = rot + i * pitch;
      const p1 = a + pitch * 0.12;
      const p2 = a + pitch * 0.32;
      const p3 = a + pitch * 0.5;
      if (i === 0) c2d.moveTo(Math.cos(a) * root, Math.sin(a) * root);
      else c2d.lineTo(Math.cos(a) * root, Math.sin(a) * root);
      c2d.lineTo(Math.cos(p1) * tip, Math.sin(p1) * tip);
      c2d.lineTo(Math.cos(p2) * tip, Math.sin(p2) * tip);
      c2d.lineTo(Math.cos(p3) * root, Math.sin(p3) * root);
      c2d.lineTo(Math.cos(a + pitch) * root, Math.sin(a + pitch) * root);
    }
    c2d.closePath();
  }

  function drawGear(g, rot, brass, rim, saw) {
    c2d.save();
    c2d.translate(g.x, g.y);
    if (saw) {
      // Escapement: pointed saw teeth.
      const pitch = (Math.PI * 2) / g.teeth;
      c2d.beginPath();
      for (let i = 0; i < g.teeth; i++) {
        const a = rot + i * pitch;
        if (i === 0) c2d.moveTo(Math.cos(a) * g.r, Math.sin(a) * g.r);
        else c2d.lineTo(Math.cos(a) * g.r, Math.sin(a) * g.r);
        c2d.lineTo(
          Math.cos(a + pitch * 0.25) * g.r * 1.18,
          Math.sin(a + pitch * 0.25) * g.r * 1.18
        );
        c2d.lineTo(Math.cos(a + pitch) * g.r, Math.sin(a + pitch) * g.r);
      }
      c2d.closePath();
    } else {
      gearPath(g, rot);
    }
    c2d.fillStyle = rgb(brass);
    c2d.fill();
    c2d.strokeStyle = rgb(rim);
    c2d.lineWidth = Math.max(1, g.r * 0.02);
    c2d.stroke();

    // Face: darker inner disc, spokes, hub.
    const inner = g.r * 0.82;
    c2d.fillStyle = rgb(mix(brass, [0, 0, 0], 0.35));
    c2d.beginPath();
    c2d.arc(0, 0, inner, 0, Math.PI * 2);
    c2d.fill();
    const spokes = g.spokes || 4;
    c2d.strokeStyle = rgb(brass);
    c2d.lineWidth = g.r * 0.13;
    c2d.beginPath();
    for (let s = 0; s < spokes; s++) {
      const a = rot + (s / spokes) * Math.PI * 2;
      c2d.moveTo(Math.cos(a) * g.r * 0.2, Math.sin(a) * g.r * 0.2);
      c2d.lineTo(Math.cos(a) * inner * 0.92, Math.sin(a) * inner * 0.92);
    }
    c2d.stroke();
    c2d.fillStyle = rgb(brass);
    c2d.beginPath();
    c2d.arc(0, 0, g.r * 0.18, 0, Math.PI * 2);
    c2d.fill();
    c2d.fillStyle = rgb(mix(brass, [0, 0, 0], 0.5));
    c2d.beginPath();
    c2d.arc(0, 0, g.r * 0.07, 0, Math.PI * 2);
    c2d.fill();
    c2d.restore();
  }

  function frame(t, params) {
    const { gears, esc } = build(params);
    const c = getColors();
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.07, 0.06, 0.05];
    clearAndFill(c2d, w, h, [bg[0] * 0.6, bg[1] * 0.6, bg[2] * 0.6, 1]);
    const intensity = params.intensity ?? 0.5;
    const warm = c.warning || [0.78, 0.6, 0.25];
    const acc = c.accent || [0.75, 0.45, 0.3];
    const rim = mix(warm, [1, 1, 1], 0.25);

    for (const g of gears) {
      const brass = mix(mix(warm, acc, g.tone), [0, 0, 0], 0.35 - 0.25 * intensity);
      drawGear(g, g.phase + g.omega * t, brass, rim, false);
    }

    // Escapement: discrete steps with a brief recoil ease on each tick.
    const tickF = t * TICKS_PER_SEC;
    const step = Math.floor(tickF);
    const frac = tickF - step;
    const advance =
      frac < 0.18 ? (frac / 0.18) * 1.12 - 0.12 * Math.sin((frac / 0.18) * Math.PI) : 1;
    const rot = (step + advance) * esc.stepAngle;
    const brass = mix(mix(warm, acc, esc.tone), [0, 0, 0], 0.3 - 0.2 * intensity);
    drawGear({ ...esc, spokes: 3 }, rot, brass, rim, true);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      cache = null;
    },
  };
}
