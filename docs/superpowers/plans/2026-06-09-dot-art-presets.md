# Dot-art Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three canvas2d `<bg-wc>` presets — `dotwork`, `stipple`, `tapestry` — capturing the Aboriginal / Pacific-Northwest / pointillist dot-art motifs from the reference paintings (concentric dot rosettes, stippled fields, dotted spirals/whorls, flow-traced dots).

**Architecture:** Three preset modules sharing one internal helper module (`src/presets/_dots.js`) of pure + canvas2d dot primitives. All follow the established canvas2d preset shape (see `src/presets/scandi.js`): theme palette built fresh each frame via `getColors()`, layout cached by `seed|density|size`, `mulberry32` for determinism, `clearAndFill` for the bg, `staticFrame` for reduced-motion. Variant selection uses the existing `mode` host attribute (as in `doodles`/`mosaic`/`atomic`). Dense fields render once to an offscreen canvas and blit; flow modes run a capped particle sim.

**Tech Stack:** Vanilla JS ES modules, Canvas2D, Playwright (browser tests), node:test (units), custom-elements-manifest (cem).

**Spec:** `docs/superpowers/specs/2026-06-09-dot-art-presets-design.md`

---

## File Structure

- **Create** `src/presets/_dots.js` — shared dot primitives: `mix`, `buildDotPalette`, `dotCircle`, `concentricRings`, `phyllotaxis`, `doubleSpiral`, `whorl`, `stippleField`.
- **Create** `src/presets/dotwork.js` — radial dotted structures (`mode`: rings/spiral/double/whorl/waterholes).
- **Create** `src/presets/stipple.js` — pointillist fields (`mode`: field/contour/vortex).
- **Create** `src/presets/tapestry.js` — dense dot-art composite (no mode).
- **Modify** `src/presets/index.js` — 3 `REGISTRY` entries.
- **Modify** `test/new-presets.spec.js` — add names to `PRESETS`; add `mode` + density/seed coverage.
- **Create** `test/dots-unit.mjs` — node units for the pure helpers.
- **Modify** `docs/api.html`, `README.md` — catalog rows + `mode` docs.
- **Regenerate** `custom-elements.json` via `npm run analyze` (new modules appear in the manifest; `cem:check` is CI-gated).

---

## Task 1: Setup — branch + beads issues

**Files:** none (tracking only)

- [ ] **Step 1: Create a feature branch** (we are on `main`, the default)

```bash
git checkout -b feat/dot-art-presets
```

- [ ] **Step 2: Create beads epic + child issues** (repo uses `bd`, NOT TodoWrite)

```bash
bd create --title="Dot-art presets (dotwork, stipple, tapestry)" --type=feature --priority=2 \
  --description="Add Aboriginal/pointillist dot-art presets per docs/superpowers/specs/2026-06-09-dot-art-presets-design.md"
# note the returned id as $EPIC, then:
bd create --title="Shared dot primitives _dots.js" --type=task --priority=2 --description="Pure + canvas2d dot helpers shared by the three presets"
bd create --title="dotwork preset" --type=task --priority=2 --description="Radial dotted structures with mode rings/spiral/double/whorl/waterholes"
bd create --title="stipple preset" --type=task --priority=2 --description="Pointillist fields with mode field/contour/vortex"
bd create --title="tapestry preset" --type=task --priority=2 --description="Dense dot-art composite backdrop"
bd create --title="Docs + manifest for dot-art presets" --type=task --priority=2 --description="api.html catalog rows, README mode note, regenerate custom-elements.json"
```

- [ ] **Step 3: Claim the first task**

```bash
bd ready   # confirm visible; claim the _dots.js task
bd update <dots-task-id> --claim
```

---

## Task 2: Shared dot primitives (`_dots.js`)

**Files:**
- Create: `src/presets/_dots.js`
- Test: `test/dots-unit.mjs`

- [ ] **Step 1: Write the failing unit test**

Create `test/dots-unit.mjs`:

