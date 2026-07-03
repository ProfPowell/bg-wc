# Style Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 12 movement/pattern/technique presets (registry 150 → 162) and 5 demo homes so every preset stays demoed.

**Architecture:** Each preset is one file in `src/presets/` plus one `REGISTRY` entry per the contract in that file's header. All 12 are designed as pure functions of `t` (no accumulated state), so repeated frames at a frozen `t` are pixel-identical — they all join the time-rule test and all get container visual baselines. Eleven are canvas2d; `psychedelia` is a `makeShaderPreset` WebGL shader. Demos follow the vocabulary idiom (custom elements + data-*, binder-only backgrounds).

**Tech Stack:** Vanilla JS ES modules, Canvas2D + WebGL, Playwright, node:test, Docker (pinned Playwright container for baselines).

**Spec:** `docs/superpowers/specs/2026-07-03-style-wave-design.md`

## Global Constraints

- Preset contract (`src/presets/index.js` header): colors from `getColors()` EVERY frame; `t` is pre-scaled by speed — never multiply motion by `params.speed`; layouts seeded with `mulberry32(params.seed)`; provide `staticFrame(params)`; clean up in `dispose()`.
- All 12 presets are pure functions of `t`: derive every animated quantity from `t` directly (phases, offsets, positions along paths). No `lastT`, no per-call advancement.
- Color strings only via `rgbCss`/`rgbaCss` from `src/renderer/tokens.js`; palette blends via `mix` from `src/presets/_dots.js` where needed. No hand-rolled channel math.
- No `mode` attributes. No new registry groups.
- Before each commit: `set -o pipefail; npm run lint && npm run format:check && npm run cem:check` must pass (run `npx prettier --write "src/**/*.js" "test/**/*.{js,mjs}"` first if needed; commit the regenerated `custom-elements.json` when it changes). Never pipe a gate through `| tail` without pipefail.
- Demos: zero `<div>`, zero `class=`, binder-only backgrounds (`data-background*`), standard script block (`import 'vanilla-breeze/css'` + `import '../src/data-background.js'`), crumbs carry `target="_top"`. The conventions/idiom/smoke tests in `test/demos-conventions.mjs` and `test/demos-smoke.spec.js` enforce this — keep them green.
- Track work in bd (issue IDs created in Task 0); close each task's issue in its commit step. Do NOT use TodoWrite/TaskCreate.
- All commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 0: File bd issues for the wave

**Files:** none (tracker only)

**Interfaces:**
- Produces: seventeen bd issue IDs, referenced in later commit steps as `$NOUVEAU`, `$CONSTR`, `$PSYCH`, `$BRUSH`, `$CELTIC`, `$PAISLEY`, `$AZULEJO`, `$MUDCLOTH`, `$TERRAZZO`, `$CYANO`, `$SCREEN`, `$TRANSIT`, `$BELLE`, `$POSTER`, `$ATLAS`, `$INTER`, `$SHEET5`.

- [ ] **Step 1: Create the issues**

```bash
for t in \
  "Preset: art-nouveau (canvas2d, classic)" \
  "Preset: constructivism (canvas2d, classic)" \
  "Preset: psychedelia (webgl, pop)" \
  "Preset: brushstroke (canvas2d, art)" \
  "Preset: celtic-knot (canvas2d, ornamental)" \
  "Preset: paisley (canvas2d, ornamental)" \
  "Preset: azulejo (canvas2d, ornamental)" \
  "Preset: mudcloth (canvas2d, ornamental)" \
  "Preset: terrazzo (canvas2d, texture)" \
  "Preset: cyanotype (canvas2d, print)" \
  "Preset: screenprint (canvas2d, print)" \
  "Preset: transit-diagram (canvas2d, dataviz)" \
  "Demo: belle-epoque.html (art-nouveau + brushstroke)" \
  "Demo: poster-century.html (constructivism, psychedelia, screenprint)" \
  "Demo: atlas.html (celtic-knot, paisley, azulejo, mudcloth, terrazzo)" \
  "Demo: interchange.html (transit-diagram)" \
  "Demo: drawing-office.html Sheet 5 (cyanotype)"; do
  bd create --type=task --priority=2 --title="$t" --description="Style wave, per spec docs/superpowers/specs/2026-07-03-style-wave-design.md"
done
```

Record the seventeen printed IDs.

---

### Task 1: Preset `art-nouveau` (creates the wave's test scaffolding)

**Files:**
- Create: `src/presets/art-nouveau.js`, `test/style-wave.spec.js`
- Modify: `src/presets/index.js` (REGISTRY, next to `morris` in the classic block), `test/time-rule.spec.js` (PRESETS list), `test/groups-unit.mjs` (append one wave test)

**Interfaces:**
- Consumes: `mulberry32(seed)` from `src/util/pause.js`; `clearAndFill(c2d, w, h, bgTuple)` from `src/renderer/canvas2d.js`; `rgbCss`/`rgbaCss` from `src/renderer/tokens.js`; `mix` from `src/presets/_dots.js`.
- Produces: `create({ c2d, getColors, pxScale })` → `{ resize, frame, staticFrame, dispose }`; registry key `'art-nouveau'`. Later tasks extend `test/style-wave.spec.js`'s `PRESETS` array and the `STYLE_WAVE` map in `test/groups-unit.mjs`.

- [ ] **Step 1: Write the failing tests**

Create `test/style-wave.spec.js`:

```js
import { test, expect } from '@playwright/test';

// Render smoke for the 2026-07-03 style-wave presets: each must mount without
// fallback and produce a non-blank still. Pixel baselines live in the visual
// project; frame-purity is pinned in time-rule.spec.js (all twelve are pure
// functions of t by design).

const PRESETS = ['art-nouveau'];

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

In `test/time-rule.spec.js`, extend the list:

```js
const PRESETS = ['particles', 'asteroids', 'network', 'rain', 'fireflies', 'zen-garden', 'art-nouveau'];
```

Append to `test/groups-unit.mjs` (later tasks add entries to this map — keep it a single test):

```js
test('style-wave presets landed in their groups (2026-07-03)', () => {
  const STYLE_WAVE = {
    'art-nouveau': 'classic',
  };
  const byName = new Map(listPresets().map((p) => [p.name, p.group]));
  for (const [name, group] of Object.entries(STYLE_WAVE)) {
    assert.equal(byName.get(name), group, `${name} in ${group}`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: style-wave `art-nouveau` FAILS (unknown preset → fallback), time-rule `art-nouveau` FAILS (module import), node group test FAILS.

- [ ] **Step 3: Write the preset**

Create `src/presets/art-nouveau.js`:

```js
// art-nouveau — whiplash-curve botanical borders. Seeded vine spines sweep in
// from the frame edges as long tapering S-curves; leaves and buds sprout at
// the curvature peaks, and a double frame line contains the composition. The
// tendril tips sway gently — everything is a pure function of t, so a frozen
// frame is a stable still. primary = vine, accent = blooms, fg = frame.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let vines = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 2);
    const n = 3 + Math.round(params.density * 4); // 3..7 spines
    vines = [];
    for (let i = 0; i < n; i++) {
      // Anchor on a frame edge; the spine is a chain of alternating S-curves.
      const edge = (rand() * 4) | 0;
      const a = 0.15 + rand() * 0.7;
      const start =
        edge === 0 ? [a, 0.02] : edge === 1 ? [0.98, a] : edge === 2 ? [a, 0.98] : [0.02, a];
      const inward = edge === 0 ? [0, 1] : edge === 1 ? [-1, 0] : edge === 2 ? [0, -1] : [1, 0];
      const segs = [];
      let heading = Math.atan2(inward[1], inward[0]) + (rand() - 0.5) * 0.6;
      let len = 0.16 + rand() * 0.12;
      for (let s = 0; s < 4 + ((rand() * 3) | 0); s++) {
        segs.push({
          len,
          bend: (s % 2 ? 1 : -1) * (0.7 + rand() * 0.9), // alternating whiplash
          leaf: rand() < 0.6,
          bud: rand() < 0.35,
        });
        len *= 0.78;
        heading += 0;
      }
      vines.push({ start, heading, segs, phase: rand() * Math.PI * 2, ci: (rand() * 3) | 0 });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!vines.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const sway = 0.12 * Math.sin(t * 0.4);

    // Double frame.
    c2d.strokeStyle = rgbaCss(c.fg, 0.55);
    c2d.lineWidth = 2 * px;
    c2d.strokeRect(s * 0.03, s * 0.03, w - s * 0.06, h - s * 0.06);
    c2d.lineWidth = 1 * px;
    c2d.strokeRect(s * 0.055, s * 0.055, w - s * 0.11, h - s * 0.11);

    const vineCss = rgbCss(c.primary);
    const bloomCss = rgbCss(c.accent);
    c2d.lineCap = 'round';

    for (const v of vines) {
      let x = v.start[0] * w;
      let y = v.start[1] * h;
      let heading = v.heading;
      let width = (5 + params.intensity * 4) * px;
      for (let i = 0; i < v.segs.length; i++) {
        const seg = v.segs[i];
        const tipSway = i === v.segs.length - 1 ? sway + 0.1 * Math.sin(t * 0.7 + v.phase) : 0;
        const bend = seg.bend + tipSway;
        const L = seg.len * s;
        // Quadratic S-curve: control point off to one side of the chord.
        const midA = heading + bend * 0.5;
        const cx = x + Math.cos(midA) * L * 0.6;
        const cy = y + Math.sin(midA) * L * 0.6;
        const endA = heading + bend;
        const ex = x + Math.cos(endA) * L;
        const ey = y + Math.sin(endA) * L;
        c2d.strokeStyle = vineCss;
        c2d.lineWidth = Math.max(1, width);
        c2d.beginPath();
        c2d.moveTo(x, y);
        c2d.quadraticCurveTo(cx, cy, ex, ey);
        c2d.stroke();
        // Leaf: a lens of two arcs off the curvature peak.
        if (seg.leaf) {
          const la = midA + Math.PI / 2;
          const lx = cx + Math.cos(la) * 4 * px;
          const ly = cy + Math.sin(la) * 4 * px;
          const ll = L * 0.28;
          c2d.fillStyle = rgbaCss(c.primary, 0.8);
          c2d.beginPath();
          c2d.moveTo(lx, ly);
          c2d.quadraticCurveTo(
            lx + Math.cos(la - 0.5) * ll,
            ly + Math.sin(la - 0.5) * ll,
            lx + Math.cos(la) * ll * 1.4,
            ly + Math.sin(la) * ll * 1.4
          );
          c2d.quadraticCurveTo(
            lx + Math.cos(la + 0.5) * ll,
            ly + Math.sin(la + 0.5) * ll,
            lx,
            ly
          );
          c2d.fill();
        }
        // Bud/bloom at the joint.
        if (seg.bud) {
          c2d.fillStyle = bloomCss;
          c2d.beginPath();
          c2d.arc(ex, ey, (2.5 + width * 0.4) * (1 + 0.15 * Math.sin(t * 0.6 + v.phase + i)), 0, Math.PI * 2);
          c2d.fill();
        }
        x = ex;
        y = ey;
        heading = endA;
        width *= 0.72; // taper
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
      vines = [];
    },
  };
}
```

Register in `src/presets/index.js`, in the classic block next to `morris`:

```js
  'art-nouveau': { renderer: 'canvas2d', group: 'classic', loader: () => import('./art-nouveau.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (commit `custom-elements.json` if regenerated).

- [ ] **Step 5: Commit**

```bash
git add src/presets/art-nouveau.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): art-nouveau — whiplash vines and blooms ($NOUVEAU)"
bd close $NOUVEAU
```

---

### Task 2: Preset `constructivism`

**Files:**
- Create: `src/presets/constructivism.js`
- Modify: `src/presets/index.js` (classic block, next to `art-nouveau`), `test/style-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: same helpers as Task 1.
- Produces: registry key `constructivism` (canvas2d, classic).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js`: `const PRESETS = ['art-nouveau', 'constructivism'];`
`test/time-rule.spec.js`: append `'constructivism'` to the PRESETS array.
`test/groups-unit.mjs` STYLE_WAVE map: add `'constructivism': 'classic',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `constructivism` cases FAIL; earlier cases PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/constructivism.js`:

```js
// constructivism — Lissitzky/Malevich field. One dominant diagonal wedge and a
// squadron of floating planes (bars, rects, circles) composed along a rotated
// axis; the minor planes drift on slow orbits, all derived from t. primary is
// the revolutionary red lead, fg the ink bars, accent/info the supporting
// planes, over a warm paper bg.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

const AXIS = -0.42; // the composition's rotation, radians

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let planes = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 4);
    const n = 6 + Math.round(params.density * 8); // 6..14 planes
    planes = [];
    for (let i = 0; i < n; i++) {
      planes.push({
        u: rand() * 1.4 - 0.2, // position along the axis
        v: (rand() - 0.5) * 0.9, // offset perpendicular to it
        kind: rand() < 0.25 ? 'circle' : rand() < 0.6 ? 'bar' : 'rect',
        size: 0.04 + rand() * 0.13,
        aspect: 0.15 + rand() * 0.5,
        ci: (rand() * 3) | 0,
        outline: rand() < 0.3,
        wobble: 0.008 + rand() * 0.02,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!planes.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const cos = Math.cos(AXIS);
    const sin = Math.sin(AXIS);
    const toXY = (u, v) => [w * 0.1 + (u * cos - v * sin) * w, h * 0.75 + (u * sin + v * cos) * h];

    // The dominant wedge: a long triangle beating along the axis.
    const [wx, wy] = toXY(-0.05, 0.02);
    const [tx, ty] = toXY(0.95 + 0.01 * Math.sin(t * 0.3), -0.03);
    const half = s * (0.05 + params.intensity * 0.06);
    c2d.fillStyle = rgbCss(c.primary);
    c2d.beginPath();
    c2d.moveTo(wx - Math.sin(AXIS) * half, wy + Math.cos(AXIS) * half);
    c2d.lineTo(wx + Math.sin(AXIS) * half, wy - Math.cos(AXIS) * half);
    c2d.lineTo(tx, ty);
    c2d.closePath();
    c2d.fill();

    // A large restrained circle outline crossing the wedge.
    const [ox, oy] = toXY(0.42, -0.18);
    c2d.strokeStyle = rgbaCss(c.fg, 0.85);
    c2d.lineWidth = 3 * px;
    c2d.beginPath();
    c2d.arc(ox, oy, s * 0.2, 0, Math.PI * 2);
    c2d.stroke();

    const pal = [c.fg, c.accent, c.info];
    for (const p of planes) {
      const dv = p.v + p.wobble * Math.sin(t * 0.35 + p.phase);
      const [x, y] = toXY(p.u, dv);
      const col = pal[p.ci % pal.length];
      c2d.save();
      c2d.translate(x, y);
      c2d.rotate(AXIS);
      if (p.kind === 'circle') {
        c2d.fillStyle = rgbCss(col);
        c2d.beginPath();
        c2d.arc(0, 0, p.size * s * 0.5, 0, Math.PI * 2);
        c2d.fill();
      } else if (p.kind === 'bar') {
        c2d.fillStyle = rgbCss(col);
        c2d.fillRect((-p.size * s) / 2, (-p.size * s * p.aspect) / 8, p.size * s, (p.size * s * p.aspect) / 4);
      } else if (p.outline) {
        c2d.strokeStyle = rgbCss(col);
        c2d.lineWidth = 2 * px;
        c2d.strokeRect((-p.size * s) / 2, (-p.size * s * p.aspect) / 2, p.size * s, p.size * s * p.aspect);
      } else {
        c2d.fillStyle = rgbCss(col);
        c2d.fillRect((-p.size * s) / 2, (-p.size * s * p.aspect) / 2, p.size * s, p.size * s * p.aspect);
      }
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
      planes = [];
    },
  };
}
```

Register next to `art-nouveau`:

```js
  constructivism: { renderer: 'canvas2d', group: 'classic', loader: () => import('./constructivism.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/constructivism.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): constructivism — wedge and floating planes ($CONSTR)"
bd close $CONSTR
```

---

### Task 3: Preset `psychedelia` (the wave's one WebGL shader)

**Files:**
- Create: `src/presets/psychedelia.js`
- Modify: `src/presets/index.js` (pop block, next to `groove`), `test/style-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: `makeShaderPreset(FS, uniformNames)` from `src/renderer/shader-preset.js`; the quad VS supplies `varying vec2 v_uv` (0..1). Allowed uniforms only: `u_time, u_intensity, u_density, u_c1, u_c2, u_c3, u_bg, u_fg, u_ink, u_res`.
- Produces: registry key `psychedelia` (webgl, pop). NOT added to time-rule.spec.js (canvas2d-only harness; the shader is pure `u_time` by construction).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js`: `const PRESETS = ['art-nouveau', 'constructivism', 'psychedelia'];`
`test/groups-unit.mjs` STYLE_WAVE map: add `psychedelia: 'pop',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `psychedelia` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/psychedelia.js`:

```js
// psychedelia — 1960s liquid poster warp. Concentric contour bands around two
// drifting centers, domain-warped so the rings melt and breathe; bands cycle
// hard-edged through the three theme colors at full saturation (the vibrating
// Fillmore look). A pure function of u_time — stills are deterministic.
// density = ring frequency, intensity = warp depth.

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
  vec2 a = vec2(0.5 * aspect, 0.5) + 0.22 * vec2(sin(u_time * 0.11), cos(u_time * 0.13));
  vec2 b = vec2(0.5 * aspect, 0.5) - 0.22 * vec2(sin(u_time * 0.09 + 2.1), cos(u_time * 0.07 + 1.3));

  // Melt the domain before measuring distance.
  float warp = 0.05 + 0.12 * u_intensity;
  p.x += warp * sin(p.y * 7.0 + u_time * 0.5) * sin(p.y * 2.3 - u_time * 0.21);
  p.y += warp * sin(p.x * 6.0 - u_time * 0.4) * sin(p.x * 3.1 + u_time * 0.17);

  float da = length(p - a);
  float db = length(p - b);
  float field = 8.0 * da * db / (da + db); // rounded two-center contour metric

  float rings = 6.0 + u_density * 10.0;
  float band = fract(field * rings * 0.5 - u_time * 0.12);

  vec3 col = u_c1;
  if (band > 0.25) col = u_c2;
  if (band > 0.5) col = u_c3;
  if (band > 0.75) col = u_bg;
  // Thin ink line at each band edge keeps the poster crispness.
  float edge = smoothstep(0.0, 0.035, band) * smoothstep(0.0, 0.035, 1.0 - band);
  col *= 0.35 + 0.65 * edge;

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

Register in the pop block next to `groove`:

```js
  psychedelia: { renderer: 'webgl', group: 'pop', loader: () => import('./psychedelia.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (the render test failing with a fallback would mean the shader did not compile).

- [ ] **Step 5: Commit**

```bash
git add src/presets/psychedelia.js src/presets/index.js test/style-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): psychedelia — liquid poster contour warp ($PSYCH)"
bd close $PSYCH
```

---

### Task 4: Preset `brushstroke`

**Files:**
- Create: `src/presets/brushstroke.js`
- Modify: `src/presets/index.js` (art block, next to `watercolor`), `test/style-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers plus `mix` from `src/presets/_dots.js`.
- Produces: registry key `brushstroke` (canvas2d, art).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js` PRESETS: append `'brushstroke'`.
`test/time-rule.spec.js` PRESETS: append `'brushstroke'`.
`test/groups-unit.mjs` STYLE_WAVE map: add `brushstroke: 'art',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `brushstroke` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/brushstroke.js`:

```js
// brushstroke — impasto flow field. Short directional ribbon strokes follow a
// smooth angular field with seeded swirl centers (the Starry-Night motion);
// each stroke carries a lighter top edge for paint relief. Strokes sway with
// t (pure function — no accumulation), so frozen frames are stable stills.
// density = stroke count, intensity = stroke length/weight.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let strokes = [];
  let swirls = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 6);
    swirls = [];
    for (let i = 0; i < 3; i++) {
      swirls.push({ x: rand(), y: rand() * 0.7, r: 0.15 + rand() * 0.2, dir: rand() < 0.5 ? 1 : -1 });
    }
    const n = Math.floor(300 + params.density * 900);
    strokes = [];
    for (let i = 0; i < n; i++) {
      strokes.push({ x: rand(), y: rand(), ci: (rand() * 3) | 0, jitter: rand() * Math.PI * 2, len: 0.7 + rand() * 0.6 });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!strokes.length || key !== lastKey) rebuild(params);
  }

  // Angular field: gentle horizontal drift plus circular flow near each swirl.
  function fieldAngle(x, y, t) {
    let a = Math.sin(y * 4.2) * 0.6 + Math.sin(t * 0.15) * 0.15;
    for (const s of swirls) {
      const dx = x - s.x;
      const dy = y - s.y;
      const d = Math.hypot(dx, dy);
      const infl = Math.exp(-(d * d) / (s.r * s.r));
      a += s.dir * infl * (Math.atan2(dy, dx) + Math.PI / 2 - a);
    }
    return a;
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.info];
    const L = (8 + params.intensity * 12) * px;
    c2d.lineCap = 'round';

    for (const st of strokes) {
      const a = fieldAngle(st.x, st.y, t) + 0.1 * Math.sin(t * 0.5 + st.jitter);
      const col = pal[st.ci % pal.length];
      const x = st.x * w;
      const y = st.y * h;
      const dx = Math.cos(a) * L * st.len;
      const dy = Math.sin(a) * L * st.len;
      // Body stroke.
      c2d.strokeStyle = rgbCss(col);
      c2d.lineWidth = 3 * px;
      c2d.beginPath();
      c2d.moveTo(x - dx / 2, y - dy / 2);
      c2d.lineTo(x + dx / 2, y + dy / 2);
      c2d.stroke();
      // Impasto highlight: a thinner, lighter pass offset one pixel "above".
      c2d.strokeStyle = rgbCss(mix(col, [1, 1, 1], 0.35));
      c2d.lineWidth = 1 * px;
      c2d.beginPath();
      c2d.moveTo(x - dx / 2 - Math.sin(a) * px, y - dy / 2 + Math.cos(a) * px * -1);
      c2d.lineTo(x + dx / 2 - Math.sin(a) * px, y + dy / 2 + Math.cos(a) * px * -1);
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
      strokes = [];
      swirls = [];
    },
  };
}
```

Register in the art block next to `watercolor`:

```js
  brushstroke: { renderer: 'canvas2d', group: 'art', loader: () => import('./brushstroke.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/brushstroke.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): brushstroke — impasto flow field ($BRUSH)"
bd close $BRUSH
```

---

### Task 5: Preset `celtic-knot`

**Files:**
- Create: `src/presets/celtic-knot.js`
- Modify: `src/presets/index.js` (ornamental block, next to `girih`), `test/style-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `'celtic-knot'` (canvas2d, ornamental).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js` PRESETS: append `'celtic-knot'`.
`test/time-rule.spec.js` PRESETS: append `'celtic-knot'`.
`test/groups-unit.mjs` STYLE_WAVE map: add `'celtic-knot': 'ornamental',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `celtic-knot` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/celtic-knot.js`:

```js
// celtic-knot — interlaced strapwork. A diagonal plait on a seeded grid:
// every cell carries two crossing diagonals; seeded "breaks" merge cells into
// longer weaving straps (the classic knotwork move). The over-under illusion
// comes from drawing order: every strap is drawn wide-outline-then-fill, and
// the "over" diagonal of each cell is drawn after its "under" partner. A
// highlight dash slides along the straps with t (pure function of t).
// density = grid fineness, intensity = strap weight.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let cellsX = 0;
  let cellsY = 0;
  let breaks = null; // Uint8Array per cell: 0 cross, 1 horizontal pair, 2 vertical pair
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 8);
    const s = Math.min(w, h);
    const cell = Math.max(28, s * (0.16 - params.density * 0.08));
    cellsX = Math.max(3, Math.ceil(w / cell));
    cellsY = Math.max(3, Math.ceil(h / cell));
    breaks = new Uint8Array(cellsX * cellsY);
    for (let i = 0; i < breaks.length; i++) {
      const r = rand();
      breaks[i] = r < 0.18 ? 1 : r < 0.36 ? 2 : 0;
    }
    lastKey = `${params.seed}|${params.density}|${w}x${h}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${w}x${h}`;
    if (!breaks || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const cw = w / cellsX;
    const ch = h / cellsY;
    const strap = (3 + params.intensity * 5) * px;
    const outline = rgbCss(c.fg);
    const fill = rgbCss(c.primary);
    const glint = rgbaCss(c.accent, 0.9);
    c2d.lineCap = 'round';

    // One diagonal segment of a cell; kind 'a' runs TL->BR, 'b' runs BL->TR.
    // Break codes reroute the pair into arcs that turn back (longer straps).
    function seg(ix, iy, kind, pass) {
      const x = ix * cw;
      const y = iy * ch;
      const code = breaks[iy * cellsX + ix];
      c2d.strokeStyle = pass === 0 ? outline : pass === 1 ? fill : glint;
      c2d.lineWidth = pass === 0 ? strap + 3 * px : pass === 1 ? strap : 1.4 * px;
      if (pass === 2) {
        // Sliding highlight: dashes travel along the strap direction.
        c2d.setLineDash([cw * 0.22, cw * 0.78]);
        c2d.lineDashOffset = -t * 24 - (ix + iy) * 7;
      }
      c2d.beginPath();
      if (code === 1) {
        // Horizontal turn-backs: both diagonals become top/bottom arcs.
        if (kind === 'a') c2d.arc(x + cw / 2, y, cw * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
        else c2d.arc(x + cw / 2, y + ch, cw * 0.32, 1.15 * Math.PI, 1.85 * Math.PI);
      } else if (code === 2) {
        // Vertical turn-backs: left/right arcs.
        if (kind === 'a') c2d.arc(x, y + ch / 2, ch * 0.32, -0.35 * Math.PI, 0.35 * Math.PI);
        else c2d.arc(x + cw, y + ch / 2, ch * 0.32, 0.65 * Math.PI, 1.35 * Math.PI);
      } else if (kind === 'a') {
        c2d.moveTo(x + cw * 0.08, y + ch * 0.08);
        c2d.lineTo(x + cw * 0.92, y + ch * 0.92);
      } else {
        c2d.moveTo(x + cw * 0.08, y + ch * 0.92);
        c2d.lineTo(x + cw * 0.92, y + ch * 0.08);
      }
      c2d.stroke();
      c2d.setLineDash([]);
    }

    // Weave: for each cell, the "under" diagonal first (checkerboard picks
    // which), then the "over" one — outline+fill per diagonal so the over
    // strap visually severs the under strap at the crossing.
    for (let iy = 0; iy < cellsY; iy++) {
      for (let ix = 0; ix < cellsX; ix++) {
        const overA = (ix + iy) % 2 === 0;
        const order = overA ? ['b', 'a'] : ['a', 'b'];
        for (const kind of order) {
          seg(ix, iy, kind, 0);
          seg(ix, iy, kind, 1);
        }
        seg(ix, iy, order[1], 2);
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      breaks = null;
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      breaks = null;
    },
  };
}
```

Register in the ornamental block next to `girih`:

```js
  'celtic-knot': { renderer: 'canvas2d', group: 'ornamental', loader: () => import('./celtic-knot.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/celtic-knot.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): celtic-knot — woven strapwork plait ($CELTIC)"
bd close $CELTIC
```

---

### Task 6: Preset `paisley`

**Files:**
- Create: `src/presets/paisley.js`
- Modify: `src/presets/index.js` (ornamental block, next to `celtic-knot`), `test/style-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `paisley` (canvas2d, ornamental).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js` PRESETS: append `'paisley'`.
`test/time-rule.spec.js` PRESETS: append `'paisley'`.
`test/groups-unit.mjs` STYLE_WAVE map: add `paisley: 'ornamental',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `paisley` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/paisley.js`:

```js
// paisley — boteh block print. A half-drop grid of teardrop motifs, each
// stamped with the outline layer and a fill layer that sits slightly
// off-register (per-stamp seeded offset plus a whisper of press drift from
// t — pure function, stable stills). Inside each boteh: a dotted arc row and
// a sprout of fronds. primary = ink outline, accent = fill, info = details.
// density = grid fineness, intensity = fill opacity.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let stamps = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 5);
    const s = Math.min(w, h);
    const cell = Math.max(60, s * (0.34 - params.density * 0.16));
    stamps = [];
    for (let iy = -1; iy * cell * 0.9 < h + cell; iy++) {
      for (let ix = -1; ix * cell < w + cell; ix++) {
        stamps.push({
          x: ix * cell + (iy % 2 ? cell / 2 : 0), // half-drop
          y: iy * cell * 0.9,
          size: cell * (0.32 + rand() * 0.08),
          rot: -0.5 + rand() * 0.35,
          misX: (rand() - 0.5) * 4,
          misY: (rand() - 0.5) * 4,
          phase: rand() * Math.PI * 2,
        });
      }
    }
    lastKey = `${params.seed}|${params.density}|${w}x${h}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${w}x${h}`;
    if (!stamps.length || key !== lastKey) rebuild(params);
  }

  // The boteh path: a teardrop whose tip curls over. Drawn in unit space,
  // scaled by size; callers set transform first.
  function botehPath(r) {
    c2d.beginPath();
    c2d.moveTo(0, r);
    c2d.bezierCurveTo(-r * 1.05, r * 0.55, -r * 0.85, -r * 0.75, 0, -r);
    c2d.bezierCurveTo(r * 0.55, -r * 1.15, r * 0.95, -r * 0.7, r * 0.45, -r * 0.5);
    c2d.bezierCurveTo(r * 0.95, -r * 0.1, r * 0.75, r * 0.65, 0, r);
    c2d.closePath();
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const ink = rgbCss(c.primary);
    const fill = rgbaCss(c.accent, 0.25 + params.intensity * 0.5);
    const detail = rgbCss(c.info);

    for (const st of stamps) {
      c2d.save();
      c2d.translate(st.x, st.y);
      c2d.rotate(st.rot);
      const r = st.size;
      // Fill layer, off-register: seeded offset + gentle press drift.
      c2d.save();
      c2d.translate(st.misX * px + Math.sin(t * 0.2 + st.phase) * 0.8 * px, st.misY * px);
      botehPath(r);
      c2d.fillStyle = fill;
      c2d.fill();
      c2d.restore();
      // Ink outline layer.
      botehPath(r);
      c2d.strokeStyle = ink;
      c2d.lineWidth = 2 * px;
      c2d.stroke();
      // Interior: dotted arc row following the belly.
      c2d.fillStyle = detail;
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * 0.6 + (k / 6) * Math.PI * 0.9;
        c2d.beginPath();
        c2d.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 1.6 * px, 0, Math.PI * 2);
        c2d.fill();
      }
      // A three-frond sprout from the base.
      c2d.strokeStyle = detail;
      c2d.lineWidth = 1.2 * px;
      for (let k = -1; k <= 1; k++) {
        c2d.beginPath();
        c2d.moveTo(0, r * 0.55);
        c2d.quadraticCurveTo(k * r * 0.25, r * 0.85, k * r * 0.4, r * 1.05);
        c2d.stroke();
      }
      c2d.restore();
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      stamps = [];
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      stamps = [];
    },
  };
}
```

Register next to `celtic-knot`:

```js
  paisley: { renderer: 'canvas2d', group: 'ornamental', loader: () => import('./paisley.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/paisley.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): paisley — off-register boteh block print ($PAISLEY)"
bd close $PAISLEY
```

---

### Task 7: Preset `azulejo`

**Files:**
- Create: `src/presets/azulejo.js`
- Modify: `src/presets/index.js` (ornamental block, next to `paisley`), `test/style-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers plus `mix` from `src/presets/_dots.js`.
- Produces: registry key `azulejo` (canvas2d, ornamental).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js` PRESETS: append `'azulejo'`.
`test/time-rule.spec.js` PRESETS: append `'azulejo'`.
`test/groups-unit.mjs` STYLE_WAVE map: add `azulejo: 'ornamental',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `azulejo` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/azulejo.js`:

```js
// azulejo — glazed tile wall. A grid of quadrant-symmetric tiles: each tile
// draws one motif quarter (petal, star-arm, or corner-arc — seeded per tile
// from a small family) reflected into all four quadrants, in cobalt primary
// on a light tile ground with thin grout lines. Every seventh-ish tile flips
// to the accent variant. A soft glaze sheen sweeps the wall with t (pure
// function of t). density = tile fineness, intensity = motif ink weight.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let tiles = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 9);
    const s = Math.min(w, h);
    const size = Math.max(48, s * (0.3 - params.density * 0.16));
    tiles = [];
    for (let iy = 0; iy * size < h + size; iy++) {
      for (let ix = 0; ix * size < w + size; ix++) {
        tiles.push({
          x: ix * size,
          y: iy * size,
          size,
          kind: (rand() * 3) | 0, // petal / star / corner-arc family
          accent: rand() < 0.14,
        });
      }
    }
    lastKey = `${params.seed}|${params.density}|${w}x${h}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${w}x${h}`;
    if (!tiles.length || key !== lastKey) rebuild(params);
  }

  // One motif quarter drawn in the unit quadrant (0..1); the caller mirrors it.
  function quarter(kind, q, lw) {
    c2d.lineWidth = lw;
    c2d.beginPath();
    if (kind === 0) {
      // Petal reaching from the corner to the center.
      c2d.moveTo(q, q);
      c2d.quadraticCurveTo(q * 0.15, q * 0.75, 0, 0);
      c2d.quadraticCurveTo(q * 0.75, q * 0.15, q, q);
      c2d.closePath();
      c2d.fill();
      c2d.stroke();
    } else if (kind === 1) {
      // Star arm: a slim triangle plus a center dot.
      c2d.moveTo(0, 0);
      c2d.lineTo(q * 0.8, q * 0.18);
      c2d.lineTo(q * 0.35, q * 0.35);
      c2d.closePath();
      c2d.fill();
      c2d.beginPath();
      c2d.arc(0, 0, q * 0.1, 0, Math.PI * 2);
      c2d.fill();
    } else {
      // Corner arc with a bud.
      c2d.arc(q, q, q * 0.55, Math.PI, Math.PI * 1.5);
      c2d.stroke();
      c2d.beginPath();
      c2d.arc(q * 0.45, q * 0.45, q * 0.09, 0, Math.PI * 2);
      c2d.fill();
    }
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const ground = rgbCss(mix(c.bg, c.fg, 0.04)); // barely-off tile white
    const grout = rgbaCss(c.fg, 0.25);
    const lw = (1.4 + params.intensity * 1.6) * px;

    for (const tl of tiles) {
      const q = tl.size / 2;
      const col = tl.accent ? c.accent : c.primary;
      c2d.fillStyle = ground;
      c2d.fillRect(tl.x, tl.y, tl.size, tl.size);
      c2d.strokeStyle = grout;
      c2d.lineWidth = 1 * px;
      c2d.strokeRect(tl.x, tl.y, tl.size, tl.size);
      c2d.fillStyle = rgbaCss(col, 0.85);
      c2d.strokeStyle = rgbCss(col);
      // Mirror the quarter into all four quadrants.
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        c2d.save();
        c2d.translate(tl.x + q, tl.y + q);
        c2d.scale(sx, sy);
        quarter(tl.kind, q * 0.92, lw);
        c2d.restore();
      }
    }

    // Glaze sheen: a soft diagonal light band sweeping slowly.
    const sweep = ((t * 0.04) % 1.4) - 0.2;
    const grad = c2d.createLinearGradient(w * (sweep - 0.15), 0, w * (sweep + 0.15), h * 0.4);
    const sheen = mix(c.bg, [1, 1, 1], 0.5);
    grad.addColorStop(0, rgbaCss(sheen, 0));
    grad.addColorStop(0.5, rgbaCss(sheen, 0.12));
    grad.addColorStop(1, rgbaCss(sheen, 0));
    c2d.fillStyle = grad;
    c2d.fillRect(0, 0, w, h);
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      tiles = [];
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      tiles = [];
    },
  };
}
```

Register next to `paisley`:

```js
  azulejo: { renderer: 'canvas2d', group: 'ornamental', loader: () => import('./azulejo.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/azulejo.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): azulejo — quadrant-symmetric glazed tiles ($AZULEJO)"
bd close $AZULEJO
```

---

### Task 8: Preset `mudcloth`

**Files:**
- Create: `src/presets/mudcloth.js`
- Modify: `src/presets/index.js` (ornamental block, next to `azulejo`), `test/style-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `mudcloth` (canvas2d, ornamental).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js` PRESETS: append `'mudcloth'`.
`test/time-rule.spec.js` PRESETS: append `'mudcloth'`.
`test/groups-unit.mjs` STYLE_WAVE map: add `mudcloth: 'ornamental',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `mudcloth` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/mudcloth.js`:

```js
// mudcloth — bogolanfini bands. Horizontal strips, each filled with one
// hand-drawn symbol row (zigzag, dot rows, ticks, diamonds, crosses); every
// stroke carries seeded jitter so nothing is ruler-straight. The cloth
// scrolls slowly — row content derives from the absolute row index, so the
// scroll is an exact function of t and stills are stable. fg symbols on the
// theme bg; density = band count, intensity = stroke weight.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

const KINDS = 5; // zigzag, dots, ticks, diamonds, crosses

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;

  // Deterministic per-row values derived from seed + absolute row index.
  function rowRand(seed, row) {
    return mulberry32(((seed | 0 || 7) * 2654435761) ^ (row * 40503));
  }

  function frame(t, params) {
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const bands = 6 + Math.round(params.density * 8);
    const bandH = h / bands;
    const ink = rgbaCss(c.fg, 0.92);
    const lw = (1.6 + params.intensity * 2.2) * px;
    const scroll = t * bandH * 0.12; // slow upward drift, pure in t
    const firstRow = Math.floor(scroll / bandH);
    c2d.strokeStyle = ink;
    c2d.fillStyle = ink;
    c2d.lineWidth = lw;
    c2d.lineCap = 'round';

    for (let r = firstRow; r <= firstRow + bands + 1; r++) {
      const y0 = r * bandH - scroll;
      const rand = rowRand(params.seed, r);
      const kind = (rand() * KINDS) | 0;
      const jit = () => (rand() - 0.5) * 2.4 * px;
      const midY = y0 + bandH / 2;
      const step = bandH * (0.8 + rand() * 0.5);

      // Band separator line, hand-wavering.
      c2d.beginPath();
      for (let x = 0; x <= w; x += 14 * px) {
        const yy = y0 + jit() * 0.6;
        if (x === 0) c2d.moveTo(x, yy);
        else c2d.lineTo(x, yy);
      }
      c2d.stroke();

      for (let x = step / 2; x < w + step; x += step) {
        if (kind === 0) {
          // zigzag
          c2d.beginPath();
          c2d.moveTo(x - step / 2 + jit(), midY + bandH * 0.22 + jit());
          c2d.lineTo(x + jit(), midY - bandH * 0.22 + jit());
          c2d.lineTo(x + step / 2 + jit(), midY + bandH * 0.22 + jit());
          c2d.stroke();
        } else if (kind === 1) {
          // dot pair
          for (const dy of [-0.15, 0.15]) {
            c2d.beginPath();
            c2d.arc(x + jit(), midY + bandH * dy + jit(), lw * 0.9, 0, Math.PI * 2);
            c2d.fill();
          }
        } else if (kind === 2) {
          // tick fence
          c2d.beginPath();
          c2d.moveTo(x + jit(), midY - bandH * 0.24 + jit());
          c2d.lineTo(x + jit(), midY + bandH * 0.24 + jit());
          c2d.stroke();
        } else if (kind === 3) {
          // hollow diamond
          c2d.beginPath();
          c2d.moveTo(x + jit(), midY - bandH * 0.24 + jit());
          c2d.lineTo(x + step * 0.22 + jit(), midY + jit());
          c2d.lineTo(x + jit(), midY + bandH * 0.24 + jit());
          c2d.lineTo(x - step * 0.22 + jit(), midY + jit());
          c2d.closePath();
          c2d.stroke();
        } else {
          // cross
          c2d.beginPath();
          c2d.moveTo(x - step * 0.16 + jit(), midY - bandH * 0.18 + jit());
          c2d.lineTo(x + step * 0.16 + jit(), midY + bandH * 0.18 + jit());
          c2d.moveTo(x + step * 0.16 + jit(), midY - bandH * 0.18 + jit());
          c2d.lineTo(x - step * 0.16 + jit(), midY + bandH * 0.18 + jit());
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
      frame(0, params);
    },
    dispose() {},
  };
}
```

Register next to `azulejo`:

```js
  mudcloth: { renderer: 'canvas2d', group: 'ornamental', loader: () => import('./mudcloth.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/mudcloth.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): mudcloth — hand-jittered bogolanfini bands ($MUDCLOTH)"
bd close $MUDCLOTH
```

---

### Task 9: Preset `terrazzo`

**Files:**
- Create: `src/presets/terrazzo.js`
- Modify: `src/presets/index.js` (texture block, next to `stipple`), `test/style-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers plus `mix` from `src/presets/_dots.js`.
- Produces: registry key `terrazzo` (canvas2d, texture).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js` PRESETS: append `'terrazzo'`.
`test/time-rule.spec.js` PRESETS: append `'terrazzo'`.
`test/groups-unit.mjs` STYLE_WAVE map: add `terrazzo: 'texture',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `terrazzo` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/terrazzo.js`:

```js
// terrazzo — stone-chip speckle. Seeded convex chips (3–6-gons) in softened
// theme tints scattered dense over the ground, big flakes with a scatter of
// fines between; a faint polish sheen sweeps with t (pure function of t).
// density = chip count, intensity = tint strength.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let chips = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 3);
    const n = Math.floor(90 + params.density * 260);
    chips = [];
    for (let i = 0; i < n; i++) {
      const sides = 3 + ((rand() * 4) | 0);
      const base = i < n * 0.25 ? 0.02 + rand() * 0.025 : 0.004 + rand() * 0.01; // big flakes + fines
      const verts = [];
      for (let v = 0; v < sides; v++) {
        const a = (v / sides) * Math.PI * 2 + rand() * 0.5;
        verts.push([Math.cos(a) * base * (0.7 + rand() * 0.5), Math.sin(a) * base * (0.7 + rand() * 0.5)]);
      }
      chips.push({ x: rand(), y: rand(), rot: rand() * Math.PI, verts, ci: (rand() * 4) | 0 });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!chips.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const soften = 0.45 - params.intensity * 0.3;
    const pal = [c.primary, c.accent, c.info, c.fg].map((col) => mix(col, c.bg, soften));

    for (const ch of chips) {
      const col = pal[ch.ci % pal.length];
      c2d.save();
      c2d.translate(ch.x * w, ch.y * h);
      c2d.rotate(ch.rot);
      c2d.beginPath();
      ch.verts.forEach(([vx, vy], i) => {
        if (i === 0) c2d.moveTo(vx * s, vy * s);
        else c2d.lineTo(vx * s, vy * s);
      });
      c2d.closePath();
      c2d.fillStyle = rgbCss(col);
      c2d.fill();
      c2d.strokeStyle = rgbCss(mix(col, c.fg, 0.25));
      c2d.lineWidth = 0.8 * px;
      c2d.stroke();
      c2d.restore();
    }

    // Polish sheen, drifting diagonally.
    const sweep = ((t * 0.03) % 1.4) - 0.2;
    const grad = c2d.createLinearGradient(w * (sweep - 0.2), 0, w * (sweep + 0.2), h * 0.5);
    const sheen = mix(c.bg, [1, 1, 1], 0.45);
    grad.addColorStop(0, rgbaCss(sheen, 0));
    grad.addColorStop(0.5, rgbaCss(sheen, 0.08));
    grad.addColorStop(1, rgbaCss(sheen, 0));
    c2d.fillStyle = grad;
    c2d.fillRect(0, 0, w, h);
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
      chips = [];
    },
  };
}
```

Register in the texture block next to `stipple`:

```js
  terrazzo: { renderer: 'canvas2d', group: 'texture', loader: () => import('./terrazzo.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/terrazzo.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): terrazzo — seeded stone-chip speckle ($TERRAZZO)"
bd close $TERRAZZO
```

---

### Task 10: Preset `cyanotype`

**Files:**
- Create: `src/presets/cyanotype.js`
- Modify: `src/presets/index.js` (print block, next to `risograph`), `test/style-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers plus `mix` from `src/presets/_dots.js`.
- Produces: registry key `cyanotype` (canvas2d, print).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js` PRESETS: append `'cyanotype'`.
`test/time-rule.spec.js` PRESETS: append `'cyanotype'`.
`test/groups-unit.mjs` STYLE_WAVE map: add `cyanotype: 'print',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `cyanotype` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/cyanotype.js`:

```js
// cyanotype — botanical sun prints. Seeded fern/sprig/seed-head silhouettes
// exposed white-on-Prussian-blue, each with a soft exposure halo, over a
// paper-edge vignette. DESIGN NOTE: the ground is deliberately the theme
// primary pulled hard toward Prussian blue — a cyanotype IS blue; the theme
// still tints it (documented deviation, like fireflies' dusk treatment).
// The exposure halo breathes with t (pure function). density = specimen
// count, intensity = exposure strength.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PRUSSIAN = [0.05, 0.15, 0.35];

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let plants = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 11);
    const n = 2 + Math.round(params.density * 5); // 2..7 specimens
    plants = [];
    for (let i = 0; i < n; i++) {
      plants.push({
        x: 0.12 + rand() * 0.76,
        y: 0.2 + rand() * 0.7,
        len: 0.18 + rand() * 0.22,
        lean: -0.4 + rand() * 0.8,
        kind: (rand() * 3) | 0, // fern / sprig / seed-head
        leaflets: 7 + ((rand() * 6) | 0),
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!plants.length || key !== lastKey) rebuild(params);
  }

  function drawPlant(p, s, whiteCss) {
    const L = p.len * s;
    const a = -Math.PI / 2 + p.lean;
    const tipX = Math.cos(a) * L;
    const tipY = Math.sin(a) * L;
    // Stem.
    c2d.strokeStyle = whiteCss;
    c2d.beginPath();
    c2d.moveTo(0, 0);
    c2d.quadraticCurveTo(tipX * 0.4, tipY * 0.65, tipX, tipY);
    c2d.stroke();
    if (p.kind === 2) {
      // Seed-head: a burst of rays and dots at the tip.
      for (let k = 0; k < 12; k++) {
        const ra = (k / 12) * Math.PI * 2;
        c2d.beginPath();
        c2d.moveTo(tipX, tipY);
        c2d.lineTo(tipX + Math.cos(ra) * L * 0.22, tipY + Math.sin(ra) * L * 0.22);
        c2d.stroke();
        c2d.beginPath();
        c2d.arc(tipX + Math.cos(ra) * L * 0.26, tipY + Math.sin(ra) * L * 0.26, 1.6, 0, Math.PI * 2);
        c2d.fillStyle = whiteCss;
        c2d.fill();
      }
      return;
    }
    // Fern / sprig leaflets along the stem, mirrored pairs, shrinking to the tip.
    for (let k = 1; k <= p.leaflets; k++) {
      const u = k / (p.leaflets + 1);
      const bx = tipX * u;
      const by = tipY * u * (1 - 0.15 * u);
      const ll = L * (p.kind === 0 ? 0.22 : 0.13) * (1 - u * 0.75);
      for (const side of [-1, 1]) {
        const la = a + side * (p.kind === 0 ? 1.15 : 0.8);
        c2d.beginPath();
        c2d.moveTo(bx, by);
        c2d.quadraticCurveTo(
          bx + Math.cos(la) * ll * 0.6,
          by + Math.sin(la) * ll * 0.6,
          bx + Math.cos(la + side * 0.25) * ll,
          by + Math.sin(la + side * 0.25) * ll
        );
        c2d.stroke();
      }
    }
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const ground = mix(c.primary, PRUSSIAN, 0.72);
    clearAndFill(c2d, w, h, [...ground, 1]);
    const s = Math.min(w, h);
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.3);
    c2d.lineCap = 'round';

    for (const p of plants) {
      c2d.save();
      c2d.translate(p.x * w, p.y * h);
      // Exposure halo: three widening low-alpha passes under the crisp pass.
      for (const [lw, alpha] of [
        [9 * px, 0.06 * params.intensity * breathe],
        [5 * px, 0.12 * params.intensity * breathe],
        [1.6 * px, 0.9],
      ]) {
        c2d.lineWidth = lw;
        drawPlant(p, s, rgbaCss(c.fg, alpha));
      }
      c2d.restore();
    }

    // Paper-edge vignette: darkened ground at every edge.
    const edge = rgbaCss(mix(ground, [0, 0, 0], 0.5), 0.35);
    for (const [x0, y0, x1, y1] of [
      [0, 0, 0, h],
      [w, 0, w, h],
      [0, 0, w, 0],
      [0, h, w, h],
    ]) {
      const g = c2d.createLinearGradient(x0, y0, x0 === x1 ? x0 + (x0 === 0 ? s * 0.08 : -s * 0.08) : x0, y0 === y1 ? y0 + (y0 === 0 ? s * 0.08 : -s * 0.08) : y0);
      g.addColorStop(0, edge);
      g.addColorStop(1, rgbaCss(ground, 0));
      c2d.fillStyle = g;
      c2d.fillRect(0, 0, w, h);
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
      plants = [];
    },
  };
}
```

Register in the print block next to `risograph`:

```js
  cyanotype: { renderer: 'canvas2d', group: 'print', loader: () => import('./cyanotype.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/cyanotype.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): cyanotype — botanical sun prints ($CYANO)"
bd close $CYANO
```

---

### Task 11: Preset `screenprint`

**Files:**
- Create: `src/presets/screenprint.js`
- Modify: `src/presets/index.js` (print block, next to `cyanotype`), `test/style-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `screenprint` (canvas2d, print).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js` PRESETS: append `'screenprint'`.
`test/time-rule.spec.js` PRESETS: append `'screenprint'`.
`test/groups-unit.mjs` STYLE_WAVE map: add `screenprint: 'print',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `screenprint` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/screenprint.js`:

```js
// screenprint — off-register pulls. A seeded grid of bold motifs (star, ring,
// blob), each stamped three times in primary/accent/info with per-stamp
// registration error; layers darken where they overlap (multiply), and the
// last layer prints through a coarse halftone screen. The press drifts a
// hair with t (pure function of t). density = motif grid, intensity =
// misregistration.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let motifs = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 13);
    const s = Math.min(w, h);
    const cell = Math.max(90, s * (0.5 - params.density * 0.24));
    motifs = [];
    for (let iy = 0; iy * cell < h + cell; iy++) {
      for (let ix = 0; ix * cell < w + cell; ix++) {
        motifs.push({
          x: ix * cell + cell / 2,
          y: iy * cell + cell / 2,
          r: cell * (0.26 + rand() * 0.1),
          kind: (rand() * 3) | 0,
          rot: rand() * Math.PI,
          mis: [
            [(rand() - 0.5) * 10, (rand() - 0.5) * 10],
            [(rand() - 0.5) * 10, (rand() - 0.5) * 10],
            [(rand() - 0.5) * 10, (rand() - 0.5) * 10],
          ],
          phase: rand() * Math.PI * 2,
        });
      }
    }
    lastKey = `${params.seed}|${params.density}|${w}x${h}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${w}x${h}`;
    if (!motifs.length || key !== lastKey) rebuild(params);
  }

  function motifPath(kind, r, rot) {
    c2d.beginPath();
    if (kind === 0) {
      // five-point star
      for (let k = 0; k < 10; k++) {
        const rad = k % 2 ? r * 0.45 : r;
        const a = rot + (k / 10) * Math.PI * 2 - Math.PI / 2;
        if (k === 0) c2d.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
        else c2d.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      c2d.closePath();
    } else if (kind === 1) {
      // fat ring
      c2d.arc(0, 0, r, 0, Math.PI * 2);
      c2d.arc(0, 0, r * 0.55, 0, Math.PI * 2, true);
    } else {
      // soft blob: four-lobe bezier
      c2d.moveTo(0, -r);
      c2d.bezierCurveTo(r * 1.1, -r * 0.9, r * 0.9, r * 1.1, 0, r * 0.9);
      c2d.bezierCurveTo(-r * 1.2, r * 0.8, -r * 0.8, -r, 0, -r);
      c2d.closePath();
    }
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const inks = [c.primary, c.accent, c.info];
    const mis = 0.4 + params.intensity;

    for (const m of motifs) {
      for (let layer = 0; layer < 3; layer++) {
        const drift = Math.sin(t * 0.25 + m.phase + layer) * 1.2 * px;
        c2d.save();
        c2d.translate(
          m.x + m.mis[layer][0] * mis * px + drift,
          m.y + m.mis[layer][1] * mis * px
        );
        c2d.globalCompositeOperation = 'multiply';
        c2d.fillStyle = rgbaCss(inks[layer], 0.8);
        if (layer === 2) {
          // Halftone pull: clip to the motif and print a dot screen.
          motifPath(m.kind, m.r, m.rot);
          c2d.clip();
          const dot = 5 * px;
          for (let yy = -m.r; yy <= m.r; yy += dot * 2) {
            for (let xx = -m.r; xx <= m.r; xx += dot * 2) {
              c2d.beginPath();
              c2d.arc(xx + ((yy / (dot * 2)) % 2 ? dot : 0), yy, dot * 0.6, 0, Math.PI * 2);
              c2d.fill();
            }
          }
        } else {
          motifPath(m.kind, m.r, m.rot);
          c2d.fill();
        }
        c2d.restore();
      }
    }
    c2d.globalCompositeOperation = 'source-over';
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      motifs = [];
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      motifs = [];
    },
  };
}
```

Register next to `cyanotype`:

```js
  screenprint: { renderer: 'canvas2d', group: 'print', loader: () => import('./screenprint.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/screenprint.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): screenprint — off-register halftone pulls ($SCREEN)"
bd close $SCREEN
```

---

### Task 12: Preset `transit-diagram`

**Files:**
- Create: `src/presets/transit-diagram.js`
- Modify: `src/presets/index.js` (dataviz block, next to `vectormap`), `test/style-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `'transit-diagram'` (canvas2d, dataviz).

- [ ] **Step 1: Extend the failing tests**

`test/style-wave.spec.js` PRESETS: append `'transit-diagram'` (final list is all 12).
`test/time-rule.spec.js` PRESETS: append `'transit-diagram'`.
`test/groups-unit.mjs` STYLE_WAVE map: add `'transit-diagram': 'dataviz',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `transit-diagram` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/transit-diagram.js`:

```js
// transit-diagram — the Beck/Vignelli map. Seeded routes walk the canvas in
// 0/45/90-degree grid-snapped segments; stations tick every other vertex,
// interchanges ring the shared ones, and little trains run each line —
// train position is (t * v + phase) mod route length, a pure function of t.
// Route colors cycle primary/accent/info/success/warning; fg for stations
// and the faint graticule. density = route count, intensity = line weight.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

const DIRS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let routes = [];
  let interchanges = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 15);
    const grid = 10 + Math.round((1 - params.density) * 6); // grid cells across
    const nRoutes = 3 + Math.round(params.density * 3); // 3..6 lines
    routes = [];
    const visits = new Map(); // "gx,gy" -> count across routes
    for (let i = 0; i < nRoutes; i++) {
      let gx = (rand() * grid) | 0;
      let gy = 0;
      let dir = 2; // heading down-ish
      const pts = [[gx, gy]];
      for (let s = 0; s < grid * 2; s++) {
        // Beck rule: turn at most 45 degrees at a time.
        const turn = rand() < 0.4 ? (rand() < 0.5 ? -1 : 1) : 0;
        dir = (dir + turn + 8) % 8;
        const run = 1 + ((rand() * 3) | 0);
        gx = Math.max(0, Math.min(grid, gx + DIRS[dir][0] * run));
        gy = Math.max(0, Math.min(grid, gy + DIRS[dir][1] * run));
        const key = `${gx},${gy}`;
        visits.set(key, (visits.get(key) || 0) + 1);
        pts.push([gx, gy]);
        if (gy >= grid) break;
      }
      routes.push({ pts, grid, speed: 0.05 + rand() * 0.05, phase: rand() });
    }
    interchanges = [...visits.entries()].filter(([, n]) => n > 1).map(([k]) => k.split(',').map(Number));
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!routes.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.info, c.success, c.warning];
    const lw = (4 + params.intensity * 4) * px;
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';

    // Faint graticule.
    c2d.strokeStyle = rgbaCss(c.fg, 0.07);
    c2d.lineWidth = 1 * px;
    const g0 = routes[0].grid;
    for (let i = 0; i <= g0; i++) {
      c2d.beginPath();
      c2d.moveTo((i / g0) * w, 0);
      c2d.lineTo((i / g0) * w, h);
      c2d.stroke();
      c2d.beginPath();
      c2d.moveTo(0, (i / g0) * h);
      c2d.lineTo(w, (i / g0) * h);
      c2d.stroke();
    }

    const toXY = (grid) => ([gx, gy]) => [(gx / grid) * w * 0.92 + w * 0.04, (gy / grid) * h * 0.92 + h * 0.04];

    routes.forEach((r, i) => {
      const map = toXY(r.grid);
      const col = pal[i % pal.length];
      c2d.strokeStyle = rgbCss(col);
      c2d.lineWidth = lw;
      c2d.beginPath();
      r.pts.forEach((p, k) => {
        const [x, y] = map(p);
        if (k === 0) c2d.moveTo(x, y);
        else c2d.lineTo(x, y);
      });
      c2d.stroke();

      // Station ticks every other vertex.
      c2d.fillStyle = rgbCss(c.bg);
      c2d.strokeStyle = rgbaCss(c.fg, 0.9);
      c2d.lineWidth = 1.6 * px;
      r.pts.forEach((p, k) => {
        if (k % 2 === 0) return;
        const [x, y] = map(p);
        c2d.beginPath();
        c2d.arc(x, y, lw * 0.45, 0, Math.PI * 2);
        c2d.fill();
        c2d.stroke();
      });

      // The train: distance along the polyline, pure in t.
      const lens = [];
      let total = 0;
      for (let k = 1; k < r.pts.length; k++) {
        const [ax, ay] = map(r.pts[k - 1]);
        const [bx, by] = map(r.pts[k]);
        const L = Math.hypot(bx - ax, by - ay);
        lens.push(L);
        total += L;
      }
      if (total > 0) {
        let d = ((t * r.speed + r.phase) % 1) * total;
        for (let k = 0; k < lens.length; k++) {
          if (d <= lens[k]) {
            const [ax, ay] = map(r.pts[k]);
            const [bx, by] = map(r.pts[k + 1]);
            const u = lens[k] ? d / lens[k] : 0;
            c2d.fillStyle = rgbCss(c.fg);
            c2d.beginPath();
            c2d.arc(ax + (bx - ax) * u, ay + (by - ay) * u, lw * 0.55, 0, Math.PI * 2);
            c2d.fill();
            break;
          }
          d -= lens[k];
        }
      }
    });

    // Interchange rings.
    const map0 = toXY(routes[0].grid);
    c2d.strokeStyle = rgbaCss(c.fg, 0.9);
    c2d.lineWidth = 2 * px;
    c2d.fillStyle = rgbCss(c.bg);
    for (const p of interchanges) {
      const [x, y] = map0(p);
      c2d.beginPath();
      c2d.arc(x, y, lw * 0.8, 0, Math.PI * 2);
      c2d.fill();
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
      routes = [];
      interchanges = [];
    },
  };
}
```

Register in the dataviz block next to `vectormap`:

```js
  'transit-diagram': { renderer: 'canvas2d', group: 'dataviz', loader: () => import('./transit-diagram.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/style-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (12/12 style-wave, 17 time-rule entries).

- [ ] **Step 5: Commit**

```bash
git add src/presets/transit-diagram.js src/presets/index.js test/style-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): transit-diagram — Beck map with running trains ($TRANSIT)"
bd close $TRANSIT
```

---

### Task 13: API reference rows for the twelve presets

**Files:**
- Modify: `docs/api.html` (six group tables; single-line `<tr>` row style matching the `lanterns`/`matrix` rows)

**Interfaces:**
- Consumes: the registered names from Tasks 1–12.
- Produces: 162/162 catalog coverage.

- [ ] **Step 1: Add the rows**

Insert each row in its group's table in registry order (match neighboring markup/indentation exactly):

Classic presets table:

```html
            <tr><td><code>art-nouveau</code></td><td>Whiplash-curve vines with leaves and buds inside a double frame; tendril tips sway</td><td>primary, accent, foreground, background</td></tr>
            <tr><td><code>constructivism</code></td><td>Lissitzky field &mdash; a dominant diagonal wedge and floating planes drifting on a rotated axis</td><td>primary, accent, info, foreground, background</td></tr>
```

WebGL shader presets table (alphabetical position near `plasma`):

```html
            <tr><td><code>psychedelia</code></td><td>Liquid 1960s poster warp &mdash; melting concentric bands cycling three colors at full saturation</td><td>primary, accent, info, background</td></tr>
```

Canvas2D pattern & geometric presets table (or the table holding the `art` group rows, matching where `watercolor`/`drip` live):

```html
            <tr><td><code>brushstroke</code></td><td>Impasto flow field &mdash; directional ribbon strokes with painted highlights swirling around seeded centers</td><td>primary, accent, info, background</td></tr>
```

Ornamental presets table:

```html
            <tr><td><code>celtic-knot</code></td><td>Interlaced strapwork plait with seeded turn-backs and a sliding glint</td><td>primary, accent, foreground, background</td></tr>
            <tr><td><code>paisley</code></td><td>Half-drop boteh block print, fill layer deliberately off-register</td><td>primary, accent, info, background</td></tr>
            <tr><td><code>azulejo</code></td><td>Quadrant-symmetric glazed tiles with grout lines and a sweeping sheen</td><td>primary, accent, foreground, background</td></tr>
            <tr><td><code>mudcloth</code></td><td>Bogolanfini symbol bands, every stroke hand-jittered, slowly scrolling</td><td>foreground, background</td></tr>
```

Texture presets table:

```html
            <tr><td><code>terrazzo</code></td><td>Seeded stone-chip speckle in softened theme tints under a polish sheen</td><td>primary, accent, info, foreground, background</td></tr>
```

Print presets table:

```html
            <tr><td><code>cyanotype</code></td><td>Botanical sun prints &mdash; fern and seed-head silhouettes glowing on Prussian-tinted primary</td><td>primary, foreground</td></tr>
            <tr><td><code>screenprint</code></td><td>Three off-register ink pulls per motif, multiplied where they overlap, one through a halftone screen</td><td>primary, accent, info, background</td></tr>
```

Dataviz presets table:

```html
            <tr><td><code>transit-diagram</code></td><td>Beck-style metro map &mdash; 45&deg; routes, station ticks, interchange rings, trains running the lines</td><td>primary, accent, info, success, warning, foreground, background</td></tr>
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

Expected: `162 registered; 0 missing: []`

- [ ] **Step 3: Commit**

```bash
git add docs/api.html
git commit -m "docs(api): catalog rows for the twelve style-wave presets"
```

---

### Task 14: Container visual baselines for the twelve

**Files:**
- Create: `test/visual.spec.js-snapshots/{art-nouveau,constructivism,psychedelia,brushstroke,celtic-knot,paisley,azulejo,mudcloth,terrazzo,cyanotype,screenprint,transit-diagram}-visual-linux.png`

**Interfaces:**
- Consumes: Docker (OrbStack; `docker info --format ok` must print ok — otherwise `open -a OrbStack` and re-check) + `mcr.microsoft.com/playwright:v1.60.0-jammy`. The visual suite iterates `listPresets()` automatically; all twelve are pure functions of t so they settle at `speed=0`.

- [ ] **Step 1: Generate the baselines (anchored filter — a bare name would substring-match other presets)**

```bash
docker run --rm --ipc=host --platform=linux/amd64 -v "$PWD:/work" -v /work/node_modules \
  -w /work mcr.microsoft.com/playwright:v1.60.0-jammy \
  bash -lc "npm ci --no-audit --no-fund >/dev/null 2>&1 && npx playwright test --project=visual --update-snapshots -g '(^| )(art-nouveau|constructivism|psychedelia|brushstroke|celtic-knot|paisley|azulejo|mudcloth|terrazzo|cyanotype|screenprint|transit-diagram)$'"
```

Expected: 12 pass, 12 `writing actual` lines. Then `git status --porcelain test/visual.spec.js-snapshots/` MUST show exactly twelve new files and zero modified; restore anything else with `git checkout -- <file>`.

- [ ] **Step 2: Verify determinism (same command WITHOUT `--update-snapshots`)**

Expected: 12/12 pass. Then Read each of the twelve PNGs and describe it in one line — none may be blank or near-uniform; a blank/uniform one means the preset design needs fixing (report DONE_WITH_CONCERNS naming it rather than shipping a bad baseline).

- [ ] **Step 3: Commit**

```bash
git add test/visual.spec.js-snapshots/
git commit -m "test(visual): baselines for the twelve style-wave presets"
```

---

### Task 15: Demo `belle-epoque.html`

**Files:**
- Create: `demos/belle-epoque.html`
- Modify: `demos/index.html` (append a `.bw-card` tile after the last card, matching neighbors)

**Interfaces:**
- Consumes: presets `art-nouveau`, `brushstroke` (registered in Tasks 1 and 4); the data-background binder.
- Produces: the page + hub tile. Conventions: zero div/class, `target="_top"` crumb, standard script block.

- [ ] **Step 1: Write the page**

Create `demos/belle-epoque.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Belle &Eacute;poque &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Yeseva+One&family=Crimson+Pro:ital,wght@0,300;0,500;1,300&display=swap" rel="stylesheet">
  <style>
    /* Montmartre, 1899. Two rooms: the poster wall (art-nouveau) and the
       night over the hill (brushstroke). Vocabulary elements + binder only. */
    :root {
      --color-background: #f3e6c9;  /* gaslight cream */
      --color-foreground: #33251a;  /* absinthe-bar walnut */
      --color-primary: #6d7f3f;     /* olive vine */
      --color-accent: #c8563b;      /* poppy */
      --color-info: #3f6d7f;        /* peacock */
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: 'Crimson Pro', Georgia, serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    affiche-card {
      display: block; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      max-width: 440px; text-align: center;
      background: rgba(243, 230, 201, 0.88); border: 3px double var(--color-foreground);
      padding: 26px 34px;
    }
    affiche-kicker { display: block; font-size: 12px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 10px; }
    affiche-card h1, affiche-card h2 { font-family: 'Yeseva One', serif; font-weight: 400; margin: 0 0 10px; }
    affiche-card h1 { font-size: clamp(38px, 6vw, 72px); line-height: 1.02; }
    affiche-card h2 { font-size: clamp(28px, 4vw, 46px); }
    affiche-card p { margin: 0; font-weight: 300; line-height: 1.6; font-size: 16px; }
    affiche-card p em { font-style: italic; }
    code { font-family: ui-monospace, monospace; font-size: 0.8em; background: rgba(51, 37, 26, 0.09); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="art-nouveau" data-background-intensity="0.65" data-background-seed="9" data-background-speed="0.6">
    <affiche-card>
      <affiche-kicker>Cabaret des Fleurs &middot; ce soir</affiche-kicker>
      <h1>Belle &Eacute;poque</h1>
      <p><em>The poster wall.</em> Whiplash vines climbing the frame the way Mucha meant them to. <code>data-background="art-nouveau"</code></p>
    </affiche-card>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="brushstroke" data-background-intensity="0.7" data-background-seed="14" data-background-speed="0.5">
    <affiche-card>
      <affiche-kicker>After closing &middot; up the hill</affiche-kicker>
      <h2>The Night, In Oils</h2>
      <p><em>Plein air, past midnight.</em> Every stroke follows the wind around the stars. <code>data-background="brushstroke"</code></p>
    </affiche-card>
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
        <browser-window mode="light" shadow data-demo-src="./belle-epoque.html" title="Belle Époque"
                        url="profpowell.github.io/bg-wc/demos/belle-epoque.html"></browser-window>
        <a class="bw-open" href="./belle-epoque.html" aria-label="Open the Belle Époque demo"></a>
        <div class="meta"><span class="name">Belle Époque</span><span class="desc">nouveau vines, oil-paint night</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "belle-epoque"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/belle-epoque.html demos/index.html
git commit -m "docs(demos): belle-epoque — nouveau poster wall + oil-paint night ($BELLE)"
bd close $BELLE
```

---

### Task 16: Demo `poster-century.html`

**Files:**
- Create: `demos/poster-century.html`
- Modify: `demos/index.html` (append a `.bw-card` tile)

**Interfaces:**
- Consumes: presets `constructivism`, `psychedelia`, `screenprint`.

- [ ] **Step 1: Write the page**

Create `demos/poster-century.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Poster Century &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* Three revolutions in poster design, one scroll: 1920s agitprop, 1967
       Fillmore, and the Factory's screenprints. Era placards ride each wall. */
    :root {
      --color-background: #efe6d4;  /* poster stock */
      --color-foreground: #1d1a17;
      --color-primary: #cf2f25;     /* agitprop red */
      --color-accent: #f2a71b;      /* fillmore orange */
      --color-info: #2762a8;        /* worker blue */
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Inter, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    era-placard {
      display: block; position: absolute; left: clamp(24px, 6vw, 90px); top: 50%; transform: translateY(-50%);
      max-width: 400px; background: var(--color-background);
      border: 4px solid var(--color-foreground); padding: 22px 26px;
      box-shadow: 8px 8px 0 var(--color-foreground);
    }
    era-placard[data-side="right"] { left: auto; right: clamp(24px, 6vw, 90px); }
    era-year { display: block; font-family: 'Archivo Black', sans-serif; font-size: 14px; letter-spacing: 0.3em; color: var(--color-primary); margin-bottom: 8px; }
    era-placard h1, era-placard h2 { font-family: 'Archivo Black', sans-serif; font-weight: 400; margin: 0 0 8px; text-transform: uppercase; }
    era-placard h1 { font-size: clamp(30px, 4.6vw, 54px); line-height: 1; }
    era-placard h2 { font-size: clamp(24px, 3.4vw, 40px); line-height: 1.05; }
    era-placard p { margin: 0; font-weight: 300; line-height: 1.6; font-size: 15px; }
    code { font-family: ui-monospace, monospace; font-size: 0.82em; background: rgba(29, 26, 23, 0.08); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="constructivism" data-background-intensity="0.65" data-background-seed="5" data-background-speed="0.5">
    <era-placard>
      <era-year>1923 &middot; VKhUTEMAS</era-year>
      <h1>Beat the Whites with the Red Wedge</h1>
      <p>A diagonal is an argument. <code>data-background="constructivism"</code></p>
    </era-placard>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="psychedelia" data-background-intensity="0.7" data-background-seed="2" data-background-speed="0.6">
    <era-placard data-side="right">
      <era-year>1967 &middot; The Fillmore</era-year>
      <h2>Can You Read It? Then It Works</h2>
      <p>The bands vibrate on purpose; squint and it sings. <code>data-background="psychedelia"</code></p>
    </era-placard>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="screenprint" data-background-intensity="0.6" data-background-seed="21" data-background-speed="0.5">
    <era-placard>
      <era-year>1964 &middot; The Factory</era-year>
      <h2>Thirty Are Better Than One</h2>
      <p>Off-register is the signature, not the mistake. <code>data-background="screenprint"</code></p>
    </era-placard>
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
        <browser-window mode="light" shadow data-demo-src="./poster-century.html" title="Poster Century"
                        url="profpowell.github.io/bg-wc/demos/poster-century.html"></browser-window>
        <a class="bw-open" href="./poster-century.html" aria-label="Open the Poster Century demo"></a>
        <div class="meta"><span class="name">Poster Century</span><span class="desc">agitprop, Fillmore, Factory</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "poster-century"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/poster-century.html demos/index.html
git commit -m "docs(demos): poster-century — three poster revolutions ($POSTER)"
bd close $POSTER
```

---

### Task 17: Demo `atlas.html`

**Files:**
- Create: `demos/atlas.html`
- Modify: `demos/index.html` (append a `.bw-card` tile)

**Interfaces:**
- Consumes: presets `celtic-knot`, `paisley`, `azulejo`, `mudcloth`, `terrazzo`.

- [ ] **Step 1: Write the page**

Create `demos/atlas.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>An Atlas of Pattern &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,600&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* Five places, five pattern languages. Each stop is a cover section with
       a luggage-tag plaque pinned to a seeded corner via data-at. */
    :root {
      --color-background: #f4efe4;  /* atlas paper */
      --color-foreground: #26221b;
      --color-primary: #315c45;     /* map green */
      --color-accent: #b3502e;      /* route ochre */
      --color-info: #2d5c86;        /* sea blue */
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    atlas-tag {
      display: block; position: absolute; max-width: 380px;
      background: var(--color-background); border: 1.5px solid var(--color-foreground); border-radius: 6px;
      padding: 18px 24px; box-shadow: 0 8px 26px rgba(38, 34, 27, 0.28);
    }
    atlas-tag::before { content: "◦"; position: absolute; top: 8px; right: 12px; color: var(--color-accent); }
    atlas-tag[data-at="tl"] { top: clamp(60px, 9vh, 88px); left: clamp(24px, 5vw, 72px); }
    atlas-tag[data-at="tr"] { top: clamp(60px, 9vh, 88px); right: clamp(24px, 5vw, 72px); }
    atlas-tag[data-at="bl"] { bottom: clamp(24px, 6vh, 64px); left: clamp(24px, 5vw, 72px); }
    atlas-tag[data-at="br"] { bottom: clamp(24px, 6vh, 64px); right: clamp(24px, 5vw, 72px); }
    tag-place { display: block; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 6px; }
    atlas-tag h1, atlas-tag h2 { font-family: Fraunces, Georgia, serif; font-weight: 600; margin: 0 0 6px; font-size: clamp(24px, 3vw, 38px); }
    atlas-tag h1 { font-size: clamp(30px, 4.4vw, 52px); }
    atlas-tag p { margin: 0; font-weight: 300; line-height: 1.6; font-size: 15px; }
    code { font-family: ui-monospace, monospace; font-size: 0.82em; background: rgba(38, 34, 27, 0.08); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="celtic-knot" data-background-intensity="0.6" data-background-seed="12" data-background-speed="0.5">
    <atlas-tag data-at="tl">
      <tag-place>Stop I &middot; Kells, Ireland</tag-place>
      <h1>An Atlas of Pattern</h1>
      <p>Strapwork with no beginning and no end &mdash; follow any ribbon home. <code>data-background="celtic-knot"</code></p>
    </atlas-tag>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="paisley" data-background-intensity="0.6" data-background-seed="7" data-background-speed="0.5">
    <atlas-tag data-at="br">
      <tag-place>Stop II &middot; Kashmir</tag-place>
      <h2>The Boteh</h2>
      <p>A teardrop that has crossed more borders than any flag. <code>data-background="paisley"</code></p>
    </atlas-tag>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="azulejo" data-background-intensity="0.6" data-background-seed="4" data-background-speed="0.5">
    <atlas-tag data-at="tr">
      <tag-place>Stop III &middot; Lisbon</tag-place>
      <h2>Cobalt on White</h2>
      <p>A whole city faced in quartered stars and petals. <code>data-background="azulejo"</code></p>
    </atlas-tag>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="mudcloth" data-background-intensity="0.65" data-background-seed="18" data-background-speed="0.5">
    <atlas-tag data-at="bl">
      <tag-place>Stop IV &middot; Mali</tag-place>
      <h2>Bogolanfini</h2>
      <p>Fermented mud on cotton; every band a sentence, every symbol a word. <code>data-background="mudcloth"</code></p>
    </atlas-tag>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="terrazzo" data-background-intensity="0.6" data-background-seed="25" data-background-speed="0.5">
    <atlas-tag data-at="tr">
      <tag-place>Stop V &middot; Venice</tag-place>
      <h2>Pavimento</h2>
      <p>Marble offcuts, set in lime, polished by four centuries of shoes. <code>data-background="terrazzo"</code></p>
    </atlas-tag>
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
        <browser-window mode="light" shadow data-demo-src="./atlas.html" title="An Atlas of Pattern"
                        url="profpowell.github.io/bg-wc/demos/atlas.html"></browser-window>
        <a class="bw-open" href="./atlas.html" aria-label="Open the An Atlas of Pattern demo"></a>
        <div class="meta"><span class="name">An Atlas of Pattern</span><span class="desc">five places, five patterns</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "atlas"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/atlas.html demos/index.html
git commit -m "docs(demos): atlas — five places, five pattern languages ($ATLAS)"
bd close $ATLAS
```

---

### Task 18: Demo `interchange.html`

**Files:**
- Create: `demos/interchange.html`
- Modify: `demos/index.html` (append a `.bw-card` tile)

**Interfaces:**
- Consumes: preset `transit-diagram`.

- [ ] **Step 1: Write the page**

Create `demos/interchange.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Interchange &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Overpass:wght@300;700;900&display=swap" rel="stylesheet">
  <style>
    /* One viewport: the network map, with a legend board bottom-left. The
       legend is a real list — lines of a metro ARE a list. */
    :root {
      --color-background: #f7f5ef;  /* map paper */
      --color-foreground: #17171c;
      --color-primary: #d02c2c;     /* line A */
      --color-accent: #1d69c4;      /* line B */
      --color-info: #14967d;        /* line C */
      --color-success: #7a3fb0;     /* line D */
      --color-warning: #e0871f;     /* line E */
    }
    html, body { margin: 0; background: var(--color-background); color: var(--color-foreground); overflow: hidden; }
    body { font-family: Overpass, system-ui, sans-serif; height: 100vh; }
    main { position: relative; height: 100%; }

    map-legend {
      display: block; position: absolute; left: clamp(20px, 4vw, 56px); bottom: clamp(20px, 5vh, 48px);
      background: var(--color-background); border: 2px solid var(--color-foreground); border-radius: 8px;
      padding: 16px 22px; box-shadow: 0 8px 30px rgba(23, 23, 28, 0.2);
    }
    map-legend h1 { font-weight: 900; font-size: clamp(22px, 2.6vw, 34px); margin: 0 0 8px; letter-spacing: -0.01em; }
    map-legend p { margin: 0 0 10px; font-weight: 300; font-size: 14px; max-width: 320px; line-height: 1.55; }
    map-legend ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 5px; }
    map-legend li { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; padding-left: 26px; position: relative; }
    map-legend li::before { content: ""; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 18px; height: 6px; border-radius: 3px; background: var(--color-foreground); }
    li[data-line="a"]::before { background: var(--color-primary); }
    li[data-line="b"]::before { background: var(--color-accent); }
    li[data-line="c"]::before { background: var(--color-info); }
    li[data-line="d"]::before { background: var(--color-success); }
    li[data-line="e"]::before { background: var(--color-warning); }
    code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(23, 23, 28, 0.07); padding: 2px 7px; border-radius: 3px; }

    body > nav { position: absolute; top: 24px; right: 32px; z-index: 10; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; }
    body > nav a:hover { opacity: 1; }
  </style>
</head>
<body>
  <main data-background="transit-diagram" data-background-intensity="0.7" data-background-seed="8" data-background-speed="0.8" data-background-density="0.7">
    <map-legend>
      <h1>Interchange</h1>
      <p>Geography is a lie the map tells so you can read it. Lines run at 45&deg;, trains run on <code>t</code>. <code>data-background="transit-diagram"</code></p>
      <ul>
        <li data-line="a">A &middot; Riverside &rlarr; Terminus</li>
        <li data-line="b">B &middot; Foundry Loop</li>
        <li data-line="c">C &middot; University &rlarr; Docks</li>
        <li data-line="d">D &middot; Orbital</li>
        <li data-line="e">E &middot; Night Service</li>
      </ul>
    </map-legend>
  </main>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>
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
        <browser-window mode="light" shadow data-demo-src="./interchange.html" title="Interchange"
                        url="profpowell.github.io/bg-wc/demos/interchange.html"></browser-window>
        <a class="bw-open" href="./interchange.html" aria-label="Open the Interchange demo"></a>
        <div class="meta"><span class="name">Interchange</span><span class="desc">the metro map, running</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "interchange"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/interchange.html demos/index.html
git commit -m "docs(demos): interchange — the metro map, running ($INTER)"
bd close $INTER
```

---

### Task 19: Drawing Office Sheet 5 (`cyanotype`)

**Files:**
- Modify: `demos/drawing-office.html` (append one section before the closing script block; update the sheet counts in the four existing `<dl>`s from "of 4" to "of 5")

**Interfaces:**
- Consumes: preset `cyanotype`; the page's existing `sheet-block`/`dl` vocabulary (read the file first and match it exactly).

- [ ] **Step 1: Update the sheet counts**

In each existing `<dd>` that reads `A1 &middot; 1 of 4`, `H0 &middot; 2 of 4`, `B2 &middot; 3 of 4`, `C3 &middot; 4 of 4` — change `of 4` to `of 5`.

- [ ] **Step 2: Append Sheet 5**

Insert before the `<script type="module">` block:

```html
  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="cyanotype" data-background-intensity="0.7" data-background-seed="6" data-background-speed="0.5">
    <sheet-block>
      <h2>Botanical Record</h2>
      <dl>
        <dt>Sheet</dt><dd>S1 &middot; 5 of 5</dd>
        <dt>Drawn by</dt><dd>data-background="cyanotype"</dd>
        <dt>Process</dt><dd>the blueprint's photographic cousin</dd>
        <dt>Status</dt><dd data-stamp>EXPOSED &middot; 12 MIN, FULL SUN</dd>
      </dl>
    </sheet-block>
  </section>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "drawing-office"
```

Expected: pass (the smoke test now sees five bound hosts on the page).

- [ ] **Step 4: Commit**

```bash
git add demos/drawing-office.html
git commit -m "docs(demos): drawing-office sheet 5 — the cyanotype record ($SHEET5)"
bd close $SHEET5
```

---

### Task 20: Final gates, coverage, push

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

Expected: everything green (the main suite grows by 12 style-wave + 11 time-rule entries; verify:site confirms the built pages still reach the bg-wc definition).

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

Expected: `registered 162  demoed 162  missing []`.

- [ ] **Step 3: Push (MANDATORY per CLAUDE.md)**

```bash
git pull --rebase
git push
git status   # MUST be up to date with origin
bd ready     # no style-wave issues left open
```

Then watch CI (`gh run watch`) through the visual job and the gated Pages deploy; after deploy, spot-check one new demo and the gallery's new presets on the live site.
