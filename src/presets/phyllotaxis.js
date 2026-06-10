import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// Phyllotaxis — golden-angle spiral (Vogel model). Dots are emitted from the
// centre with a counter that advances with `t`; each dot's radius ∝ √age and its
// angle is index · 137.5°, so dots spiral outward as they age and the oldest are
// recycled (faded) at the rim once the count exceeds a density-derived cap. The
// whole field rotates slowly. Dot colour cycles through theme roles by ring band;
// `intensity` sets the dot-size contrast between bands. Deterministic — the field
// depends only on `t`, size and params, not on a PRNG.

const GOLDEN = Math.PI * (3 - Math.sqrt(5)); // 137.5° in radians
const EMIT_RATE = 26; // dots emitted per second
const ROT_SPEED = 0.05; // whole-field rotation (rad/s)

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;

  function capFor(params) {
    return Math.round(180 + 1000 * (params.density ?? 0.5));
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const roles = [c.primary, c.accent, c.info, c.success, c.warning].filter(Boolean);
    if (!roles.length) roles.push(c.fg || [0.1, 0.1, 0.1]);

    const cap = capFor(params);
    const cx = w / 2;
    const cy = h / 2;
    const scale = (0.47 * Math.min(w, h)) / Math.sqrt(cap);
    const intensity = params.intensity ?? 0.5;
    const baseR = Math.max(1.5, scale * 0.62);
    const band = Math.max(8, cap * 0.06); // dots per colour band
    const rot = t * ROT_SPEED;

    // Sliding window of live dots: youngest (age 0) at the centre, oldest
    // (age cap) at the rim. N advances with time so the field grows + recycles.
    const N = t * EMIT_RATE;
    const lo = Math.max(0, Math.ceil(N - cap));
    const hi = Math.floor(N);

    for (let i = lo; i <= hi; i++) {
      const age = N - i;
      if (age < 0) continue;
      const r = scale * Math.sqrt(age);
      const a = i * GOLDEN + rot;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;

      // Fade in near the centre and out at the rim so recycling is seamless.
      const alpha = smoothstep(0, cap * 0.06, age) * smoothstep(cap, cap * 0.82, age);
      if (alpha <= 0.01) continue;

      const bandIdx = ((Math.floor(age / band) % roles.length) + roles.length) % roles.length;
      const col = roles[bandIdx];
      // Higher intensity → more size variation between adjacent bands.
      const wob = 1 + intensity * 0.6 * Math.sin(bandIdx * 1.7);
      const dotR = baseR * wob;

      c2d.fillStyle = rgb(col, alpha);
      c2d.beginPath();
      c2d.arc(x, y, dotR, 0, Math.PI * 2);
      c2d.fill();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      // Draw a fully-grown field (counter at the cap) rather than a single seed.
      frame(capFor(params) / EMIT_RATE, params);
    },
    dispose() {},
  };
}
