import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { rgbaCss as rgb } from '../renderer/tokens.js';

// alchemy — an engraved esoteric diagram. Nested rings carry invented sigil
// glyphs and tick scales, an inscribed polygon and small orbit circles sit
// inside, and seeded chords connect points across rings. Each ring rotates at
// its own slow rate; on the first cycle every element etches on progressively
// (partial arcs / growing chords). Monoline `fg` on `bg` with one `accent`
// ring. `density` = ring/chord count, `intensity` = line weight + contrast.

const ETCH_SEC = 10; // seconds for the full diagram to etch on
const START_OFF = 7; // clock offset so a frozen first frame shows most of the diagram

function ease(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
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
    const nRings = 3 + Math.round(density * 2); // 3..5
    const rings = [];
    for (let i = 0; i < nRings; i++) {
      rings.push({
        rf: 0.92 - i * (0.78 / nRings), // radius fraction of R
        speed: (rng() - 0.5) * 0.1, // rad/s, each its own slow rate
        phase: rng() * Math.PI * 2,
        marks: i === 0 ? 12 : 8 + ((rng() * 16) | 0),
        kind: i === 0 ? 'sigils' : rng() < 0.5 ? 'ticks' : 'orbits',
        accent: false,
        etchAt: i / (nRings + 2),
      });
    }
    rings[1 + ((rng() * (nRings - 1)) | 0)].accent = true;
    // Sigil shapes for the outer ring: each an invented 3-4 stroke mark.
    const sigils = [];
    for (let s = 0; s < 12; s++) {
      const strokes = [];
      const nSt = 2 + ((rng() * 2) | 0);
      for (let k = 0; k < nSt; k++) {
        strokes.push({
          kind: rng() < 0.4 ? 'arc' : 'line',
          a: rng() * Math.PI * 2,
          b: rng() * Math.PI * 2,
          r: 0.25 + rng() * 0.65,
        });
      }
      sigils.push(strokes);
    }
    // Chords: seeded pairs of (ring, angle) endpoints.
    const chords = [];
    const nCh = 4 + Math.round(density * 8);
    for (let k = 0; k < nCh; k++) {
      chords.push({
        r1: (rng() * nRings) | 0,
        a1: rng() * Math.PI * 2,
        r2: (rng() * nRings) | 0,
        a2: rng() * Math.PI * 2,
        etchAt: 0.55 + (k / nCh) * 0.4,
      });
    }
    const polySides = 3 + ((rng() * 3) | 0); // inscribed triangle/square/pentagon
    cache = { key, rings, sigils, chords, polySides };
    return cache;
  }

  function drawSigil(strokes, x, y, s) {
    c2d.save();
    c2d.translate(x, y);
    for (const st of strokes) {
      c2d.beginPath();
      if (st.kind === 'line') {
        c2d.moveTo(Math.cos(st.a) * s * st.r, Math.sin(st.a) * s * st.r);
        c2d.lineTo(Math.cos(st.b) * s * st.r, Math.sin(st.b) * s * st.r);
      } else {
        c2d.arc(0, 0, s * st.r * 0.6, st.a, st.a + Math.PI * (0.4 + st.r));
      }
      c2d.stroke();
    }
    c2d.restore();
  }

  function frame(t0, params) {
    const t = t0 + START_OFF;
    const { rings, sigils, chords, polySides } = build(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const ink = c.fg || [0.75, 0.72, 0.65];
    const accent = c.accent || [0.8, 0.5, 0.3];
    const intensity = params.intensity ?? 0.5;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.44;
    const etch = Math.min(1, t / ETCH_SEC);
    const lw = Math.max(1, Math.min(w, h) * (0.0018 + 0.0016 * intensity));
    c2d.lineCap = 'round';

    // Rings.
    for (const ring of rings) {
      const reveal = ease((etch - ring.etchAt) * 3);
      if (reveal <= 0) continue;
      const r = R * ring.rf;
      const rot = ring.phase + t * ring.speed;
      const col = ring.accent ? accent : ink;
      c2d.strokeStyle = rgb(col, 0.5 + 0.4 * intensity);
      c2d.lineWidth = lw;
      c2d.beginPath();
      c2d.arc(cx, cy, r, rot, rot + Math.PI * 2 * reveal);
      c2d.stroke();
      if (reveal < 1) continue;

      if (ring.kind === 'sigils') {
        const ss = R * 0.055;
        c2d.strokeStyle = rgb(col, 0.7 + 0.3 * intensity);
        for (let m = 0; m < 12; m++) {
          const a = rot + (m / 12) * Math.PI * 2;
          drawSigil(
            sigils[m],
            cx + Math.cos(a) * (r - ss * 1.6),
            cy + Math.sin(a) * (r - ss * 1.6),
            ss
          );
        }
      } else if (ring.kind === 'ticks') {
        c2d.beginPath();
        for (let m = 0; m < ring.marks; m++) {
          const a = rot + (m / ring.marks) * Math.PI * 2;
          const inner = m % 4 === 0 ? 0.95 : 0.975;
          c2d.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          c2d.lineTo(cx + Math.cos(a) * r * inner, cy + Math.sin(a) * r * inner);
        }
        c2d.stroke();
      } else {
        // Small orbit circles riding the ring.
        for (let m = 0; m < Math.min(6, ring.marks); m++) {
          const a = rot + (m / Math.min(6, ring.marks)) * Math.PI * 2;
          c2d.beginPath();
          c2d.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, R * 0.022, 0, Math.PI * 2);
          c2d.stroke();
        }
      }
    }

    // Inscribed polygon on the innermost ring.
    const polyReveal = ease((etch - 0.45) * 3);
    if (polyReveal > 0) {
      const r = R * rings[rings.length - 1].rf;
      const rot = -t * 0.04;
      c2d.strokeStyle = rgb(ink, (0.5 + 0.4 * intensity) * polyReveal);
      c2d.lineWidth = lw;
      c2d.beginPath();
      for (let i = 0; i <= polySides; i++) {
        const a = rot + (i / polySides) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) c2d.moveTo(x, y);
        else c2d.lineTo(x, y);
      }
      c2d.stroke();
    }

    // Chords between rings (endpoints ride their ring rotations).
    c2d.lineWidth = lw * 0.8;
    for (const ch of chords) {
      const reveal = ease((etch - ch.etchAt) * 4);
      if (reveal <= 0) continue;
      const ring1 = rings[ch.r1];
      const ring2 = rings[ch.r2];
      const a1 = ch.a1 + ring1.phase + t * ring1.speed;
      const a2 = ch.a2 + ring2.phase + t * ring2.speed;
      const x1 = cx + Math.cos(a1) * R * ring1.rf;
      const y1 = cy + Math.sin(a1) * R * ring1.rf;
      const x2 = cx + Math.cos(a2) * R * ring2.rf;
      const y2 = cy + Math.sin(a2) * R * ring2.rf;
      c2d.strokeStyle = rgb(ink, 0.3 + 0.25 * intensity);
      c2d.beginPath();
      c2d.moveTo(x1, y1);
      c2d.lineTo(x1 + (x2 - x1) * reveal, y1 + (y2 - y1) * reveal);
      c2d.stroke();
      // Node dots at revealed endpoints.
      c2d.fillStyle = rgb(ink, 0.6);
      c2d.beginPath();
      c2d.arc(x1, y1, lw * 1.6, 0, Math.PI * 2);
      c2d.fill();
    }

    // Centre mark.
    c2d.fillStyle = rgb(accent, 0.8);
    c2d.beginPath();
    c2d.arc(cx, cy, lw * 2.4, 0, Math.PI * 2);
    c2d.fill();
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      cache = null;
    },
    frame,
    staticFrame(params) {
      frame(ETCH_SEC, params); // fully etched diagram
    },
    dispose() {
      cache = null;
    },
  };
}
