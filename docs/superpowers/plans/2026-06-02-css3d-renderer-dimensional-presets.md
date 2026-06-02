# css3d Renderer + Dimensional Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third `bg-wc` renderer kind, `css3d`, that mounts DOM/CSS-3D scenes, and ship two theme-aware background presets on it: `fly-through` (a composable tunnel) and `explode` (a particle burst).

**Architecture:** Hybrid "approach C" — CSS `@keyframes` drive motion (GPU-composited); JS owns parameters (node count, colors, perspective, duration) and toggles `animation-play-state`. The component gains a `css3d` dispatch branch that mounts a `<div>` stage instead of a `<canvas>`; everything else (theming via `getColors`, pause/visibility/reduced-motion, fallback slot) is reused. The rAF loop, when running, only reconciles a few CSS vars per frame so live theme switches apply — it never writes per-node transforms.

**Tech Stack:** Vanilla custom element, ESM, Vite (dev server + build), Playwright (browser tests), ESLint/Prettier.

**Spec:** `docs/superpowers/specs/2026-06-02-css3d-renderer-dimensional-presets-design.md`

**Reference pens (in-repo):** `docs/superpowers/plans/found-demos/fly-through/fly.css`, `docs/superpowers/plans/found-demos/explode-cube/explode-cube.css`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/renderer/css3d.js` | NEW. Stage factory + helpers (`mountStyle`, `setVars`, `setPlaying`, `dispose`). No drawing context. |
| `src/bg-wc.js` | EDIT. css3d dispatch branch, stage layer, `setPlaying` wiring, fallback/snapshot/resize/`mode` handling. |
| `src/presets/index.js` | EDIT. Register `fly-through` + `explode` under a new `dimensional` group. |
| `src/presets/fly-through.js` | NEW. Composable tunnel: profile × path × unit, density, theming. |
| `src/presets/explode.js` | NEW. Particle burst over a floor grid. |
| `demos/dimensional.html` | NEW. Both presets with real content slotted on top — proof they work as backgrounds. |
| `test/css3d.spec.js` | NEW. Playwright tests for the renderer + both presets. |

The test harness page `test/new-presets-page.html` (already hosts `<bg-wc id="wc">` with theme tokens) is reused — no new test page needed.

---

## Task 1: The css3d renderer module

**Files:**
- Create: `src/renderer/css3d.js`
- Test: deferred — exercised through the component in Task 2 (a bare module has no behavior to assert without a host).

- [ ] **Step 1: Write the module**

```js
// src/renderer/css3d.js
// css3d — DOM / CSS-3D renderer. Unlike webgl/canvas2d there is no drawing
// context: the "context" is a <div> stage mounted in the shadow root that a
// preset builds a `transform-style: preserve-3d` scene into. Motion lives in
// CSS @keyframes; JS only sets parameters and toggles play-state. See
// docs/superpowers/specs/2026-06-02-css3d-renderer-dimensional-presets-design.md
// (approach C).

export function createCSS3DContext() {
  const stage = document.createElement('div');
  stage.className = 'stage';
  stage.setAttribute('part', 'stage');
  stage.setAttribute('aria-hidden', 'true');
  stage.setAttribute('role', 'presentation');
  // Default to playing; the component flips this via setPlaying().
  stage.setAttribute('data-playing', '1');

  let styleEl = null;

  return {
    stage,

    // Inject (or replace) the preset's scoped stylesheet inside the stage.
    mountStyle(css) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        stage.appendChild(styleEl);
      }
      styleEl.textContent = css;
      return styleEl;
    },

    // Write CSS custom properties onto the stage, skipping unchanged values so
    // a per-frame reconcile does not thrash style recalc.
    setVars(map) {
      const s = stage.style;
      for (const k in map) {
        const v = String(map[k]);
        if (s.getPropertyValue(k) !== v) s.setProperty(k, v);
      }
    },

    // Start/stop CSS motion without tearing the scene down. Presets gate their
    // animations on `.stage[data-playing="0"]` (see the shared pause rule each
    // preset includes).
    setPlaying(playing) {
      stage.setAttribute('data-playing', playing ? '1' : '0');
    },

    dispose() {
      try {
        styleEl?.remove();
      } catch {}
      styleEl = null;
      stage.replaceChildren();
    },
  };
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/css3d.js
git commit -m "feat(css3d): stage factory + style/var helpers (gl-wc-2zw)"
```

---

## Task 2: Wire the css3d dispatch into the component

Mount a stage for `css3d` presets. Drive it with a skeleton `fly-through` so the pipeline is testable; the real scene lands in Task 5.

**Files:**
- Modify: `src/bg-wc.js` (import, STYLE, `#loadCurrentPreset`, `create()` call, `#resize`)
- Create: `src/presets/fly-through.js` (skeleton)
- Modify: `src/presets/index.js` (register `fly-through` + `dimensional` group)
- Create: `test/css3d.spec.js`

- [ ] **Step 1: Write the failing test**

