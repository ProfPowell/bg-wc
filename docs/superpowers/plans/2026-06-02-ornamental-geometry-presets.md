# Ornamental Geometry Preset Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four theme-aware `<bg-wc>` background presets — `girih` (Islamic star-polygon strapwork), `mandala` (layered radial), `atomic` (mid-century), `op-art` (optical illusion).

**Architecture:** Three are WebGL fragment-shader presets mirroring `src/presets/kaleidoscope.js` (full-screen quad, uniforms for time/intensity/density/colors, `frame`/`staticFrame`/`resize`/`dispose`). One (`atomic`) is a Canvas2D preset mirroring `src/presets/confetti.js` (`clearAndFill` + seeded `mulberry32`, deterministic `staticFrame`). All read theme tokens via `getColors()`. A new `ornamental` registry group holds the three WebGL presets; `atomic` joins `pop`.

**Tech Stack:** Vanilla JS, WebGL1 (GLSL ES 1.00, no derivative extensions), Canvas2D, Vite, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-02-ornamental-geometry-presets-design.md`

**Reference files (read first):** `src/presets/kaleidoscope.js` (WebGL contract), `src/presets/confetti.js` (Canvas2D contract), `src/presets/index.js` (registry), `test/new-presets.spec.js` (test pattern), `docs/gallery.js` (MODE_OPTIONS), `docs/api.html` (catalog).

**Conventions that apply to every preset:**
- `create()` is called with `{ host, gl, c2d, getColors, getParams }`. WebGL presets use `gl`; Canvas2D uses `c2d`. Read the `mode` attribute live with `host.getAttribute('mode')` inside the draw loop (changing `mode` does NOT re-init non-css3d presets, so reading fresh each frame is correct).
- `getColors()` returns `{ primary, accent, info, bg, fg, ... }`, each a 3-element array of 0–1 floats.
- `getParams()` (and the `params` passed to `frame`) provides `{ intensity, speed, density, seed, quality, ... }`. Time is already speed-scaled by the host — do NOT multiply by `speed` again.
- WebGL shaders are GLSL ES 1.00. **Do not use `fwidth`/derivatives** (needs an extension this project doesn't enable). Use constant smoothstep widths.
- Every preset implements `staticFrame(params)` so reduced motion shows a still frame (no fallback swap).
- Tests are Playwright; the harness `test/new-presets-page.html` hosts `<bg-wc id="wc">` with theme tokens. Run `npm test -- ornamental.spec.js`.

---

## Task 1: `girih` — Islamic star-polygon strapwork (WebGL) + the `ornamental` group

**Files:**
- Create: `src/presets/girih.js`
- Modify: `src/presets/index.js` (new `ornamental` group + entry)
- Create: `test/ornamental.spec.js`

- [ ] **Step 1: Write the failing test** — create `test/ornamental.spec.js`:

```js
// test/ornamental.spec.js
import { test, expect } from '@playwright/test';

async function loadsAndRenders(page, preset, mode) {
  await page.goto('/test/new-presets-page.html');
  return page.evaluate(
    async ([p, m]) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', p);
      await el.ready;
      const c = el.shadowRoot.querySelector('canvas');
      return {
        rendered: !!c && c.width > 0 && c.height > 0,
        fallback: el.hasAttribute('data-fallback'),
      };
    },
    [preset, mode]
  );
}

for (const mode of ['', '8fold', '12fold', '6fold']) {
  test(`girih renders for mode="${mode}"`, async ({ page }) => {
    const r = await loadsAndRenders(page, 'girih', mode);
    expect(r.rendered, `mode="${mode}" should render to canvas`).toBe(true);
    expect(r.fallback).toBe(false);
  });
}

test('girih is registered in the ornamental group', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const meta = await page.evaluate(() =>
    customElements.get('bg-wc').presets().find((p) => p.name === 'girih')
  );
  expect(meta.renderer).toBe('webgl');
  expect(meta.group).toBe('ornamental');
});
```

- [ ] **Step 2: Run it to confirm it fails** — `npm test -- ornamental.spec.js`. Expected: FAIL (unknown preset `girih`).

- [ ] **Step 3: Create `src/presets/girih.js`:**

```js
// girih — Islamic periodic star-polygon strapwork. A repeating n-fold star
// lattice with interlaced strapwork lines, drawn as anti-aliased strokes over
// theme tokens. `mode`: 8fold (default) | 12fold | 6fold. Slow whole-lattice
// rotation. Scoped to periodic lattices (not aperiodic quasicrystal girih).

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity, u_density, u_fold;
uniform vec3  u_c1, u_c2, u_c3, u_bg;
uniform vec2  u_res;
const float PI = 3.141592653589793;

