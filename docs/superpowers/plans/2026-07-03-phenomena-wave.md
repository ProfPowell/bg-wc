# Phenomena Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 natural-phenomena presets (registry 162 → 168) and 3 paired demo homes.

**Architecture:** Same as the style wave: each preset one file + one REGISTRY entry, all pure functions of `t` (cyclic particle paths `(off + t*v) mod 1`), five canvas2d + one WebGL shader (`fog`). New self-contained `test/phenomena-wave.spec.js` render smoke; five canvas2d newcomers join time-rule; PHENOMENA_WAVE map test in groups-unit. Demos in the vocabulary idiom, two phenomena per page.

**Tech Stack:** Vanilla JS ES modules, Canvas2D + WebGL, Playwright, node:test, pinned Playwright Docker container.

**Spec:** `docs/superpowers/specs/2026-07-03-phenomena-wave-design.md`

## Global Constraints

- Preset contract: colors from `getColors()` EVERY frame; motion PURE in pre-scaled `t` (no lastT/accumulation; never multiply by `params.speed`); `mulberry32(params.seed)` layouts; `staticFrame(params)`; `dispose()`; no `mode` attributes.
- Color strings only via `rgbCss`/`rgbaCss` from `src/renderer/tokens.js`; blends via `mix` from `src/presets/_dots.js`.
- Light-ground legibility (gl-wc-0eq6 lesson): every preset must remain visible over the light baseline theme; document any cyanotype-style ground deviation in the file header.
- Before each commit: `set -o pipefail; npm run lint && npm run format:check && npm run cem:check` (prettier --write first if needed; commit regenerated `custom-elements.json`). After `bd close <id>`, commit the modified `.beads/issues.jsonl` — never leave it dangling.
- Demos: zero `<div>`/`class=`, binder-only backgrounds, script block `import 'vanilla-breeze/css'` then `import '../src/data-background.js'`, crumbs carry `target="_top"`. Guards: `test/demos-conventions.mjs`, `test/demos-smoke.spec.js`, `test/demos-hub.spec.js`.
- Track in bd (Task 0 IDs); commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 0: File bd issues

**Files:** none (tracker only)

**Interfaces:**
- Produces: nine issue IDs referenced later as `$EMBERS`, `$LIGHTNING`, `$FOG`, `$CONST`, `$BUBBLES`, `$LEAVES`, `$CAMP`, `$LIGHTHOUSE`, `$NOTES`.

- [ ] **Step 1: Create the issues**

```bash
for t in \
  "Preset: embers (canvas2d, particles)" \
  "Preset: lightning (canvas2d, atmospheric)" \
  "Preset: fog (webgl, atmospheric)" \
  "Preset: constellation (canvas2d, particles)" \
  "Preset: bubbles (canvas2d, particles)" \
  "Preset: leaves (canvas2d, nature)" \
  "Demo: campsite.html (embers + constellation)" \
  "Demo: lighthouse.html (lightning + fog)" \
  "Demo: field-notes.html (bubbles + leaves)"; do
  bd create --type=task --priority=2 --title="$t" --description="Phenomena wave, per spec docs/superpowers/specs/2026-07-03-phenomena-wave-design.md"
done
```

Record the nine printed IDs.

---

### Task 1: Preset `embers` (creates the wave's test scaffolding)

**Files:**
- Create: `src/presets/embers.js`, `test/phenomena-wave.spec.js`
- Modify: `src/presets/index.js` (particles block, next to `fireflies`), `test/time-rule.spec.js` (PRESETS), `test/groups-unit.mjs` (append one wave test)

**Interfaces:**
- Consumes: `mulberry32` from `src/util/pause.js`; `clearAndFill` from `src/renderer/canvas2d.js`; `rgbCss`/`rgbaCss` from `src/renderer/tokens.js`; `mix` from `src/presets/_dots.js`.
- Produces: registry key `embers`; `test/phenomena-wave.spec.js` whose `PRESETS` array later tasks extend; `PHENOMENA_WAVE` map in groups-unit that later tasks extend.

- [ ] **Step 1: Write the failing tests**

Create `test/phenomena-wave.spec.js`:

```js
import { test, expect } from '@playwright/test';

// Render smoke for the 2026-07-03 phenomena-wave presets: each must mount
// without fallback and produce a non-blank still. Pixel baselines live in the
// visual project; frame-purity is pinned in time-rule.spec.js (all five
// canvas2d presets are pure functions of t by design; fog is pure u_time).

const PRESETS = ['embers'];

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
    expect(r.bytes, `${name} still should not be blank`).toBeGreaterThan(1500);
  });
}
```

`test/time-rule.spec.js`: append `'embers'` to the PRESETS array.

Append to `test/groups-unit.mjs` (after the STYLE_WAVE test):

