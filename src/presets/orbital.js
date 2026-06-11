import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// orbital — a planetary system. Satellites ride seeded ellipses around a
// central planet with correct Keplerian speed variation (solved from the mean
// anomaly each frame, so they genuinely sweep faster at periapsis), trailing
// faded orbit arcs; occasionally a Hohmann-style transfer arc animates a
// payload between two orbits. `density` = satellite count, `intensity` =
// trail/glow strength. Fully deterministic from `t`.

const TRANSFER_PERIOD = 14; // seconds between transfer departures

function kepler(M, e) {
  // Solve E - e·sinE = M by a few Newton steps (e is small enough).
  let E = M;
  for (let i = 0; i < 5; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32(params.seed | 0 || 1);
    const n = 3 + Math.round((params.density ?? 0.5) * 5);
    const R = Math.min(w, h) * 0.46;
    const sats = [];
    for (let i = 0; i < n; i++) {
      const a = R * (0.25 + (i / n) * 0.72); // semi-major axis, spread outward
      sats.push({
        a,
        e: 0.05 + rng() * 0.35,
        tilt: rng() * Math.PI * 2, // ellipse orientation
        period: 6 * Math.pow(a / (R * 0.4), 1.5), // Kepler's third law-ish
        phase: rng() * Math.PI * 2,
        size: Math.max(2, R * (0.012 + rng() * 0.012)),
        ci: (rng() * 4) | 0,
      });
    }
    // Transfer pair: between two adjacent orbits.
    const ti = (rng() * (n - 1)) | 0;
    cache = { key, sats, R, transferFrom: ti, transferTo: ti + 1 };
    return cache;
  }

  // Position on a sat's ellipse at mean anomaly M (focus at origin).
  function posOf(sat, M) {
    const E = kepler(M, sat.e);
    const x = sat.a * (Math.cos(E) - sat.e);
    const y = sat.a * Math.sqrt(1 - sat.e * sat.e) * Math.sin(E);
    const ct = Math.cos(sat.tilt);
    const st = Math.sin(sat.tilt);
    return [x * ct - y * st, x * st + y * ct];
  }

  function frame(t, params) {
    const { sats, R, transferFrom, transferTo } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const cx = w / 2;
    const cy = h / 2;
    const roles = [c.primary, c.accent, c.info, c.warning].filter(Boolean);
    if (!roles.length) roles.push(c.fg || [0.7, 0.75, 0.8]);
    const fg = c.fg || [0.7, 0.75, 0.8];
    const intensity = params.intensity ?? 0.5;

    // Orbit paths (faint full ellipses).
    c2d.lineWidth = 1;
    for (const s of sats) {
      c2d.strokeStyle = rgb(fg, 0.12 + 0.1 * intensity);
      c2d.beginPath();
      for (let k = 0; k <= 72; k++) {
        const [x, y] = posOf(s, (k / 72) * Math.PI * 2);
        if (k === 0) c2d.moveTo(cx + x, cy + y);
        else c2d.lineTo(cx + x, cy + y);
      }
      c2d.closePath();
      c2d.stroke();
    }

    // Planet.
    const pr = R * 0.1;
    const g = c2d.createRadialGradient(cx - pr * 0.3, cy - pr * 0.3, pr * 0.2, cx, cy, pr);
    g.addColorStop(0, rgb(roles[0], 1));
    g.addColorStop(
      1,
      rgb(
        roles[0].map((v) => v * 0.4),
        1
      )
    );
    c2d.fillStyle = g;
    c2d.beginPath();
    c2d.arc(cx, cy, pr, 0, Math.PI * 2);
    c2d.fill();

    // Satellites with trailing arcs (recent path, Keplerian speeds).
    for (const s of sats) {
      const M = s.phase + (t / s.period) * Math.PI * 2;
      const col = roles[s.ci % roles.length];
      // Trail: sample backwards in time so the spacing shows the speed-up.
      c2d.lineWidth = Math.max(1, s.size * 0.5);
      c2d.lineCap = 'round';
      const steps = 14;
      const span = s.period * 0.16;
      let prev = posOf(s, M);
      for (let k = 1; k <= steps; k++) {
        const Mk = s.phase + ((t - (k / steps) * span) / s.period) * Math.PI * 2;
        const p = posOf(s, Mk);
        c2d.strokeStyle = rgb(col, (1 - k / steps) * (0.35 + 0.4 * intensity));
        c2d.beginPath();
        c2d.moveTo(cx + prev[0], cy + prev[1]);
        c2d.lineTo(cx + p[0], cy + p[1]);
        c2d.stroke();
        prev = p;
      }
      const [x, y] = posOf(s, M);
      c2d.fillStyle = rgb(col, 1);
      c2d.beginPath();
      c2d.arc(cx + x, cy + y, s.size, 0, Math.PI * 2);
      c2d.fill();
    }

    // Hohmann-style transfer: a payload arcs between two orbits periodically.
    const from = sats[transferFrom];
    const to = sats[transferTo];
    const tp = (t % TRANSFER_PERIOD) / TRANSFER_PERIOD;
    if (tp < 0.42) {
      const f = tp / 0.42;
      // Half-ellipse between the two radii along the departure direction.
      const aT = (from.a + to.a) / 2;
      const eT = Math.abs(to.a - from.a) / (to.a + from.a);
      const dir = from.tilt + 0.6;
      const ang = f * Math.PI; // true-anomaly-ish sweep over the half ellipse
      const r = (aT * (1 - eT * eT)) / (1 + eT * Math.cos(ang));
      const x = Math.cos(ang + dir) * r;
      const y = Math.sin(ang + dir) * r;
      // Dashed path swept so far.
      c2d.strokeStyle = rgb(c.success || roles[1 % roles.length], 0.5);
      c2d.setLineDash([4, 5]);
      c2d.beginPath();
      for (let k = 0; k <= 24; k++) {
        const ak = (k / 24) * ang;
        const rk = (aT * (1 - eT * eT)) / (1 + eT * Math.cos(ak));
        const px = cx + Math.cos(ak + dir) * rk;
        const py = cy + Math.sin(ak + dir) * rk;
        if (k === 0) c2d.moveTo(px, py);
        else c2d.lineTo(px, py);
      }
      c2d.stroke();
      c2d.setLineDash([]);
      c2d.fillStyle = rgb(c.success || roles[1 % roles.length], 1);
      c2d.beginPath();
      c2d.arc(cx + x, cy + y, Math.max(2, R * 0.012), 0, Math.PI * 2);
      c2d.fill();
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
      frame(TRANSFER_PERIOD * 0.3, params); // mid-transfer still
    },
    dispose() {
      cache = null;
    },
  };
}