float band(float x, float w) { return smoothstep(w, 0.0, abs(x)); }

void main() {
  vec2 p = (v_uv - 0.5);
  p.x *= u_res.x / max(u_res.y, 1.0);
  float scale = mix(2.5, 7.0, u_density);
  float ang = u_time * 0.04;
  float ca = cos(ang), sa = sin(ang);
  p = mat2(ca, -sa, sa, ca) * p * scale;

  vec2 cell = fract(p) - 0.5;
  float r = length(cell);
  float a = atan(cell.y, cell.x);
  float wedge = (2.0 * PI) / u_fold;
  float af = abs(mod(a, wedge) - wedge * 0.5);
  float lobe = cos(af);                       // 1 toward a star point

  float lw = 0.022 + 0.02 * u_intensity;      // line half-width
  float starEdge = 0.30 - 0.12 * (1.0 - lobe);
  float starLine = band(r - starEdge, lw);
  float grid = min(0.5 - abs(cell.x), 0.5 - abs(cell.y));
  float gridLine = band(grid, lw * 0.8);
  float diag = min(abs(cell.x - cell.y), abs(cell.x + cell.y));
  float diagLine = band(diag, lw * 0.7) * step(r, 0.45);

  vec3 col = u_bg;
  col = mix(col, u_c3, gridLine * 0.7);
  col = mix(col, u_c2, diagLine * 0.6);
  col = mix(col, u_c1, starLine);
  col = mix(col, u_c2, band(r, 0.05) * 0.85);  // star centers
  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl, getColors, host }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time'), uInt = u('u_intensity'), uDen = u('u_density'), uFold = u('u_fold');
  const uC1 = u('u_c1'), uC2 = u('u_c2'), uC3 = u('u_c3'), uBg = u('u_bg'), uRes = u('u_res');
  let w = 1, h = 1;

  function foldOf() {
    const m = (host.getAttribute('mode') || '').toLowerCase();
    if (m.indexOf('12') >= 0) return 12.0;
    if (m.indexOf('6') >= 0) return 6.0;
    return 8.0;
  }

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity);
    gl.uniform1f(uDen, params.density);
    gl.uniform1f(uFold, foldOf());
    gl.uniform3f(uC1, c.primary[0], c.primary[1], c.primary[2]);
    gl.uniform3f(uC2, c.accent[0], c.accent[1], c.accent[2]);
    gl.uniform3f(uC3, c.info[0], c.info[1], c.info[2]);
    gl.uniform3f(uBg, c.bg[0], c.bg[1], c.bg[2]);
    gl.uniform2f(uRes, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { draw(t, params); },
    staticFrame(params) { draw(0, params); },
    dispose() { try { gl.deleteProgram(program); gl.deleteBuffer(buf); } catch {} },
  };
}
```

- [ ] **Step 4: Register the preset + the new group** — in `src/presets/index.js`:

Add a new block inside `REGISTRY` (after the `// Pop art / deco` block):

```js
  // Ornamental geometry
  girih: { renderer: 'webgl', group: 'ornamental', loader: () => import('./girih.js') },
```

And in `GROUP_LABELS`, add an entry after `pop`:

```js
  ornamental: 'Ornamental',
```

- [ ] **Step 5: Run the test** — `npm test -- ornamental.spec.js`. Expected: PASS (all girih tests).

- [ ] **Step 6: Visual check (manual, during execution)** — `npm run dev`, open `http://localhost:5173/test/new-presets-page.html`, run `wc.setAttribute('preset','girih')` in the console; confirm an n-fold star lattice renders in theme colors; try `wc.setAttribute('mode','12fold')`. Tune shader constants if needed (this is the expected place for visual polish).

- [ ] **Step 7: Lint + commit:**

```bash
npm run lint
git add src/presets/girih.js src/presets/index.js test/ornamental.spec.js
git commit -m "feat(girih): Islamic star-polygon strapwork preset + ornamental group (gl-wc-k3m)"
```

---

## Task 2: `mandala` — layered radial symmetry (WebGL)

**Files:**
- Create: `src/presets/mandala.js`
- Modify: `src/presets/index.js`
- Modify: `test/ornamental.spec.js`

