// VB token resolver. CSS var string → RGBA tuple (0..1) via canvas2d round-trip.
// No build-time coupling, no dependency. Cached per input string.

// CSS color strings from a [0..1] RGB(A) tuple. Centralizes the assembly that
// canvas2d presets used to each re-implement. Components match (channels floored).
export function rgbCss(c) {
  return `rgb(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0})`;
}
export function rgbaCss(c, a = 1) {
  return `rgba(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0},${a})`;
}

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

// Parsed-color cache, capped so a long-lived SPA cycling through many dynamic
// colors can't grow it without bound. Map insertion order gives a cheap LRU:
// hits are re-inserted (most-recently-used last) and the oldest key is evicted
// at the cap.
const CACHE_CAP = 128;
const cache = new Map();
let probeCtx = null;
let probeEl = null;
// Ambient dark-preference MQL: qualifies light-dark() cache keys so an `auto`
// scheme ("light dark"), whose resolution follows the OS preference, can't
// serve a stale arm after the preference flips mid-session.
const darkMq =
  typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;

function cacheGet(key) {
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key); // re-insert to mark most-recently-used
    cache.set(key, hit);
  }
  return hit;
}

function cacheSet(key, rgba) {
  if (cache.size >= CACHE_CAP) cache.delete(cache.keys().next().value);
  cache.set(key, rgba);
}

// Resolve a CSS color the canvas can't parse (notably `light-dark()`) to a
// concrete color via the DOM. The browser resolves `light-dark()` against an
// element's `color-scheme`, which a bare canvas context has no notion of — so
// a theme that serves tokens as `light-dark(...)` (e.g. vanilla-breeze in
// light/auto mode) would otherwise collapse to black. The probe carries the
// caller's scheme so a host inside a scheme island resolves its own arm, and
// is detached again after the read — it must not linger in the user's DOM.
function resolveViaDom(str, scheme) {
  if (typeof document === 'undefined' || !document.body) return str;
  if (!probeEl) {
    probeEl = document.createElement('span');
    probeEl.setAttribute('aria-hidden', 'true');
    probeEl.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0';
  }
  probeEl.style.colorScheme = scheme || '';
  probeEl.style.color = '';
  probeEl.style.color = str; // invalid input leaves it empty
  document.body.appendChild(probeEl);
  const resolved = getComputedStyle(probeEl).color;
  probeEl.remove();
  return resolved || str;
}

export function parseColor(str, scheme) {
  if (!str) return [0, 0, 0, 0];
  const key = String(str).trim();
  if (!key || key === 'transparent') return [0, 0, 0, 0];
  // `light-dark()` is scheme-dependent (the same string resolves differently in
  // light vs dark), so it is cached under a scheme-qualified key. resolveTokens
  // passes the host's scheme; bare cssToRgba() falls back to the page's.
  if (key.indexOf('light-dark(') >= 0) {
    if (scheme == null) {
      scheme =
        (typeof document !== 'undefined' &&
          document.body &&
          getComputedStyle(document.body).colorScheme) ||
        '';
    }
    const ldKey = `${key}@${scheme}|${darkMq?.matches ? 'd' : 'l'}`;
    const ldHit = cacheGet(ldKey);
    if (ldHit) return ldHit;
    const rgba = parseColor(resolveViaDom(key, scheme));
    cacheSet(ldKey, rgba);
    return rgba;
  }
  const hit = cacheGet(key);
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
  cacheSet(key, rgba);
  return rgba;
}

export function readTokenString(host, token, override, cs = getComputedStyle(host)) {
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
  // One computed-style read for the whole mapping — this runs per frame, and a
  // per-key getComputedStyle(host) is 8 forced style resolutions per element.
  const cs = getComputedStyle(host);
  const scheme = cs.colorScheme || '';
  const out = {};
  for (const key of Object.keys(mapping)) {
    const { token, override } = mapping[key];
    out[key] = parseColor(readTokenString(host, token, override, cs), scheme);
  }
  return out;
}

export function cssToRgba(str) {
  return parseColor(str);
}
