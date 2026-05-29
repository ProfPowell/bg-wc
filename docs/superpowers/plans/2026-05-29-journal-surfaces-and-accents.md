# Journal Surfaces & Animated Accents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation for a bullet-journal theme — static paper substrates in Vanilla Breeze plus two animated bg-wc presets (`paper-grain`, `doodles`).

**Architecture:** Two stacked layers. The *substrate* (paper/dots/grid/lines/kraft) is static CSS in vanilla-breeze, applied via `[data-surface="…"]`. The *accents* (`paper-grain`, `doodles`) are bg-wc JS presets that render transparent animated overlays on top of any background.

**Tech Stack:** bg-wc presets are ES modules using WebGL (via `src/renderer/webgl.js`) or Canvas2D; registered in `src/presets/index.js`; tested with Playwright. VB surfaces are plain CSS tokens + `[data-surface]` rules, tested via computed-style assertions in Playwright.

**Two repos:** Tasks 1, 2, 4 are in `~/src/bg-wc`. Task 3 is in `~/src/vanilla-breeze`. Each task names its repo.

**Spec:** `docs/superpowers/specs/2026-05-29-journal-surfaces-and-accents-design.md`

---

## File structure

**bg-wc (`~/src/bg-wc`):**
- Create: `src/presets/paper-grain.js` — warm low-motion grain WebGL preset.
- Create: `src/presets/doodles.js` — hand-drawn marginalia Canvas2D preset.
- Modify: `src/presets/index.js` — register both presets.
- Modify: `test/new-presets-page.html` — (no change needed; reused as harness).
- Modify: `test/new-presets.spec.js` — add load/render + mode tests for both.
- Create: `demos/journal.html` — composed substrate + accents demo.
- Modify: `demos/index.html` — add hub entry (follow existing entries).

**vanilla-breeze (`~/src/vanilla-breeze`):**
- Modify: `src/tokens/extensions/surfaces.css` — add journal tokens.
- Modify: `src/utils/surface-types.css` — add `[data-surface="paper|dots|grid|lines|kraft"]`.
- Create: `tests/visual/journal-surfaces.spec.js` — computed-style assertions.

---

## Task 1: `paper-grain` preset (bg-wc)

A warm, slow-drifting grain overlay — a paper-fiber sibling of `grain`.

**Repo:** `~/src/bg-wc`

**Files:**
- Create: `src/presets/paper-grain.js`
- Modify: `src/presets/index.js` (registry, `pattern` group)
- Test: `test/new-presets.spec.js`

- [ ] **Step 1: Register the preset**

In `src/presets/index.js`, inside the `REGISTRY` object, in the "Structured / geometric patterns" block right after the `grain:` entry, add:

```js
  'paper-grain': { renderer: 'webgl', group: 'pattern', loader: () => import('./paper-grain.js') },
```

- [ ] **Step 2: Add a failing render test**

In `test/new-presets.spec.js`, change the `PRESETS` array (line 3) to include the two new presets:

```js
const PRESETS = ['mosaic', 'ribbons', 'source', 'system7', 'supergraphics', 'flowlines', 'paper-grain', 'doodles'];
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx playwright test new-presets --grep "paper-grain"`
Expected: FAIL — the preset module does not exist yet, so `el.ready` resolves with `data-fallback` and the canvas-size check still passes BUT the page console errors on the failed dynamic import. (If it unexpectedly passes, the import error is being swallowed — proceed; Step 5 will make it genuinely pass.)

- [ ] **Step 4: Implement the preset**

Create `src/presets/paper-grain.js`:

```js
// paper-grain — warm, slow-drifting paper fiber texture. A sibling of `grain`,
// retuned for paper rather than film: the speckle is tinted toward the ink/fg
// color, the temporal change is a slow drift (not a 24fps strobe), and the
// default intensity is low so it textures warm paper without reading as noise.
// Sits over a page at low alpha (multiply / soft-light). Pattern group.

import { QUAD_VS, createProgram, fullscreenQuad, bindQuad } from '../renderer/webgl.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3  u_ink;
uniform vec2  u_res;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  // Fiber cell size: density 0 -> coarse, density 1 -> fine.
  float cell = mix(2.5, 1.0, u_density);
  vec2 g = floor(v_uv * u_res / cell);
  // Slow drift: advance the noise field a fraction of a cell per second
  // instead of quantizing to whole film frames. Paper breathes, it doesn't flicker.
  float drift = u_time * 0.6;
  float n = hash(g + floor(drift) * 1.7);
  float n2 = hash(g + floor(drift + 1.0) * 1.7);
  n = mix(n, n2, fract(drift));

  // Sparse coverage so it reads as an overlay; tint toward the ink color.
  float a = abs(n - 0.5) * 2.0;
  float alpha = smoothstep(0.6, 1.0, a) * mix(0.02, 0.18, u_intensity);
  // Blend the speckle between a touch lighter and the ink color for warmth.
  vec3 col = mix(vec3(1.0), u_ink, 0.6);
  gl_FragColor = vec4(col, alpha);
}
`;