- [ ] **Step 1: Write the failing test** — APPEND to `test/ornamental.spec.js`:

```js
test('mandala renders to canvas', async ({ page }) => {
  const r = await loadsAndRenders(page, 'mandala', '');
  expect(r.rendered).toBe(true);
  expect(r.fallback).toBe(false);
});

test('mandala is registered in the ornamental group', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const meta = await page.evaluate(() =>
    customElements.get('bg-wc').presets().find((p) => p.name === 'mandala')
  );
  expect(meta.renderer).toBe('webgl');
  expect(meta.group).toBe('ornamental');
});
```

- [ ] **Step 2: Run to confirm failure** — `npm test -- ornamental.spec.js`. Expected: FAIL (unknown preset `mandala`).

- [ ] **Step 3: Create `src/presets/mandala.js`:**

```js
// mandala — layered concentric radial symmetry. Polar coordinates from center;
// concentric radius bands each carry an N-fold petal motif keyed to the ring
// index, colors cycling primary→accent→info outward, adjacent rings counter-
// rotating. Calm, meditative motion.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity, u_density;
uniform vec3  u_c1, u_c2, u_c3, u_bg;
uniform vec2  u_res;
const float PI = 3.141592653589793;

float band(float x, float w) { return smoothstep(w, 0.0, abs(x)); }

void main() {
  vec2 p = (v_uv - 0.5);
  p.x *= u_res.x / max(u_res.y, 1.0);
  float r = length(p) * 2.0;
  float a = atan(p.y, p.x);

  float rings = floor(mix(4.0, 10.0, u_density));
  float idx = floor(r * rings);
  float rf = fract(r * rings);
  float sym = 6.0 + 2.0 * idx;                 // symmetry grows outward
  float dir = mod(idx, 2.0) * 2.0 - 1.0;       // alternate rings counter-rotate
  float aa = a + dir * u_time * 0.12;
  float wedge = (2.0 * PI) / sym;
  float af = abs(mod(aa, wedge) - wedge * 0.5);

  float ringLine = band(rf, 0.05);
  float petal = band(rf - 0.5, 0.16 + 0.08 * u_intensity)
              * smoothstep(0.1, 0.7, cos(af * sym * 0.5));

  // color cycles by ring
  float m = mod(idx, 3.0);
  vec3 ringCol = (m < 1.0) ? u_c1 : (m < 2.0) ? u_c2 : u_c3;

  vec3 col = u_bg;
  col = mix(col, ringCol, petal);
  col = mix(col, u_c3, ringLine * 0.5);
  col = mix(col, u_c2, band(r, 0.08));          // bright center
  col = mix(col, u_bg, smoothstep(1.7, 2.4, r));// fade at far edge
  gl_FragColor = vec4(col, 1.0);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time'), uInt = u('u_intensity'), uDen = u('u_density');
  const uC1 = u('u_c1'), uC2 = u('u_c2'), uC3 = u('u_c3'), uBg = u('u_bg'), uRes = u('u_res');
  let w = 1, h = 1;

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity);
    gl.uniform1f(uDen, params.density);
    gl.uniform3f(uC1, c.primary[0], c.primary[1], c.primary[2]);
    gl.uniform3f(uC2, c.accent[0], c.accent[1], c.accent[2]);
    gl.uniform3f(uC3, c.info[0], c.info[1], c.info[2]);
    gl.uniform3f(uBg, c.bg[0], c.bg[1], c.bg[2]);
    gl.uniform2f(uRes, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { draw(t, params); },
    staticFrame(params) { draw(0, params); },
    dispose() { try { gl.deleteProgram(program); gl.deleteBuffer(buf); } catch {} },
  };
}
```

- [ ] **Step 4: Register** — in `src/presets/index.js`, in the `// Ornamental geometry` block:

```js
  mandala: { renderer: 'webgl', group: 'ornamental', loader: () => import('./mandala.js') },
```

- [ ] **Step 5: Run the test** — `npm test -- ornamental.spec.js`. Expected: PASS.

- [ ] **Step 6: Visual check** — as Task 1 Step 6, preset `mandala`; confirm concentric counter-rotating petal rings in cycling token colors. Tune constants if needed.

- [ ] **Step 7: Lint + commit:**

```bash
npm run lint
git add src/presets/mandala.js src/presets/index.js test/ornamental.spec.js
git commit -m "feat(mandala): layered radial symmetry preset (gl-wc-k3m)"
```