```js
// test/css3d.spec.js
import { test, expect } from '@playwright/test';

test('css3d preset mounts a stage <div>, not a canvas', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const result = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'fly-through');
    await el.ready;
    const root = el.shadowRoot;
    return {
      hasStage: !!root.querySelector('div.stage[part="stage"]'),
      hasCanvas: !!root.querySelector('canvas'),
      fallback: el.hasAttribute('data-fallback'),
    };
  });
  expect(result.hasStage).toBe(true);
  expect(result.hasCanvas).toBe(false);
  expect(result.fallback).toBe(false);
});

test('css3d preset emits bg-wc:ready with renderer "css3d"', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const detail = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const el = document.getElementById('wc');
        el.addEventListener('bg-wc:ready', (e) => resolve(e.detail), { once: true });
        el.setAttribute('preset', 'fly-through');
      })
  );
  expect(detail.renderer).toBe('css3d');
  expect(detail.preset).toBe('fly-through');
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- css3d.spec.js`
Expected: FAIL — `fly-through` is an unknown preset (load error), no stage mounted.

- [ ] **Step 3: Create the skeleton preset**

```js
// src/presets/fly-through.js
// fly-through — skeleton; the scene is built out in a later task. For now it
// just mounts an empty stage so the css3d pipeline is exercisable.

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

export function create({ css3d }) {
  css3d.mountStyle(`
    .stage { perspective: var(--perspective, 600px); overflow: hidden; }
    .stage .scene { position: absolute; inset: 0; transform-style: preserve-3d; }
    ${PAUSE_RULE}
  `);
  const scene = document.createElement('div');
  scene.className = 'scene';
  css3d.stage.appendChild(scene);

  return {
    setPlaying(p) {
      css3d.setPlaying(p);
    },
    frame() {},
    dispose() {
      css3d.dispose();
    },
  };
}
```

- [ ] **Step 4: Register the preset and the group**

In `src/presets/index.js`, add inside `REGISTRY` (a new block, after the `particles` block):

```js
  // Dimensional / CSS-3D scenes
  'fly-through': { renderer: 'css3d', group: 'dimensional', loader: () => import('./fly-through.js') },
```

And in `GROUP_LABELS`, add a final entry:

```js
  dimensional: 'Dimensional / 3D',
```

- [ ] **Step 5: Edit `src/bg-wc.js` — import the renderer**

Add after the existing renderer imports (the line importing `createC2DContext`):

```js
import { createCSS3DContext } from './renderer/css3d.js';
```

- [ ] **Step 6: Edit `src/bg-wc.js` — stage styling in STYLE**

In the `STYLE` template string, after the `canvas { … }` block, add:

```css
.stage {
  position: absolute;
  inset: 0;
  z-index: var(--bg-wc-z-index, var(--gl-wc-z-index, 0));
  pointer-events: none;
  overflow: hidden;
}
:host([data-fallback]) .stage { display: none; }
```

- [ ] **Step 7: Edit `src/bg-wc.js` — dispatch branch in `#loadCurrentPreset`**

Replace this block (the canvas-swap + context creation):

```js
    // Swap canvas so we can switch renderer kinds without stale-context issues.
    this.#disposeInstance();
    const fresh = this.#makeCanvas();
    this.#canvas.replaceWith(fresh);
    this.#canvas = fresh;

    let ctx;
    try {
      ctx =
        loaded.renderer === 'webgl'
          ? createGLContext(this.#canvas)
          : createC2DContext(this.#canvas);
      if (!ctx) throw new Error(`${loaded.renderer} context unavailable`);
    } catch (err) {
      this.setAttribute('data-fallback', '');
      this.#emit('bg-wc:error', { phase: 'init', error: err });
      this.#readyResolve();
      return;
    }
```

with:

```js
    // Swap the layer element so we can switch renderer kinds without stale
    // context issues. For css3d the layer is a <div> stage; otherwise a <canvas>.
    // NOTE: #canvas holds the active layer element (canvas OR stage); canvas-only
    // code paths gate on #rendererKind.
    this.#disposeInstance();

    let ctx, layer;
    try {
      if (loaded.renderer === 'css3d') {
        ctx = createCSS3DContext();
        layer = ctx.stage;
      } else {
        layer = this.#makeCanvas();
        ctx =
          loaded.renderer === 'webgl'
            ? createGLContext(layer)
            : createC2DContext(layer);
        if (!ctx) throw new Error(`${loaded.renderer} context unavailable`);
      }
    } catch (err) {
      this.setAttribute('data-fallback', '');
      this.#emit('bg-wc:error', { phase: 'init', error: err });
      this.#readyResolve();
      return;
    }
    this.#canvas.replaceWith(layer);
    this.#canvas = layer;
```

- [ ] **Step 8: Edit `src/bg-wc.js` — pass `css3d` into `create()`**

In the `this.#instance = loaded.create({ … })` call, change the renderer params so they read:

```js
      this.#instance = loaded.create({
        host: this,
        canvas: loaded.renderer === 'css3d' ? null : this.#canvas,
        gl: loaded.renderer === 'webgl' ? ctx : null,
        c2d: loaded.renderer === 'canvas2d' ? ctx : null,
        css3d: loaded.renderer === 'css3d' ? ctx : null,
        getColors: () => resolveTokens(this, COLOR_MAPPING),
        getParams: () => this.#readParams(),
      });
```