export function create({ gl, getColors }) {
  const program = createProgram(gl, QUAD_VS, FS);
  const buf = fullscreenQuad(gl);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uInt = gl.getUniformLocation(program, 'u_intensity');
  const uDen = gl.getUniformLocation(program, 'u_density');
  const uInk = gl.getUniformLocation(program, 'u_ink');
  const uRes = gl.getUniformLocation(program, 'u_res');

  let w = 1,
    h = 1;

  function draw(t, params) {
    const c = getColors();
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(program);
    bindQuad(gl, buf, aPos);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uInt, params.intensity);
    gl.uniform1f(uDen, params.density);
    gl.uniform3f(uInk, c.fg[0], c.fg[1], c.fg[2]);
    gl.uniform2f(uRes, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      draw(t, params);
    },
    staticFrame(params) {
      draw(0, params);
    },
    dispose() {
      try {
        gl.deleteProgram(program);
        gl.deleteBuffer(buf);
      } catch {}
    },
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx playwright test new-presets --grep "paper-grain"`
Expected: PASS — `preset "paper-grain" loads and renders to canvas`.

- [ ] **Step 6: Commit**

```bash
git add src/presets/paper-grain.js src/presets/index.js test/new-presets.spec.js
git commit -m "feat(preset): paper-grain — warm low-motion paper fiber overlay"
```

---

## Task 2: `doodles` preset (bg-wc)

Hand-drawn marginalia that sketch in, hold, and fade, biased to the page margins, with selectable icon families via `mode`.

**Repo:** `~/src/bg-wc`

**Files:**
- Create: `src/presets/doodles.js`
- Modify: `src/presets/index.js` (registry)
- Test: `test/new-presets.spec.js`

- [ ] **Step 1: Register the preset**

In `src/presets/index.js`, in the "Structured / geometric patterns" block right after the `paper-grain:` entry from Task 1, add:

```js
  doodles: { renderer: 'canvas2d', group: 'pattern', loader: () => import('./doodles.js') },
```

- [ ] **Step 2: Add a failing `mode` test**

In `test/new-presets.spec.js`, append this test (the load/render check was already added to `PRESETS` in Task 1):

```js
// doodles: every `mode` family value loads and renders without error, and an
// absent mode (defaults to all families) also renders.
test('doodles honors each `mode` value and defaults to all', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const mode of ['planner', 'botanical', 'geometric', 'planner botanical', '']) {
    const ok = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', 'doodles');
      await el.ready;
      return !el.hasAttribute('data-fallback');
    }, mode);
    expect(ok, `mode="${mode}" should render`).toBe(true);
  }
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx playwright test new-presets --grep "doodles"`
Expected: FAIL — `./doodles.js` does not exist; import fails and the element shows `data-fallback`.

- [ ] **Step 4: Implement the preset**

Create `src/presets/doodles.js`:

```js
// doodles — hand-drawn bullet-journal marginalia. Sketch icons draw themselves
// stroke-by-stroke at the page margins, hold, then fade; new ones spawn to keep
// a small population alive. Clears to transparent so it overlays any substrate
// (paper/dot-grid surface). Canvas2D. Pattern group.
//
// Icon families are selected with the `mode` attribute (same convention as
// `mosaic`): a space/comma-separated list of `planner`, `botanical`,
// `geometric`. Absent/empty/unknown -> all three.

import { mulberry32 } from '../util/pause.js';

// --- Icon library ----------------------------------------------------------
// Each icon is an array of strokes; each stroke is an array of [x,y] points in
// a normalized 0..1 box. Curves are densified into polylines so a single
// length-based reveal works uniformly across every icon.

