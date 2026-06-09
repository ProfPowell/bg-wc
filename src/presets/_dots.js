// Shared dot-art primitives for the dotwork / stipple / tapestry presets.
// Pure helpers (mix, buildDotPalette) + canvas2d drawing routines. All drawing
// is dot-based (filled arcs) to evoke hand-stippled Aboriginal / pointillist
// painting. Callers resolve theme tuples → css once per frame; drawing helpers
// take ready-made css strings.

import { rgbCss } from '../renderer/tokens.js';

export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Theme roles → vibrant dot palette (css strings). High intensity keeps colors
// saturated; low softens them toward bg (or white if bg is transparent).
export function buildDotPalette(c, intensity) {
  const roles = [c.primary, c.accent, c.info, c.success, c.warning, c.error].filter(Boolean);
  const toward = c.bg && c.bg[3] > 0.01 ? c.bg : [1, 1, 1];
  const amt = 0.45 * (1 - (intensity ?? 0.5)); // 0 vivid .. 0.45 soft
  const src = roles.length ? roles : [[0.9, 0.3, 0.3]];
  const pal = src.map((col) => rgbCss(mix(col, toward, amt)));
  const highlight = c.fg && c.fg[3] > 0.01 ? rgbCss(c.fg) : '#ffffff';
  return { pal, highlight };
}

export function dotCircle(c2d, x, y, r, css) {
  c2d.beginPath();
  c2d.arc(x, y, r, 0, Math.PI * 2);
  c2d.fillStyle = css;
  c2d.fill();
}

// Concentric ring rosette — the signature motif. `ci` offsets color choice.
export function concentricRings(c2d, cx, cy, opts) {
  const { rings, ringGap, dotR, pal, highlight, phase = 0, ci = 0 } = opts;
  const n = pal.length;
  for (let r = 0; r <= rings; r++) {
    const rad = r * ringGap + ringGap * 0.6;
    const count = r === 0 ? 1 : Math.max(6, Math.round((rad * 1.1) / dotR));
    const css = r % 2 ? pal[(ci + r) % n] : highlight;
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + phase;
      dotCircle(c2d, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, dotR, css);
    }
  }
}

// Golden-angle phyllotaxis spiral of dots.
export function phyllotaxis(c2d, cx, cy, opts) {
  const { n, scale, dotR, pal, phase = 0, dir = 1, ci = 0 } = opts;
  const gold = 2.399963;
  const m = pal.length;
  for (let i = 0; i < n; i++) {
    const a = i * gold * dir + phase;
    const rad = Math.sqrt(i) * scale;
    dotCircle(c2d, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, dotR, pal[(ci + i) % m]);
  }
}

// Paired counter-offset spiral arms.
export function doubleSpiral(c2d, cx, cy, opts) {
  const { arms = 2, n, b, dotR, pal, phase = 0, dir = 1, ci = 0 } = opts;
  const m = pal.length;
  for (let arm = 0; arm < arms; arm++) {
    const off = (arm / arms) * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const th = (k / 22) * Math.PI;
      const rad = b * th;
      const a = th + off + phase * dir;
      dotCircle(
        c2d,
        cx + Math.cos(a) * rad,
        cy + Math.sin(a) * rad,
        dotR,
        pal[(ci + arm * 4 + k) % m]
      );
    }
  }
}

// Single Archimedean whorl traced in dots (fingerprint / cloud swirl).
export function whorl(c2d, cx, cy, opts) {
  const { turns, b, dotR, baseCss, highlight, phase = 0, dir = 1 } = opts;
  const steps = Math.round(turns * 40);
  for (let k = 0; k < steps; k++) {
    const th = (k / 40) * Math.PI * 2;
    const rad = b * th;
    const a = th * dir + phase * dir;
    dotCircle(
      c2d,
      cx + Math.cos(a) * rad,
      cy + Math.sin(a) * rad,
      dotR,
      k % 6 < 3 ? baseCss : highlight
    );
  }
}

// Dense graded pointillist fill. Writes `count` jittered dots across w×h.
export function stippleField(c2d, w, h, opts) {
  const { rng, count, dotR, pal } = opts;
  const n = pal.length;
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const m = (Math.sin(x * 0.012) + Math.cos(y * 0.013) + 2) / 4; // 0..1 spatial gradient
    dotCircle(c2d, x, y, dotR * (0.5 + rng()), pal[Math.min(n - 1, (m * n) | 0)]);
  }
}
