# Preset Gap Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new presets (rain, fireflies, metaballs, zen-garden) and 4 themed demo pages that give ~18 never-demoed presets an in-context showcase.

**Architecture:** Each preset is one file in `src/presets/` plus one `REGISTRY` entry, following the contract in `src/presets/index.js`'s header. Canvas2d presets integrate motion from `t` via the dt idiom; the WebGL preset is a pure function of `u_time` through `makeShaderPreset`. Demos are standalone token-themed HTML pages in `demos/` registered as `.bw-card` tiles in `demos/index.html`.

**Tech Stack:** Vanilla JS ES modules, Canvas2D + WebGL, Playwright (browser tests), node:test (registry pinning), Docker (visual baselines in the pinned Playwright container).

**Spec:** `docs/superpowers/specs/2026-07-01-preset-gap-wave-design.md`

## Global Constraints

- Preset contract (`src/presets/index.js` header): colors from `getColors()` EVERY frame; `t` is pre-scaled by speed — never multiply motion by `params.speed`; layout seeded with `mulberry32(params.seed)`; provide `staticFrame(params)`; clean up in `dispose()`.
- dt idiom for canvas2d motion (must be exactly this so frozen `t` freezes the frame): `let dt = t - lastT; lastT = t; if (!(dt >= 0) || dt > 1) dt = 0;`
- Color strings only via `rgbCss`/`rgbaCss` from `src/renderer/tokens.js` — never hand-rolled channel math.
- No `mode` attribute on any new preset. No new registry groups.
- After every task: `npm run lint && npm run format:check` must pass (run `npx prettier --write "src/**/*.js" "test/**/*.{js,mjs}"` if needed). `npm run cem:check` must pass before each commit that touches `src/` exports (commit the regenerated `custom-elements.json` when it changes).
- Track work in bd (issue IDs created in Task 0); close the task's issue in its commit step. Do NOT use TodoWrite/TaskCreate.
- All commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 0: File bd issues for the wave

**Files:** none (tracker only)

**Interfaces:**
- Produces: eight bd issue IDs. Record them in a scratch note; later tasks close them. Referenced below as `$RAIN`, `$FIREFLIES`, `$METABALLS`, `$ZEN`, `$GALLERY`, `$SCRIPT`, `$FIELD`, `$GREEN`.

- [ ] **Step 1: Create the issues**

```bash
bd create --type=feature --priority=2 --title="Preset: rain (canvas2d, particles)" --description="Angled layered rain streaks + splash ripples per spec docs/superpowers/specs/2026-07-01-preset-gap-wave-design.md"
bd create --type=feature --priority=2 --title="Preset: fireflies (canvas2d, particles)" --description="Dusk glow-pulse wanderers, two-pass glow, per spec 2026-07-01-preset-gap-wave-design.md"
bd create --type=feature --priority=2 --title="Preset: metaballs (webgl, retro)" --description="Demoscene lava-lamp iso-field blobs via makeShaderPreset, per spec 2026-07-01-preset-gap-wave-design.md"
bd create --type=feature --priority=2 --title="Preset: zen-garden (canvas2d, japanese)" --description="Raked sand + stones + concentric furrows, per spec 2026-07-01-preset-gap-wave-design.md"
bd create --type=task --priority=2 --title="Demo: gallery-night.html (art group showcase)" --description="Retires drip, graffiti, colorfield, cutouts, mobile. Per spec 2026-07-01-preset-gap-wave-design.md"
bd create --type=task --priority=2 --title="Demo: scriptorium.html (classic group showcase)" --description="Retires illuminated, hieroglyph, alchemy, cave. Per spec 2026-07-01-preset-gap-wave-design.md"
bd create --type=task --priority=2 --title="Demo: field-station.html (science group showcase)" --description="Retires chladni, mycelium, phyllotaxis, orbital, boids. Per spec 2026-07-01-preset-gap-wave-design.md"
bd create --type=task --priority=2 --title="Demo: greenscreen.html (retro/text group showcase)" --description="Retires matrix, crt, glitch, bootlog, source. Per spec 2026-07-01-preset-gap-wave-design.md"
```

Record the eight printed IDs.

---

### Task 1: Preset `rain`

**Files:**
- Create: `src/presets/rain.js`
- Modify: `src/presets/index.js` (REGISTRY, next to `snow` at ~line 257)
- Test: `test/gap-wave.spec.js` (new), `test/time-rule.spec.js` (PRESETS list), `test/groups-unit.mjs` (append test)

**Interfaces:**
- Consumes: `mulberry32(seed)` from `src/util/pause.js`; `clearAndFill(c2d, w, h, bgTuple)` from `src/renderer/canvas2d.js`; `rgbaCss(tuple, alpha)` from `src/renderer/tokens.js`.
- Produces: `create({ c2d, getColors, pxScale })` → `{ resize, frame, staticFrame, dispose }`; registry key `rain` (canvas2d, particles).

- [ ] **Step 1: Write the failing tests**

Create `test/gap-wave.spec.js`:

```js
import { test, expect } from '@playwright/test';

// Render smoke for the 2026-07-01 gap-wave presets (rain, fireflies,
// metaballs, zen-garden): each must mount without fallback and produce a
// non-blank still. Pixel baselines live in the visual project; frame-purity
// for the canvas2d ones is pinned in time-rule.spec.js.

const PRESETS = ['rain'];

for (const name of PRESETS) {
  test(`${name} renders with ink and no fallback`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const r = await page.evaluate(async (n) => {
      const el = document.getElementById('wc');
      el.setAttribute('seed', '7');
      el.setAttribute('intensity', '0.6');
      el.setAttribute('preset', n);
      await el.ready;
      const blob = await el.snapshot();
      return { fallback: el.hasAttribute('data-fallback'), bytes: blob ? blob.size : 0 };
    }, name);
    expect(r.fallback, `${name} must not fall back`).toBe(false);
    // A blank 320x240 canvas PNG compresses to a few hundred bytes; any real
    // drawing lands well above this.
    expect(r.bytes, `${name} still should not be blank`).toBeGreaterThan(1500);
  });
}
```