```js
test('phenomena-wave presets landed in their groups (2026-07-03)', () => {
  const PHENOMENA_WAVE = {
    embers: 'particles',
  };
  const byName = new Map(listPresets().map((p) => [p.name, p.group]));
  for (const [name, group] of Object.entries(PHENOMENA_WAVE)) {
    assert.equal(byName.get(name), group, `${name} in ${group}`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx playwright test test/phenomena-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `embers` cases FAIL (unknown preset / module import); node group test FAILS.

- [ ] **Step 3: Write the preset**

Create `src/presets/embers.js`:

```js
// embers — sparks off an unseen fire below the frame. Seeded particles rise
// on wobbling cyclic paths (position is a pure function of t), cooling from
// accent-hot through primary to nothing as they climb; a soft warm glow
// pools along the bottom edge. Sparks are colored ink, so the preset stays
// legible on light grounds too. density = spark count, intensity = glow.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let sparks = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 17);
    const n = Math.floor(40 + params.density * 140);
    sparks = [];
    for (let i = 0; i < n; i++) {
      sparks.push({
        x0: rand(),
        off: rand(),
        v: 0.05 + rand() * 0.09, // climb rate (cycles per t-second)
        size: (1 + rand() * 2.4) * px,
        wob: 0.6 + rand() * 1.6,
        amp: (6 + rand() * 22) * px,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!sparks.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    // Warm glow pooling at the fire line (below the frame).
    const glow = c2d.createLinearGradient(0, h, 0, h * 0.55);
    glow.addColorStop(0, rgbaCss(c.accent, 0.22 * params.intensity));
    glow.addColorStop(1, rgbaCss(c.accent, 0));
    c2d.fillStyle = glow;
    c2d.fillRect(0, 0, w, h);

    for (const s of sparks) {
      const p = (s.off + t * s.v) % 1; // 0 at the fire, 1 burned out
      const y = h * (1.05 - p * 1.15);
      const x = s.x0 * w + Math.sin(t * s.wob + s.phase) * s.amp * (0.3 + p);
      const heat = 1 - p;
      const col = mix(c.accent, c.primary, p);
      c2d.fillStyle = rgbaCss(col, Math.min(1, 0.25 + heat));
      c2d.beginPath();
      c2d.arc(x, y, s.size * (0.5 + heat * 0.8), 0, Math.PI * 2);
      c2d.fill();
      // Hot core on the youngest sparks.
      if (p < 0.25) {
        c2d.fillStyle = rgbaCss(mix(c.accent, [1, 1, 1], 0.6), 0.7 * (1 - p * 4));
        c2d.beginPath();
        c2d.arc(x, y, s.size * 0.45, 0, Math.PI * 2);
        c2d.fill();
      }
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
      sparks = [];
    },
  };
}
```

Register in the particles block next to `fireflies`:

```js
  embers: { renderer: 'canvas2d', group: 'particles', loader: () => import('./embers.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/phenomena-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/embers.js src/presets/index.js test/phenomena-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): embers — sparks rising off the fire ($EMBERS)"
bd close $EMBERS
git add .beads/issues.jsonl && git commit -m "chore(beads): close $EMBERS"
```

---

### Task 2: Preset `lightning`

**Files:**
- Create: `src/presets/lightning.js`
- Modify: `src/presets/index.js` (atmospheric block, next to `aurora`), `test/phenomena-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `lightning` (canvas2d, atmospheric).

- [ ] **Step 1: Extend the failing tests**

`test/phenomena-wave.spec.js` PRESETS: append `'lightning'`.
`test/time-rule.spec.js` PRESETS: append `'lightning'`.
`test/groups-unit.mjs` PHENOMENA_WAVE map: add `lightning: 'atmospheric',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/phenomena-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `lightning` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/lightning.js`:

```js
// lightning — storm flashes. Strikes fire on a schedule derived from
// floor(t/period): each strike index seeds its own bolt (recursive midpoint
// displacement with a couple of branches), so playback is a pure function
// of t. Between strikes the cloud base pulses faintly. The bolt is drawn in
// fg with an accent glow — dark ink on light themes, white fire on dark.
// density = strike frequency, intensity = flash brightness.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;

  // Build one bolt's polyline set from a strike-specific PRNG.
  function makeBolt(rand) {
    const segs = [];
    function displace(x1, y1, x2, y2, offset, depth, width) {
      if (depth === 0) {
        segs.push({ x1, y1, x2, y2, width });
        return;
      }
      const mx = (x1 + x2) / 2 + (rand() - 0.5) * offset;
      const my = (y1 + y2) / 2 + (rand() - 0.5) * offset * 0.3;
      displace(x1, y1, mx, my, offset / 2, depth - 1, width);
      displace(mx, my, x2, y2, offset / 2, depth - 1, width);
      if (depth === 3 && rand() < 0.6) {
        // a branch peels off toward the ground, shorter and thinner
        const bx = mx + (rand() - 0.5) * 0.3;
        const by = my + 0.2 + rand() * 0.15;
        displace(mx, my, bx, by, offset / 3, depth - 2, width * 0.5);
      }
    }
    const x0 = 0.25 + rand() * 0.5;
    displace(x0, 0, x0 + (rand() - 0.5) * 0.3, 0.85, 0.28, 5, 1);
    return segs;
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const period = 3.2 - params.density * 2.2; // 1.0s..3.2s between strikes
    const idx = Math.floor(t / period);
    const phase = (t - idx * period) / period;

    // Cloud base: a restless glow across the top, always present.
    const mood = 0.04 + 0.03 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 2);
    const cloud = c2d.createLinearGradient(0, 0, 0, h * 0.5);
    cloud.addColorStop(0, rgbaCss(c.fg, mood + 0.06));
    cloud.addColorStop(1, rgbaCss(c.fg, 0));
    c2d.fillStyle = cloud;
    c2d.fillRect(0, 0, w, h);

    // The strike lives in the first ~15% of the cycle, double-flickered.
    if (phase < 0.15) {
      const u = phase / 0.15;
      const flicker = Math.max(0, Math.sin(u * Math.PI)) * (u < 0.5 ? 1 : 0.55);
      const rand = mulberry32(((params.seed | 0 || 21) * 2654435761) ^ (idx * 40503));
      const bolt = makeBolt(rand);
      // Sky flash.
      c2d.fillStyle = rgbaCss(c.fg, 0.14 * params.intensity * flicker);
      c2d.fillRect(0, 0, w, h);
      c2d.lineCap = 'round';
      for (const pass of [
        { lw: 7, css: rgbaCss(c.accent, 0.25 * flicker) },
        { lw: 2.2, css: rgbaCss(c.fg, 0.95 * flicker) },
      ]) {
        c2d.strokeStyle = pass.css;
        for (const s of bolt) {
          c2d.lineWidth = pass.lw * s.width * px;
          c2d.beginPath();
          c2d.moveTo(s.x1 * w, s.y1 * h);
          c2d.lineTo(s.x2 * w, s.y2 * h);
          c2d.stroke();
        }
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
    },
    frame,
    staticFrame(params) {
      // Freeze mid-strike so the still shows the bolt, not an empty sky.
      frame(0.05 * (3.2 - params.density * 2.2), params);
    },
    dispose() {},
  };
}
```

Register in the atmospheric block next to `aurora`:

```js
  lightning: { renderer: 'canvas2d', group: 'atmospheric', loader: () => import('./lightning.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/phenomena-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/lightning.js src/presets/index.js test/phenomena-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): lightning — seeded storm strikes ($LIGHTNING)"
bd close $LIGHTNING
git add .beads/issues.jsonl && git commit -m "chore(beads): close $LIGHTNING"
```

---

### Task 3: Preset `fog` (the wave's WebGL shader)

**Files:**
- Create: `src/presets/fog.js`
- Modify: `src/presets/index.js` (atmospheric block, next to `lightning`), `test/phenomena-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: `makeShaderPreset(FS, uniformNames)` from `src/renderer/shader-preset.js`; quad VS supplies `varying vec2 v_uv`. Allowed uniforms: u_res, u_time, u_intensity, u_density, u_bg, u_fg (subset of the closed vocabulary).
- Produces: registry key `fog` (webgl, atmospheric). NOT added to time-rule (canvas2d-only harness).

- [ ] **Step 1: Extend the failing tests**

`test/phenomena-wave.spec.js` PRESETS: append `'fog'`.
`test/groups-unit.mjs` PHENOMENA_WAVE map: add `fog: 'atmospheric',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/phenomena-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `fog` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/fog.js`:

```js
// fog — layered banks. Three octaves of scrolled value-noise fbm at
// different parallax speeds, mixed from the theme bg toward an fg-tinted
// mist, weighted toward the horizon. A pure function of u_time. density =
// bank thickness, intensity = mist opacity.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3 u_bg;
uniform vec3 u_fg;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int k = 0; k < 4; k++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    a *= 0.5;
  }
  return v;
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  vec3 mist = mix(u_bg, u_fg, 0.35);

  // Three banks, far to near: smaller scale + slower drift in the distance.
  float far  = fbm(p * 2.2 + vec2(u_time * 0.012, 0.0));
  float mid  = fbm(p * 3.4 + vec2(u_time * 0.028, 3.7));
  float near = fbm(p * 5.2 + vec2(u_time * 0.05, 9.1));

  // Horizon weighting: banks thicken toward the bottom of the frame.
  float horizon = smoothstep(0.0, 1.0, 1.0 - v_uv.y);
  float thick = 0.35 + 0.45 * u_density;
  float bank = far * 0.45 + mid * 0.35 + near * 0.4;
  bank = smoothstep(1.0 - thick, 1.15, bank * (0.55 + 0.65 * horizon));

  vec3 col = mix(u_bg, mist, bank * (0.5 + 0.5 * u_intensity));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_res',
  'u_time',
  'u_intensity',
  'u_density',
  'u_bg',
  'u_fg',
]);
```

Register next to `lightning`:

```js
  fog: { renderer: 'webgl', group: 'atmospheric', loader: () => import('./fog.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/phenomena-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (fallback on the render test means the shader failed to compile).

- [ ] **Step 5: Commit**

```bash
git add src/presets/fog.js src/presets/index.js test/phenomena-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): fog — parallax fbm banks ($FOG)"
bd close $FOG
git add .beads/issues.jsonl && git commit -m "chore(beads): close $FOG"
```

---

### Task 4: Preset `constellation`

**Files:**
- Create: `src/presets/constellation.js`
- Modify: `src/presets/index.js` (particles block, next to `stars`), `test/phenomena-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `constellation` (canvas2d, particles).

- [ ] **Step 1: Extend the failing tests**

`test/phenomena-wave.spec.js` PRESETS: append `'constellation'`.
`test/time-rule.spec.js` PRESETS: append `'constellation'`.
`test/groups-unit.mjs` PHENOMENA_WAVE map: add `constellation: 'particles',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/phenomena-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `constellation` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/constellation.js`:

```js
// constellation — a charted sky. A seeded twinkling star field, plus a few
// constellation figures: star chains joined by thin lines, the brightest
// star ringed like a catalog plate. Stars and lines are drawn in fg, so on
// light themes the preset reads as an ink star chart. Pure function of t.
// density = star count and figure count, intensity = twinkle depth.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let stars = [];
  let figures = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 19);
    const n = Math.floor(90 + params.density * 220);
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: rand(),
        y: rand(),
        r: (0.5 + rand() * 1.3) * px,
        tw: 0.5 + rand() * 2.2,
        phase: rand() * Math.PI * 2,
      });
    }
    figures = [];
    const nf = 2 + Math.round(params.density * 2);
    for (let f = 0; f < nf; f++) {
      // A figure is a short random walk of bright stars.
      let x = 0.15 + rand() * 0.7;
      let y = 0.12 + rand() * 0.6;
      const pts = [[x, y]];
      const steps = 4 + ((rand() * 4) | 0);
      for (let s = 0; s < steps; s++) {
        x = Math.min(0.95, Math.max(0.05, x + (rand() - 0.5) * 0.22));
        y = Math.min(0.85, Math.max(0.05, y + (rand() - 0.5) * 0.18));
        pts.push([x, y]);
      }
      figures.push({ pts, bright: (rand() * pts.length) | 0, phase: rand() * Math.PI * 2 });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!stars.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    // A faint zenith glow gives the sky depth.
    const glow = c2d.createRadialGradient(w * 0.5, h * 0.25, 0, w * 0.5, h * 0.25, Math.max(w, h) * 0.7);
    glow.addColorStop(0, rgbaCss(c.primary, 0.08));
    glow.addColorStop(1, rgbaCss(c.primary, 0));
    c2d.fillStyle = glow;
    c2d.fillRect(0, 0, w, h);

    const depth = 0.25 + params.intensity * 0.5;
    for (const s of stars) {
      const a = 0.35 + depth * Math.sin(t * s.tw + s.phase) * 0.5 + depth * 0.5;
      c2d.fillStyle = rgbaCss(c.fg, Math.max(0.08, Math.min(1, a)));
      c2d.beginPath();
      c2d.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      c2d.fill();
    }

    for (const f of figures) {
      c2d.strokeStyle = rgbaCss(c.fg, 0.35);
      c2d.lineWidth = 1 * px;
      c2d.beginPath();
      f.pts.forEach(([x, y], i) => {
        if (i === 0) c2d.moveTo(x * w, y * h);
        else c2d.lineTo(x * w, y * h);
      });
      c2d.stroke();
      f.pts.forEach(([x, y], i) => {
        const bright = i === f.bright;
        const pulse = bright ? 0.15 * Math.sin(t * 0.8 + f.phase) : 0;
        c2d.fillStyle = rgbaCss(c.accent, 0.85 + pulse);
        c2d.beginPath();
        c2d.arc(x * w, y * h, (bright ? 2.6 : 1.7) * px, 0, Math.PI * 2);
        c2d.fill();
        if (bright) {
          c2d.strokeStyle = rgbaCss(c.accent, 0.5);
          c2d.beginPath();
          c2d.arc(x * w, y * h, 6 * px, 0, Math.PI * 2);
          c2d.stroke();
        }
      });
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
      stars = [];
      figures = [];
    },
  };
}
```

Register in the particles block next to `stars`:

```js
  constellation: { renderer: 'canvas2d', group: 'particles', loader: () => import('./constellation.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/phenomena-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/constellation.js src/presets/index.js test/phenomena-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): constellation — charted twinkling sky ($CONST)"
bd close $CONST
git add .beads/issues.jsonl && git commit -m "chore(beads): close $CONST"
```

---

### Task 5: Preset `bubbles`

**Files:**
- Create: `src/presets/bubbles.js`
- Modify: `src/presets/index.js` (particles block, next to `constellation`), `test/phenomena-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `bubbles` (canvas2d, particles).

- [ ] **Step 1: Extend the failing tests**

`test/phenomena-wave.spec.js` PRESETS: append `'bubbles'`.
`test/time-rule.spec.js` PRESETS: append `'bubbles'`.
`test/groups-unit.mjs` PHENOMENA_WAVE map: add `bubbles: 'particles',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/phenomena-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `bubbles` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/bubbles.js`:

```js
// bubbles — an underwater column. Seeded bubbles rise on wobbling cyclic
// paths (bigger rises faster), each a thin fg rim with an offset highlight;
// slow caustic light shafts sweep behind them. Rims are fg ink, so the
// preset reads on light grounds as well as deep-water darks. Pure function
// of t. density = bubble count, intensity = shaft strength.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let bubbles = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 23);
    const n = Math.floor(24 + params.density * 80);
    bubbles = [];
    for (let i = 0; i < n; i++) {
      const r = (2 + rand() * 12) * px;
      bubbles.push({
        x0: rand(),
        off: rand(),
        r,
        v: 0.04 + r / (140 * px), // larger bubbles rise faster
        wob: 0.7 + rand() * 1.8,
        amp: (4 + rand() * 10) * px + r * 0.5,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!bubbles.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);

    // Caustic shafts: three slow diagonal light bands.
    for (let k = 0; k < 3; k++) {
      const cx = w * (0.2 + 0.3 * k) + Math.sin(t * 0.05 + k * 2.1) * w * 0.12;
      const grad = c2d.createLinearGradient(cx - w * 0.06, 0, cx + w * 0.14, h);
      grad.addColorStop(0, rgbaCss(c.primary, 0));
      grad.addColorStop(0.5, rgbaCss(c.primary, 0.06 * params.intensity * (1.2 + Math.sin(t * 0.11 + k))));
      grad.addColorStop(1, rgbaCss(c.primary, 0));
      c2d.fillStyle = grad;
      c2d.fillRect(0, 0, w, h);
    }

    for (const b of bubbles) {
      const p = (b.off + t * b.v) % 1;
      const y = h * (1.06 - p * 1.18);
      const x = b.x0 * w + Math.sin(t * b.wob + b.phase) * b.amp;
      const grow = 0.7 + p * 0.4; // decompression: slightly bigger near the top
      c2d.strokeStyle = rgbaCss(c.fg, 0.55);
      c2d.lineWidth = 1.2 * px;
      c2d.beginPath();
      c2d.arc(x, y, b.r * grow, 0, Math.PI * 2);
      c2d.stroke();
      c2d.fillStyle = rgbaCss(c.fg, 0.7);
      c2d.beginPath();
      c2d.arc(x - b.r * grow * 0.35, y - b.r * grow * 0.35, Math.max(1, b.r * grow * 0.18), 0, Math.PI * 2);
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
      bubbles = [];
    },
  };
}
```

Register next to `constellation`:

```js
  bubbles: { renderer: 'canvas2d', group: 'particles', loader: () => import('./bubbles.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/phenomena-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/bubbles.js src/presets/index.js test/phenomena-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): bubbles — wobbling underwater column ($BUBBLES)"
bd close $BUBBLES
git add .beads/issues.jsonl && git commit -m "chore(beads): close $BUBBLES"
```

---

### Task 6: Preset `leaves`

**Files:**
- Create: `src/presets/leaves.js`
- Modify: `src/presets/index.js` (nature block, next to `komorebi`), `test/phenomena-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers (incl. `mix`).
- Produces: registry key `leaves` (canvas2d, nature).

- [ ] **Step 1: Extend the failing tests**

`test/phenomena-wave.spec.js` PRESETS: append `'leaves'` (final list: 6 entries).
`test/time-rule.spec.js` PRESETS: append `'leaves'`.
`test/groups-unit.mjs` PHENOMENA_WAVE map: add `leaves: 'nature',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/phenomena-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `leaves` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/leaves.js`:

```js
// leaves — autumn fall. Seeded leaves in three shapes tumble down cyclic
// paths, each rotating and swaying, all leaning together under a slow gust.
// Tints mix primary/accent/warning toward the bg for depth. Pure function
// of t. density = leaf count, intensity = leaf size.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let leaves = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 29);
    const n = Math.floor(18 + params.density * 60);
    leaves = [];
    for (let i = 0; i < n; i++) {
      leaves.push({
        x0: rand(),
        off: rand(),
        v: 0.03 + rand() * 0.05,
        size: (8 + rand() * 14) * px,
        kind: (rand() * 3) | 0, // oval / three-lobe / willow
        rotW: 0.4 + rand() * 1.4,
        sway: (14 + rand() * 30) * px,
        swayW: 0.5 + rand() * 1.1,
        phase: rand() * Math.PI * 2,
        ci: (rand() * 3) | 0,
        depth: 0.15 + rand() * 0.85, // far leaves smaller + fainter
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!leaves.length || key !== lastKey) rebuild(params);
  }

  function leafPath(kind, s) {
    c2d.beginPath();
    if (kind === 0) {
      // oval leaf with a pointed tip
      c2d.moveTo(0, -s);
      c2d.quadraticCurveTo(s * 0.7, -s * 0.3, 0, s);
      c2d.quadraticCurveTo(-s * 0.7, -s * 0.3, 0, -s);
    } else if (kind === 1) {
      // three-lobe (maple-ish)
      c2d.moveTo(0, s * 0.9);
      c2d.quadraticCurveTo(-s, s * 0.2, -s * 0.55, -s * 0.35);
      c2d.quadraticCurveTo(-s * 0.25, -s * 0.15, 0, -s);
      c2d.quadraticCurveTo(s * 0.25, -s * 0.15, s * 0.55, -s * 0.35);
      c2d.quadraticCurveTo(s, s * 0.2, 0, s * 0.9);
    } else {
      // willow: a slim lens
      c2d.moveTo(0, -s);
      c2d.quadraticCurveTo(s * 0.3, 0, 0, s);
      c2d.quadraticCurveTo(-s * 0.3, 0, 0, -s);
    }
    c2d.closePath();
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.warning];
    const gust = Math.sin(t * 0.1) * w * 0.05;
    const sizeMul = 0.7 + params.intensity * 0.6;

    for (const L of leaves) {
      const p = (L.off + t * L.v) % 1;
      const y = h * (p * 1.2 - 0.1);
      const x = L.x0 * w + Math.sin(t * L.swayW + L.phase) * L.sway + gust * p;
      const s = L.size * sizeMul * (0.5 + L.depth * 0.6);
      const col = mix(pal[L.ci % pal.length], c.bg, (1 - L.depth) * 0.45);
      c2d.save();
      c2d.translate(x, y);
      c2d.rotate(t * L.rotW + L.phase + Math.sin(t * L.swayW + L.phase) * 0.4);
      leafPath(L.kind, s);
      c2d.fillStyle = rgbaCss(col, 0.55 + L.depth * 0.4);
      c2d.fill();
      // mid-vein
      c2d.strokeStyle = rgbaCss(mix(col, c.bg, 0.35), 0.8);
      c2d.lineWidth = 1 * px;
      c2d.beginPath();
      c2d.moveTo(0, -s * 0.85);
      c2d.lineTo(0, s * 0.85);
      c2d.stroke();
      c2d.restore();
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
      leaves = [];
    },
  };
}
```

Register in the nature block next to `komorebi`:

```js
  leaves: { renderer: 'canvas2d', group: 'nature', loader: () => import('./leaves.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/phenomena-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (6 phenomena entries; time-rule +5).

- [ ] **Step 5: Commit**

```bash
git add src/presets/leaves.js src/presets/index.js test/phenomena-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): leaves — tumbling autumn fall ($LEAVES)"
bd close $LEAVES
git add .beads/issues.jsonl && git commit -m "chore(beads): close $LEAVES"
```

---

### Task 7: API reference rows for the six presets

**Files:**
- Modify: `docs/api.html` (particles, atmospheric, and nature group tables; single-line `<tr>` style matching neighbors)

**Interfaces:**
- Consumes: the registered names from Tasks 1–6.
- Produces: 168/168 catalog coverage.

- [ ] **Step 1: Add the rows**

Particles table (near `fireflies`/`stars`):

```html
            <tr><td><code>embers</code></td><td>Sparks rising off an unseen fire, cooling accent&rarr;primary as they climb over a warm bottom glow</td><td>primary, accent, background</td></tr>
            <tr><td><code>constellation</code></td><td>Twinkling star field with charted figures &mdash; star chains, join lines, a ringed catalog star</td><td>primary, accent, foreground, background</td></tr>
            <tr><td><code>bubbles</code></td><td>Underwater column of wobbling rising bubbles under slow caustic light shafts</td><td>primary, foreground, background</td></tr>
```

Atmospheric table (near `aurora`):

```html
            <tr><td><code>lightning</code></td><td>Seeded storm strikes on a t-derived schedule &mdash; branched bolts, sky flash, restless cloud glow</td><td>accent, foreground, background</td></tr>
            <tr><td><code>fog</code></td><td>Three parallax fbm banks drifting between bg and fg-tinted mist, thickening toward the horizon</td><td>foreground, background</td></tr>
```

Nature table (near `komorebi`):

```html
            <tr><td><code>leaves</code></td><td>Autumn leaves in three shapes tumbling down swaying paths, leaning together under a slow gust</td><td>primary, accent, warning, background</td></tr>
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

Expected: `168 registered; 0 missing: []`

- [ ] **Step 3: Commit**

```bash
git add docs/api.html
git commit -m "docs(api): catalog rows for the six phenomena-wave presets"
```

---

### Task 8: Container visual baselines for the six (+ light-ground inspection)

**Files:**
- Create: `test/visual.spec.js-snapshots/{embers,lightning,fog,constellation,bubbles,leaves}-visual-linux.png`

**Interfaces:**
- Consumes: Docker (`docker info --format ok`; if not running, `open -a OrbStack` and retry) + `mcr.microsoft.com/playwright:v1.60.0-jammy`.

- [ ] **Step 1: Generate (anchored filter)**

```bash
docker run --rm --ipc=host --platform=linux/amd64 -v "$PWD:/work" -v /work/node_modules \
  -w /work mcr.microsoft.com/playwright:v1.60.0-jammy \
  bash -lc "npm ci --no-audit --no-fund >/dev/null 2>&1 && npx playwright test --project=visual --update-snapshots -g '(^| )(embers|lightning|fog|constellation|bubbles|leaves)$'"
```

Expected: 6 pass, 6 `writing actual` lines; `git status --porcelain test/visual.spec.js-snapshots/` shows exactly six new files, zero modified (restore anything else).

- [ ] **Step 2: Verify determinism (same command WITHOUT `--update-snapshots`)**

Expected: 6/6 pass.

- [ ] **Step 3: Light-ground inspection (gl-wc-0eq6 lesson)**

Read each of the six PNGs (the visual theme is light). For each: describe in one line; it must show the phenomenon clearly — not a blank/near-uniform field. If any preset is invisible on the light ground, STOP and report DONE_WITH_CONCERNS naming it — the controller decides between an ink-reading fix or a documented ground deviation.

- [ ] **Step 4: Commit**

```bash
git add test/visual.spec.js-snapshots/
git commit -m "test(visual): baselines for the six phenomena-wave presets"
```

---

### Task 9: Demo `campsite.html`

**Files:**
- Create: `demos/campsite.html`
- Modify: `demos/index.html` (append a `.bw-card` tile after the current last card)

**Interfaces:**
- Consumes: presets `embers`, `constellation`.

- [ ] **Step 1: Write the page**

Create `demos/campsite.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Campsite &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* Night at the fire, then the sky above it. Warm-dark pinned palette. */
    :root {
      --color-background: #140d08;  /* firelit dark */
      --color-foreground: #f2e3c8;  /* lamplight cream */
      --color-primary: #b3502e;     /* ember red */
      --color-accent: #f2a13b;      /* flame orange */
      --color-info: #6b86a8;        /* night blue */
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    camp-story {
      display: block; position: absolute; left: 50%; transform: translateX(-50%);
      max-width: 460px; text-align: center; padding: 20px 30px;
      background: rgba(20, 13, 8, 0.72); border: 1px solid rgba(242, 227, 200, 0.25); border-radius: 10px;
    }
    camp-story[data-at="low"] { bottom: clamp(28px, 8vh, 80px); }
    camp-story[data-at="high"] { top: clamp(48px, 10vh, 96px); }
    story-mark { display: block; font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 8px; }
    camp-story h1, camp-story h2 { font-family: 'Amatic SC', cursive; font-weight: 700; margin: 0 0 8px; letter-spacing: 0.04em; }
    camp-story h1 { font-size: clamp(44px, 7vw, 84px); line-height: 0.95; }
    camp-story h2 { font-size: clamp(36px, 5vw, 62px); }
    camp-story p { margin: 0; font-weight: 300; line-height: 1.65; font-size: 15px; }
    code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(242, 227, 200, 0.12); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="embers" data-background-intensity="0.7" data-background-seed="11" data-background-speed="0.8">
    <camp-story data-at="low">
      <story-mark>Last log on the fire</story-mark>
      <h1>The Campsite</h1>
      <p>Every story gets taller as the sparks go up. <code>data-background="embers"</code></p>
    </camp-story>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="constellation" data-background-intensity="0.65" data-background-seed="3" data-background-speed="0.6">
    <camp-story data-at="high">
      <story-mark>Lie back &middot; look up</story-mark>
      <h2>Where the Sparks End Up</h2>
      <p>Somebody names a bear; nobody argues with the ringed one. <code>data-background="constellation"</code></p>
    </camp-story>
  </section>

  <script type="module">
    import 'vanilla-breeze/css'; /* layers + layout attributes; no theme JS — the palette is pinned */
    import '../src/data-background.js';
  </script>
</body>
</html>
```

- [ ] **Step 2: Register the hub tile (after the current last `.bw-card`)**

```html
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./campsite.html" title="The Campsite"
                        url="profpowell.github.io/bg-wc/demos/campsite.html"></browser-window>
        <a class="bw-open" href="./campsite.html" aria-label="Open the Campsite demo"></a>
        <div class="meta"><span class="name">The Campsite</span><span class="desc">embers up to the constellations</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "campsite"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/campsite.html demos/index.html
git commit -m "docs(demos): campsite — embers up to the constellations ($CAMP)"
bd close $CAMP
git add .beads/issues.jsonl && git commit -m "chore(beads): close $CAMP"
```

---

### Task 10: Demo `lighthouse.html`

**Files:**
- Create: `demos/lighthouse.html`
- Modify: `demos/index.html` (append a `.bw-card` tile)

**Interfaces:**
- Consumes: presets `lightning`, `fog`.

- [ ] **Step 1: Write the page**

Create `demos/lighthouse.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Lighthouse &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Serif:ital,wght@0,300;1,300&display=swap" rel="stylesheet">
  <style>
    /* A keeper's log through one squall: the strikes, then the bank that
       always follows. Cold-dark pinned palette. */
    :root {
      --color-background: #0b1016;  /* squall dark */
      --color-foreground: #dfe7ee;  /* signal white */
      --color-primary: #4a6d8c;     /* sea slate */
      --color-accent: #9fc2e0;      /* arc light */
      --color-info: #7c93a8;        /* mist */
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: 'IBM Plex Serif', Georgia, serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    keeper-log {
      display: block; position: absolute; max-width: 420px; padding: 20px 26px;
      background: rgba(11, 16, 22, 0.78); border-left: 3px solid var(--color-accent);
    }
    keeper-log[data-at="left"] { left: clamp(24px, 6vw, 90px); bottom: clamp(32px, 10vh, 96px); }
    keeper-log[data-at="right"] { right: clamp(24px, 6vw, 90px); top: clamp(48px, 12vh, 110px); }
    log-stamp { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 8px; }
    keeper-log h1, keeper-log h2 { font-weight: 300; margin: 0 0 8px; font-size: clamp(28px, 4vw, 46px); line-height: 1.1; }
    keeper-log p { margin: 0; font-weight: 300; font-style: italic; line-height: 1.65; font-size: 15px; }
    code { font-family: 'IBM Plex Mono', monospace; font-style: normal; font-size: 0.8em; background: rgba(223, 231, 238, 0.1); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="lightning" data-background-intensity="0.75" data-background-seed="9" data-background-speed="0.9" data-background-density="0.6">
    <keeper-log data-at="left">
      <log-stamp>Keeper's log &middot; 02:14</log-stamp>
      <h1>The Lighthouse</h1>
      <p>Counting between the flash and the thunder. Stopped counting. <code>data-background="lightning"</code></p>
    </keeper-log>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="fog" data-background-intensity="0.7" data-background-seed="5" data-background-speed="0.6" data-background-density="0.65">
    <keeper-log data-at="right">
      <log-stamp>Keeper's log &middot; 04:50</log-stamp>
      <h2>Then the Bank Rolled In</h2>
      <p>The beam turns; the fog keeps whatever it touches. <code>data-background="fog"</code></p>
    </keeper-log>
  </section>

  <script type="module">
    import 'vanilla-breeze/css'; /* layers + layout attributes; no theme JS — the palette is pinned */
    import '../src/data-background.js';
  </script>
</body>
</html>
```

- [ ] **Step 2: Register the hub tile**

```html
      <div class="bw-card">
        <browser-window mode="dark" shadow data-demo-src="./lighthouse.html" title="The Lighthouse"
                        url="profpowell.github.io/bg-wc/demos/lighthouse.html"></browser-window>
        <a class="bw-open" href="./lighthouse.html" aria-label="Open the Lighthouse demo"></a>
        <div class="meta"><span class="name">The Lighthouse</span><span class="desc">the squall, then the fog bank</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "lighthouse"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/lighthouse.html demos/index.html
git commit -m "docs(demos): lighthouse — the squall, then the fog bank ($LIGHTHOUSE)"
bd close $LIGHTHOUSE
git add .beads/issues.jsonl && git commit -m "chore(beads): close $LIGHTHOUSE"
```

---

### Task 11: Demo `field-notes.html`

**Files:**
- Create: `demos/field-notes.html`
- Modify: `demos/index.html` (append a `.bw-card` tile)

**Interfaces:**
- Consumes: presets `bubbles`, `leaves`.

- [ ] **Step 1: Write the page**

Create `demos/field-notes.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Field Notes &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* A naturalist's notebook: the pond dip, then the walk home through the
       leaves. Paper pinned palette. */
    :root {
      --color-background: #f3efe3;  /* notebook paper */
      --color-foreground: #2b3230;  /* field-pen ink */
      --color-primary: #3e7d8c;     /* pond teal */
      --color-accent: #c26b3f;      /* maple */
      --color-warning: #d9a13b;     /* birch gold */
      --color-info: #6a8f5f;        /* moss */
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    note-entry {
      display: block; position: absolute; max-width: 400px; padding: 18px 26px;
      background: var(--color-background); border: 1.5px solid var(--color-foreground); border-radius: 4px;
      box-shadow: 5px 5px 0 rgba(43, 50, 48, 0.18); transform: rotate(-0.8deg);
    }
    note-entry[data-at="tl"] { top: clamp(56px, 9vh, 88px); left: clamp(24px, 5vw, 72px); }
    note-entry[data-at="br"] { bottom: clamp(28px, 7vh, 68px); right: clamp(24px, 5vw, 72px); transform: rotate(0.9deg); }
    entry-date { display: block; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 6px; }
    note-entry h1, note-entry h2 { font-family: Caveat, cursive; font-weight: 600; margin: 0 0 6px; line-height: 0.95; }
    note-entry h1 { font-size: clamp(40px, 6vw, 68px); }
    note-entry h2 { font-size: clamp(34px, 5vw, 56px); }
    note-entry p { margin: 0; font-weight: 300; line-height: 1.6; font-size: 15px; }
    code { font-family: ui-monospace, monospace; font-size: 0.82em; background: rgba(43, 50, 48, 0.08); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="bubbles" data-background-intensity="0.65" data-background-seed="13" data-background-speed="0.7"
           data-background-color-bg="#123742" data-background-color-fg="#e8f2f0">
    <note-entry data-at="tl">
      <entry-date>Entry 41 &middot; the pond dip</entry-date>
      <h1>Field Notes</h1>
      <p>Whatever breathes down there is having a better morning than us. <code>data-background="bubbles"</code></p>
    </note-entry>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="leaves" data-background-intensity="0.7" data-background-seed="8" data-background-speed="0.6">
    <note-entry data-at="br">
      <entry-date>Entry 42 &middot; the walk home</entry-date>
      <h2>Every Leaf Signed the Wind</h2>
      <p>Collected nine; kept the crooked one. <code>data-background="leaves"</code></p>
    </note-entry>
  </section>

  <script type="module">
    import 'vanilla-breeze/css'; /* layers + layout attributes; no theme JS — the palette is pinned */
    import '../src/data-background.js';
  </script>
</body>
</html>
```

- [ ] **Step 2: Register the hub tile**

```html
      <div class="bw-card">
        <browser-window mode="light" shadow data-demo-src="./field-notes.html" title="Field Notes"
                        url="profpowell.github.io/bg-wc/demos/field-notes.html"></browser-window>
        <a class="bw-open" href="./field-notes.html" aria-label="Open the Field Notes demo"></a>
        <div class="meta"><span class="name">Field Notes</span><span class="desc">the pond dip, the walk home</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "field-notes"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/field-notes.html demos/index.html
git commit -m "docs(demos): field-notes — the pond dip, the walk home ($NOTES)"
bd close $NOTES
git add .beads/issues.jsonl && git commit -m "chore(beads): close $NOTES"
```

---

### Task 12: Final gates, coverage, push

**Files:** none new

- [ ] **Step 1: Full verification**

```bash
set -o pipefail
npm test
npm run test:node
npm run lint
npm run format:check
npm run cem:check
npm run build && npm run build:site && npm run verify:site
```

Expected: everything green.

- [ ] **Step 2: Coverage sanity**

```bash
python3 - << 'EOF'
import re, glob
src = open('src/presets/index.js').read()
entries = re.findall(r"^\s{2}(?:'([\w-]+)'|([\w-]+)):\s*\{\s*renderer", src, re.M)
presets = {a or b for a, b in entries}
used = set()
for f in glob.glob('demos/*.html'):
    for m in re.findall(r'(?:preset|data-background)="([\w-]+)"', open(f).read()):
        if m in presets: used.add(m)
print(f"registered {len(presets)}  demoed {len(used)}  missing {sorted(presets - used)}")
EOF
```

Expected: `registered 168  demoed 168  missing []`.

- [ ] **Step 3: Push (MANDATORY)**

```bash
git pull --rebase
git push
git status   # MUST be up to date with origin
bd ready     # no phenomena-wave issues left open
```

Then watch CI and the gated Pages deploy; spot-check one new demo live.