function star() {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 0.48 : 0.2;
    pts.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r]);
  }
  return [pts];
}
function arrow() {
  return [
    [[0.1, 0.5], [0.85, 0.5]],
    [[0.6, 0.3], [0.88, 0.5], [0.6, 0.7]],
  ];
}
function check() {
  return [[[0.2, 0.55], [0.42, 0.78], [0.82, 0.25]]];
}
function heart() {
  const p = [];
  for (let i = 0; i <= 24; i++) {
    const t = (Math.PI * 2 * i) / 24;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    p.push([0.5 + x / 40, 0.5 - y / 40]);
  }
  return [p];
}
function sprig() {
  return [
    [[0.5, 0.95], [0.5, 0.08]],
    [[0.5, 0.62], [0.28, 0.46]],
    [[0.5, 0.5], [0.72, 0.34]],
    [[0.5, 0.38], [0.3, 0.24]],
  ];
}
function box() {
  return [[[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8], [0.2, 0.2]]];
}
function triangle() {
  return [[[0.5, 0.15], [0.85, 0.82], [0.15, 0.82], [0.5, 0.15]]];
}
function divider() {
  return [
    [[0.08, 0.5], [0.92, 0.5]],
    [[0.08, 0.42], [0.08, 0.58]],
    [[0.92, 0.42], [0.92, 0.58]],
  ];
}

const FAMILIES = {
  planner: [star, arrow, check],
  botanical: [sprig, heart],
  geometric: [box, triangle, divider],
};
const ALL = ['planner', 'botanical', 'geometric'];

function parseMode(raw) {
  if (!raw) return ALL;
  const names = String(raw)
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((n) => FAMILIES[n]);
  return names.length ? names : ALL;
}
function poolFor(families) {
  const out = [];
  for (const f of families) out.push(...FAMILIES[f]);
  return out;
}

// --- Geometry helpers ------------------------------------------------------

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
function strokeLen(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += dist(points[i - 1], points[i]);
  return len;
}

// Draw the first `frac` (0..1) of a device-space polyline.
function drawPartial(c2d, points, frac) {
  const total = strokeLen(points);
  if (total <= 0) return;
  let budget = frac * total;
  c2d.beginPath();
  c2d.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const seg = dist(points[i - 1], points[i]);
    if (budget >= seg) {
      c2d.lineTo(points[i][0], points[i][1]);
      budget -= seg;
    } else {
      const u = budget / seg;
      const x = points[i - 1][0] + (points[i][0] - points[i - 1][0]) * u;
      const y = points[i - 1][1] + (points[i][1] - points[i - 1][1]) * u;
      c2d.lineTo(x, y);
      break;
    }
  }
  c2d.stroke();
}

const CAPS = { low: 3, med: 5, high: 8 };

