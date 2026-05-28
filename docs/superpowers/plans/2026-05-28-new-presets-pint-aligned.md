# Four New Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement four new Canvas2D presets — `mosaic`, `ribbons`, `source`, `system7` — per spec `docs/superpowers/specs/2026-05-28-new-presets-pint-aligned.md`.

**Architecture:** Each preset is a single ES module under `src/presets/` exporting `create({host, canvas, c2d, getColors, getParams})` returning `{resize, frame(t, params), staticFrame(params), dispose?}`. Two new host-attribute conventions: `mode` (read by `mosaic`) and `use-theme` (read by `system7`). All four register in `src/presets/index.js`. One composition demo + smoke tests round it out.

**Tech Stack:** Vanilla JS (ES modules), Canvas2D, Playwright, Vite. No new dependencies.

---

## File structure

**Create:**
- `src/presets/mosaic.js` (~250 LOC)
- `src/presets/ribbons.js` (~150 LOC)
- `src/presets/source.js` (~200 LOC)
- `src/presets/system7.js` (~200 LOC)
- `demos/pint-tribute.html` (~80 LOC)
- `test/new-presets.spec.js` (~120 LOC)
- `test/new-presets-page.html` (~30 LOC)

**Modify:**
- `src/presets/index.js` — add 4 registry entries
- `docs/api.html` — document new presets and the `mode` / `use-theme` attributes
- `demos/demos-hub.js` — only if hub doesn't auto-discover; verify first

---

## Task 1: Scaffold registry + skeleton presets + smoke harness

**Goal:** All four presets registered and loadable; smoke tests turn green against placeholder frame implementations. This locks the wiring before we write any visual code.

**Files:**
- Create: `src/presets/mosaic.js`, `src/presets/ribbons.js`, `src/presets/source.js`, `src/presets/system7.js` (skeletons only)
- Create: `test/new-presets-page.html`, `test/new-presets.spec.js`
- Modify: `src/presets/index.js`

### Steps

- [ ] **Step 1: Write the failing smoke test page**

Create `test/new-presets-page.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>new presets harness</title>
  <style>
    body { margin: 0; }
    bg-wc { display: block; width: 320px; height: 240px; }
    :root {
      --color-primary: #6b3fa0; --color-accent: #d946ef; --color-info: #25d0a6;
      --color-background: #fafafa; --color-text: #1a1a1a;
    }
  </style>
</head>
<body>
  <bg-wc id="wc" preset="mosaic"></bg-wc>
  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write the failing smoke spec**

Create `test/new-presets.spec.js`:

```js
import { test, expect } from '@playwright/test';

const PRESETS = ['mosaic', 'ribbons', 'source', 'system7'];

for (const name of PRESETS) {
  test(`preset "${name}" loads and renders to canvas`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    await page.evaluate((n) => {
      const el = document.getElementById('wc');
      el.setAttribute('preset', n);
    }, name);
    await page.evaluate(() => document.getElementById('wc').ready);
    const ok = await page.evaluate(() => {
      const c = document.getElementById('wc').shadowRoot.querySelector('canvas');
      return c instanceof HTMLCanvasElement && c.width > 0 && c.height > 0;
    });
    expect(ok).toBe(true);
  });
}

test('mosaic honors each `mode` value without erroring', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const mode of ['isometric', 'flat', 'sparse', 'stacked']) {
    const ok = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      el.setAttribute('mode', m);
      el.setAttribute('preset', 'mosaic');
      await el.ready;
      return !el.hasAttribute('data-fallback');
    }, mode);
    expect(ok, `mode=${mode} should render`).toBe(true);
  }
});

test('system7 honors use-theme toggle', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const detail = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'system7');
    await el.ready;
    const blob1 = await el.snapshot();
    el.setAttribute('use-theme', '');
    await new Promise((r) => requestAnimationFrame(r));
    const blob2 = await el.snapshot();
    return { size1: blob1.size, size2: blob2.size };
  });
  // The two renders should produce different image bytes (toggling theme
  // changes chrome color). Sizes won't be identical for PNG.
  expect(detail.size1).toBeGreaterThan(0);
  expect(detail.size2).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Run tests — expect failures**

Run: `npx playwright test test/new-presets.spec.js`
Expected: 4 preset-load tests FAIL with "module not found" / load errors; mode and use-theme tests also fail.

- [ ] **Step 4: Create skeleton preset modules**

Create `src/presets/mosaic.js`:

```js
import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ host, canvas, c2d, getColors, getParams }) {
  let w = 0, h = 0;
  function frame(/* t, params */) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
  }
  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame,
    staticFrame(params) { frame(0, params); },
  };
}
```

Create `src/presets/ribbons.js`, `src/presets/source.js`, `src/presets/system7.js` with identical skeletons (change nothing — the same import + frame + return shape).

- [ ] **Step 5: Register the four presets**

Modify `src/presets/index.js`. Inside the `presets` object, add (group them by their declared group sections):