---

## Task 3: `atomic` — mid-century / atomic age (Canvas2D)

**Files:**
- Create: `src/presets/atomic.js`
- Modify: `src/presets/index.js` (registers in `pop` group)
- Modify: `test/ornamental.spec.js`

- [ ] **Step 1: Write the failing test** — APPEND to `test/ornamental.spec.js`:

```js
for (const mode of ['', 'mixed', 'boomerangs', 'starbursts', 'harlequin']) {
  test(`atomic renders for mode="${mode}"`, async ({ page }) => {
    const r = await loadsAndRenders(page, 'atomic', mode);
    expect(r.rendered, `mode="${mode}" should render`).toBe(true);
    expect(r.fallback).toBe(false);
  });
}

test('atomic is registered in the pop group', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const meta = await page.evaluate(() =>
    customElements.get('bg-wc').presets().find((p) => p.name === 'atomic')
  );
  expect(meta.renderer).toBe('canvas2d');
  expect(meta.group).toBe('pop');
});
```

- [ ] **Step 2: Run to confirm failure** — `npm test -- ornamental.spec.js`. Expected: FAIL (unknown preset `atomic`).

- [ ] **Step 3: Create `src/presets/atomic.js`:**

```js
// atomic — mid-century / atomic-age scattered shapes on a flat token field:
// boomerangs, kidney blobs, starbursts, plus a harlequin diamond grid. Seeded
// placement (deterministic) with a lazy bob/rotate drift.
// mode: mixed (default) | boomerangs | starbursts | harlequin.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';

function rgb(c) {
  return `rgb(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0})`;
}

function drawBoomerang(ctx, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.26);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.6, -Math.PI * 0.78, -Math.PI * 0.06);
  ctx.stroke();
}

function drawKidney(ctx, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.7, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStarburst(ctx, size, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * size * 0.7, Math.sin(a) * size * 0.7);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawHarlequin(ctx, w, h, c1, c2, cell) {
  for (let y = -cell; y < h + cell; y += cell) {
    for (let x = -cell; x < w + cell; x += cell) {
      const even = (Math.round(x / cell) + Math.round(y / cell)) % 2 === 0;
      ctx.fillStyle = even ? c1 : c2;
      ctx.beginPath();
      ctx.moveTo(x + cell / 2, y);
      ctx.lineTo(x + cell, y + cell / 2);
      ctx.lineTo(x + cell / 2, y + cell);
      ctx.lineTo(x, y + cell / 2);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function create({ c2d, getColors, host }) {
  let w = 1, h = 1;

  function modeOf() {
    return (host.getAttribute('mode') || 'mixed').toLowerCase();
  }
  function kindsFor(mode) {
    if (mode === 'boomerangs') return ['boom'];
    if (mode === 'starbursts') return ['star'];
    return ['boom', 'kidney', 'star']; // mixed
  }

  function render(t, params) {
    const c = getColors();
    const palette = [rgb(c.primary), rgb(c.accent), rgb(c.info)];
    clearAndFill(c2d, w, h, c.bg);

    const mode = modeOf();
    if (mode === 'harlequin') {
      const cell = 30 + (1 - params.density) * 50;
      drawHarlequin(c2d, w, h, palette[0], palette[1], cell);
      return;
    }

    const r = mulberry32((params.seed | 0) || 7);
    const kinds = kindsFor(mode);
    const n = Math.floor(12 + params.density * 60);
    const base = Math.min(w, h) * (0.06 + params.intensity * 0.06);
    for (let i = 0; i < n; i++) {
      const x = r() * w;
      const y = r() * h;
      const kind = kinds[(r() * kinds.length) | 0];
      const size = base * (0.6 + r() * 0.8);
      const color = palette[(r() * palette.length) | 0];
      const phase = r() * Math.PI * 2;
      const bob = Math.sin(t * 0.6 + phase) * size * 0.15;
      const rot = phase + Math.sin(t * 0.2 + phase) * 0.2;
      c2d.save();
      c2d.translate(x, y + bob);
      c2d.rotate(rot);
      if (kind === 'boom') drawBoomerang(c2d, size, color);
      else if (kind === 'kidney') drawKidney(c2d, size, color);
      else drawStarburst(c2d, size, color);
      c2d.restore();
    }
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { render(t, params); },
    staticFrame(params) { render(0, params); },
    dispose() {},
  };
}
```