In `test/time-rule.spec.js`, change the preset list:

```js
const PRESETS = ['particles', 'asteroids', 'network', 'rain'];
```

Append to `test/groups-unit.mjs`:

```js
test('particles group gained rain (2026-07-01 gap wave)', () => {
  const g = listGroups().find((x) => x.id === 'particles');
  assert.ok(
    g.presets.some((p) => p.name === 'rain'),
    'particles has rain'
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx playwright test test/gap-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: gap-wave `rain` FAILS (unknown preset → fallback), time-rule `rain` FAILS (module import), node test FAILS (`particles has rain`).

- [ ] **Step 3: Write the preset**

Create `src/presets/rain.js`:

```js
// rain — layered rainfall. Angled streaks with depth (near drops are faster,
// longer, brighter) falling to a per-drop ground line, where each landing
// spawns an expanding splash ripple. Streaks and ripples tint the theme info
// color over the theme bg. intensity = storm strength (speed, slant, streak
// length); density = drop count.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

const CAPS = { low: 120, med: 320, high: 700 };

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let drops = [];
  let ripples = [];
  let lastKey = '';
  let lastT = 0;

  function rebuild(params) {
    const cap = CAPS[params.quality] || CAPS.med;
    const n = Math.floor(30 + cap * params.density);
    const rand = mulberry32(params.seed | 0 || 5);
    drops = new Array(n);
    for (let i = 0; i < n; i++) {
      drops[i] = {
        x: rand(),
        y: rand(),
        depth: rand(), // 0 far .. 1 near
        ground: 0.8 + rand() * 0.17, // normalized landing line near the bottom
      };
    }
    ripples = [];
    lastKey = `${params.seed}|${params.density}|${params.quality}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${params.quality}`;
    if (!drops.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    let dt = t - lastT;
    lastT = t;
    if (!(dt >= 0) || dt > 1) dt = 0;

    const storm = 0.3 + params.intensity * 1.4; // fall speed multiplier
    const slant = 0.08 + params.intensity * 0.22; // horizontal drift per unit fall
    c2d.lineCap = 'round';

    for (const d of drops) {
      const fall = (0.5 + d.depth * 0.9) * storm * dt; // normalized units/s
      d.y += fall;
      d.x = (d.x + fall * slant + 1) % 1;
      if (d.y >= d.ground) {
        ripples.push({ x: d.x, y: d.ground, r: 0, max: (6 + d.depth * 18) * px });
        d.y -= d.ground; // respawn at the top, keeping the overshoot
      }
      const len = (5 + d.depth * 16) * (0.6 + params.intensity) * px;
      c2d.strokeStyle = rgbaCss(c.info, 0.2 + d.depth * 0.55);
      c2d.lineWidth = (0.7 + d.depth * 0.9) * px;
      c2d.beginPath();
      c2d.moveTo(d.x * w, d.y * h);
      c2d.lineTo(d.x * w - len * slant * 3, d.y * h - len);
      c2d.stroke();
    }

    // Splash ripples: flattened expanding ellipses fading out by radius.
    c2d.lineWidth = 1 * px;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += (30 + 60 * params.intensity) * px * dt;
      const a = 1 - rp.r / rp.max;
      if (a <= 0) {
        ripples.splice(i, 1);
        continue;
      }
      c2d.strokeStyle = rgbaCss(c.info, a * 0.45);
      c2d.beginPath();
      c2d.ellipse(rp.x * w, rp.y * h, rp.r, rp.r * 0.28, 0, 0, Math.PI * 2);
      c2d.stroke();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      drops = [];
      ripples = [];
    },
  };
}
```

Register it in `src/presets/index.js` directly under the `snow` entry:

```js
  rain: { renderer: 'canvas2d', group: 'particles', loader: () => import('./rain.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/gap-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (commit `custom-elements.json` if `cem:check` regenerated it).

- [ ] **Step 5: Commit**

```bash
git add src/presets/rain.js src/presets/index.js test/gap-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): rain — layered streaks with splash ripples ($RAIN)"
bd close $RAIN
```

---

### Task 2: Preset `fireflies`

**Files:**
- Create: `src/presets/fireflies.js`
- Modify: `src/presets/index.js` (REGISTRY, under `rain`)
- Test: `test/gap-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: same helpers as Task 1.
- Produces: registry key `fireflies` (canvas2d, particles).

- [ ] **Step 1: Extend the failing tests**

`test/gap-wave.spec.js`: `const PRESETS = ['rain', 'fireflies'];`
`test/time-rule.spec.js`: `const PRESETS = ['particles', 'asteroids', 'network', 'rain', 'fireflies'];`
`test/groups-unit.mjs`, extend the Task-1 test body (same test, second assert):

```js
test('particles group gained rain and fireflies (2026-07-01 gap wave)', () => {
  const g = listGroups().find((x) => x.id === 'particles');
  for (const n of ['rain', 'fireflies'])
    assert.ok(
      g.presets.some((p) => p.name === n),
      `particles has ${n}`
    );
});
```

(Replace the Task-1 version of this test — one test, two asserts.)

- [ ] **Step 2: Run tests to verify the fireflies cases fail**

```bash
npx playwright test test/gap-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `fireflies` cases FAIL; `rain` cases still PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/fireflies.js`:

```js
// fireflies — dusk meadow of drifting glow-pulses. Each fly wanders a gentle
// sin flow field and pulses on its own cycle; glow is drawn in passes (wide
// faint halo under a crisp core — the asteroids idiom, no shadowBlur). Warm
// theme warning color; a few "answering" flies pulse in accent. intensity =
// glow reach + wander speed; density = fly count.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

const CAPS = { low: 25, med: 60, high: 120 };

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let flies = [];
  let lastKey = '';
  let lastT = 0;

  function rebuild(params) {
    const cap = CAPS[params.quality] || CAPS.med;
    const n = Math.floor(8 + cap * params.density);
    const rand = mulberry32(params.seed | 0 || 9);
    flies = new Array(n);
    for (let i = 0; i < n; i++) {
      flies[i] = {
        x: rand(),
        y: rand(),
        drift: rand() * Math.PI * 2,
        freq: 0.35 + rand() * 0.5, // pulse cycles per second
        phase: rand() * Math.PI * 2,
        r: (1.2 + rand() * 1.4) * px,
        accent: rand() < 0.18, // the rare answering fly
      };
    }
    lastKey = `${params.seed}|${params.density}|${params.quality}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${params.quality}`;
    if (!flies.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    let dt = t - lastT;
    lastT = t;
    if (!(dt >= 0) || dt > 1) dt = 0;

    const speed = 0.02 + params.intensity * 0.05; // normalized units/s
    for (const f of flies) {
      const a = Math.sin(f.x * 5 + t * 0.25 + f.drift) * 2 + Math.cos(f.y * 4 - f.drift);
      f.x = (f.x + Math.cos(a) * speed * dt + 1) % 1;
      f.y = (f.y + Math.sin(a) * speed * dt * 0.6 + 1) % 1;

      const pulse = Math.max(0, Math.sin(t * f.freq * Math.PI * 2 + f.phase));
      const b = pulse * pulse * pulse; // sharp attack, long dark gap
      if (b < 0.02) continue;
      const col = f.accent ? c.accent : c.warning;
      const cx = f.x * w;
      const cy = f.y * h;
      const glowR = f.r * (5 + 4 * params.intensity);
      c2d.fillStyle = rgbaCss(col, 0.08 * b); // wide halo
      c2d.beginPath();
      c2d.arc(cx, cy, glowR, 0, Math.PI * 2);
      c2d.fill();
      c2d.fillStyle = rgbaCss(col, 0.25 * b); // mid halo
      c2d.beginPath();
      c2d.arc(cx, cy, glowR * 0.45, 0, Math.PI * 2);
      c2d.fill();
      c2d.fillStyle = rgbaCss(col, 0.95 * b); // core
      c2d.beginPath();
      c2d.arc(cx, cy, f.r, 0, Math.PI * 2);
      c2d.fill();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      flies = [];
    },
  };
}
```

Register under `rain` in `src/presets/index.js`:

```js
  fireflies: { renderer: 'canvas2d', group: 'particles', loader: () => import('./fireflies.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/gap-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (commit `custom-elements.json` if `cem:check` regenerated it).

- [ ] **Step 5: Commit**

```bash
git add src/presets/fireflies.js src/presets/index.js test/gap-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): fireflies — dusk glow-pulse wanderers ($FIREFLIES)"
bd close $FIREFLIES
```

---

### Task 3: Preset `zen-garden`

**Files:**
- Create: `src/presets/zen-garden.js`
- Modify: `src/presets/index.js` (REGISTRY, next to `seigaiha` at ~line 128)
- Test: `test/gap-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs` (UPDATE the existing japanese-group test)

**Interfaces:**
- Consumes: Task-1 helpers plus `rgbCss` from `src/renderer/tokens.js` and `mix` from `src/presets/_dots.js`.
- Produces: registry key `'zen-garden'` (canvas2d, japanese).

- [ ] **Step 1: Extend the failing tests**

`test/gap-wave.spec.js`: `const PRESETS = ['rain', 'fireflies', 'zen-garden'];`
`test/time-rule.spec.js`: `const PRESETS = ['particles', 'asteroids', 'network', 'rain', 'fireflies', 'zen-garden'];`
`test/groups-unit.mjs`: the existing japanese pin asserts an exact six-name list — update it:

```js
test('japanese group contains the seven japanese presets', () => {
  const g = listGroups().find((x) => x.id === 'japanese');
  assert.ok(g, 'japanese group exists');
  assert.deepEqual(g.presets.map((p) => p.name).sort(), [
    'kintsugi',
    'origami',
    'sakura',
    'seigaiha',
    'sumi-e',
    'ukiyo-e',
    'zen-garden',
  ]);
});
```

- [ ] **Step 2: Run tests to verify the zen-garden cases fail**

```bash
npx playwright test test/gap-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `zen-garden` cases and the japanese-group test FAIL; earlier cases PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/zen-garden.js`:

```js
// zen-garden — raked karesansui sand. A straight rake field with an almost
// imperceptible breathing waver, seeded stones, and concentric furrows combed
// around each stone over a cleared disc. Grooves are low-alpha fg strokes on
// the theme bg; stones blend fg toward bg. Nearly still by design — time only
// breathes the waver. intensity = groove contrast; density = rake spacing and
// stone count.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let stones = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 3);
    const n = 2 + Math.round(params.density * 4); // 2..6 stones
    stones = new Array(n);
    for (let i = 0; i < n; i++) {
      stones[i] = {
        x: 0.12 + rand() * 0.76,
        y: 0.15 + rand() * 0.7,
        r: 0.03 + rand() * 0.05, // fraction of min(w, h)
        squash: 0.6 + rand() * 0.35,
        rot: rand() * Math.PI,
        rings: 3 + ((rand() * 3) | 0),
      };
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!stones.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const groove = rgbaCss(c.fg, 0.1 + params.intensity * 0.25);
    const gap = s * (0.028 - params.density * 0.012);
    c2d.lineWidth = 1 * px;
    c2d.strokeStyle = groove;

    // Straight rake field with a slow breathing waver.
    const waver = s * 0.004;
    for (let y = gap * 0.5; y < h; y += gap) {
      c2d.beginPath();
      for (let x = 0; x <= w; x += 8 * px) {
        const yy = y + Math.sin((x * 0.012) / px + t * 0.25 + y * 0.05) * waver;
        if (x === 0) c2d.moveTo(x, yy);
        else c2d.lineTo(x, yy);
      }
      c2d.stroke();
    }

    // Stones: clear a disc, comb concentric furrows, set the stone on top.
    for (const st of stones) {
      const cx = st.x * w;
      const cy = st.y * h;
      const r = st.r * s;
      const maxR = r + st.rings * gap * 0.8;
      // Clear the disc: paint bg when opaque, punch out when transparent.
      const punch = !(c.bg && c.bg[3] > 0.01);
      if (punch) {
        c2d.save();
        c2d.globalCompositeOperation = 'destination-out';
        c2d.fillStyle = 'rgba(0,0,0,1)';
      } else {
        c2d.fillStyle = rgbCss(c.bg);
      }
      c2d.beginPath();
      c2d.arc(cx, cy, maxR + gap * 0.4, 0, Math.PI * 2);
      c2d.fill();
      if (punch) c2d.restore();

      c2d.strokeStyle = groove;
      for (let k = 1; k <= st.rings; k++) {
        c2d.beginPath();
        c2d.arc(cx, cy, r + k * gap * 0.8, 0, Math.PI * 2);
        c2d.stroke();
      }
      c2d.fillStyle = rgbCss(mix(c.fg, c.bg, 0.35));
      c2d.beginPath();
      c2d.ellipse(cx, cy, r, r * st.squash, st.rot, 0, Math.PI * 2);
      c2d.fill();
      c2d.strokeStyle = rgbaCss(c.fg, 0.5);
      c2d.stroke();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      stones = [];
    },
  };
}
```

Register next to `seigaiha` in `src/presets/index.js`:

```js
  'zen-garden': { renderer: 'canvas2d', group: 'japanese', loader: () => import('./zen-garden.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/gap-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (commit `custom-elements.json` if `cem:check` regenerated it).

- [ ] **Step 5: Commit**

```bash
git add src/presets/zen-garden.js src/presets/index.js test/gap-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): zen-garden — raked sand, stones, combed furrows ($ZEN)"
bd close $ZEN
```

---

### Task 4: Preset `metaballs`

**Files:**
- Create: `src/presets/metaballs.js`
- Modify: `src/presets/index.js` (REGISTRY, next to `copperbars` at ~line 233)
- Test: `test/gap-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: `makeShaderPreset(FS, uniformNames)` from `src/renderer/shader-preset.js`. The quad VS supplies `varying vec2 v_uv` (0..1). Supported uniforms only: `u_time, u_intensity, u_density, u_c1, u_c2, u_c3, u_bg, u_fg, u_ink, u_res`.
- Produces: registry key `metaballs` (webgl, retro). NOT added to time-rule.spec.js (its harness is canvas2d-only; the shader is a pure function of `u_time` by construction).

- [ ] **Step 1: Extend the failing tests**

`test/gap-wave.spec.js`: `const PRESETS = ['rain', 'fireflies', 'zen-garden', 'metaballs'];`
Append to `test/groups-unit.mjs`:

```js
test('retro group gained metaballs (2026-07-01 gap wave)', () => {
  const g = listGroups().find((x) => x.id === 'retro');
  assert.ok(
    g.presets.some((p) => p.name === 'metaballs'),
    'retro has metaballs'
  );
});
```

- [ ] **Step 2: Run tests to verify the metaballs cases fail**

```bash
npx playwright test test/gap-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `metaballs` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/metaballs.js`:

```js
// metaballs — demoscene lava lamp. Sum of inverse-square fields from up to 8
// blobs orbiting the center on incommensurate periods, thresholded at a soft
// iso edge and banded through three theme colors over the theme bg. A pure
// function of u_time, so stills are deterministic. density = blob count,
// intensity = blob size.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_bg;

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  vec2 mid = vec2(0.5 * aspect, 0.5);
  float count = 4.0 + floor(u_density * 4.0); // 4..8 blobs
  float field = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi >= count) break;
    vec2 c = mid + vec2(
      sin(u_time * (0.21 + fi * 0.053) + fi * 1.7),
      cos(u_time * (0.17 + fi * 0.041) + fi * 2.9)
    ) * (0.14 + 0.17 * fract(fi * 0.618034));
    float r = 0.09 + 0.05 * fract(fi * 0.7548) + 0.05 * u_intensity;
    vec2 d = p - c;
    field += r * r / (dot(d, d) + 1e-4);
  }
  vec3 col = mix(u_bg, u_c1, smoothstep(0.85, 1.15, field));
  col = mix(col, u_c2, smoothstep(1.6, 2.8, field));
  col = mix(col, u_c3, smoothstep(3.2, 5.2, field));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_res',
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_c2',
  'u_c3',
  'u_bg',
]);
```

Register next to `copperbars` in `src/presets/index.js`:

```js
  metaballs: { renderer: 'webgl', group: 'retro', loader: () => import('./metaballs.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/gap-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (commit `custom-elements.json` if `cem:check` regenerated it).
Additionally: the gap-wave render test fails with a fallback if the shader does not compile — a PASS confirms clean compilation.

- [ ] **Step 5: Commit**

```bash
git add src/presets/metaballs.js src/presets/index.js test/gap-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): metaballs — demoscene lava-lamp iso blobs ($METABALLS)"
bd close $METABALLS
```

---

### Task 5: API reference rows for the four presets

**Files:**
- Modify: `docs/api.html` (three tables; single-line `<tr>` row style, matching the `lanterns`/`matrix` rows)

**Interfaces:**
- Consumes: the registered names/renderers from Tasks 1–4.
- Produces: 146+4 = 150/150 catalog coverage.

- [ ] **Step 1: Add the rows**

In the **Canvas2D particle presets** table (`docs/api.html` ~line 377), after the `snow` row (keep registry order — rain then fireflies after snow's neighbors):

```html
            <tr><td><code>rain</code></td><td>Layered angled rainfall &mdash; depth-scaled streaks with splash ripples at the ground line</td><td>info, background</td></tr>
            <tr><td><code>fireflies</code></td><td>Dusk glow-pulses wandering a gentle flow field; rare answering flies in accent</td><td>warning, accent, background</td></tr>
```

In the **WebGL shader presets** table (~line 290), in alphabetical position:

```html
            <tr><td><code>metaballs</code></td><td>Demoscene lava lamp &mdash; orbiting blobs merging at a soft iso surface, banded through three theme colors</td><td>primary, accent, info, background</td></tr>
```

In the **Japanese presets** table (~line 559):

```html
            <tr><td><code>zen-garden</code></td><td>Raked karesansui sand &mdash; breathing rake field, stones, combed concentric furrows</td><td>foreground, background</td></tr>
```

- [ ] **Step 2: Verify coverage**

```bash
python3 - << 'EOF'
import re
reg = re.findall(r"^\s{2}(?:'([\w-]+)'|([\w-]+)):\s*\{\s*renderer", open('src/presets/index.js').read(), re.M)
names = {a or b for a, b in reg}
api = open('docs/api.html').read()
missing = sorted(n for n in names if f'<code>{n}</code>' not in api)
print(len(names), 'registered;', len(missing), 'missing:', missing)
EOF
```

Expected: `150 registered; 0 missing: []`

- [ ] **Step 3: Commit**

```bash
git add docs/api.html
git commit -m "docs(api): catalog rows for rain, fireflies, metaballs, zen-garden"
```

---

### Task 6: Visual baselines for the four presets

**Files:**
- Create: `test/visual.spec.js-snapshots/{rain,fireflies,metaballs,zen-garden}-visual-linux.png`

**Interfaces:**
- Consumes: Docker (OrbStack) + `mcr.microsoft.com/playwright:v1.60.0-jammy`. The visual suite iterates `listPresets()` automatically — no spec change needed unless a preset proves unstable at frozen t (then add it to `NO_SNAPSHOT` with a reason comment; all four are designed to be stable).

- [ ] **Step 1: Confirm Docker is up**

```bash
docker info --format ok || open -a OrbStack
```

(If OrbStack was just started, re-run `docker info --format ok` until it prints `ok`.)

- [ ] **Step 2: Generate the baselines**

```bash
docker run --rm --ipc=host --platform=linux/amd64 -v "$PWD:/work" -v /work/node_modules \
  -w /work mcr.microsoft.com/playwright:v1.60.0-jammy \
  bash -lc "npm ci --no-audit --no-fund >/dev/null 2>&1 && npx playwright test --project=visual --update-snapshots -g '(^| )(rain|fireflies|metaballs|zen-garden)$'"
```

Expected: 4 tests pass, four `writing actual` lines, four new PNGs in `test/visual.spec.js-snapshots/`.
Note: the anchored regex is deliberate — a bare `-g rain` would ALSO match `grain` and `paper-grain` and silently rewrite their baselines. After the run, `git status --porcelain test/visual.spec.js-snapshots/` must show exactly four new files and zero modified ones; if anything else changed, `git checkout -- test/visual.spec.js-snapshots/<file>` to restore it.

- [ ] **Step 3: Verify against a fresh run (no update flag)**

```bash
docker run --rm --ipc=host --platform=linux/amd64 -v "$PWD:/work" -v /work/node_modules \
  -w /work mcr.microsoft.com/playwright:v1.60.0-jammy \
  bash -lc "npm ci --no-audit --no-fund >/dev/null 2>&1 && npx playwright test --project=visual -g '(^| )(rain|fireflies|metaballs|zen-garden)$'"
```

Expected: all PASS (proves the stills are deterministic). Also eyeball each PNG (open/Read the four files) — none should be blank or near-black.

- [ ] **Step 4: Commit**

```bash
git add test/visual.spec.js-snapshots/
git status --porcelain   # confirm ONLY the four new PNGs are staged
git commit -m "test(visual): baselines for rain, fireflies, metaballs, zen-garden"
```

---

### Task 7: Demo page `gallery-night.html` (art group)

**Files:**
- Create: `demos/gallery-night.html`
- Modify: `demos/index.html` (add a `.bw-card` tile in the grid)

**Interfaces:**
- Consumes: `<bg-wc>` element from `../src/bg-wc.js`; presets `drip`, `graffiti`, `colorfield`, `cutouts`, `mobile` (all registered).
- Produces: the page + hub tile. Pattern for Tasks 8–10: full-viewport stacked `<section>` panels, each a `<bg-wc>` with slotted copy.

- [ ] **Step 1: Write the page**

Create `demos/gallery-night.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gallery Night &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;900&family=Space+Grotesk:wght@300;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #101014;  /* gallery night */
      --color-foreground: #f4f2ec;
      --color-primary: #e4572e;     /* cadmium */
      --color-accent: #17bebb;      /* viridian pop */
      --color-info: #ffc914;        /* hansa yellow */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--color-background); color: var(--color-foreground); }
    body { font-family: 'Space Grotesk', system-ui, sans-serif; }
    .crumb { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; }
    .crumb a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    .crumb a:hover { opacity: 1; }
    section { min-height: 100vh; }
    section bg-wc { display: block; min-height: 100vh; }
    .copy { min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-end; padding: clamp(28px, 6vw, 90px); }
    .copy .plate { max-width: 560px; background: rgba(16,16,20,0.72); backdrop-filter: blur(6px); padding: 26px 30px; border-left: 3px solid var(--color-primary); }
    .eyebrow { font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--color-accent); margin: 0 0 10px; }
    h1 { font-family: 'Archivo', sans-serif; font-weight: 900; font-size: clamp(44px, 8vw, 110px); line-height: 0.95; margin: 0 0 12px; text-transform: uppercase; }
    h2 { font-family: 'Archivo', sans-serif; font-weight: 900; font-size: clamp(28px, 4vw, 54px); margin: 0 0 10px; }
    p { margin: 0; line-height: 1.6; font-weight: 300; opacity: 0.9; }
    code { font-size: 0.85em; background: rgba(244,242,236,0.12); padding: 2px 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <nav class="crumb"><a href="./index.html">&larr; bg-wc demos</a></nav>

  <section>
    <bg-wc preset="drip" intensity="0.65" seed="11">
      <div class="copy"><div class="plate">
        <p class="eyebrow">One night only &middot; South Hall</p>
        <h1>Nocturne</h1>
        <p>Five rooms, five ways of making a mess on purpose. Backgrounds by <code>preset="drip"</code> &mdash; action painting, live.</p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="graffiti" intensity="0.6" seed="4">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Room I &middot; East wall</p>
        <h2>Writers&rsquo; Bench</h2>
        <p>Throw-ups and fills, layered like the wall remembers every crew that passed. <code>preset="graffiti"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="colorfield" intensity="0.55" seed="7" speed="0.6">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Room II &middot; The quiet room</p>
        <h2>Fields</h2>
        <p>Soft-edged planes of color to stand in front of until closing time. <code>preset="colorfield"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="cutouts" intensity="0.6" seed="19">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Room III &middot; The annex</p>
        <h2>Scissors, Not Sketches</h2>
        <p>Torn-paper shapes drifting into arrangements the artist would have pinned down. <code>preset="cutouts"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="mobile" intensity="0.6" seed="2" speed="0.8">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Room IV &middot; The court</p>
        <h2>Counterweights</h2>
        <p>A kinetic mobile turning on air currents nobody can feel but everyone can see. <code>preset="mobile"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Register the hub tile**

In `demos/index.html`, add inside the tile grid alongside the existing `.bw-card` entries (match neighbors exactly):

```html
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./gallery-night.html" title="Gallery Night"
                        url="profpowell.github.io/bg-wc/demos/gallery-night.html"></browser-window>
        <a class="bw-open" href="./gallery-night.html" aria-label="Open the Gallery Night demo"></a>
        <div class="meta"><span class="name">Gallery Night</span><span class="desc">art presets in five rooms</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
```

Expected: builds clean. Then `npm run dev`, open `http://localhost:5173/demos/gallery-night.html`, confirm all five panels render animated backgrounds (no blank panels, no console errors) and the hub tile appears on `/demos/index.html`. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add demos/gallery-night.html demos/index.html
git commit -m "docs(demos): gallery-night — art-group showcase (drip, graffiti, colorfield, cutouts, mobile) ($GALLERY)"
bd close $GALLERY
```

---

### Task 8: Demo page `scriptorium.html` (classic group)

**Files:**
- Create: `demos/scriptorium.html`
- Modify: `demos/index.html`

**Interfaces:**
- Consumes: presets `illuminated`, `hieroglyph`, `alchemy`, `cave`.

- [ ] **Step 1: Write the page**

Create `demos/scriptorium.html` (same stacked-panel skeleton as Task 7 — repeated here in full):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Scriptorium &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&family=Spectral:wght@300&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #f2e8d5;  /* vellum */
      --color-foreground: #2b2118;  /* iron gall ink */
      --color-primary: #8c2d19;     /* rubric red */
      --color-accent: #a67c00;      /* gold leaf */
      --color-info: #274e5e;        /* lapis */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--color-background); color: var(--color-foreground); }
    body { font-family: 'Spectral', Georgia, serif; }
    .crumb { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; }
    .crumb a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    .crumb a:hover { opacity: 1; }
    section { min-height: 100vh; }
    section bg-wc { display: block; min-height: 100vh; }
    .copy { min-height: 100vh; display: flex; align-items: center; padding: clamp(28px, 6vw, 90px); }
    .copy .plate { max-width: 520px; background: rgba(242,232,213,0.82); padding: 30px 34px; border: 1px solid rgba(43,33,24,0.25); }
    .eyebrow { font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--color-primary); margin: 0 0 10px; }
    h1, h2 { font-family: 'Cormorant Garamond', serif; font-weight: 700; margin: 0 0 12px; }
    h1 { font-size: clamp(46px, 8vw, 104px); line-height: 0.95; }
    h2 { font-size: clamp(30px, 4vw, 52px); }
    p { margin: 0; line-height: 1.7; font-weight: 300; }
    code { font-family: ui-monospace, monospace; font-size: 0.8em; background: rgba(43,33,24,0.08); padding: 2px 8px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav class="crumb"><a href="./index.html">&larr; bg-wc demos</a></nav>

  <section>
    <bg-wc preset="illuminated" intensity="0.6" seed="8" speed="0.7">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Rare books &amp; manuscripts</p>
        <h1>The Scriptorium</h1>
        <p>Four rooms of things written down before writing was cheap. Margins illuminated by <code>preset="illuminated"</code>.</p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="hieroglyph" intensity="0.55" seed="14" speed="0.8">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Room I &middot; Antiquities</p>
        <h2>Before the Alphabet</h2>
        <p>A cartouche wall of borrowed gods and administrative grain counts. <code>preset="hieroglyph"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="alchemy" intensity="0.6" seed="21" speed="0.8">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Room II &middot; The laboratory</p>
        <h2>Solve et Coagula</h2>
        <p>Sigils, retorts, and the periodic table&rsquo;s eccentric grandparents. <code>preset="alchemy"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="cave" intensity="0.65" seed="5" speed="0.7">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Room III &middot; Origins</p>
        <h2>First Marks</h2>
        <p>Ochre hands and running aurochs &mdash; the oldest backgrounds we know of. <code>preset="cave"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Register the hub tile**

```html
      <div class="bw-card">
        <browser-window mode="light" shadow data-demo-src="./scriptorium.html" title="The Scriptorium"
                        url="profpowell.github.io/bg-wc/demos/scriptorium.html"></browser-window>
        <a class="bw-open" href="./scriptorium.html" aria-label="Open the The Scriptorium demo"></a>
        <div class="meta"><span class="name">The Scriptorium</span><span class="desc">classic presets, four rooms</span></div>
      </div>
```

- [ ] **Step 3: Verify** — `npm run build:site` clean; dev-server check all four panels render; hub tile present.

- [ ] **Step 4: Commit**

```bash
git add demos/scriptorium.html demos/index.html
git commit -m "docs(demos): scriptorium — classic-group showcase (illuminated, hieroglyph, alchemy, cave) ($SCRIPT)"
bd close $SCRIPT
```

---

### Task 9: Demo page `field-station.html` (science group)

**Files:**
- Create: `demos/field-station.html`
- Modify: `demos/index.html`

**Interfaces:**
- Consumes: presets `chladni`, `mycelium`, `phyllotaxis`, `orbital`, `boids`.

- [ ] **Step 1: Write the page**

Create `demos/field-station.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Field Station 7 &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;600&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #0d1512;  /* instrument-bay dark */
      --color-foreground: #e8f2ec;
      --color-primary: #3ddc97;     /* readout green */
      --color-accent: #ff7f51;      /* survey orange */
      --color-info: #6fb3ff;        /* telemetry blue */
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--color-background); color: var(--color-foreground); }
    body { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
    .crumb { position: fixed; top: 20px; left: 28px; z-index: 20; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; }
    .crumb a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    .crumb a:hover { opacity: 1; }
    section { min-height: 100vh; }
    section bg-wc { display: block; min-height: 100vh; }
    .copy { min-height: 100vh; display: flex; align-items: flex-end; padding: clamp(28px, 6vw, 90px); }
    .copy .plate { max-width: 540px; background: rgba(13,21,18,0.78); padding: 24px 28px; border: 1px solid rgba(61,220,151,0.35); border-radius: 6px; }
    .eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--color-primary); margin: 0 0 10px; }
    h1 { font-weight: 600; font-size: clamp(42px, 7.5vw, 96px); line-height: 0.98; margin: 0 0 12px; }
    h2 { font-weight: 600; font-size: clamp(28px, 4vw, 50px); margin: 0 0 10px; }
    p { margin: 0; line-height: 1.65; font-weight: 300; opacity: 0.92; }
    code { font-family: 'IBM Plex Mono', monospace; font-size: 0.82em; background: rgba(111,179,255,0.14); color: var(--color-info); padding: 2px 8px; border-radius: 4px; }
  </style>