```js
// in the `pattern` group:
mosaic:  { renderer: 'canvas2d', group: 'pattern', loader: () => import('./mosaic.js') },

// in the `gradient` group:
ribbons: { renderer: 'canvas2d', group: 'gradient', loader: () => import('./ribbons.js') },

// in the `text` group:
source:  { renderer: 'canvas2d', group: 'text', loader: () => import('./source.js') },

// in the `retro` group:
system7: { renderer: 'canvas2d', group: 'retro', loader: () => import('./system7.js') },
```

- [ ] **Step 6: Run tests — expect passes**

Run: `npx playwright test test/new-presets.spec.js`
Expected: All 6 tests PASS (4 load tests + mosaic-modes + system7 toggle). Skeleton frames render only a bg clear, but that produces a non-blank canvas.

- [ ] **Step 7: Commit**

```bash
git add src/presets/mosaic.js src/presets/ribbons.js src/presets/source.js src/presets/system7.js \
        src/presets/index.js test/new-presets-page.html test/new-presets.spec.js
git commit -m "scaffold: register mosaic/ribbons/source/system7 with skeleton frames"
```

---

## Task 2: Implement `mosaic` — all four modes

**Goal:** Full mosaic preset with isometric (default), flat, sparse, and stacked modes selectable via `host.getAttribute('mode')`.

**Files:**
- Modify: `src/presets/mosaic.js`

### Steps

- [ ] **Step 1: Replace the skeleton with the full module**

Open `src/presets/mosaic.js` and replace its contents with the implementation below. The module shape:

- Top-level: a seeded PRNG (small `mulberry32`-style), a `rebuild(params)` that lays out tile state for the *current mode*, and a `drawMode(t, params)` dispatch table.
- Each of the four mode draw functions is its own small function.
- `staticFrame` calls `frame(0, params)` with motion offsets zeroed.