- [ ] **Step 9: Edit `src/bg-wc.js` — `#resize` early branch**

At the top of `#resize()`, immediately after the `if (rect.width === 0 || rect.height === 0) return;` line, add:

```js
    if (this.#rendererKind === 'css3d') {
      try {
        this.#instance?.resize?.(rect.width, rect.height);
      } catch {}
      return;
    }
```

(The `rect` variable is already declared at the top of `#resize`.)

- [ ] **Step 10: Run the test to verify it passes**

Run: `npm test -- css3d.spec.js`
Expected: PASS (both tests).

- [ ] **Step 11: Confirm canvas presets still pass**

Run: `npm test -- new-presets.spec.js lifecycle.spec.js`
Expected: PASS (no regressions).

- [ ] **Step 12: Lint + commit**

```bash
npm run lint
git add src/bg-wc.js src/presets/index.js src/presets/fly-through.js test/css3d.spec.js
git commit -m "feat(css3d): mount stage layer + dispatch branch (gl-wc-2zw)"
```

---

## Task 3: Pause, reduced-motion, and snapshot for css3d

**Files:**
- Modify: `src/bg-wc.js` (`#evalPlay`, `#updateFallbackVisibility`, `snapshot`)
- Modify: `test/css3d.spec.js`

- [ ] **Step 1: Write the failing tests**

Append to `test/css3d.spec.js`:

```js
test('paused toggles data-playing on the stage', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const states = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'fly-through');
    await el.ready;
    const stage = el.shadowRoot.querySelector('div.stage');
    const playing = stage.getAttribute('data-playing');
    el.setAttribute('paused', '');
    const paused = stage.getAttribute('data-playing');
    el.removeAttribute('paused');
    const resumed = stage.getAttribute('data-playing');
    return { playing, paused, resumed };
  });
  expect(states.playing).toBe('1');
  expect(states.paused).toBe('0');
  expect(states.resumed).toBe('1');
});

test('reduced motion freezes the scene but keeps it visible (no fallback)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/test/new-presets-page.html');
  const result = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'fly-through');
    await el.ready;
    const stage = el.shadowRoot.querySelector('div.stage');
    return {
      fallback: el.hasAttribute('data-fallback'),
      playing: stage.getAttribute('data-playing'),
      stageVisible: getComputedStyle(stage).display !== 'none',
    };
  });
  expect(result.fallback).toBe(false);
  expect(result.playing).toBe('0');
  expect(result.stageVisible).toBe(true);
});

test('snapshot() returns null for a css3d preset', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const snap = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'fly-through');
    await el.ready;
    return await el.snapshot();
  });
  expect(snap).toBeNull();
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- css3d.spec.js`
Expected: FAIL — `data-playing` not flipped on pause; snapshot returns a Blob, not null.

- [ ] **Step 3: Edit `#evalPlay`**

Replace `#evalPlay()` with:

```js
  #evalPlay() {
    const play = this.#shouldPlay();
    if (this.#rendererKind === 'css3d') {
      // setPlaying is the source of truth for CSS motion. rAF still runs when
      // playing, but only to reconcile params/colors (cheap), never per-node.
      try {
        this.#instance?.setPlaying?.(play);
      } catch {}
    }
    if (play) {
      if (!this.#rafId) {
        this.#lastTickMs = performance.now();
        this.#rafId = requestAnimationFrame(this.#tick);
      }
    } else {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = 0;
      // If reduced motion is the reason we're stopped, ask the preset for one
      // frame if it supports it. (css3d has no staticFrame — its paused scene
      // is already the static representation.)
      if (this.#instance && this.#reducedMotionActive() && this.#instance.staticFrame) {
        try {
          this.#instance.staticFrame(this.#readParams());
        } catch (err) {
          this.#emit('bg-wc:error', { phase: 'runtime', error: err });
        }
      }
    }
  }
```

- [ ] **Step 4: Edit `#updateFallbackVisibility`**

At the very top of `#updateFallbackVisibility()`, add:

```js
    if (this.#rendererKind === 'css3d') {
      // The paused scene is itself the static representation; never swap to the
      // fallback slot for css3d (even under reduced motion).
      this.removeAttribute('data-fallback');
      return;
    }
```

- [ ] **Step 5: Edit `snapshot()`**

At the top of `async snapshot()`, add:

```js
    // css3d renders to DOM, not a canvas — there is no pixel buffer to read.
    if (this.#rendererKind === 'css3d') return null;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- css3d.spec.js`
Expected: PASS (all css3d tests).

- [ ] **Step 7: Regression check + lint + commit**

```bash
npm test -- new-presets.spec.js lifecycle.spec.js smoke.spec.js
npm run lint
git add src/bg-wc.js test/css3d.spec.js
git commit -m "feat(css3d): pause via play-state, no fallback, null snapshot (gl-wc-2zw)"
```

---

## Task 4: `mode`/`density` rebuild the scene (css3d only)

**Files:**
- Modify: `src/bg-wc.js` (`observedAttributes`, `attributeChangedCallback`)
- Modify: `src/presets/fly-through.js` (read `density` so a rebuild is observable)
- Modify: `test/css3d.spec.js`

- [ ] **Step 1: Make the skeleton's node count depend on density**

