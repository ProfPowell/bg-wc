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
  if (!probeCtx) {
    probeCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  }
  // Render the color to a 1×1 pixel and read it back. Going through actual
  // pixels (instead of parsing the serialized fillStyle string) handles every
  // CSS color the browser can render — oklch/lab/lch/color()/hsl/named/hex/rgb.
  // Design systems like vanilla-breeze express tokens as oklch(), which the old
  // string parser collapsed to black: fillStyle serializes it back as
  // "oklch(...)", matching neither the #hex nor the rgb() branch. The two
  // fillStyle assignments keep #000 when `key` is invalid (fillStyle retains its
  // prior value on bad input), so unparseable colors stay black rather than throw.
  probeCtx.clearRect(0, 0, 1, 1);
  probeCtx.fillStyle = '#000';
  probeCtx.fillStyle = key;
  probeCtx.fillRect(0, 0, 1, 1);
  const d = probeCtx.getImageData(0, 0, 1, 1).data;
  const rgba = [d[0] / 255, d[1] / 255, d[2] / 255, d[3] / 255];
  cache.set(key, rgba);
  return rgba;
}

export function readTokenString(host, token, override) {
  const cs = getComputedStyle(host);
  if (override) {
    const overrides = Array.isArray(override) ? override : [override];
    for (const o of overrides) {
      const v = cs.getPropertyValue(o).trim();
      if (v) return v;
    }
  }
  const tokens = Array.isArray(token) ? token : [token];
  for (const t of tokens) {
    const v = cs.getPropertyValue(t).trim();
    if (v) return v;
  }
  return DEFAULTS[tokens[0]] || '#000';
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