```js
// Units for the pure helpers in _dots.js. Drawing helpers need a real canvas
// and are exercised by the Playwright preset tests instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mix, buildDotPalette } from '../src/presets/_dots.js';

test('mix lerps each channel', () => {
  assert.deepEqual(mix([0, 0, 0], [1, 1, 1], 0.5), [0.5, 0.5, 0.5]);
  assert.deepEqual(mix([0.2, 0.4, 0.6], [0.2, 0.4, 0.6], 1), [0.2, 0.4, 0.6]);
});

test('buildDotPalette returns css strings and a highlight', () => {
  const c = {
    primary: [1, 0, 0], accent: [0, 1, 0], info: [0, 0, 1],
    success: [1, 1, 0], warning: [1, 0, 1], error: [0, 1, 1],
    bg: [0, 0, 0, 1], fg: [1, 1, 1, 1],
  };
  const { pal, highlight } = buildDotPalette(c, 1);
  assert.equal(pal.length, 6);
  assert.match(pal[0], /^rgb\(/);
  assert.match(highlight, /^rgb\(/);
});

test('buildDotPalette softens toward bg at low intensity', () => {
  const c = { primary: [1, 1, 1], bg: [0, 0, 0, 1], fg: [1, 1, 1, 1] };
  const vivid = buildDotPalette(c, 1).pal[0];
  const soft = buildDotPalette(c, 0).pal[0];
  assert.notEqual(vivid, soft); // low intensity pulls white toward black
});

test('buildDotPalette tolerates missing roles and transparent bg', () => {
  const { pal, highlight } = buildDotPalette({ primary: [0.9, 0.3, 0.3], bg: [0, 0, 0, 0] }, 0.5);
  assert.ok(pal.length >= 1);
  assert.equal(highlight, '#ffffff'); // no fg → white
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/dots-unit.mjs`
Expected: FAIL — `Cannot find module '../src/presets/_dots.js'`.

- [ ] **Step 3: Implement `_dots.js`**

Create `src/presets/_dots.js`:

```js
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
      dotCircle(c2d, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, dotR, pal[(ci + arm * 4 + k) % m]);
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
    dotCircle(c2d, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, dotR, k % 6 < 3 ? baseCss : highlight);
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/dots-unit.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Lint + commit**

```bash
npm run lint -- src/presets/_dots.js
git add src/presets/_dots.js test/dots-unit.mjs
git commit -m "feat(presets): shared dot-art primitives (_dots.js)"
```

---

## Task 3: `dotwork` preset

**Files:**
- Create: `src/presets/dotwork.js`
- Modify: `src/presets/index.js` (registry)
- Test: `test/new-presets.spec.js`

- [ ] **Step 1: Add the failing tests**

In `test/new-presets.spec.js`, add `'dotwork'` to the `PRESETS` array (the generic render test). Then append this `mode` test at the end of the file:

```js
// dotwork: every radial-structure mode loads and renders without falling back.
test('dotwork honors each `mode` value without erroring', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const mode of ['rings', 'spiral', 'double', 'whorl', 'waterholes', '']) {
    const ok = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', 'dotwork');
      await el.ready;
      return !el.hasAttribute('data-fallback');
    }, mode);
    expect(ok, `mode="${mode}" should render`).toBe(true);
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test test/new-presets.spec.js -g dotwork`
Expected: FAIL — preset `dotwork` not in registry / module missing.

- [ ] **Step 3: Implement `dotwork.js`**

Create `src/presets/dotwork.js`:

```js
import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import {
  buildDotPalette,
  concentricRings,
  phyllotaxis,
  doubleSpiral,
  whorl,
  dotCircle,
} from './_dots.js';

// Aboriginal / pointillist dotwork: discrete dotted structures scattered on a
// theme-bg field, each gently rotating on its own slow cycle. `mode` picks the
// structure; layout is seed-cached and only dot angles recompute per frame.

const ROT_W = 0.15; // base rotation frequency
const MODES = ['rings', 'spiral', 'double', 'whorl', 'waterholes'];
const DETAIL = { low: 0.55, med: 1, high: 1.6 }; // dots-per-structure multiplier