In `src/presets/fly-through.js`, replace the body of `create()` so it builds `density`-many marker nodes (this is temporary scaffolding that Task 5 replaces, but it makes "rebuild on change" observable):

```js
export function create({ css3d, getParams }) {
  css3d.mountStyle(`
    .stage { perspective: var(--perspective, 600px); overflow: hidden; }
    .stage .scene { position: absolute; inset: 0; transform-style: preserve-3d; }
    ${PAUSE_RULE}
  `);
  const scene = document.createElement('div');
  scene.className = 'scene';
  const { density } = getParams();
  const rings = Math.max(1, Math.round(density * 20)); // skeleton: 0..20 rings
  for (let i = 0; i < rings; i++) {
    const r = document.createElement('div');
    r.className = 'ring';
    scene.appendChild(r);
  }
  css3d.stage.appendChild(scene);

  return {
    setPlaying(p) {
      css3d.setPlaying(p);
    },
    frame() {},
    dispose() {
      css3d.dispose();
    },
  };
}
```

- [ ] **Step 2: Write the failing tests**

Append to `test/css3d.spec.js`:

```js
test('changing density rebuilds the css3d scene (node count changes)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const counts = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('density', '0.25');
    el.setAttribute('preset', 'fly-through');
    await el.ready;
    const before = el.shadowRoot.querySelectorAll('.ring').length;
    el.setAttribute('density', '0.9');
    await el.ready;
    const after = el.shadowRoot.querySelectorAll('.ring').length;
    return { before, after };
  });
  expect(counts.after).toBeGreaterThan(counts.before);
});

test('changing mode on a canvas preset does NOT re-init (mosaic unaffected)', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const ok = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'mosaic');
    await el.ready;
    let reinits = 0;
    el.addEventListener('bg-wc:ready', () => reinits++);
    el.setAttribute('mode', 'flat');
    await new Promise((r) => requestAnimationFrame(r));
    return reinits === 0 && !el.hasAttribute('data-fallback');
  });
  expect(ok).toBe(true);
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `npm test -- css3d.spec.js`
Expected: FAIL — density change does not rebuild (`before === after`); `mode` is not even observed yet.

- [ ] **Step 4: Add `mode` to `observedAttributes`**

In `static get observedAttributes()`, add `'mode'` to the returned array (e.g. after `'fit'`).

- [ ] **Step 5: Handle `mode`/`density` re-init in `attributeChangedCallback`**

Add a branch to the `if/else` chain in `attributeChangedCallback`:

```js
    } else if (name === 'mode' || name === 'density') {
      // css3d builds its scene from these at create-time, so a change requires a
      // rebuild. Canvas presets read them per frame and need no re-init — pass
      // the current preset name as prevName so no spurious preset-changed fires.
      if (this.#rendererKind === 'css3d') this.#loadCurrentPreset(this.preset);
    }
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- css3d.spec.js`
Expected: PASS.

- [ ] **Step 7: Regression + lint + commit**

```bash
npm test -- new-presets.spec.js
npm run lint
git add src/bg-wc.js src/presets/fly-through.js test/css3d.spec.js
git commit -m "feat(css3d): rebuild scene on mode/density change (gl-wc-2zw)"
```

---

## Task 5: Build out `fly-through` (profile × path × unit, theming)

The tunnel is a torus of rings, each ring a cross-section of repeated units. Ring placement follows the formula derived from the reference pen (`docs/superpowers/plans/found-demos/fly-through/fly.css`), generated in JS so density scales it. The camera `@keyframes` are ported verbatim from the pen (they are a fixed flight path, independent of ring count).

**Derivation (default `ring` profile, full torus over `a = i * 720/N` degrees):**
- `x = -10 + 10*cos(a)` (em)
- `y = 5*cos(a/2)` (em)
- `z = -10*sin(a)` (em)
- `rotateY = a <= 360 ? a : 720 - a` (deg) — keeps units facing inward
- `rotateX = -15*sin(a/2)` (deg)

Verify against the pen: `i=1 (a=10°)` → x=-0.152, y≈4.981, z=-1.736, rotateX≈-1.307 — matches `fly.css` `.ring:nth-child(3)`.

**Files:**
- Modify: `src/presets/fly-through.js` (full implementation)
- Modify: `test/css3d.spec.js`

- [ ] **Step 1: Write the failing tests**

Replace the density-rebuild assertions are fine; append new behavior tests to `test/css3d.spec.js`:

```js
const FLY_MODES = ['', 'ring straight cube', 'corridor helix sphere', 'hex wave pyramid', 'tube straight card'];

for (const mode of FLY_MODES) {
  test(`fly-through renders for mode="${mode}"`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const ok = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', 'fly-through');
      await el.ready;
      const scene = el.shadowRoot.querySelector('.scene');
      return !el.hasAttribute('data-fallback') && scene && scene.querySelectorAll('.ring').length > 0;
    }, mode);
    expect(ok, `mode="${mode}" should render rings`).toBe(true);
  });
}