</head>
<body>
  <nav class="crumb"><a href="./index.html">&larr; bg-wc demos</a></nav>

  <section>
    <bg-wc preset="chladni" intensity="0.65" seed="12">
      <div class="copy"><div class="plate">
        <p class="eyebrow">FS-7 &middot; Long-term observation</p>
        <h1>Field Station&nbsp;7</h1>
        <p>Instruments hum at resonance; sand finds the nodes. Splash page courtesy of <code>preset="chladni"</code>.</p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="mycelium" intensity="0.6" seed="3">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Plot B &middot; Under the leaf litter</p>
        <h2>The Wood Wide Web</h2>
        <p>Hyphal threads mapping the shortest path to everything. <code>preset="mycelium"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="phyllotaxis" intensity="0.6" seed="17" speed="0.7">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Greenhouse &middot; Specimen 137.5&deg;</p>
        <h2>Golden Angles</h2>
        <p>Every seed head runs the same tight packing algorithm. <code>preset="phyllotaxis"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="orbital" intensity="0.6" seed="9" speed="0.8">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Roof array &middot; Night shift</p>
        <h2>Two-Body Problems</h2>
        <p>Tracked objects on clean conic sections, for once. <code>preset="orbital"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="boids" intensity="0.6" seed="26">
      <div class="copy"><div class="plate">
        <p class="eyebrow">Estuary &middot; Dusk survey</p>
        <h2>Murmuration</h2>
        <p>Separation, alignment, cohesion &mdash; three rules and ten thousand decisions a second. <code>preset="boids"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Register the hub tile**