- [ ] **Step 4: Register** — in `src/presets/index.js`, in the existing `// Pop art / deco` block (next to `deco`):

```js
  atomic: { renderer: 'canvas2d', group: 'pop', loader: () => import('./atomic.js') },
```

- [ ] **Step 5: Run the test** — `npm test -- ornamental.spec.js`. Expected: PASS.

- [ ] **Step 6: Visual check** — preset `atomic`; confirm scattered boomerangs/kidneys/starbursts in token colors; try `mode="harlequin"` (diamond grid) and `mode="starbursts"`. Tune sizes if needed.

- [ ] **Step 7: Lint + commit:**

```bash
npm run lint
git add src/presets/atomic.js src/presets/index.js test/ornamental.spec.js
git commit -m "feat(atomic): mid-century atomic-age preset (gl-wc-k3m)"
```

---

## Task 4: `op-art` — optical illusion (WebGL)

**Files:**
- Create: `src/presets/op-art.js`
- Modify: `src/presets/index.js`
- Modify: `test/ornamental.spec.js`

- [ ] **Step 1: Write the failing test** — APPEND to `test/ornamental.spec.js`:

```js
for (const mode of ['', 'riley', 'cafewall', 'moire', 'drift']) {
  test(`op-art renders for mode="${mode}"`, async ({ page }) => {
    const r = await loadsAndRenders(page, 'op-art', mode);
    expect(r.rendered, `mode="${mode}" should render`).toBe(true);
    expect(r.fallback).toBe(false);
  });
}

test('op-art is registered in the ornamental group', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const meta = await page.evaluate(() =>
    customElements.get('bg-wc').presets().find((p) => p.name === 'op-art')
  );
  expect(meta.renderer).toBe('webgl');
  expect(meta.group).toBe('ornamental');
});
```

- [ ] **Step 2: Run to confirm failure** — `npm test -- ornamental.spec.js`. Expected: FAIL (unknown preset `op-art`).

- [ ] **Step 3: Create `src/presets/op-art.js`:**

```js
// op-art — optical-illusion patterns with false motion, using a high-contrast
// theme pair (foreground / background). mode: riley (sine-warped bands,
// default) | cafewall (offset checker) | moire (drifting gratings) | drift
// (peripheral-drift rings). density = frequency, intensity = contrast/warp.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time, u_intensity, u_density, u_mode;
uniform vec3  u_fg, u_bg;
uniform vec2  u_res;

void main() {
  vec2 p = (v_uv - 0.5);
  p.x *= u_res.x / max(u_res.y, 1.0);
  float freq = mix(8.0, 40.0, u_density);
  float v = 0.5;

  if (u_mode < 0.5) {
    // riley: sine-warped vertical bands
    float warp = 0.15 * sin(p.y * 6.0 + u_time * 0.5);
    v = step(0.5, fract((p.x + warp) * freq * 0.5));
  } else if (u_mode < 1.5) {
    // cafewall: offset checker rows with mortar lines
    float row = floor(p.y * freq * 0.5);
    float off = mod(row, 2.0) * 0.5 + u_time * 0.05;
    float cx = fract(p.x * freq * 0.5 + off);
    float cy = fract(p.y * freq * 0.5);
    float checks = step(0.5, cx);
    float mortar = smoothstep(0.0, 0.08, cy) * smoothstep(1.0, 0.92, cy);
    v = mix(0.5, checks, mortar);
  } else if (u_mode < 2.5) {
    // moire: two rotated gratings drifting against each other
    float ph = 0.2 + u_time * 0.03;
    float b = (p.x * cos(ph) + p.y * sin(ph)) * freq;
    v = step(0.0, sin(p.x * freq)) * 0.5 + step(0.0, sin(b)) * 0.5;
  } else {
    // drift: concentric peripheral-drift rings
    float r = length(p);
    v = step(0.5, fract(r * freq * 0.5 - u_time * 0.1));
  }

  v = clamp((v - 0.5) * (1.0 + u_intensity * 1.5) + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(mix(u_bg, u_fg, v), 1.0);
}
`;