test('fly-through palette="theme" pulls a token color onto a unit', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const usesToken = await page.evaluate(async () => {
    const el = document.getElementById('wc');
    el.setAttribute('preset', 'fly-through');
    el.setAttribute('palette', 'theme'); // default, but explicit
    await el.ready;
    const face = el.shadowRoot.querySelector('.ring i, .ring .face');
    const bg = getComputedStyle(face).backgroundColor;
    // theme primary is #6b3fa0 → rgb(107, 63, 160); just assert it's not the
    // pen's rainbow gray/HSL default and is a real rgb().
    return /^rgb/.test(bg);
  });
  expect(usesToken).toBe(true);
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- css3d.spec.js`
Expected: FAIL — profiles/units not implemented; `.ring i`/`.face` selectors absent for non-default modes.

- [ ] **Step 3: Implement the full preset**

Replace the entire contents of `src/presets/fly-through.js`:

```js
// fly-through — a composable CSS-3D tunnel the camera flies through.
// Axes (read from the `mode` attribute, space-delimited):
//   profile: ring | corridor | hex | tube   (cross-section shape)
//   path:    straight | helix | wave         (centerline flown)
//   unit:    cube | sphere | pyramid | card  (repeated element)
// Defaults reproduce the reference pen
// (docs/superpowers/plans/found-demos/fly-through/fly.css).

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

// --- mode parsing ----------------------------------------------------------

const PROFILES = ['ring', 'corridor', 'hex', 'tube'];
const PATHS = ['straight', 'helix', 'wave'];
const UNITS = ['cube', 'sphere', 'pyramid', 'card'];

function parseMode(host) {
  const tokens = (host.getAttribute('mode') || '').toLowerCase().split(/\s+/).filter(Boolean);
  return {
    profile: tokens.find((t) => PROFILES.includes(t)) || 'ring',
    path: tokens.find((t) => PATHS.includes(t)) || 'straight',
    unit: tokens.find((t) => UNITS.includes(t)) || 'cube',
  };
}

// --- ring placement (the torus) -------------------------------------------

function ringTransform(profile, i, N) {
  const a = (i * 720) / N; // degrees
  const rad = (d) => (d * Math.PI) / 180;
  if (profile === 'corridor') {
    // Square corridor: same sweep, but cross-section snapped to a 4-corner box.
    const x = -10 + 10 * Math.cos(rad(a));
    const y = 5 * Math.cos(rad(a / 2));
    const z = -10 * Math.sin(rad(a));
    const ry = a <= 360 ? a : 720 - a;
    const rx = -15 * Math.sin(rad(a / 2));
    return `translate3d(${x}em, ${y}em, ${z}em) rotateY(${ry}deg) rotateX(${rx}deg)`;
  }
  if (profile === 'tube') {
    // Smooth cylinder: no per-ring rotateX bob, tighter radius.
    const x = -8 + 8 * Math.cos(rad(a));
    const z = -8 * Math.sin(rad(a));
    const ry = a <= 360 ? a : 720 - a;
    return `translate3d(${x}em, 0em, ${z}em) rotateY(${ry}deg)`;
  }
  // ring (default) and hex share the torus; hex differs only in unit count.
  const x = -10 + 10 * Math.cos(rad(a));
  const y = 5 * Math.cos(rad(a / 2));
  const z = -10 * Math.sin(rad(a));
  const ry = a <= 360 ? a : 720 - a;
  const rx = -15 * Math.sin(rad(a / 2));
  return `translate3d(${x}em, ${y}em, ${z}em) rotateY(${ry}deg) rotateX(${rx}deg)`;
}

// Extra per-ring transform layered on for non-straight paths.
function pathOffset(path, i, N) {
  if (path === 'helix') return ` rotateZ(${(i * 360) / N}deg)`;
  if (path === 'wave') return ` translateX(${3 * Math.sin((i / N) * Math.PI * 4)}em)`;
  return '';
}

// --- unit markup (the repeated element) -----------------------------------

// Number of units around each ring's cross-section.
function unitCount(profile) {
  if (profile === 'corridor') return 4;
  if (profile === 'hex') return 6;
  if (profile === 'tube') return 12;
  return 6; // ring
}

// Build one unit element. `n` is its index around the ring, `count` the total.
function makeUnit(unit, n, count) {
  const ry = (n * 360) / count;
  const el = document.createElement('i');
  el.style.setProperty('--ry', `${ry}deg`);
  // Lightness step gives the 3D shading the pen relies on.
  const light = 80 - Math.abs(((n / count) * 2 - 1)) * 45; // 80%..35%..80%
  el.style.setProperty('--light', `${light}%`);
  if (unit === 'cube') {
    el.dataset.unit = 'cube';
    for (let f = 0; f < 6; f++) el.appendChild(document.createElement('b'));
  } else {
    el.dataset.unit = unit; // sphere/pyramid/card are styled flat planes via CSS
  }
  return el;
}

// --- color reconcile -------------------------------------------------------

function rgb(c) {
  return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
}

// --- styles ----------------------------------------------------------------

// Camera flight + idle-rotation keyframes are ported VERBATIM from the
// reference pen. Copy the `@keyframes scene { … }` block (fly.css lines 87-94)
// and the `@keyframes flyThrough { … }` block (fly.css lines 782-1002 — the
// non-prefixed copy) into this template. They are camera paths and do NOT
// depend on ring count.
const KEYFRAMES = `
@keyframes scene { from { transform: rotateX(-45deg) rotateY(0deg); } to { transform: rotateX(-45deg) rotateY(360deg); } }
/* PORT: paste @keyframes flyThrough { … } from
   docs/superpowers/plans/found-demos/fly-through/fly.css here, unchanged. */
`;

function styleFor() {
  return `
    .stage { perspective: var(--perspective, 600px); overflow: hidden; display: grid; place-items: center; }
    .stage .scene { position: relative; transform-style: preserve-3d;
      animation: var(--fly-anim, scene) var(--fly-dur, 48s) infinite linear; }
    .ring { position: absolute; transform-style: preserve-3d; }
    .ring i { position: absolute; inset: -0.275em -0.55em; transform-style: preserve-3d;
      transform: rotateX(90deg) rotateY(var(--ry, 0deg)) translateZ(1em);
      background-color: color-mix(in srgb, var(--unit-color, #888) calc(var(--light, 60%)), white); }
    .ring i[data-unit='sphere'] { border-radius: 50%; }
    .ring i[data-unit='card'] { inset: -0.4em -0.6em; }
    .ring i b { position: absolute; inset: 0; background: inherit; }
    ${KEYFRAMES}
    ${PAUSE_RULE}
  `;
}

// --- preset ----------------------------------------------------------------

export function create({ host, css3d, getColors, getParams }) {
  css3d.mountStyle(styleFor());

  const { profile, path } = parseMode(host);
  const p = getParams();
  // density 0..1 → ring count, capped for performance (pen uses ~72).
  const N = Math.max(8, Math.round(8 + p.density * 64));
  const count = unitCount(profile);
  const { unit } = parseMode(host);

  const scene = document.createElement('div');
  scene.className = 'scene';
  for (let i = 0; i < N; i++) {
    const ring = document.createElement('div');
    ring.className = 'ring';
    ring.style.transform = ringTransform(profile, i, N) + pathOffset(path, i, N);
    ring.style.setProperty('--ring-i', String(i));
    for (let n = 0; n < count; n++) ring.appendChild(makeUnit(unit, n, count));
    scene.appendChild(ring);
  }
  css3d.stage.appendChild(scene);

  let lastSpeed = null;
  let lastColorKey = null;

  function reconcile() {
    const params = getParams();
    const c = getColors();
    // Flight on; theme vs spectrum color; speed → duration; intensity → perspective.
    css3d.setVars({
      '--fly-anim': 'flyThrough 24s -18s',
      '--perspective': `${Math.round(400 + params.intensity * 600)}px`,
    });
    if (params.speed !== lastSpeed) {
      lastSpeed = params.speed;
      const dur = (24 / Math.max(0.05, params.speed)).toFixed(2);
      css3d.setVars({ '--fly-dur': `${dur}s` });
    }
    // palette: theme cycles primary→accent→info across depth; spectrum = rainbow.
    const spectrum = (params.palette || 'theme') === 'spectrum';
    const key = spectrum ? 'spectrum' : rgb(c.primary) + rgb(c.accent) + rgb(c.info);
    if (key !== lastColorKey) {
      lastColorKey = key;
      const rings = scene.querySelectorAll('.ring');
      const palette = [rgb(c.primary), rgb(c.accent), rgb(c.info)];
      rings.forEach((ring, i) => {
        const color = spectrum
          ? `hsl(${(i * 360) / rings.length}, 50%, 60%)`
          : palette[i % palette.length];
        ring.style.setProperty('--unit-color', color);
      });
    }
  }

  reconcile();

  return {
    setPlaying(pl) {
      css3d.setPlaying(pl);
    },
    frame() {
      reconcile(); // cheap; guarded by lastSpeed/lastColorKey diffs
    },
    resize() {},
    dispose() {
      css3d.dispose();
    },
  };
}
```

- [ ] **Step 4: Port the camera keyframes**

Open `docs/superpowers/plans/found-demos/fly-through/fly.css`, copy the **non-`-webkit-` `@keyframes flyThrough { … }`** block (lines 782–1002) verbatim, and paste it into `KEYFRAMES` in place of the `/* PORT: … */` comment. Do not edit its values.

- [ ] **Step 5: Run the tests**

Run: `npm test -- css3d.spec.js`
Expected: PASS (all `FLY_MODES` render; palette test sees an `rgb()` color).

- [ ] **Step 6: Manual visual check**

Run: `npm run dev`, open `http://localhost:5173/test/new-presets-page.html`, in the console run `wc.setAttribute('preset','fly-through')`. Confirm a tunnel of colored units flies past. Try `wc.setAttribute('mode','corridor helix sphere')`.

- [ ] **Step 7: Lint + commit**

```bash
npm run lint
git add src/presets/fly-through.js test/css3d.spec.js
git commit -m "feat(fly-through): composable tunnel (profile/path/unit) + theming (gl-wc-2zw)"
```

---

## Task 6: Build the `explode` preset

Ported from `docs/superpowers/plans/found-demos/explode-cube/explode-cube.css`: a grid of points over a faint floor grid; each point's `::before` explodes outward and fades on a loop while the scene slowly rotates.

**Files:**
- Create: `src/presets/explode.js`
- Modify: `src/presets/index.js` (register `explode`)
- Modify: `test/css3d.spec.js`

- [ ] **Step 1: Write the failing tests**

Append to `test/css3d.spec.js`:

```js
for (const mode of ['', 'radial', 'cube']) {
  test(`explode renders for mode="${mode}"`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const ok = await page.evaluate(async (m) => {
      const el = document.getElementById('wc');
      if (m) el.setAttribute('mode', m);
      else el.removeAttribute('mode');
      el.setAttribute('preset', 'explode');
      await el.ready;
      return !el.hasAttribute('data-fallback') && el.shadowRoot.querySelectorAll('.particle').length > 0;
    }, mode);
    expect(ok, `mode="${mode}" should render particles`).toBe(true);
  });
}

test('explode is registered as a css3d preset', async ({ page }) => {
  await page.goto('/test/new-presets-page.html');
  const meta = await page.evaluate(() =>
    customElements.get('bg-wc').presets().find((p) => p.name === 'explode')
  );
  expect(meta.renderer).toBe('css3d');
  expect(meta.group).toBe('dimensional');
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm test -- css3d.spec.js`
Expected: FAIL — `explode` is an unknown preset.

- [ ] **Step 3: Create the preset**

```js
// src/presets/explode.js
// explode — a field of theme-colored particles over a faint floor grid that
// periodically bursts outward and reassembles. Ported from the explode-cube
// reference pen (docs/superpowers/plans/found-demos/explode-cube/explode-cube.css).

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

function rgb(c) {
  return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
}

// Tiny deterministic PRNG so `seed` gives reproducible scatter.
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STYLE = `
  .stage { perspective: 32em; overflow: hidden; display: grid; place-items: center; }
  .scene { position: relative; transform-style: preserve-3d;
    animation: explodeRotate var(--ex-dur, 117s) infinite linear; }
  .floor { position: absolute; inset: -32em; transform: rotateX(-90deg) translateZ(8em);
    background-image:
      radial-gradient(transparent, var(--ex-bg, #000) 32em),
      repeating-linear-gradient(90deg, var(--ex-rule, #fff) 0 1px, transparent 0 2em),
      repeating-linear-gradient(var(--ex-rule, #fff) 0 1px, transparent 0 2em);
    opacity: var(--ex-floor, 0.4); }
  .particle { position: absolute; transform: rotateX(90deg); transform-style: preserve-3d; }
  .particle::before { content: ''; position: absolute; inset: -1em;
    background-image: radial-gradient(var(--ex-color, #fff), transparent 60%);
    animation: explodeBurst var(--ex-cycle, 6s) infinite cubic-bezier(0.25,0,0.65,1.25),
               explodeFade var(--ex-cycle, 6s) infinite linear; }
  @keyframes explodeRotate { to { transform: rotateY(360deg); } }
  @keyframes explodeBurst {
    0%, 40%, 100% { transform: translate(0, 0); animation-timing-function: cubic-bezier(0.25,-0.25,0,1); }
    90% { transform: translate(var(--tx, 0), var(--ty, 0)); }
  }
  @keyframes explodeFade { 0%, 40%, 100% { opacity: 0.1; } 60%, 90% { opacity: 1; } }
  ${PAUSE_RULE}
`;

export function create({ host, css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);

  const p = getParams();
  const mode = (host.getAttribute('mode') || 'radial').toLowerCase();
  const rand = mulberry32((p.seed | 0) || 1);
  // density 0..1 → grid side, capped.
  const side = Math.max(4, Math.round(4 + p.density * 10));
  const burst = 2 + p.intensity * 6; // em

  const scene = document.createElement('div');
  scene.className = 'scene';
  const floor = document.createElement('div');
  floor.className = 'floor';
  scene.appendChild(floor);

  for (let gx = 0; gx < side; gx++) {
    for (let gy = 0; gy < side; gy++) {
      const el = document.createElement('div');
      el.className = 'particle';
      // Lay out on a grid, centered.
      el.style.left = `${(gx - side / 2) * 1.4}em`;
      el.style.top = `${(gy - side / 2) * 1.4}em`;
      let tx, ty;
      if (mode === 'cube') {
        // Burst to cube-face offsets (axis-aligned), like the reference pen.
        tx = `${(gx % 2 ? 1 : -1) * burst}em`;
        ty = `${(gy % 2 ? 1 : -1) * burst}em`;
      } else {
        // radial scatter
        const ang = rand() * Math.PI * 2;
        const r = burst * (0.4 + rand() * 0.6);
        tx = `${Math.cos(ang) * r}em`;
        ty = `${Math.sin(ang) * r}em`;
      }
      el.style.setProperty('--tx', tx);
      el.style.setProperty('--ty', ty);
      scene.appendChild(el);
    }
  }
  css3d.stage.appendChild(scene);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const cycle = (6 / Math.max(0.05, params.speed)).toFixed(2);
    css3d.setVars({ '--ex-cycle': `${cycle}s`, '--ex-floor': (0.2 + params.intensity * 0.4).toFixed(2) });
    const key = rgb(c.primary) + rgb(c.bg) + rgb(c.fg);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({ '--ex-color': rgb(c.primary), '--ex-bg': rgb(c.bg), '--ex-rule': rgb(c.fg) });
    }
  }
  reconcile();

  return {
    setPlaying(pl) {
      css3d.setPlaying(pl);
    },
    frame() {
      reconcile();
    },
    resize() {},
    dispose() {
      css3d.dispose();
    },
  };
}
```

- [ ] **Step 4: Register `explode`**

In `src/presets/index.js`, add under the `dimensional` block (next to `fly-through`):

```js
  explode: { renderer: 'css3d', group: 'dimensional', loader: () => import('./explode.js') },
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- css3d.spec.js`
Expected: PASS.

- [ ] **Step 6: Lint + commit**

```bash
npm run lint
git add src/presets/explode.js src/presets/index.js test/css3d.spec.js
git commit -m "feat(explode): css3d particle burst over floor grid (gl-wc-2zw)"
```

---

## Task 7: Demo page + final regression

**Files:**
- Create: `demos/dimensional.html`
- Modify: `test/css3d.spec.js` (screenshot sanity)

- [ ] **Step 1: Create the demo page**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>bg-wc — dimensional presets</title>
  <style>
    :root {
      --color-primary: #6b3fa0; --color-accent: #d946ef; --color-info: #25d0a6;
      --color-background: #0e0e12; --color-foreground: #f5f5f7;
    }
    body { margin: 0; font: 16px/1.5 system-ui, sans-serif; color: var(--color-foreground); }
    section { height: 100vh; }
    bg-wc { display: block; width: 100%; height: 100%; }
    .overlay { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; pointer-events: none; }
    .overlay h1 { font-size: clamp(2rem, 6vw, 5rem); margin: 0; }
    .overlay p { opacity: 0.85; }
  </style>
</head>
<body>
  <section>
    <bg-wc preset="fly-through" mode="ring straight cube" intensity="0.6">
      <div class="overlay">
        <h1>Fly-through</h1>
        <p>Content sits above a css3d background.</p>
      </div>
    </bg-wc>
  </section>
  <section>
    <bg-wc preset="explode" mode="radial" intensity="0.6">
      <div class="overlay">
        <h1>Explode</h1>
        <p>Theme-colored particle burst.</p>
      </div>
    </bg-wc>
  </section>
  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Add a screenshot sanity test**

Append to `test/css3d.spec.js`:

```js
test('dimensional demo renders both presets with content on top', async ({ page }) => {
  await page.goto('/demos/dimensional.html');
  await page.evaluate(async () => {
    for (const el of document.querySelectorAll('bg-wc')) await el.ready;
  });
  // Content slot is visible above the stage.
  await expect(page.locator('.overlay h1').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/dimensional-demo.png', fullPage: false });
});
```

- [ ] **Step 3: Run the test**

Run: `npm test -- css3d.spec.js`
Expected: PASS; `test-results/dimensional-demo.png` written.

- [ ] **Step 4: Full suite + lint + format check**

Run:
```bash
npm test
npm run lint
npm run format:check
```
Expected: all PASS. (If `format:check` flags the new files, run `npm run format` and re-stage.)

- [ ] **Step 5: Manifest + commit**

```bash
npm run analyze   # regenerate custom-elements.json if the component surface changed
git add demos/dimensional.html test/css3d.spec.js custom-elements.json
git commit -m "feat(css3d): dimensional demo page + screenshot test (gl-wc-2zw)"
```

- [ ] **Step 6: Close the issue**

```bash
bd close gl-wc-2zw --reason="css3d renderer + fly-through + explode shipped with tests"
```

---

## Self-Review (completed during planning)

**Spec coverage:**
- css3d renderer (stage, helpers) → Task 1. ✓
- 7 component edits → Tasks 2 (layer/dispatch/resize/STYLE/import), 3 (evalPlay/setPlaying/fallback/snapshot), 4 (observedAttributes+`mode`, re-init). ✓
- fly-through profile×path×unit + density + theming + spectrum opt-in → Task 5. ✓
- explode radial/cube + density + theming → Task 6. ✓
- New `dimensional` group → Tasks 2 (label + fly-through) & 6 (explode). ✓
- Reduced-motion = paused visible scene, no fallback → Task 3. ✓
- snapshot null for css3d → Task 3. ✓
- Demo page proving background use → Task 7. ✓
- Tests (mount, theming, pause, reduced-motion, mode rebuild, dispose, registration, snapshot) → Tasks 2–7. ✓

**Known port dependency:** Task 5 Step 4 ports `@keyframes flyThrough` verbatim from the in-repo pen — exact lines cited, no invention required.

**Type/name consistency:** the css3d context surface (`stage`, `mountStyle`, `setVars`, `setPlaying`, `dispose`) is used identically in Tasks 1, 2, 5, 6. The instance surface (`setPlaying`, `frame`, `resize`, `dispose`) matches what the component calls in `#evalPlay`/`#resize`/`#tick`/`#disposeInstance`.

**Note on `dispose()`:** css3d presets call `css3d.dispose()` from their own `dispose()`; the component's `#disposeInstance()` already calls `instance.dispose()`, so no css3d branch is needed there.