function readMode(host) {
  const m = (host.getAttribute('mode') || 'rings').toLowerCase();
  return MODES.includes(m) ? m : 'rings';
}

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let cache = null;

  function build(params, mode) {
    const key = `${mode}|${params.seed | 0}|${params.density}|${w}x${h}`;
    if (cache && cache.key === key) return cache;
    const rng = mulberry32((params.seed | 0) || 1);
    const s = Math.min(w, h);
    const count = Math.max(3, Math.round(w * h * 0.000018 * (0.4 + params.density * 1.4)));
    const motifs = [];
    for (let i = 0; i < count; i++) {
      motifs.push({
        cx: rng() * w,
        cy: rng() * h,
        scale: (0.5 + rng()) * s * (mode === 'waterholes' ? 0.05 : 0.07),
        turns: 2 + rng() * 2,
        dir: rng() < 0.5 ? 1 : -1,
        ci: (rng() * 6) | 0,
        phase: rng() * Math.PI * 2,
        spin: 0.4 + rng() * 0.8,
      });
    }
    const paths = [];
    if (mode === 'waterholes') {
      for (let i = 0; i < motifs.length - 1; i++) {
        const a = motifs[i];
        const b = motifs[i + 1];
        paths.push({
          ax: a.cx,
          ay: a.cy,
          bx: b.cx,
          by: b.cy,
          mx: (a.cx + b.cx) / 2 + (rng() - 0.5) * s * 0.3,
          my: (a.cy + b.cy) / 2 + (rng() - 0.5) * s * 0.3,
        });
      }
    }
    cache = { key, motifs, paths };
    return cache;
  }

  function frame(t, params) {
    const mode = readMode(host);
    const { motifs, paths } = build(params, mode);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const { pal, highlight } = buildDotPalette(c, params.intensity);
    const detail = DETAIL[params.quality] || DETAIL.med;
    const dotR = Math.max(1, Math.min(w, h) * 0.0045);
    const rings = 2 + Math.round((params.intensity ?? 0.5) * 3); // 2..5

    // Connecting meander paths first (under the rosettes).
    for (const p of paths) {
      const steps = 28;
      for (let st = 0; st <= steps; st++) {
        const u = st / steps;
        const x = (1 - u) * (1 - u) * p.ax + 2 * (1 - u) * u * p.mx + u * u * p.bx;
        const y = (1 - u) * (1 - u) * p.ay + 2 * (1 - u) * u * p.my + u * u * p.by;
        dotCircle(c2d, x, y, dotR * 0.8, highlight);
      }
    }

    for (const m of motifs) {
      const phase = m.phase + t * ROT_W * m.spin * m.dir;
      const common = { dotR, pal, highlight, phase, dir: m.dir, ci: m.ci };
      if (mode === 'spiral') {
        phyllotaxis(c2d, m.cx, m.cy, { ...common, n: Math.round(140 * detail), scale: m.scale * 0.5 });
      } else if (mode === 'double') {
        doubleSpiral(c2d, m.cx, m.cy, { ...common, arms: 2, n: Math.round(90 * detail), b: m.scale * 0.35 });
      } else if (mode === 'whorl') {
        whorl(c2d, m.cx, m.cy, {
          ...common,
          baseCss: pal[m.ci % pal.length],
          turns: m.turns,
          b: m.scale * 0.12,
        });
      } else {
        // rings (default) and waterholes both draw rosettes
        concentricRings(c2d, m.cx, m.cy, { ...common, rings, ringGap: m.scale * 0.18 });
      }
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
      frame(0, params);
    },
    dispose() {
      cache = null;
    },
  };
}
```

- [ ] **Step 4: Add the registry entry**

In `src/presets/index.js`, in the "Ornamental geometry" block (after the `op-art` entry), add:

```js
  // Dot-art — Aboriginal / pointillist dotwork
  dotwork: { renderer: 'canvas2d', group: 'ornamental', loader: () => import('./dotwork.js') },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test test/new-presets.spec.js -g dotwork`
Expected: PASS (generic render test + the 6 mode values).

- [ ] **Step 6: Lint + commit**

```bash
npm run lint -- src/presets/dotwork.js src/presets/index.js
git add src/presets/dotwork.js src/presets/index.js test/new-presets.spec.js
git commit -m "feat(presets): dotwork — radial dot structures (rings/spiral/double/whorl/waterholes)"
```

---

## Task 4: `stipple` preset

**Files:**
- Create: `src/presets/stipple.js`
- Modify: `src/presets/index.js`
- Test: `test/new-presets.spec.js`

- [ ] **Step 1: Add the failing tests**

Add `'stipple'` to the `PRESETS` array in `test/new-presets.spec.js`, then append:

```js
// stipple: each field mode renders, paints bytes, and never falls back.
test('stipple honors each `mode` value and paints bytes', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const mode of ['field', 'contour', 'vortex', '']) {
    const detail = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', 'stipple');
      await el.ready;
      await new Promise((r) => requestAnimationFrame(r));
      const blob = await el.snapshot();
      return { fallback: el.hasAttribute('data-fallback'), size: blob.size };
    }, mode);
    expect(detail.fallback, `mode="${mode}" should not fall back`).toBe(false);
    expect(detail.size, `mode="${mode}" should paint bytes`).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test test/new-presets.spec.js -g stipple`
Expected: FAIL — preset `stipple` missing.

- [ ] **Step 3: Implement `stipple.js`**

Create `src/presets/stipple.js`:

```js
import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { buildDotPalette, stippleField, dotCircle } from './_dots.js';