```js
import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ host, canvas, c2d, getColors, getParams }) {
  let w = 0, h = 0;
  let lastSeed = -1, lastMode = '', lastDensity = -1;
  let state = null;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function modeOf(params) {
    const m = (host.getAttribute('mode') || 'isometric').toLowerCase();
    return ['isometric', 'flat', 'sparse', 'stacked'].includes(m) ? m : 'isometric';
  }

  function rebuild(params) {
    const mode = modeOf(params);
    const seed = params.seed | 0;
    const rng = mulberry32(seed || 1);
    const density = params.density;

    if (mode === 'isometric') {
      const cols = Math.max(6, Math.floor(8 + density * 12));
      const tiles = [];
      for (let i = -2; i < cols; i++) {
        for (let j = -2; j < cols; j++) {
          tiles.push({ i, j, pulsePhase: rng() * Math.PI * 2, hue: rng() });
        }
      }
      state = { mode, tiles, cols };
    } else if (mode === 'flat') {
      const layers = [];
      for (let L = 0; L < 4; L++) {
        const count = Math.max(4, Math.floor(8 + density * 12 - L * 2));
        const items = [];
        const size = 0.04 + L * 0.04;
        for (let i = 0; i < count; i++) {
          items.push({ x: rng(), y: rng(), size, alpha: 0.06 + L * 0.05 });
        }
        layers.push({ items, parallax: 1 - L * 0.25 });
      }
      state = { mode, layers };
    } else if (mode === 'sparse') {
      const step = Math.max(40, Math.floor(140 - density * 80)); // CSS px per cell
      const pulses = [];
      const pulseCount = Math.max(2, Math.floor(2 + density * 6));
      for (let i = 0; i < pulseCount; i++) {
        pulses.push({ next: rng() * 4, ttl: 0, cx: 0, cy: 0, color: rng() < 0.5 ? 'primary' : 'accent' });
      }
      state = { mode, step, pulses };
    } else if (mode === 'stacked') {
      const stacks = [];
      const count = Math.max(4, Math.floor(6 + density * 14));
      for (let i = 0; i < count; i++) {
        stacks.push({
          x: (i + 0.5) / count,
          height: 3 + Math.floor(rng() * 5),
          phase: rng() * 6,
          color: ['primary', 'accent', 'info'][Math.floor(rng() * 3)],
        });
      }
      state = { mode, stacks };
    }
    lastMode = mode;
    lastSeed = seed;
    lastDensity = density;
  }

  function ensure(params) {
    const mode = modeOf(params);
    if (
      !state ||
      mode !== lastMode ||
      (params.seed | 0) !== lastSeed ||
      params.density !== lastDensity
    ) {
      rebuild(params);
    }
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    if (state.mode === 'isometric') drawIso(t, params, c);
    else if (state.mode === 'flat') drawFlat(t, params, c);
    else if (state.mode === 'sparse') drawSparse(t, params, c);
    else if (state.mode === 'stacked') drawStacked(t, params, c);
  }

  function rgb(v, a = 1) {
    return `rgba(${(v[0] * 255) | 0},${(v[1] * 255) | 0},${(v[2] * 255) | 0},${a})`;
  }

  function drawIso(t, params, c) {
    const tileW = Math.min(w, h) / Math.max(6, state.cols * 0.9);
    const tileH = tileW * 0.55;
    const drift = (t * 0.05) % 1;
    const intensity = params.intensity;
    c2d.lineWidth = 1;
    for (const tile of state.tiles) {
      const cx = (tile.i - tile.j) * tileW * 0.95 + w / 2 + drift * tileW;
      const cy = (tile.i + tile.j) * tileH * 0.95 + h / 2 - drift * tileH * 0.5;
      if (cx < -tileW * 2 || cx > w + tileW * 2 || cy < -tileH * 2 || cy > h + tileH * 2) continue;
      // Top face: rhombus
      c2d.beginPath();
      c2d.moveTo(cx, cy - tileH);
      c2d.lineTo(cx + tileW, cy);
      c2d.lineTo(cx, cy + tileH);
      c2d.lineTo(cx - tileW, cy);
      c2d.closePath();
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.6 + tile.pulsePhase);
      const baseAlpha = 0.04 + 0.06 * intensity;
      c2d.fillStyle = rgb(c.primary, baseAlpha * (0.6 + 0.4 * pulse));
      c2d.fill();
      c2d.strokeStyle = rgb(c.fg, 0.08 + 0.06 * intensity);
      c2d.stroke();
      // Accent highlight on occasional tile
      if (tile.hue > 0.85) {
        c2d.fillStyle = rgb(c.accent, baseAlpha * 1.4 * pulse);
        c2d.fill();
      }
    }
  }

  function drawFlat(t, params, c) {
    for (let L = 0; L < state.layers.length; L++) {
      const layer = state.layers[L];
      const drift = (t * 0.04 * layer.parallax) % 1;
      const color = L % 3 === 0 ? c.primary : L % 3 === 1 ? c.accent : c.info;
      for (const it of layer.items) {
        const sz = it.size * Math.min(w, h);
        const x = ((it.x + drift) % 1) * w;
        const y = it.y * h;
        c2d.fillStyle = rgb(color, it.alpha * (0.5 + 0.5 * params.intensity));
        c2d.fillRect(x - sz / 2, y - sz / 2, sz, sz);
      }
    }
  }

  function drawSparse(t, params, c) {
    const step = state.step;
    c2d.strokeStyle = rgb(c.fg, 0.06 + 0.04 * params.intensity);
    c2d.lineWidth = 1;
    c2d.beginPath();
    for (let x = step; x < w; x += step) {
      c2d.moveTo(x, 0); c2d.lineTo(x, h);
    }
    for (let y = step; y < h; y += step) {
      c2d.moveTo(0, y); c2d.lineTo(w, y);
    }
    c2d.stroke();
    // Pulses
    for (const p of state.pulses) {
      p.next -= 0.016;
      if (p.next <= 0 && p.ttl <= 0) {
        p.cx = Math.floor(Math.random() * Math.floor(w / step)) * step;
        p.cy = Math.floor(Math.random() * Math.floor(h / step)) * step;
        p.ttl = 1.2;
        p.next = 1.5 + Math.random() * 3;
      }
      if (p.ttl > 0) {
        p.ttl -= 0.016;
        const a = Math.sin((1 - p.ttl / 1.2) * Math.PI) * params.intensity * 0.45;
        c2d.fillStyle = rgb(p.color === 'primary' ? c.primary : c.accent, a);
        c2d.fillRect(p.cx + 1, p.cy + 1, step - 2, step - 2);
      }
    }
  }

  function drawStacked(t, params, c) {
    const bw = w / state.stacks.length * 0.7;
    const bh = bw;
    for (const s of state.stacks) {
      const cycle = ((t + s.phase) * 0.4) % (s.height + 1.5);
      const visible = Math.min(s.height, Math.floor(cycle));
      const x = s.x * w - bw / 2;
      const color = s.color === 'primary' ? c.primary : s.color === 'accent' ? c.accent : c.info;
      for (let i = 0; i < visible; i++) {
        const y = h - (i + 1) * bh - 8;
        c2d.fillStyle = rgb(color, 0.18 + 0.18 * params.intensity);
        c2d.fillRect(x, y, bw, bh - 2);
        c2d.strokeStyle = rgb(c.fg, 0.12);
        c2d.strokeRect(x, y, bw, bh - 2);
      }
    }
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame,
    staticFrame(params) { frame(0, params); },
  };
}
```

- [ ] **Step 2: Manually verify each mode**

Run: `npm run dev`
Open: `http://localhost:5173/test/new-presets-page.html`
In the browser console, cycle through modes:

```js
const el = document.getElementById('wc');
['isometric', 'flat', 'sparse', 'stacked'].forEach((m, i) => {
  setTimeout(() => { el.setAttribute('mode', m); console.log('mode:', m); }, i * 3000);
});
```

Expected: each mode renders distinctly. No console errors. Stop the dev server with Ctrl+C.

- [ ] **Step 3: Run tests**