```html
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./field-station.html" title="Field Station 7"
                        url="profpowell.github.io/bg-wc/demos/field-station.html"></browser-window>
        <a class="bw-open" href="./field-station.html" aria-label="Open the Field Station 7 demo"></a>
        <div class="meta"><span class="name">Field Station 7</span><span class="desc">science presets on survey</span></div>
      </div>
```

- [ ] **Step 3: Verify** — `npm run build:site` clean; dev-server check all five panels render; hub tile present.

- [ ] **Step 4: Commit**

```bash
git add demos/field-station.html demos/index.html
git commit -m "docs(demos): field-station — science-group showcase (chladni, mycelium, phyllotaxis, orbital, boids) ($FIELD)"
bd close $FIELD
```

---

### Task 10: Demo page `greenscreen.html` (retro + text groups)

**Files:**
- Create: `demos/greenscreen.html`
- Modify: `demos/index.html`

**Interfaces:**
- Consumes: presets `matrix`, `crt`, `glitch`, `bootlog`, `source`. `bootlog`/`source` take their content from the `text` attribute (lines split on `|`).

- [ ] **Step 1: Write the page**

Create `demos/greenscreen.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Greenscreen &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=VT323&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-background: #050b06;  /* CRT black */
      --color-foreground: #7dffa0;  /* P1 phosphor */
      --color-primary: #34d17a;
      --color-accent: #ffd166;      /* amber terminal */
      --color-info: #59d8e6;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; background: var(--color-background); color: var(--color-foreground); }
    body { font-family: 'IBM Plex Mono', monospace; }
    .crumb { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; }
    .crumb a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    .crumb a:hover { opacity: 1; }
    section { min-height: 100vh; }
    section bg-wc { display: block; min-height: 100vh; }
    .copy { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: clamp(28px, 6vw, 90px); text-align: center; }
    .copy .plate { max-width: 560px; background: rgba(5,11,6,0.8); padding: 26px 30px; border: 1px solid rgba(125,255,160,0.35); box-shadow: 0 0 40px rgba(125,255,160,0.12); }
    .eyebrow { font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--color-accent); margin: 0 0 10px; }
    h1 { font-family: 'VT323', monospace; font-weight: 400; font-size: clamp(56px, 10vw, 130px); line-height: 0.9; margin: 0 0 10px; }
    h2 { font-family: 'VT323', monospace; font-weight: 400; font-size: clamp(36px, 5vw, 64px); margin: 0 0 10px; }
    p { margin: 0; line-height: 1.65; opacity: 0.9; font-size: 14px; }
    code { background: rgba(125,255,160,0.12); padding: 2px 8px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav class="crumb"><a href="./index.html">&larr; bg-wc demos</a></nav>

  <section>
    <bg-wc preset="matrix" intensity="0.65" seed="1">
      <div class="copy"><div class="plate">
        <p class="eyebrow">tty0 &middot; 80&times;25</p>
        <h1>GREENSCREEN</h1>
        <p>Five terminals nobody logged out of. Rain of glyphs by <code>preset="matrix"</code>.</p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="crt" intensity="0.6" seed="6">
      <div class="copy"><div class="plate">
        <p class="eyebrow">tty1 &middot; degauss pending</p>
        <h2>PHOSPHOR BURN</h2>
        <p>Scanlines, bloom, and the curvature your eyes still remember. <code>preset="crt"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="bootlog" intensity="0.6" seed="2"
           text="BIOS 4.51PG OK|MEM CHECK 640K OK|MOUNT /dev/bg0 .. ok|LOAD PRESET RegistrY .. 150 found|START compositor .. ok|WELCOME TO GREENSCREEN">
      <div class="copy"><div class="plate">
        <p class="eyebrow">tty2 &middot; cold boot</p>
        <h2>POST</h2>
        <p>Every line a small victory. Feed your own via the <code>text</code> attribute &mdash; <code>preset="bootlog"</code>.</p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="source" intensity="0.55" seed="13"
           text="function frame(t, params) {|  const c = getColors();|  clearAndFill(c2d, w, h, c.bg);|  // t is pre-scaled by speed|  drops.forEach(step);|}">
      <div class="copy"><div class="plate">
        <p class="eyebrow">tty3 &middot; read the source</p>
        <h2>LISTING</h2>
        <p>Faded pages of somebody else&rsquo;s good ideas. <code>preset="source"</code> with slotted <code>text</code>.</p>
      </div></div>
    </bg-wc>
  </section>

  <section>
    <bg-wc preset="glitch" intensity="0.6" seed="23">
      <div class="copy"><div class="plate">
        <p class="eyebrow">tty4 &middot; signal degraded</p>
        <h2>HOLD STILL</h2>
        <p>Slices, tears, channel splits &mdash; the picture is fine, the cable is art. <code>preset="glitch"</code></p>
      </div></div>
    </bg-wc>
  </section>

  <script type="module" src="../src/bg-wc.js"></script>
</body>
</html>
```

