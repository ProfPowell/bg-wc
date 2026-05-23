// VB token resolver. CSS var string → RGBA tuple (0..1) via canvas2d round-trip.
// No build-time coupling, no dependency. Cached per input string.

const DEFAULTS = {
  '--color-background': 'transparent',
  '--color-foreground': '#1a1a1a',
  '--color-primary': '#3b82f6',
  '--color-accent': '#ec4899',
  '--color-info': '#10b981',
  '--color-success': '#22c55e',
  '--color-warning': '#f59e0b',
  '--color-error': '#ef4444',
};

const cache = new Map();
let probeCtx = null;

export function parseColor(str) {
  if (!str) return [0, 0, 0, 0];
  const key = String(str).trim();
  if (!key || key === 'transparent') return [0, 0, 0, 0];
  const hit = cache.get(key);
  if (hit) return hit;
  if (!probeCtx) probeCtx = document.createElement('canvas').getContext('2d');
  // Two assignments: first ensures fallback if second is invalid (fillStyle keeps prior value on bad input).
  probeCtx.fillStyle = '#000';
  probeCtx.fillStyle = key;
  const norm = probeCtx.fillStyle;
  let rgba;
  if (norm.startsWith('#')) {
    rgba = [
      parseInt(norm.slice(1, 3), 16) / 255,
      parseInt(norm.slice(3, 5), 16) / 255,
      parseInt(norm.slice(5, 7), 16) / 255,
      1,
    ];
  } else {
    const m = norm.match(/rgba?\(([^)]+)\)/);
    if (!m) {
      rgba = [0, 0, 0, 1];
    } else {
      const p = m[1].split(',').map((s) => parseFloat(s));
      rgba = [p[0] / 255, p[1] / 255, p[2] / 255, p[3] == null ? 1 : p[3]];
    }
  }
  cache.set(key, rgba);
  return rgba;
}

export function readTokenString(host, token, override) {
  const cs = getComputedStyle(host);
  if (override) {
    const v = cs.getPropertyValue(override).trim();
    if (v) return v;
  }
  const v = cs.getPropertyValue(token).trim();
  if (v) return v;
  return DEFAULTS[token] || '#000';
}

export function resolveTokens(host, mapping) {
  const out = {};
  for (const key of Object.keys(mapping)) {
    const { token, override } = mapping[key];
    out[key] = parseColor(readTokenString(host, token, override));
  }
  return out;
}

export function cssToRgba(str) {
  return parseColor(str);
}