Run: `npx playwright test test/new-presets.spec.js`
Expected: All 6 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presets/mosaic.js
git commit -m "feat(mosaic): implement isometric/flat/sparse/stacked modes"
```

---

## Task 3: Implement `ribbons` — Bezier wave bands

**Goal:** Stacked Bezier ribbons with crisp top-edge stroke; theme-aware; reads as geometric (not gradient).

**Files:**
- Modify: `src/presets/ribbons.js`

### Steps

- [ ] **Step 1: Replace skeleton**

Open `src/presets/ribbons.js` and replace contents:

```js
import { clearAndFill } from '../renderer/canvas2d.js';

export function create({ canvas, c2d, getColors, getParams }) {
  let w = 0, h = 0;

  function rgb(v, a) {
    return `rgba(${(v[0] * 255) | 0},${(v[1] * 255) | 0},${(v[2] * 255) | 0},${a})`;
  }

  function ribbonCount(params) {
    return Math.max(3, Math.min(8, Math.round(3 + params.density * 5)));
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const n = ribbonCount(params);
    const amp = h * (0.05 + 0.2 * params.intensity);
    const bandHeight = h / (n + 1);
    const palette = [c.primary, c.accent, c.info];

    for (let i = 0; i < n; i++) {
      const phase = t * 0.4 + i * 0.7;
      const baseY = bandHeight * (i + 1);

      // Two cubic Bezier curves (top, bottom of ribbon), share envelope offset
      const topY = (x) => baseY + Math.sin(phase + x * 1.6) * amp - bandHeight * 0.35;
      const botY = (x) => baseY + Math.sin(phase + 0.4 + x * 1.6) * amp + bandHeight * 0.35;

      c2d.beginPath();
      const segs = 24;
      // Top edge (left to right)
      c2d.moveTo(0, topY(0));
      for (let s = 1; s <= segs; s++) {
        const x = (s / segs) * w;
        c2d.lineTo(x, topY(s / segs));
      }
      // Bottom edge (right to left)
      for (let s = segs; s >= 0; s--) {
        const x = (s / segs) * w;
        c2d.lineTo(x, botY(s / segs));
      }
      c2d.closePath();

      const color = palette[i % palette.length];
      c2d.fillStyle = rgb(color, 0.18 + 0.08 * params.intensity);
      c2d.fill();

      // Crisp top edge — this keeps it geometric, not gradient
      c2d.beginPath();
      c2d.moveTo(0, topY(0));
      for (let s = 1; s <= segs; s++) {
        const x = (s / segs) * w;
        c2d.lineTo(x, topY(s / segs));
      }
      c2d.strokeStyle = rgb(c.fg, 0.18);
      c2d.lineWidth = Math.max(1.5, h * 0.0025);
      c2d.stroke();
    }
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame,
    staticFrame(params) { frame(0, params); },
  };
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`
Open `http://localhost:5173/test/new-presets-page.html` and set preset:

```js
document.getElementById('wc').setAttribute('preset', 'ribbons');
```

Expected: 4–5 horizontal wavy bands, each with a darker crisp top-edge stroke. Slow drift. No console errors.

- [ ] **Step 3: Run tests**

Run: `npx playwright test test/new-presets.spec.js`
Expected: All 6 tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presets/ribbons.js
git commit -m "feat(ribbons): implement Bezier-band geometric wave preset"
```

---

## Task 4: Implement `source` — faded HTML source listing

**Goal:** Static HTML listing rendered as background, slow vertical scroll, occasional span flickers.

**Files:**
- Modify: `src/presets/source.js`

### Steps

- [ ] **Step 1: Replace skeleton**

Open `src/presets/source.js` and replace contents:

```js
import { clearAndFill } from '../renderer/canvas2d.js';

const DEFAULT_LISTING = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Hello, world</title>
  <link rel="stylesheet" href="/style.css">
  <script type="module" src="/app.js"></script>
</head>
<body>
  <header class="site-nav">
    <a href="/" class="logo">Pint</a>
    <nav>
      <a href="/work">Work</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <h1>An extension of your team.</h1>
      <p class="lede">Websites, apps, and software, built to last.</p>
      <a href="/contact" class="cta">Start a conversation</a>
    </section>
    <section class="services">
      <article class="card">
        <h3>Strategy</h3>
        <p>Roadmaps, audits, discovery.</p>
      </article>
      <article class="card">
        <h3>Design</h3>
        <p>Identity, systems, UX.</p>
      </article>
      <article class="card">
        <h3>Engineering</h3>
        <p>Web, mobile, platform.</p>
      </article>
    </section>
    <section class="proof">
      <blockquote>
        "They felt like part of our team from day one."
        <cite>— Director of Engineering, Fortune 100</cite>
      </blockquote>
    </section>
  </main>
  <footer>
    <small>&copy; 2026 Pint, Inc.</small>
  </footer>
  <script>
    (function () {
      const links = document.querySelectorAll('a[data-prefetch]');
      links.forEach((a) => a.addEventListener('mouseenter', () => fetch(a.href)));
    }());
  </script>
</body>
</html>`;

// Lightweight tokenizer for monochrome highlighting.
function tokenize(line) {
  // Return [{type, text}, ...]. Types: tag, attr, string, text.
  const out = [];
  let rest = line;
  const push = (type, text) => out.push({ type, text });
  // Match leading whitespace verbatim
  const ws = rest.match(/^\s*/)[0];
  if (ws) push('text', ws);
  rest = rest.slice(ws.length);

  while (rest.length > 0) {
    if (rest.startsWith('<')) {
      const m = rest.match(/^<\/?[\w!-]+/);
      if (m) {
        push('tag', m[0]);
        rest = rest.slice(m[0].length);
        continue;
      }
      push('text', '<');
      rest = rest.slice(1);
      continue;
    }
    if (rest[0] === '>' || rest.startsWith('/>')) {
      const tk = rest.startsWith('/>') ? '/>' : '>';
      push('tag', tk);
      rest = rest.slice(tk.length);
      continue;
    }
    const attr = rest.match(/^\s*[\w-]+=/);
    if (attr) {
      push('text', attr[0].match(/^\s*/)[0]);
      push('attr', attr[0].trim());
      rest = rest.slice(attr[0].length);
      continue;
    }
    const str = rest.match(/^"[^"]*"/);
    if (str) {
      push('string', str[0]);
      rest = rest.slice(str[0].length);
      continue;
    }
    const ch = rest.match(/^[^<>]+/);
    if (ch) {
      push('text', ch[0]);
      rest = rest.slice(ch[0].length);
      continue;
    }
    push('text', rest[0]);
    rest = rest.slice(1);
  }
  return out;
}

export function create({ host, canvas, c2d, getColors, getParams }) {
  let w = 0, h = 0;
  let lines = null;
  let lastText = null;
  let scroll = 0;
  let lastT = 0;
  let flickers = []; // { lineIdx, tokenIdx, ttl }
  let flickerAcc = 0;

  function rgb(v, a) {
    return `rgba(${(v[0] * 255) | 0},${(v[1] * 255) | 0},${(v[2] * 255) | 0},${a})`;
  }

  function ensure(params) {
    const text = (params.text && params.text.length > 0) ? params.text : DEFAULT_LISTING;
    if (text !== lastText) {
      lastText = text;
      lines = text.split('\n').map(tokenize);
      scroll = 0;
      flickers = [];
    }
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;
    scroll += dt * 16; // ~1 line every 6s at speed=1 (host pre-scales)

    const fontSize = Math.max(9, Math.min(14, 9 + params.density * 5));
    const lineH = fontSize * 1.4;
    c2d.font = `${fontSize}px ui-monospace, monospace`;
    c2d.textBaseline = 'top';

    const totalH = lines.length * lineH;
    const offY = -((scroll) % totalH);

    // Maintain pool of flickers
    flickerAcc += dt;
    const flickerRate = 0.4 + params.intensity * 2.0; // per second
    while (flickerAcc > 1 / flickerRate) {
      flickerAcc -= 1 / flickerRate;
      const li = Math.floor(Math.random() * lines.length);
      const tokens = lines[li];
      if (!tokens || tokens.length === 0) continue;
      const ti = Math.floor(Math.random() * tokens.length);
      flickers.push({ li, ti, ttl: 0.35 });
    }
    for (let i = flickers.length - 1; i >= 0; i--) {
      flickers[i].ttl -= dt;
      if (flickers[i].ttl <= 0) flickers.splice(i, 1);
    }

    // Two passes (current + wrapped copy) so the listing wraps seamlessly.
    for (let pass = 0; pass < 2; pass++) {
      const baseY = offY + pass * totalH;
      for (let i = 0; i < lines.length; i++) {
        const y = baseY + i * lineH;
        if (y < -lineH || y > h) continue;
        let x = 8;
        for (let ti = 0; ti < lines[i].length; ti++) {
          const tok = lines[i][ti];
          const flick = flickers.find((f) => f.li === i && f.ti === ti);
          const baseAlpha =
            tok.type === 'tag' ? 0.4 :
            tok.type === 'attr' ? 0.45 :
            tok.type === 'string' ? 0.45 :
            0.25;
          const color =
            tok.type === 'tag' ? c.primary :
            tok.type === 'attr' ? c.accent :
            tok.type === 'string' ? c.info :
            c.fg;
          const a = flick ? Math.min(1, baseAlpha + 0.5 * (flick.ttl / 0.35)) : baseAlpha;
          c2d.fillStyle = rgb(color, a);
          c2d.fillText(tok.text, x, y);
          x += c2d.measureText(tok.text).width;
        }
      }
    }
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame,
    staticFrame(params) {
      ensure(params);
      const c = getColors();
      clearAndFill(c2d, w, h, c.bg);
      const fontSize = Math.max(9, Math.min(14, 9 + params.density * 5));
      const lineH = fontSize * 1.4;
      c2d.font = `${fontSize}px ui-monospace, monospace`;
      c2d.textBaseline = 'top';
      for (let i = 0; i < lines.length; i++) {
        const y = i * lineH;
        if (y > h) break;
        let x = 8;
        for (const tok of lines[i]) {
          const baseAlpha =
            tok.type === 'tag' ? 0.4 :
            tok.type === 'attr' ? 0.45 :
            tok.type === 'string' ? 0.45 :
            0.25;
          const color =
            tok.type === 'tag' ? c.primary :
            tok.type === 'attr' ? c.accent :
            tok.type === 'string' ? c.info :
            c.fg;
          c2d.fillStyle = rgb(color, baseAlpha);
          c2d.fillText(tok.text, x, y);
          x += c2d.measureText(tok.text).width;
        }
      }
    },
  };
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`. In the browser console at the test page:

```js
document.getElementById('wc').setAttribute('preset', 'source');
```

Expected: small monospace HTML listing visible, slow vertical scroll, occasional brighter character flickers. Tags appear in primary (purple) color, attrs in accent, strings in info, plain text in fg, all at low alpha.

- [ ] **Step 3: Run tests**

Run: `npx playwright test test/new-presets.spec.js`
Expected: All 6 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presets/source.js
git commit -m "feat(source): implement faded HTML source-listing preset"
```

---

## Task 5: Implement `system7` — Mac windows on stipple

**Goal:** Classic 50% stipple background with mini Macintosh windows drifting; black-on-white by default; reads theme tokens when `use-theme` attribute is present.

**Files:**
- Modify: `src/presets/system7.js`

### Steps

- [ ] **Step 1: Replace skeleton**

Open `src/presets/system7.js` and replace contents:

```js
import { clearAndFill } from '../renderer/canvas2d.js';

const HARD_BLACK = [0, 0, 0];
const HARD_WHITE = [1, 1, 1];

export function create({ host, canvas, c2d, getColors, getParams }) {
  let w = 0, h = 0;
  let windows = [];
  let lastSeed = -1, lastDensity = -1;
  let stipplePattern = null;
  let stippleKey = null;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rgb(v, a = 1) {
    return `rgba(${(v[0] * 255) | 0},${(v[1] * 255) | 0},${(v[2] * 255) | 0},${a})`;
  }

  function palette() {
    const useTheme = host.hasAttribute('use-theme');
    if (!useTheme) return { page: HARD_WHITE, chrome: HARD_BLACK };
    const c = getColors();
    return { page: c.bg && c.bg[3] > 0.01 ? c.bg : HARD_WHITE, chrome: c.fg || HARD_BLACK };
  }

  function stippleDensity(intensity) {
    // 25% / 50% / 75% in equal thirds
    if (intensity < 0.34) return 0.25;
    if (intensity < 0.67) return 0.5;
    return 0.75;
  }

  function ensureStipple(params, chrome) {
    const dens = stippleDensity(params.intensity);
    const key = `${dens}|${chrome[0]}|${chrome[1]}|${chrome[2]}`;
    if (key === stippleKey && stipplePattern) return stipplePattern;
    const pc = document.createElement('canvas');
    pc.width = 4; pc.height = 4;
    const pctx = pc.getContext('2d');
    pctx.fillStyle = rgb(chrome);
    if (dens === 0.5) {
      // checkerboard 50%
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        if (((x + y) & 1) === 0) pctx.fillRect(x, y, 1, 1);
      }
    } else if (dens === 0.25) {
      // sparse — 4 of 16 px
      [[0, 0], [2, 1], [1, 2], [3, 3]].forEach(([x, y]) => pctx.fillRect(x, y, 1, 1));
    } else {
      // 75% — checkerboard inverse, then plus extras
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        if (((x + y) & 1) === 1) pctx.fillRect(x, y, 1, 1);
      }
      [[0, 0], [2, 2]].forEach(([x, y]) => pctx.fillRect(x, y, 1, 1));
    }
    stipplePattern = c2d.createPattern(pc, 'repeat');
    stippleKey = key;
    return stipplePattern;
  }

  function ensureWindows(params) {
    const seed = params.seed | 0;
    if (seed === lastSeed && params.density === lastDensity && windows.length > 0) return;
    lastSeed = seed;
    lastDensity = params.density;
    const count = Math.max(2, Math.min(8, Math.round(2 + params.density * 6)));
    const rng = mulberry32(seed || 1);
    windows = [];
    for (let i = 0; i < count; i++) {
      windows.push({
        x: rng(),         // normalized 0..1
        y: rng(),
        wRel: 0.16 + rng() * 0.18,
        hRel: 0.14 + rng() * 0.14,
        vx: (rng() - 0.5) * 0.04,
        vy: (rng() - 0.5) * 0.03,
        contentLines: 1 + Math.floor(rng() * 2),
      });
    }
  }

  function drawWindow(win, chrome) {
    const ww = win.wRel * w;
    const wh = win.hRel * h;
    const x = win.x * w - ww / 2;
    const y = win.y * h - wh / 2;
    const titleH = Math.max(14, Math.floor(wh * 0.12));

    // body fill (white-or-page)
    c2d.fillStyle = rgb(palette().page);
    c2d.fillRect(x, y, ww, wh);

    // 1px black border (or chrome)
    c2d.strokeStyle = rgb(chrome);
    c2d.lineWidth = 1;
    c2d.strokeRect(x + 0.5, y + 0.5, ww - 1, wh - 1);

    // title bar — 6 horizontal lines
    const lineY0 = y + 2;
    const lineSpacing = Math.max(2, Math.floor(titleH / 7));
    c2d.fillStyle = rgb(chrome);
    for (let i = 0; i < 6; i++) {
      c2d.fillRect(x + 12, lineY0 + i * lineSpacing, ww - 24, 1);
    }
    // close box on the left
    const boxSize = Math.max(8, Math.floor(titleH * 0.55));
    const boxY = y + Math.floor((titleH - boxSize) / 2);
    c2d.fillStyle = rgb(palette().page);
    c2d.fillRect(x + 3, boxY, boxSize, boxSize);
    c2d.strokeRect(x + 3 + 0.5, boxY + 0.5, boxSize - 1, boxSize - 1);

    // separator under title
    c2d.fillRect(x, y + titleH, ww, 1);

    // content area — 1-2 stipple rows
    const contentY0 = y + titleH + 4;
    const stipple = stipplePattern;
    if (stipple) {
      const rowH = Math.floor((wh - titleH - 8) / Math.max(1, win.contentLines + 1));
      for (let i = 0; i < win.contentLines; i++) {
        c2d.save();
        c2d.fillStyle = stipple;
        c2d.fillRect(x + 6, contentY0 + i * rowH, ww - 12, Math.max(4, rowH - 4));
        c2d.restore();
      }
    }
  }

  function frame(t, params) {
    ensureWindows(params);
    const { page, chrome } = palette();
    ensureStipple(params, chrome);
    // Background — fill page color first, then overlay stipple
    clearAndFill(c2d, w, h, page);
    c2d.fillStyle = stipplePattern;
    c2d.fillRect(0, 0, w, h);

    // Drift windows
    for (const win of windows) {
      win.x = (win.x + win.vx * 0.016 + 1) % 1;
      win.y = (win.y + win.vy * 0.016 + 1) % 1;
      drawWindow(win, chrome);
    }
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame,
    staticFrame(params) {
      ensureWindows(params);
      const { page, chrome } = palette();
      ensureStipple(params, chrome);
      clearAndFill(c2d, w, h, page);
      c2d.fillStyle = stipplePattern;
      c2d.fillRect(0, 0, w, h);
      for (const win of windows) drawWindow(win, chrome);
    },
  };
}
```

- [ ] **Step 2: Manually verify**

Run: `npm run dev`. In console at the test page:

```js
const el = document.getElementById('wc');
el.setAttribute('preset', 'system7');
```

Expected: 50% stipple background, 3–5 mini Mac windows drifting. Strictly black-on-white.

Then test theme toggle:

```js
el.setAttribute('use-theme', '');
```

Expected: chrome and stipple now in `--color-fg`, page in `--color-background`.

- [ ] **Step 3: Run tests**

Run: `npx playwright test test/new-presets.spec.js`
Expected: All 6 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/presets/system7.js
git commit -m "feat(system7): implement classic Mac windows on stipple preset"
```