export function create({ gl, getColors, host }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const u = (n) => gl.getUniformLocation(program, n);
  const uTime = u('u_time'), uInt = u('u_intensity'), uDen = u('u_density'), uMode = u('u_mode');
  const uFg = u('u_fg'), uBg = u('u_bg'), uRes = u('u_res');
  let w = 1, h = 1;

  function modeOf() {
    const m = (host.getAttribute('mode') || '').toLowerCase();
    if (m === 'cafewall') return 1.0;
    if (m === 'moire') return 2.0;
    if (m === 'drift') return 3.0;
    return 0.0; // riley
  }

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity);
    gl.uniform1f(uDen, params.density);
    gl.uniform1f(uMode, modeOf());
    gl.uniform3f(uFg, c.fg[0], c.fg[1], c.fg[2]);
    gl.uniform3f(uBg, c.bg[0], c.bg[1], c.bg[2]);
    gl.uniform2f(uRes, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) { w = nw; h = nh; },
    frame(t, params) { draw(t, params); },
    staticFrame(params) { draw(0, params); },
    dispose() { try { gl.deleteProgram(program); gl.deleteBuffer(buf); } catch {} },
  };
}
```

- [ ] **Step 4: Register** — in `src/presets/index.js`, in the `// Ornamental geometry` block:

```js
  'op-art': { renderer: 'webgl', group: 'ornamental', loader: () => import('./op-art.js') },
```

- [ ] **Step 5: Run the test** — `npm test -- ornamental.spec.js`. Expected: PASS.

- [ ] **Step 6: Visual check** — preset `op-art`; cycle modes `riley`/`cafewall`/`moire`/`drift`; confirm high-contrast op-art with subtle drift. If a theme's fg/bg are low-contrast the effect is weak — that's expected (documented clang).

- [ ] **Step 7: Lint + commit:**

```bash
npm run lint
git add src/presets/op-art.js src/presets/index.js test/ornamental.spec.js
git commit -m "feat(op-art): optical-illusion preset (gl-wc-k3m)"
```

---

## Task 5: Gallery pills, API docs, reduced-motion test, manifest, regression

**Files:**
- Modify: `docs/gallery.js` (MODE_OPTIONS for `atomic`, `op-art`)
- Modify: `docs/api.html` (catalog rows + mode attribute row)
- Modify: `test/ornamental.spec.js` (reduced-motion test)
- Modify: `custom-elements.json` (regenerated)

- [ ] **Step 1: Add mode pills for `atomic` and `op-art`** — in `docs/gallery.js`, add two entries to the `MODE_OPTIONS` map (alongside the existing `fly-through`/`explode`/`mosaic`/`doodles` entries):

```js
  atomic: [
    { label: 'mixed', value: 'mixed' },
    { label: 'boomerangs', value: 'boomerangs' },
    { label: 'starbursts', value: 'starbursts' },
    { label: 'harlequin', value: 'harlequin' },
  ],
  'op-art': [
    { label: 'riley', value: 'riley' },
    { label: 'cafewall', value: 'cafewall' },
    { label: 'moire', value: 'moire' },
    { label: 'drift', value: 'drift' },
  ],
```