export function create({ host, c2d, getColors }) {
  let w = 1,
    h = 1;
  let rand = mulberry32(7);
  let lastSeed = null;
  let instances = [];
  let lastT = 0;
  let spawnAccum = 0;

  function activePool() {
    return poolFor(parseMode(host.getAttribute('mode')));
  }

  // Pick a margin-biased position (device px): reject points in the central
  // clear rectangle, but fall back gracefully on small viewports.
  function marginPoint(s) {
    const cx0 = w * 0.22,
      cx1 = w * 0.78,
      cy0 = h * 0.26,
      cy1 = h * 0.74;
    for (let i = 0; i < 6; i++) {
      const x = s + rand() * (w - 2 * s);
      const y = s + rand() * (h - 2 * s);
      if (x < cx0 || x > cx1 || y < cy0 || y > cy1) return [x, y];
    }
    return [s + rand() * (w - 2 * s), s + rand() * (h - 2 * s)];
  }

  function spawn(now, pool, color, speed) {
    if (!pool.length) return;
    const icon = pool[(rand() * pool.length) | 0]();
    const s = (26 + rand() * 30) * (0.8 + rand() * 0.4);
    const [px, py] = marginPoint(s);
    const jitter = s * 0.04;
    // Bake jittered device-space strokes once at spawn time.
    const strokes = icon.map((stroke) =>
      stroke.map(([nx, ny]) => [
        px + (nx - 0.5) * s + (rand() - 0.5) * jitter,
        py + (ny - 0.5) * s + (rand() - 0.5) * jitter,
      ])
    );
    const drawDur = (0.6 + rand() * 0.6) / Math.max(0.25, speed);
    instances.push({
      strokes,
      lens: strokes.map(strokeLen),
      born: now,
      drawDur,
      holdDur: 1.2 + rand() * 1.6,
      fadeDur: 0.7,
      lineWidth: Math.max(1.4, s * 0.045) * (0.85 + rand() * 0.4),
      color,
    });
  }

  function drawInstance(inst, age) {
    const drawEnd = inst.drawDur;
    const holdEnd = drawEnd + inst.holdDur;
    const fadeEnd = holdEnd + inst.fadeDur;
    if (age >= fadeEnd) return false; // dead
    let alpha = 1;
    let p = 1;
    if (age < drawEnd) p = age / drawEnd;
    else if (age > holdEnd) alpha = 1 - (age - holdEnd) / inst.fadeDur;

    const total = inst.lens.reduce((a, b) => a + b, 0) || 1;
    let budget = p * total;

    c2d.save();
    c2d.globalAlpha = Math.max(0, alpha);
    c2d.strokeStyle = inst.color;
    c2d.lineWidth = inst.lineWidth;
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    for (let i = 0; i < inst.strokes.length; i++) {
      if (budget <= 0) break;
      const len = inst.lens[i];
      const frac = len > 0 ? Math.min(1, budget / len) : 1;
      drawPartial(c2d, inst.strokes[i], frac);
      budget -= len;
    }
    c2d.restore();
    return true;
  }

  function inkColor(c) {
    const r = (c.fg[0] * 255) | 0;
    const g = (c.fg[1] * 255) | 0;
    const b = (c.fg[2] * 255) | 0;
    return `rgb(${r},${g},${b})`;
  }

  function frame(t, params) {
    if (params.seed !== lastSeed) {
      rand = mulberry32(params.seed || 7);
      lastSeed = params.seed;
    }
    const c = getColors();
    const color = inkColor(c);
    const cap = CAPS[params.quality] || CAPS.med;
    const target = Math.max(1, Math.round(cap * (0.4 + params.density)));

    const dt = Math.max(0, Math.min(0.1, t - lastT));
    lastT = t;

    // Spawn rate scales with intensity; throttled so doodles appear staggered.
    const rate = 0.3 + params.intensity * 1.2; // per second
    spawnAccum += rate * dt;
    const pool = activePool();
    while (spawnAccum >= 1 && instances.length < target) {
      spawn(t, pool, color, params.speed);
      spawnAccum -= 1;
    }

    c2d.clearRect(0, 0, w, h);
    instances = instances.filter((inst) => drawInstance(inst, t - inst.born));
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame(t, params) {
      frame(t, params);
    },
    staticFrame(params) {
      // Reduced-motion: a fixed, fully-drawn, seeded scatter of marginalia.
      const c = getColors();
      const color = inkColor(c);
      const r = mulberry32(params.seed || 7);
      const saved = rand;
      rand = r; // marginPoint/spawn use module-closure `rand`
      c2d.clearRect(0, 0, w, h);
      const n = Math.max(2, Math.round((CAPS[params.quality] || CAPS.med) * (0.4 + params.density)));
      const pool = activePool();
      for (let i = 0; i < n; i++) {
        spawn(0, pool, color, 1);
      }
      for (const inst of instances) drawInstance(inst, inst.drawDur); // p=1, alpha=1
      instances = [];
      rand = saved;
    },
    dispose() {
      instances = [];
    },
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx playwright test new-presets --grep "doodles"`
Expected: PASS — both `preset "doodles" loads and renders to canvas` and `doodles honors each mode value and defaults to all`.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: no errors in `src/presets/doodles.js` or `paper-grain.js`.

- [ ] **Step 7: Commit**

```bash
git add src/presets/doodles.js src/presets/index.js test/new-presets.spec.js
git commit -m "feat(preset): doodles — hand-drawn marginalia with selectable families"
```

---

## Task 3: VB journal substrate surfaces (vanilla-breeze)

Static paper substrates applied via `[data-surface]`, built on the existing `--texture-*` primitives plus new journal tokens.

**Repo:** `~/src/vanilla-breeze`

**Files:**
- Modify: `src/tokens/extensions/surfaces.css`
- Modify: `src/utils/surface-types.css`
- Create: `tests/visual/journal-surfaces.spec.js`

- [ ] **Step 1: Add journal tokens**

In `~/src/vanilla-breeze/src/tokens/extensions/surfaces.css`, inside the top `:root { … }` block, after the `--texture-lines` declaration, add:

```css
  /* ========================================
   * Journal substrate tokens (bullet-journal theme foundation)
   * ======================================== */
  --surface-paper: oklch(0.965 0.018 88);
  --kraft:  oklch(0.81 0.06 72);
  --dot:    oklch(0.8 0.018 250);
  --rule:   oklch(0.86 0.015 70);
  --margin: oklch(0.64 0.16 25);
```

- [ ] **Step 2: Add the surface rules**

In `~/src/vanilla-breeze/src/utils/surface-types.css`, before the closing `@media (prefers-reduced-transparency: reduce)` block, add:

```css
/* ========================================
 * Journal substrates — bullet-journal paper surfaces
 * Static CSS only. dots is a 22px tile with a faint blue-gray dot.
 * ======================================== */
[data-surface="paper"] {
  background: var(--texture-grain), var(--surface-paper);
  background-size: 180px 180px, auto;
  background-blend-mode: soft-light;
}

[data-surface="dots"] {
  background-color: var(--surface-paper);
  background-image: radial-gradient(circle, var(--dot) 1.3px, transparent 1.7px);
  background-size: 22px 22px;
  background-position: 0 0;
}

[data-surface="grid"] {
  background-color: var(--surface-paper);
  background-image:
    linear-gradient(to right, var(--rule) 1px, transparent 1px),
    linear-gradient(to bottom, var(--rule) 1px, transparent 1px);
  background-size: 22px 22px;
}

[data-surface="lines"] {
  background-color: var(--surface-paper);
  background-image:
    linear-gradient(to right, transparent 0 40px, var(--margin) 40px 41px, transparent 41px),
    repeating-linear-gradient(to bottom, transparent 0 27px, var(--rule) 27px 28px);
}

[data-surface="kraft"] {
  background: var(--texture-grain), var(--kraft);
  background-size: 180px 180px, auto;
  background-blend-mode: soft-light;
}
```

- [ ] **Step 3: Write the failing test**

Create `~/src/vanilla-breeze/tests/visual/journal-surfaces.spec.js`:

```js
import { test, expect } from '@playwright/test';

// Journal substrates render as backgrounds via [data-surface]. We assert on
// computed style (deterministic, no screenshot baseline) and that the dot grid
// uses the journal 22px tile.
const SURFACES = ['paper', 'dots', 'grid', 'lines', 'kraft'];

test.beforeEach(async ({ page }) => {
  await page.setContent(`
    <link rel="stylesheet" href="/src/main.css">
    ${SURFACES.map((s) => `<div id="${s}" data-surface="${s}" style="width:200px;height:120px">x</div>`).join('')}
  `);
});

for (const s of SURFACES) {
  test(`surface "${s}" sets a background`, async ({ page }) => {
    const bg = await page.evaluate((id) => {
      const el = document.getElementById(id);
      const cs = getComputedStyle(el);
      return cs.backgroundImage + '|' + cs.backgroundColor;
    }, s);
    // paper/kraft use a background-image (texture); the rest set a gradient.
    expect(bg).not.toBe('none|rgba(0, 0, 0, 0)');
  });
}

test('dots surface uses the 22px journal tile', async ({ page }) => {
  const size = await page.evaluate(() => getComputedStyle(document.getElementById('dots')).backgroundSize);
  expect(size).toContain('22px');
});
```

- [ ] **Step 4: Run the test to verify it fails, then passes**

First confirm the import path: check that `~/src/vanilla-breeze/src/main.css` exists and `@import`s `tokens/index.css` and `utils/surface-types.css` (or the bundle that includes them). If `surface-types.css` is not yet wired into `main.css`, add `@import "./utils/surface-types.css";` following the existing `@import` ordering in `main.css`.

Run: `cd ~/src/vanilla-breeze && npx playwright test journal-surfaces`
Expected: PASS for all six tests. (If a surface test fails with `none|rgba(0, 0, 0, 0)`, the CSS isn't reaching the page — fix the `main.css` import wiring and re-run.)

- [ ] **Step 5: Commit (in vanilla-breeze)**

```bash
cd ~/src/vanilla-breeze
git add src/tokens/extensions/surfaces.css src/utils/surface-types.css tests/visual/journal-surfaces.spec.js
git commit -m "feat(surfaces): bullet-journal substrates (paper/dots/grid/lines/kraft)"
```

---

## Task 4: Composed journal demo (bg-wc)

A demo page showing a substrate with both accents layered on top, plus a hub entry.

**Repo:** `~/src/bg-wc`

**Files:**
- Create: `demos/journal.html`
- Modify: `demos/index.html`

- [ ] **Step 1: Inspect an existing demo + the hub for the exact pattern**

Read `demos/pint-tribute.html` (recently rewritten with `data-background`) and the top of `demos/index.html` to copy the exact `<head>`, script import, and hub-entry markup conventions. Match them — do not invent new structure.

- [ ] **Step 2: Create the demo**

Create `demos/journal.html`. Use a dot-grid substrate via inline CSS that mirrors the VB `[data-surface="dots"]` recipe (the demo should stand alone without depending on VB being installed), and layer the `doodles` accent via `data-background`. Replace the `<head>`/import lines if Step 1 shows a different convention:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Journal — bg-wc</title>
  <style>
    :root {
      --color-text: #2b2b2b;
      --surface-paper: oklch(0.965 0.018 88);
      --dot: oklch(0.8 0.018 250);
    }
    html, body { margin: 0; min-height: 100%; }
    body {
      font: 16px/1.6 system-ui, sans-serif;
      color: var(--color-text);
      background-color: var(--surface-paper);
      background-image: radial-gradient(circle, var(--dot) 1.3px, transparent 1.7px);
      background-size: 22px 22px;
    }
    main {
      max-width: 42rem;
      margin: 0 auto;
      padding: 4rem 1.5rem;
      position: relative;
    }
    h1 { font-size: 2rem; }
  </style>
</head>
<body data-background="doodles" data-background-mode="planner botanical" data-background-intensity="0.6">
  <main>
    <h1>Today</h1>
    <p>A dot-grid journal page with hand-drawn marginalia sketching in at the margins.</p>
    <ul>
      <li>Draft the journal theme</li>
      <li>Review surfaces</li>
      <li>Ship the demo</li>
    </ul>
  </main>
  <script type="module" src="../src/data-background.js"></script>
</body>
</html>
```

- [ ] **Step 3: Verify `data-background-mode` maps through the binder**

Confirm in `src/data-background.js` that `data-background-mode` becomes the `mode` attribute (the binder maps `data-background-<key>` → kebab attribute; `mode` has no `color-` prefix so it is set via `setAttribute('mode', …)`). Open `demos/journal.html` in the dev server and confirm doodles appear and respect the families.

Run: `npm run dev` then open `http://localhost:<port>/demos/journal.html`
Expected: dot-grid page with planner+botanical doodles drawing in near the edges.

- [ ] **Step 4: Add the hub entry**

In `demos/index.html`, add a `journal` entry following the exact markup pattern of the existing entries identified in Step 1 (e.g. the `pint-tribute` entry). Place it alphabetically or with the other tribute/themed demos as the surrounding entries are organized.

- [ ] **Step 5: Run the full preset test suite**

Run: `npx playwright test new-presets`
Expected: PASS — all preset load/render tests including `paper-grain` and `doodles`, plus the `doodles` mode test.

- [ ] **Step 6: Commit**

```bash
git add demos/journal.html demos/index.html
git commit -m "demo: journal — dot-grid substrate + doodles marginalia"
```

---

## Self-review notes (verification before done)

- **Spec coverage:** VB tokens (Task 3 Step 1), five surfaces incl. 22px dots (Task 3 Steps 2/4), `paper-grain` warm/low-motion/staticFrame (Task 1), `doodles` edge-bias/draw-hold-fade/mode/staticFrame (Task 2), transparent overlay via `clearRect` (Task 2 Step 4), theme-aware `getColors` (both presets), demo + hub (Task 4), tests (all tasks). No `--pattern-*` namespace introduced (uses `--texture-*` + journal tokens) — matches the token-naming decision.
- **Type consistency:** preset return shape `{ resize, frame, staticFrame, dispose }` matches the contract used by `confetti.js`/`grain.js`; `getColors().fg` is an `[r,g,b,a]` tuple (per `tokens.js`); `mulberry32` imported from `util/pause.js` (same as `confetti.js`); registry keys `'paper-grain'` and `doodles` match the loader filenames and the test `PRESETS`/`mode` lists.
- **Out of scope (not in any task, by design):** washi-tape layer, border-wc tier, `--pattern-*` aliases, packaged theme.