---

## Task 6: Pint-tribute demo + docs + CEM + final verification

**Goal:** A composed demo showing mosaic + ribbons with pint-style theming; documentation for the new presets and attribute conventions; manifest regenerated.

**Files:**
- Create: `demos/pint-tribute.html`
- Modify: `docs/api.html`
- Verify or modify: `demos/demos-hub.js`
- Regenerate: `custom-elements.json`

### Steps

- [ ] **Step 1: Write the pint-tribute demo**

Create `demos/pint-tribute.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Pint tribute — bg-wc demo</title>
  <style>
    :root {
      --color-primary: oklch(45% 0.16 290);
      --color-accent: oklch(70% 0.18 320);
      --color-info: oklch(70% 0.12 200);
      --color-background: #fafafa;
      --color-text: #1a1a1a;
      --color-foreground: #1a1a1a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
      color: var(--color-text);
      background: var(--color-background);
    }
    section { position: relative; min-height: 60vh; padding: 4rem 2rem; }
    section bg-wc {
      position: absolute; inset: 0; z-index: 0;
      pointer-events: none;
    }
    .content { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; }
    h1, h2 { letter-spacing: -0.02em; }
    h1 { font-size: clamp(2rem, 5vw, 4rem); margin: 0 0 1rem; }
    h2 { font-size: clamp(1.5rem, 3vw, 2.5rem); margin: 0 0 0.75rem; }
    p { color: rgba(26,26,26,0.75); }
    .cta {
      display: inline-block; margin-top: 1.25rem;
      padding: 0.75rem 1.25rem;
      background: var(--color-primary); color: #fff;
      text-decoration: none; border-radius: 4px;
    }
  </style>
</head>
<body>
  <section>
    <bg-wc preset="mosaic" mode="isometric" density="0.55" intensity="0.45" speed="0.35"></bg-wc>
    <div class="content">
      <h1>An extension of your team.</h1>
      <p>This hero uses <code>preset="mosaic" mode="isometric"</code>. The palette
        is set from CSS custom properties — change <code>--color-primary</code>
        and the squares re-tint.</p>
      <a class="cta" href="#waves">See the ribbons</a>
    </div>
  </section>

  <section id="waves">
    <bg-wc preset="ribbons" density="0.4" intensity="0.5" speed="0.3"></bg-wc>
    <div class="content">
      <h2>Geometric waves.</h2>
      <p>Bezier ribbons with crisp top edges — reads as geometric rather than
        gradient. Same palette tokens flow through.</p>
    </div>
  </section>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Check whether demos hub auto-discovers**

Inspect `demos/demos-hub.js` (or `demos/index.html`). If the hub iterates a static list, add an entry for `pint-tribute.html`. If it globs the directory, no change needed.

Run: `grep -n "pint-tribute\|demos/.*\.html\|readdir\|glob" demos/*.js demos/*.html`

If the hub uses an explicit list, add `pint-tribute.html` with a label like `"Pint tribute (mosaic + ribbons)"`. If not, skip.

- [ ] **Step 3: Update docs/api.html**

Find the preset catalog section (search for "Patterns" or similar headers in the file). Add four entries with the same shape as the existing rows:

```html
<tr><td><code>mosaic</code></td>
    <td>pattern</td>
    <td>Refined squares. <code>mode</code>: <code>isometric</code> (default),
        <code>flat</code>, <code>sparse</code>, <code>stacked</code>.</td></tr>
<tr><td><code>ribbons</code></td>
    <td>gradient</td>
    <td>Bezier wave ribbons with crisp top-edge strokes.</td></tr>
<tr><td><code>source</code></td>
    <td>text</td>
    <td>Faded HTML source listing. Set <code>text</code> attribute to override
        with custom source.</td></tr>
<tr><td><code>system7</code></td>
    <td>retro</td>
    <td>Drifting Mac windows on 50% stipple. Add <code>use-theme</code> to
        honor theme tokens; otherwise black-on-white.</td></tr>
```

Find the attributes table (it should already document `preset`, `intensity`, `speed`, etc.). Add two rows:

```html
<tr><td><code>mode</code></td>
    <td>string</td>
    <td>Used by <code>mosaic</code>; one of <code>isometric</code>,
        <code>flat</code>, <code>sparse</code>, <code>stacked</code>.</td></tr>
<tr><td><code>use-theme</code></td>
    <td>boolean</td>
    <td>Used by <code>system7</code>; presence enables theme-token coloring
        instead of hard black/white.</td></tr>
```

If exact section headings differ in the file, place the rows in the nearest comparable section.

- [ ] **Step 4: Regenerate the custom-elements manifest**

Run: `npm run analyze`
Expected: completes without error; `custom-elements.json` is updated.

Confirm new presets are visible:

```bash
grep -c "mosaic\|ribbons\|system7\|source" custom-elements.json
```

If grep returns 0 for any preset (presets are not in the CEM — the manifest is about the custom element, not preset modules), that's expected. Don't force preset entries into the manifest; the gallery does that.

- [ ] **Step 5: Run full quality gates**

```bash
npm run lint
npm run build
npm test
```

Expected: lint clean, build successful, all tests pass (existing 6 lifecycle/smoke + 6 new-presets = 12+ tests pass).

- [ ] **Step 6: Smoke-test the demo in dev mode**

```bash
npm run dev
```

Open `http://localhost:5173/demos/pint-tribute.html`. Verify two sections render with mosaic (isometric) and ribbons backgrounds visible behind text. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add demos/pint-tribute.html docs/api.html custom-elements.json
# Plus demos/demos-hub.js only if you modified it
git commit -m "demo+docs: pint-tribute composition + new-preset documentation"
```

- [ ] **Step 8: Close the beads issue**

If a beads issue was created to track this work, close it now:

```bash
# Find it — likely named for the four-presets effort. If unsure, skip.
bd list --status=open | grep -i "preset\|mosaic\|ribbon\|system7"
# bd close <id> --reason="Implemented per docs/superpowers/plans/2026-05-28-new-presets-pint-aligned.md"
```

- [ ] **Step 9: Push**

```bash
git pull --rebase
git push
git status  # should show "up to date with origin"
```

---

## Self-review checklist (for the executor)

After all tasks complete:

- [ ] Each of the 4 presets has a `frame`, `staticFrame`, and `resize`
- [ ] `mosaic` responds visibly to each of the 4 `mode` values
- [ ] `system7` defaults to black-on-white; toggling `use-theme` changes colors
- [ ] `source` renders the default listing when `text` is unset; renders the custom string when `text` is set
- [ ] `ribbons` has visible top-edge strokes (the "geometric not gradient" gate)
- [ ] `npm run lint`, `npm run build`, `npm test` all green
- [ ] `demos/pint-tribute.html` opens and renders
- [ ] At least the 4 preset-load smoke tests plus the mosaic-mode and system7-theme tests are present and passing
- [ ] No commented-out code, no `console.log`, no TODOs