(`girih` has its modes too, but they're niche — optionally add a `girih` entry with `8fold`/`12fold`/`6fold`. Include it for completeness:)

```js
  girih: [
    { label: '8-fold', value: '8fold' },
    { label: '12-fold', value: '12fold' },
    { label: '6-fold', value: '6fold' },
  ],
```

- [ ] **Step 2: Add the reduced-motion test** — APPEND to `test/ornamental.spec.js`:

```js
test('ornamental presets show a static frame under reduced motion (no fallback)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const preset of ['girih', 'mandala', 'atomic', 'op-art']) {
    const ok = await page.evaluate(async (p) => {
      await document.getElementById('wc').ready.catch(() => {});
      const el = document.getElementById('wc');
      el.setAttribute('preset', p);
      await el.ready;
      const c = el.shadowRoot.querySelector('canvas');
      return !el.hasAttribute('data-fallback') && !!c && c.width > 0;
    }, preset);
    expect(ok, `${preset} should render a static frame, not fallback`).toBe(true);
  }
});
```

- [ ] **Step 3: Run the full ornamental suite** — `npm test -- ornamental.spec.js`. Expected: all PASS.

- [ ] **Step 4: Document the presets in `docs/api.html`** — add a new `<h3>` section in the Preset catalog (after the `Canvas2D pattern & geometric presets` table, before `</section>`):

```html
      <h3>Ornamental presets</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Visual</th><th>Tokens used</th></tr></thead>
          <tbody>
            <tr><td><code>girih</code></td>
                <td>Islamic periodic star-polygon strapwork lattice. <code>mode</code>:
                    <code>8fold</code> (default), <code>12fold</code>, <code>6fold</code>.</td>
                <td>primary, accent, info, background</td></tr>
            <tr><td><code>mandala</code></td>
                <td>Layered concentric, counter-rotating radial symmetry; petal motifs
                    keyed to ring, colors cycling outward.</td>
                <td>primary, accent, info, background</td></tr>
            <tr><td><code>op-art</code></td>
                <td>Optical illusion with false motion. <code>mode</code>: <code>riley</code>
                    (default), <code>cafewall</code>, <code>moire</code>, <code>drift</code>.</td>
                <td>foreground, background</td></tr>
          </tbody>
        </table>
      </div>
```

And add an `atomic` row to the existing `Canvas2D pattern & geometric presets` table (after the `system7` row):

```html
            <tr><td><code>atomic</code></td>
                <td>Mid-century atomic-age shapes &mdash; boomerangs, kidneys, starbursts.
                    <code>mode</code>: <code>mixed</code> (default), <code>boomerangs</code>,
                    <code>starbursts</code>, <code>harlequin</code>.</td>
                <td>primary, accent, info, background</td></tr>
```

And extend the `mode` attribute row (the `<tr>` whose first cell is `<code>mode</code>`) to mention the new presets — append to its description cell:

```html
 <code>girih</code>: <code>8fold</code>/<code>12fold</code>/<code>6fold</code>; <code>atomic</code>: <code>mixed</code>/<code>boomerangs</code>/<code>starbursts</code>/<code>harlequin</code>; <code>op-art</code>: <code>riley</code>/<code>cafewall</code>/<code>moire</code>/<code>drift</code>.
```

- [ ] **Step 5: Full suite + lint + format check:**

Run:
```bash
npm test
npm run lint
npm run format:check
```
Expected: tests and lint PASS. If `format:check` flags ONLY the new preset files (`girih.js`, `mandala.js`, `atomic.js`, `op-art.js`), run `npm run format` and re-stage them. Leave pre-existing unrelated format drift alone.

- [ ] **Step 6: Regenerate the manifest:**

```bash
npm run analyze
```

- [ ] **Step 7: Commit:**

```bash
git add docs/gallery.js docs/api.html test/ornamental.spec.js custom-elements.json
git commit -m "feat(ornamental): gallery mode pills, api docs, reduced-motion test (gl-wc-k3m)"
```

- [ ] **Step 8: Close the issue:**

```bash
bd close gl-wc-k3m --reason="girih, mandala, atomic, op-art shipped with tests, gallery pills, and docs"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- `girih` 8/12/6-fold WebGL strapwork → Task 1. ✓
- `mandala` layered radial WebGL → Task 2. ✓
- `atomic` mid-century Canvas2D (mixed/boomerangs/starbursts/harlequin) → Task 3. ✓
- `op-art` WebGL (riley/cafewall/moire/drift) → Task 4. ✓
- New `ornamental` group + `atomic`→`pop` → Tasks 1 (group + girih), 2, 3, 4. ✓
- Theming via `getColors()`; `intensity`/`speed`/`density`/`seed`/`mode` → all tasks. ✓
- `staticFrame` for reduced motion → every preset + Task 5 test. ✓
- Gallery auto-enumeration + mode pills → Task 5. ✓
- `api.html` catalog + `custom-elements.json` → Task 5. ✓
- Tests (load/render, modes, reduced-motion, registration/group) → Tasks 1–5. ✓

**Type/name consistency:** every WebGL preset uses the same uniform-setup shape as `kaleidoscope` (`u_time`/`u_intensity`/`u_density` + colors + `u_res`, plus `u_fold`/`u_mode` where modal). `atomic` mirrors `confetti`'s `create({ c2d, getColors })` + `clearAndFill` + `mulberry32`, adding `host` for mode. Registry keys (`girih`, `mandala`, `atomic`, `op-art`) and group ids (`ornamental`, `pop`) match between tasks, tests, gallery, and docs.

**No-derivatives note:** shaders avoid `fwidth`; AA uses constant-width `smoothstep` (`band()`), WebGL1-safe.

**Visual tuning:** shader/shape constants are first drafts; Step 6 "visual check" in each preset task is the expected place to refine the look during execution — the TDD tests assert structure (loads/renders/modes/no-fallback), not pixels.