// Pointillist fields. `field` renders a dense graded stipple once to an
// offscreen canvas and blits it (with a sparse shimmer on top); `contour` and
// `vortex` run a capped particle sim whose dots trace a flow field / swirl
// around hidden vortices and respawn before collapsing.

const MODES = ['field', 'contour', 'vortex'];
const CAP = { low: 600, med: 1500, high: 3000 };

function readMode(host) {
  const m = (host.getAttribute('mode') || 'field').toLowerCase();
  return MODES.includes(m) ? m : 'field';
}

export function create({ c2d, getColors, host }) {
  let w = 0;
  let h = 0;
  let base = null; // { key, canvas }
  let sim = null; // { key, items, verts, rng }

  function fieldCanvas(params, palKey, pal) {
    const key = `${params.seed | 0}|${params.density}|${palKey}|${w}x${h}`;
    if (base && base.key === key) return base.canvas;
    const off = (base && base.canvas) || document.createElement('canvas');
    off.width = w;
    off.height = h;
    const g = off.getContext('2d');
    g.clearRect(0, 0, w, h);
    const rng = mulberry32((params.seed | 0) || 1);
    const count = Math.round(w * h * 0.0008 * (0.3 + params.density * 1.5));
    const dotR = Math.max(1, Math.min(w, h) * 0.0035);
    stippleField(g, w, h, { rng, count, dotR, pal });
    base = { key, canvas: off };
    return off;
  }

  function buildSim(params, mode) {
    const cap = CAP[params.quality] || CAP.med;
    const n = Math.max(50, Math.round(cap * (0.3 + params.density)));
    const key = `${mode}|${params.seed | 0}|${n}|${w}x${h}`;
    if (sim && sim.key === key) return sim;
    const rng = mulberry32((params.seed | 0) || 1);
    const items = [];
    for (let i = 0; i < n; i++) {
      items.push({ x: rng() * w, y: rng() * h, ci: i, life: (rng() * 200) | 0 });
    }
    const verts = [];
    if (mode === 'vortex') {
      for (let i = 0; i < 4; i++) verts.push([rng() * w, rng() * h, rng() < 0.5 ? 1 : -1]);
    }
    sim = { key, items, verts, rng };
    return sim;
  }

  function flowAngle(x, y, t) {
    return Math.sin(x * 0.006 + t * 0.2) * 1.6 + Math.cos(y * 0.007 - x * 0.004) * 1.6;
  }

  function frame(t, params) {
    const mode = readMode(host);
    const c = getColors();
    const { pal } = buildDotPalette(c, params.intensity);
    const palKey = pal.join(',');
    clearAndFill(c2d, w, h, c.bg);

    if (mode === 'field') {
      c2d.drawImage(fieldCanvas(params, palKey, pal), 0, 0);
      const rng = mulberry32(((params.seed | 0) || 1) ^ ((t * 2) | 0));
      const dotR = Math.max(1, Math.min(w, h) * 0.0045);
      for (let i = 0; i < 40; i++) {
        dotCircle(c2d, rng() * w, rng() * h, dotR, pal[(rng() * pal.length) | 0]);
      }
      return;
    }

    const s = buildSim(params, mode);
    const dotR = Math.max(1, Math.min(w, h) * 0.0035);
    const n = pal.length;
    for (const p of s.items) {
      if (mode === 'contour') {
        const a = flowAngle(p.x, p.y, t);
        p.x += Math.cos(a) * 1.3;
        p.y += Math.sin(a) * 1.3;
        if (--p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = s.rng() * w;
          p.y = s.rng() * h;
          p.life = 60 + ((s.rng() * 120) | 0);
        }
      } else {
        let vx = 0;
        let vy = 0;
        let near = 1e9;
        for (const v of s.verts) {
          const dx = p.x - v[0];
          const dy = p.y - v[1];
          const d2 = dx * dx + dy * dy + 600;
          near = Math.min(near, d2);
          vx += (-dy / d2) * v[2] * 2600;
          vy += (dx / d2) * v[2] * 2600;
        }
        const ang = Math.atan2(vy, vx);
        const sp = Math.min(2.2, Math.hypot(vx, vy));
        p.x += Math.cos(ang) * sp;
        p.y += Math.sin(ang) * sp;
        if (--p.life <= 0 || near < 900 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = s.rng() * w;
          p.y = s.rng() * h;
          p.life = 120 + ((s.rng() * 180) | 0);
        }
      }
      dotCircle(c2d, p.x, p.y, dotR, pal[p.ci % n]);
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      base = null;
      sim = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      base = null;
      sim = null;
    },
  };
}
```

- [ ] **Step 4: Add the registry entry**

In `src/presets/index.js`, in the "Overlay textures" block (after `paper-grain`), add:

```js
  stipple: { renderer: 'canvas2d', group: 'texture', loader: () => import('./stipple.js') },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test test/new-presets.spec.js -g stipple`
Expected: PASS.

- [ ] **Step 6: Lint + commit**

```bash
npm run lint -- src/presets/stipple.js src/presets/index.js
git add src/presets/stipple.js src/presets/index.js test/new-presets.spec.js
git commit -m "feat(presets): stipple — pointillist fields (field/contour/vortex)"
```

---

## Task 5: `tapestry` preset

**Files:**
- Create: `src/presets/tapestry.js`
- Modify: `src/presets/index.js`
- Test: `test/new-presets.spec.js`

- [ ] **Step 1: Add the failing test**

Add `'tapestry'` to the `PRESETS` array in `test/new-presets.spec.js`, then append:

```js
// tapestry: dense composite backdrop must render across density/seed and paint.
test('tapestry renders across density and seed without erroring', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  for (const [density, seed] of [
    ['0.2', '2'],
    ['0.6', '11'],
    ['1', '99'],
  ]) {
    const detail = await page.evaluate(
      async ([d, s]) => {
        const el = document.getElementById('wc');
        el.setAttribute('preset', 'tapestry');
        el.setAttribute('density', d);
        el.setAttribute('seed', s);
        await el.ready;
        const blob = await el.snapshot();
        return { fallback: el.hasAttribute('data-fallback'), size: blob.size };
      },
      [density, seed]
    );
    expect(detail.fallback, `density=${density} seed=${seed} should not fall back`).toBe(false);
    expect(detail.size, `density=${density} seed=${seed} should paint bytes`).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx playwright test test/new-presets.spec.js -g tapestry`
Expected: FAIL — preset `tapestry` missing.

- [ ] **Step 3: Implement `tapestry.js`**

Create `src/presets/tapestry.js`:

```js
import { clearAndFill } from '../renderer/canvas2d.js';
import { mulberry32 } from '../util/pause.js';
import { buildDotPalette, stippleField, concentricRings, whorl } from './_dots.js';

// Dense dot-art composite: a stipple field base (offscreen, cached) packed with
// concentric dot rosettes and a few whorls, edge to edge like the source
// paintings. Designed as a rich backdrop with page content layered on top.

const ROT_W = 0.1;

export function create({ c2d, getColors }) {
  let w = 0;
  let h = 0;
  let base = null; // { key, canvas }
  let layout = null; // { key, rings, whorls }

  function fieldCanvas(params, palKey, pal) {
    const key = `${params.seed | 0}|${params.density}|${palKey}|${w}x${h}`;
    if (base && base.key === key) return base.canvas;
    const off = (base && base.canvas) || document.createElement('canvas');
    off.width = w;
    off.height = h;
    const g = off.getContext('2d');
    g.clearRect(0, 0, w, h);
    const rng = mulberry32((params.seed | 0) || 1);
    const count = Math.round(w * h * 0.0012 * (0.5 + params.density * 1.2));
    const dotR = Math.max(1, Math.min(w, h) * 0.003);
    stippleField(g, w, h, { rng, count, dotR, pal });
    base = { key, canvas: off };
    return off;
  }

  function build(params) {
    const key = `${params.seed | 0}|${params.density}|${params.intensity}|${w}x${h}`;
    if (layout && layout.key === key) return layout;
    const rng = mulberry32(((params.seed | 0) || 1) ^ 0x9e37);
    const s = Math.min(w, h);
    const rings = [];
    const ringCount = Math.round(6 + params.density * 14 + (params.intensity ?? 0.5) * 6);
    for (let i = 0; i < ringCount; i++) {
      rings.push({
        cx: rng() * w,
        cy: rng() * h,
        rings: 2 + ((rng() * 3) | 0),
        ringGap: s * (0.012 + rng() * 0.02),
        ci: (rng() * 6) | 0,
        dir: rng() < 0.5 ? 1 : -1,
        phase: rng() * Math.PI * 2,
      });
    }
    const whorls = [];
    const whorlCount = Math.round(2 + params.density * 4);
    for (let i = 0; i < whorlCount; i++) {
      whorls.push({
        cx: rng() * w,
        cy: rng() * h,
        turns: 2 + rng() * 2,
        b: s * (0.006 + rng() * 0.01),
        ci: (rng() * 6) | 0,
        dir: rng() < 0.5 ? 1 : -1,
        phase: rng() * Math.PI * 2,
      });
    }
    layout = { key, rings, whorls };
    return layout;
  }

  function frame(t, params) {
    const c = getColors();
    const { pal, highlight } = buildDotPalette(c, params.intensity);
    const palKey = pal.join(',');
    clearAndFill(c2d, w, h, c.bg);
    c2d.drawImage(fieldCanvas(params, palKey, pal), 0, 0);
    const { rings, whorls } = build(params);
    const dotR = Math.max(1, Math.min(w, h) * 0.004);
    for (const r of rings) {
      concentricRings(c2d, r.cx, r.cy, {
        rings: r.rings,
        ringGap: r.ringGap,
        dotR,
        pal,
        highlight,
        ci: r.ci,
        phase: r.phase + t * ROT_W * r.dir,
      });
    }
    for (const sw of whorls) {
      whorl(c2d, sw.cx, sw.cy, {
        turns: sw.turns,
        b: sw.b,
        dotR: dotR * 0.85,
        baseCss: pal[sw.ci % pal.length],
        highlight,
        phase: sw.phase + t * ROT_W * sw.dir,
        dir: sw.dir,
      });
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      base = null;
      layout = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      base = null;
      layout = null;
    },
  };
}
```

- [ ] **Step 4: Add the registry entry**

In `src/presets/index.js`, directly after the `dotwork` entry (same ornamental block), add:

```js
  tapestry: { renderer: 'canvas2d', group: 'ornamental', loader: () => import('./tapestry.js') },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx playwright test test/new-presets.spec.js -g tapestry`
Expected: PASS.

- [ ] **Step 6: Lint + commit**

```bash
npm run lint -- src/presets/tapestry.js src/presets/index.js
git add src/presets/tapestry.js src/presets/index.js test/new-presets.spec.js
git commit -m "feat(presets): tapestry — dense dot-art composite backdrop"
```

---

## Task 6: Docs + manifest

**Files:**
- Modify: `docs/api.html`
- Modify: `README.md`
- Regenerate: `custom-elements.json`

- [ ] **Step 1: Extend the `mode` attribute docs in `docs/api.html`**

Find the `<tr>` whose first cell is `<code>mode</code>` (the preset-specific variant selector row, ~line 177). Append to its description cell:

```html
 <code>dotwork</code>: <code>rings</code>/<code>spiral</code>/<code>double</code>/<code>whorl</code>/<code>waterholes</code>; <code>stipple</code>: <code>field</code>/<code>contour</code>/<code>vortex</code>.
```

- [ ] **Step 2: Add catalog rows in `docs/api.html`**

In `<section id="presets">`, in the Ornamental group add rows for `dotwork` and `tapestry`, and in the Texture group add a row for `stipple`, matching the existing `<tr><td><code>name</code></td>...<td>description</td></tr>` shape:

```html
<tr><td><code>dotwork</code></td><td>canvas2d</td><td>Aboriginal/pointillist dot structures — concentric rosettes, spirals, whorls, songline waterholes. <code>mode</code>: <code>rings</code> (default), <code>spiral</code>, <code>double</code>, <code>whorl</code>, <code>waterholes</code>.</td></tr>
<tr><td><code>tapestry</code></td><td>canvas2d</td><td>Dense dot-art composite — a stippled field packed with rosettes and whorls, a rich backdrop for layered content.</td></tr>
<tr><td><code>stipple</code></td><td>canvas2d</td><td>Pointillist dot fields. <code>mode</code>: <code>field</code> (default graded stipple), <code>contour</code> (dots trace a flow field), <code>vortex</code> (swirling, respawning).</td></tr>
```

(Match the exact column structure of the surrounding rows in each group; the snippet above assumes a name/renderer/description layout — adjust cells to fit.)

- [ ] **Step 3: Note the new mode-readers in `README.md`**

Find the line listing presets that read extra attributes (~line 65: "Some presets read additional attributes from the host: `mosaic` reads…"). Add `dotwork` and `stipple` to the `mode`-readers in that sentence.

- [ ] **Step 4: Regenerate the manifest**

Run: `npm run analyze`
Then verify it is now in sync:
Run: `npm run cem:check`
Expected: PASS (no drift). The new preset modules now appear in `custom-elements.json`.

- [ ] **Step 5: Commit**

```bash
git add docs/api.html README.md custom-elements.json
git commit -m "docs(presets): document dot-art presets + regenerate manifest"
```

---

## Task 7: Full verification + integration

**Files:** none (verification + merge)

- [ ] **Step 1: Run the full quality gate** (mirror CI)

```bash
npm run lint
npm run format:check
npm run cem:check
npm run test:node
npm run build
npm run build:site
npm test
```

Expected: all green. If `format:check` fails, run `npx prettier --write` on the new files and re-commit. If any preset test fails, debug with `superpowers:systematic-debugging` before proceeding.

- [ ] **Step 2: Visual sanity check** (optional but recommended)

Run: `npm run dev`, open the gallery, confirm `dotwork`, `stipple`, `tapestry` appear in the Ornamental/Texture groups and render. Toggle `mode` values and a dark/light theme to confirm theme colors apply live.

- [ ] **Step 3: Close beads issues + commit any fixups**

```bash
bd close <dots-id> <dotwork-id> <stipple-id> <tapestry-id> <docs-id> <epic-id>
```

- [ ] **Step 4: Integrate** — use `superpowers:finishing-a-development-branch` to merge `feat/dot-art-presets` to `main` (or open a PR), then complete the repo's session-close protocol:

```bash
git pull --rebase
bd dolt push
git push
git status   # MUST show up to date with origin
```

---

## Notes for the implementer

- **Time rule:** `t` is already scaled by `speed` before `frame(t)`. Drive all motion from `t` — never multiply by `params.speed` again.
- **Colors:** always from `getColors()`, read every frame. Never hardcode a palette (the fixed colors in the brainstorm mockups were throwaway).
- **Resolution independence:** size everything from the device-pixel `W`/`H` passed to `resize()`; the context is not pre-scaled.
- **Offscreen canvases** are created lazily inside `create()` (never at module top level) so SSR import stays DOM-free.
- **`mode` is read from `host`** every frame via `host.getAttribute('mode')`, so changing it needs no re-init — same convention as `doodles`/`mosaic`.