- [ ] **Step 2: Register the hub tile**

```html
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./greenscreen.html" title="Greenscreen"
                        url="profpowell.github.io/bg-wc/demos/greenscreen.html"></browser-window>
        <a class="bw-open" href="./greenscreen.html" aria-label="Open the Greenscreen demo"></a>
        <div class="meta"><span class="name">Greenscreen</span><span class="desc">retro + text terminals</span></div>
      </div>
```

- [ ] **Step 3: Verify** — `npm run build:site` clean; dev-server check all five panels render (bootlog and source must show the custom `text` content); hub tile present.

- [ ] **Step 4: Commit**

```bash
git add demos/greenscreen.html demos/index.html
git commit -m "docs(demos): greenscreen — retro/text showcase (matrix, crt, bootlog, source, glitch) ($GREEN)"
bd close $GREEN
```

---

### Task 11: Final gates + push

**Files:** none new

- [ ] **Step 1: Full verification**

```bash
npm test
npm run test:node
npm run lint
npm run format:check
npm run cem:check
npm run build && npm run build:site
```

Expected: everything green (Playwright count grows by the 4 gap-wave tests + 3 time-rule additions).

- [ ] **Step 2: Coverage sanity**

Re-run the demo-coverage script from the spec discussion (`grep preset=` across `demos/*.html` vs registry) and confirm: art 6/6, classic ≥7/12, science ≥7/8, text ≥4/6, retro ≥8/12.

- [ ] **Step 3: Push (MANDATORY per CLAUDE.md)**

```bash
git pull --rebase
git push
git status   # MUST show "up to date with origin"
bd ready     # confirm no gap-wave issues left open
```

Expected: pushed; CI runs (including the visual job against the four new baselines); Pages deploys via workflow_run after CI is green.
