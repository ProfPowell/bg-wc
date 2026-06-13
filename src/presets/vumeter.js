import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// vumeter — analog VU meters. 2–N arc dials, each with a ballistic needle: a
// damped spring chases a synthesized signal level (deterministic from `t` —
// summed sines + seeded wander), overshooting then settling like real meter
// movement. A red zone arc marks the top of the scale, tick marks + small
// labels line the dial, a PEAK LED lights on transients, and a glass glare
// sweeps the face. `density` = meter count, `intensity` = signal drive.
// staticFrame: needles parked mid-scale. Needle state integrates a fixed
// timestep from dt so frozen time holds steady.

const A0 = Math.PI * 0.78; // needle sweep start (lower-left)
const A1 = Math.PI * 0.22; // ... to lower-right (drawn via the top)

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;
  let lastT = 0;
  let acc = 0;
  let dialKey = '';

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const n = 2 + Math.round((params.density ?? 0.5) * 3); // 2..5
    const meters = [];
    for (let i = 0; i < n; i++) {
      meters.push({
        label: ['L', 'R', 'A', 'B', 'C'][i] || `${i}`,
        r1: 0.7 + rng() * 1.6,
        r2: 1.7 + rng() * 3,
        p1: rng() * Math.PI * 2,
        p2: rng() * Math.PI * 2,
        wobR: 0.1 + rng() * 0.2,
        needle: 0.2, // current position 0..1
        vel: 0,
        peakLit: 0,
      });
    }
    cache = { key, meters, n };
    // Reset needle state when the layout changes.
    if (dialKey !== key) {
      dialKey = key;
      lastT = 0;
      acc = 0;
    }
    return cache;
  }

  function targetLevel(m, t, drive) {
    const a = 0.5 + 0.5 * Math.sin(t * m.r1 + m.p1);
    const b = 0.5 + 0.5 * Math.sin(t * m.r2 + m.p2);
    const wob = 0.5 + 0.5 * Math.sin(t * m.wobR + m.p1 * 1.3);
    return Math.min(1, (a * 0.6 + b * 0.4) * (0.5 + 0.6 * wob) * drive);
  }

  function stepMeters(meters, t, drive, dt) {
    // Ballistic: spring toward the target with light damping → overshoot.
    const k = 90; // stiffness
    const damp = 11;
    for (const m of meters) {
      const tgt = targetLevel(m, t, drive);
      m.vel += (k * (tgt - m.needle) - damp * m.vel) * dt;
      m.needle += m.vel * dt;
      if (m.needle > 0.86 && m.vel > 0.3) m.peakLit = 1;
      else m.peakLit = Math.max(0, m.peakLit - dt * 1.5);
    }
  }

  function drawDial(m, cx, cy, r, c, intensity) {
    const fg = c.fg || [0.85, 0.85, 0.8];
    const face = mix(
      c.bg && c.bg[3] > 0.01 ? c.bg : [0.92, 0.9, 0.82],
      c.warning || [0.9, 0.85, 0.6],
      0.25
    );
    const red = c.error || [0.85, 0.2, 0.15];
    // Face plate.
    c2d.fillStyle = rgb(face);
    c2d.beginPath();
    c2d.arc(cx, cy, r, 0, Math.PI * 2);
    c2d.fill();
    c2d.strokeStyle = rgb(mix(fg, [0, 0, 0], 0.4), 0.7);
    c2d.lineWidth = Math.max(1.5, r * 0.03);
    c2d.stroke();

    // Scale arc (the dial sweeps over the TOP: from A0 down-left, over top, to A1 down-right).
    const ar = r * 0.82;
    const sweep = (frac) => A0 + frac * (2 * Math.PI - A0 + A1); // go the long way over the top
    c2d.lineWidth = Math.max(1, r * 0.02);
    // Normal zone.
    c2d.strokeStyle = rgb(mix(fg, [0, 0, 0], 0.3));
    c2d.beginPath();
    c2d.arc(cx, cy, ar, sweep(0), sweep(0.72));
    c2d.stroke();
    // Red zone.
    c2d.strokeStyle = rgb(red);
    c2d.beginPath();
    c2d.arc(cx, cy, ar, sweep(0.72), sweep(1));
    c2d.stroke();
    // Ticks.
    c2d.strokeStyle = rgb(mix(fg, [0, 0, 0], 0.3), 0.8);
    for (let s = 0; s <= 10; s++) {
      const a = sweep(s / 10);
      const major = s % 2 === 0;
      const ti = ar * (major ? 0.86 : 0.92);
      c2d.lineWidth = major ? Math.max(1, r * 0.018) : 1;
      c2d.beginPath();
      c2d.moveTo(cx + Math.cos(a) * ar, cy + Math.sin(a) * ar);
      c2d.lineTo(cx + Math.cos(a) * ti, cy + Math.sin(a) * ti);
      c2d.stroke();
    }
    // "VU" label + channel.
    c2d.fillStyle = rgb(mix(fg, [0, 0, 0], 0.45), 0.8);
    c2d.font = `${(r * 0.18) | 0}px 'Helvetica Neue', Arial, sans-serif`;
    c2d.textAlign = 'center';
    c2d.textBaseline = 'middle';
    c2d.fillText('VU', cx, cy + r * 0.32);
    c2d.font = `${(r * 0.13) | 0}px 'Helvetica Neue', Arial, sans-serif`;
    c2d.fillText(m.label, cx, cy + r * 0.52);

    // Needle (pivot near the bottom centre so it swings over the top).
    const pivotY = cy + r * 0.55;
    const a = sweep(Math.min(1, Math.max(0, m.needle)));
    const len = r * 1.18;
    c2d.strokeStyle = rgb(mix(fg, [0, 0, 0], 0.55));
    c2d.lineWidth = Math.max(1.5, r * 0.025);
    c2d.lineCap = 'round';
    c2d.beginPath();
    c2d.moveTo(cx, pivotY);
    c2d.lineTo(cx + Math.cos(a) * len, pivotY + Math.sin(a) * len);
    c2d.stroke();
    c2d.fillStyle = rgb(mix(fg, [0, 0, 0], 0.55));
    c2d.beginPath();
    c2d.arc(cx, pivotY, r * 0.05, 0, Math.PI * 2);
    c2d.fill();

    // PEAK LED.
    const lx = cx + r * 0.55;
    const ly = cy - r * 0.5;
    c2d.fillStyle = rgb(red, 0.18 + 0.8 * m.peakLit);
    c2d.beginPath();
    c2d.arc(lx, ly, r * 0.06, 0, Math.PI * 2);
    c2d.fill();
    c2d.fillStyle = rgb(mix(fg, [0, 0, 0], 0.4), 0.7);
    c2d.font = `${(r * 0.1) | 0}px 'Helvetica Neue', Arial, sans-serif`;
    c2d.fillText('PEAK', lx, ly + r * 0.14);

    // Glass glare: a soft diagonal highlight.
    const g = c2d.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, rgb([1, 1, 1], 0.16 + 0.08 * intensity));
    g.addColorStop(0.4, rgb([1, 1, 1], 0));
    c2d.fillStyle = g;
    c2d.beginPath();
    c2d.arc(cx, cy, r, 0, Math.PI * 2);
    c2d.fill();
  }

  function draw(t, params) {
    const { meters, n } = cache;
    const c = getColors();
    const bg = c.bg && c.bg[3] > 0.01 ? c.bg : [0.1, 0.1, 0.12];
    clearAndFill(c2d, w, h, [bg[0] * 0.55, bg[1] * 0.55, bg[2] * 0.6, 1]);
    const intensity = params.intensity ?? 0.5;
    const slotW = w / n;
    const r = Math.min(slotW * 0.42, h * 0.4);
    for (let i = 0; i < n; i++) drawDial(meters[i], (i + 0.5) * slotW, h / 2, r, c, intensity);
  }

  function frame(t, params) {
    build(params);
    const drive = 0.7 + (params.intensity ?? 0.5) * 0.7;
    let dt = t - lastT;
    lastT = t;
    if (!(dt >= 0)) dt = 0;
    acc = Math.min(acc + dt, 0.1);
    const STEP = 1 / 120;
    while (acc >= STEP) {
      stepMeters(cache.meters, t, drive, STEP);
      acc -= STEP;
    }
    draw(t, params);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
      dialKey = '';
    },
    frame,
    staticFrame(params) {
      build(params);
      const drive = 0.7 + (params.intensity ?? 0.5) * 0.7;
      for (const m of cache.meters) {
        m.needle = targetLevel(m, 2.4, drive);
        m.vel = 0;
      }
      draw(2.4, params);
    },
    dispose() {
      cache = null;
    },
  };
}
