# Music Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 11 album-art/music-video presets (late 60s–80s) in a NEW `music` registry group (registry 168 → 179) plus 3 demo homes.

**Architecture:** Same wave architecture as before: one file + one REGISTRY entry per preset, all pure functions of `t`; nine canvas2d + two WebGL shaders (`liquid-light`, `chrome`). The new group needs a `GROUP_LABELS` entry (`music: 'Music'`) in `src/presets/index.js` or it silently disappears from `listGroups()`/the gallery — Task 1 pins that with a test. New self-contained `test/music-wave.spec.js`; nine canvas2d newcomers join time-rule; MUSIC_WAVE map test in groups-unit.

**Tech Stack:** Vanilla JS ES modules, Canvas2D + WebGL, Playwright, node:test, pinned Playwright Docker container.

**Spec:** `docs/superpowers/specs/2026-07-04-music-wave-design.md`

## Global Constraints

- Preset contract: colors from `getColors()` EVERY frame; motion PURE in pre-scaled `t` (no lastT/accumulation; never multiply by `params.speed`); `mulberry32(params.seed)` layouts; `staticFrame(params)`; `dispose()`; no `mode` attributes.
- Color strings only via `rgbCss`/`rgbaCss` from `src/renderer/tokens.js`; blends via `mix` from `src/presets/_dots.js`.
- Light-ground rule (gl-wc-0eq6): beams/glows are COLORED ink (theme primary/accent/info…), never fg-alpha-only, so dark-native presets read on the light baseline theme.
- Frozen-`t` rule (the lightning lesson): every animation envelope must be visibly non-zero at `t = 0` — stills, reduced-motion, and baselines all freeze there.
- Before each commit: `set -o pipefail; npm run lint && npm run format:check && npm run cem:check` (prettier --write first if needed; commit regenerated `custom-elements.json`). After `bd close <id>`, commit `.beads/issues.jsonl` immediately — `git status --porcelain .beads/` must be clean before reporting.
- Demos: zero `<div>`/`class=`, binder-only backgrounds, script block `import 'vanilla-breeze/css'` then `import '../src/data-background.js'`, crumbs carry `target="_top"`.
- Track in bd (Task 0 IDs); commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 0: File bd issues

**Files:** none (tracker only)

**Interfaces:**
- Produces: fourteen issue IDs referenced later as `$LIQUID`, `$BLUENOTE`, `$STARBURST`, `$VINYL`, `$PRISM`, `$LASER`, `$SCANIMATE`, `$AIRBRUSH`, `$FEEDBACK`, `$STAGE`, `$CHROME`, `$SHOP`, `$TOUR`, `$VIDEOAGE`.

- [ ] **Step 1: Create the issues**

```bash
for t in \
  "Preset: liquid-light (webgl, music)" \
  "Preset: bluenote (canvas2d, music)" \
  "Preset: starburst (canvas2d, music)" \
  "Preset: vinyl (canvas2d, music)" \
  "Preset: prism (canvas2d, music)" \
  "Preset: laser-show (canvas2d, music)" \
  "Preset: scanimate (canvas2d, music)" \
  "Preset: airbrush (canvas2d, music)" \
  "Preset: video-feedback (canvas2d, music)" \
  "Preset: stage-lights (canvas2d, music)" \
  "Preset: chrome (webgl, music)" \
  "Demo: record-shop.html (prism hero + bluenote/starburst/airbrush/vinyl)" \
  "Demo: the-tour.html (stage-lights, laser-show, liquid-light)" \
  "Demo: video-age.html (video-feedback, scanimate, chrome)"; do
  bd create --type=task --priority=2 --title="$t" --description="Music wave, per spec docs/superpowers/specs/2026-07-04-music-wave-design.md"
done
```

Record the fourteen printed IDs.

---

### Task 1: Preset `liquid-light` + the `music` group (creates the wave's scaffolding)

**Files:**
- Create: `src/presets/liquid-light.js`, `test/music-wave.spec.js`
- Modify: `src/presets/index.js` (new `music` block at the end of REGISTRY, before the closing brace, with a `// ---- music ...` comment matching neighboring block comments; PLUS a `music: 'Music',` entry appended to `GROUP_LABELS` around line 332), `test/groups-unit.mjs` (append the wave test)

**Interfaces:**
- Consumes: `makeShaderPreset(FS, uniformNames)` from `src/renderer/shader-preset.js`.
- Produces: registry key `'liquid-light'` (webgl, music); the `music` group visible in `listGroups()`; `test/music-wave.spec.js` whose `PRESETS` array later tasks extend; `MUSIC_WAVE` map in groups-unit that later tasks extend. NOT in time-rule (webgl).

- [ ] **Step 1: Write the failing tests**

Create `test/music-wave.spec.js`:

```js
import { test, expect } from '@playwright/test';

// Render smoke for the 2026-07-04 music-wave presets: each must mount
// without fallback and produce a non-blank still. Baselines live in the
// visual project; the nine canvas2d presets are pinned pure-in-t by
// time-rule.spec.js; the two shaders are pure u_time by construction.

const PRESETS = ['liquid-light'];

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

Append to `test/groups-unit.mjs` (after the PHENOMENA_WAVE test):

```js
test('music-wave presets landed in the music group (2026-07-04)', () => {
  // The group itself must be registered with a label, or listGroups()
  // silently drops it and the gallery never shows the tab.
  const music = listGroups().find((x) => x.id === 'music');
  assert.ok(music, 'music group must exist in listGroups()');
  assert.equal(music.label, 'Music');
  const MUSIC_WAVE = {
    'liquid-light': 'music',
  };
  const byName = new Map(listPresets().map((p) => [p.name, p.group]));
  for (const [name, group] of Object.entries(MUSIC_WAVE)) {
    assert.equal(byName.get(name), group, `${name} in ${group}`);
  }
  assert.equal(music.presets.length, Object.keys(MUSIC_WAVE).length, 'music group holds exactly the wave presets');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx playwright test test/music-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `liquid-light` render FAILS (unknown preset); node music-group test FAILS (no group).

- [ ] **Step 3: Write the preset and register the group**

Create `src/presets/liquid-light.js`:

```js
// liquid-light — the Joshua Light Show oil projection. Three saturated dye
// blobs swirl on a domain-warped field; where dyes overlap they mix toward
// white the way projected light does (screen blending). A pure function of
// u_time. density = blob scale, intensity = dye saturation.

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

// One dye pool: a soft blob field around a moving center.
float dye(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  return smoothstep(r, r * 0.25, d);
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);

  // The projectionist nudges the slide: slow domain warp.
  p.x += 0.06 * sin(p.y * 5.0 + u_time * 0.31);
  p.y += 0.06 * sin(p.x * 4.0 - u_time * 0.23);

  float r = 0.34 + 0.18 * u_density;
  vec2 c1 = vec2(0.5 * aspect, 0.5) + 0.24 * vec2(sin(u_time * 0.17), cos(u_time * 0.13));
  vec2 c2 = vec2(0.5 * aspect, 0.5) + 0.27 * vec2(sin(u_time * 0.11 + 2.4), cos(u_time * 0.19 + 1.1));
  vec2 c3 = vec2(0.5 * aspect, 0.5) + 0.21 * vec2(sin(u_time * 0.23 + 4.2), cos(u_time * 0.09 + 3.3));

  float sat = 0.55 + 0.45 * u_intensity;
  vec3 d1 = u_c1 * sat * dye(p, c1, r);
  vec3 d2 = u_c2 * sat * dye(p, c2, r * 1.1);
  vec3 d3 = u_c3 * sat * dye(p, c3, r * 0.9);

  // Projected light: dyes screen over the ground, overlaps bloom to white.
  vec3 col = u_bg;
  col = 1.0 - (1.0 - col) * (1.0 - d1);
  col = 1.0 - (1.0 - col) * (1.0 - d2);
  col = 1.0 - (1.0 - col) * (1.0 - d3);

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

In `src/presets/index.js`:

1. Append a new block at the end of REGISTRY (match the neighboring block-comment style):

```js
  // ---- music (album art & music video, late 60s–80s) --------------------
  'liquid-light': { renderer: 'webgl', group: 'music', loader: () => import('./liquid-light.js') },
```

2. Append to `GROUP_LABELS` (keep it last, matching the object's style):

```js
  music: 'Music',
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/liquid-light.js src/presets/index.js test/music-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): liquid-light + the music group ($LIQUID)"
bd close $LIQUID
git add .beads/issues.jsonl && git commit -m "chore(beads): close $LIQUID"
```

---

### Task 2: Preset `bluenote`

**Files:**
- Create: `src/presets/bluenote.js`
- Modify: `src/presets/index.js` (music block, after `liquid-light`), `test/music-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: `mulberry32` from `src/util/pause.js`; `clearAndFill` from `src/renderer/canvas2d.js`; `rgbCss`/`rgbaCss` from `src/renderer/tokens.js`; `mix` from `src/presets/_dots.js`.
- Produces: registry key `bluenote` (canvas2d, music).

- [ ] **Step 1: Extend the failing tests**

`test/music-wave.spec.js` PRESETS: append `'bluenote'`.
`test/time-rule.spec.js` PRESETS: append `'bluenote'`.
`test/groups-unit.mjs` MUSIC_WAVE map: add `bluenote: 'music',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `bluenote` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/bluenote.js`:

```js
// bluenote — the Reid Miles jazz sleeve. A seeded off-grid composition of
// duotone tone blocks, thick rules, and a row of oversized dots; one block
// slides slowly against the grid. primary carries the duotone field,
// accent the dots, fg the rules. Pure function of t.
// density = element count, intensity = duotone depth.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let blocks = [];
  let rules = [];
  let dots = null;
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 31);
    const nb = 2 + Math.round(params.density * 2); // 2..4 tone blocks
    blocks = [];
    for (let i = 0; i < nb; i++) {
      blocks.push({
        x: rand() * 0.6,
        y: rand() * 0.55,
        bw: 0.25 + rand() * 0.4,
        bh: 0.2 + rand() * 0.35,
        tone: 0.25 + rand() * 0.5, // duotone depth position
        slide: i === 0, // the restless block
      });
    }
    const nr = 2 + Math.round(params.density * 3); // 2..5 rules
    rules = [];
    for (let i = 0; i < nr; i++) {
      rules.push({
        horiz: rand() < 0.6,
        at: 0.1 + rand() * 0.8,
        span0: rand() * 0.3,
        span1: 0.6 + rand() * 0.4,
        lw: (3 + rand() * 6) * px,
      });
    }
    dots = {
      y: 0.68 + rand() * 0.22,
      x0: 0.06 + rand() * 0.2,
      n: 3 + ((rand() * 4) | 0),
      r: 0.025 + rand() * 0.02,
      gap: 0.07 + rand() * 0.04,
    };
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!blocks.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const depth = 0.3 + params.intensity * 0.5;

    for (const b of blocks) {
      const slide = b.slide ? Math.sin(t * 0.12) * s * 0.04 : 0;
      c2d.fillStyle = rgbCss(mix(c.primary, c.bg, 1 - depth * b.tone - 0.2));
      c2d.fillRect(b.x * w + slide, b.y * h, b.bw * w, b.bh * h);
    }
    for (const r of rules) {
      c2d.fillStyle = rgbaCss(c.fg, 0.9);
      if (r.horiz) c2d.fillRect(r.span0 * w, r.at * h, (r.span1 - r.span0) * w, r.lw);
      else c2d.fillRect(r.at * w, r.span0 * h, r.lw, (r.span1 - r.span0) * h);
    }
    for (let i = 0; i < dots.n; i++) {
      const pulse = 1 + 0.06 * Math.sin(t * 0.5 + i * 1.3);
      c2d.fillStyle = rgbCss(c.accent);
      c2d.beginPath();
      c2d.arc((dots.x0 + i * dots.gap) * w, dots.y * h, dots.r * s * pulse, 0, Math.PI * 2);
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
      blocks = [];
      rules = [];
      dots = null;
    },
  };
}
```

Register after `liquid-light`:

```js
  bluenote: { renderer: 'canvas2d', group: 'music', loader: () => import('./bluenote.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/bluenote.js src/presets/index.js test/music-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): bluenote — duotone jazz sleeve ($BLUENOTE)"
bd close $BLUENOTE
git add .beads/issues.jsonl && git commit -m "chore(beads): close $BLUENOTE"
```

---

### Task 3: Preset `starburst`

**Files:**
- Create: `src/presets/starburst.js`
- Modify: `src/presets/index.js` (music block, after `bluenote`), `test/music-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-2 helpers.
- Produces: registry key `starburst` (canvas2d, music).

- [ ] **Step 1: Extend the failing tests**

`test/music-wave.spec.js` PRESETS: append `'starburst'`.
`test/time-rule.spec.js` PRESETS: append `'starburst'`.
`test/groups-unit.mjs` MUSIC_WAVE map: add `starburst: 'music',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `starburst` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/starburst.js`:

```js
// starburst — the funk/Motown ray burst. Concentric rings of radiating
// wedge spokes in alternating hot colors, each ring counter-rotating
// against its neighbor around a glowing core. Pure function of t.
// density = spoke count, intensity = ray reach.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';

export function create({ c2d, getColors, pxScale }) {
  let w = 1,
    h = 1;
  let rings = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 33);
    rings = [];
    const nr = 3;
    for (let i = 0; i < nr; i++) {
      rings.push({
        spokes: 10 + Math.round(params.density * 14) + ((rand() * 4) | 0),
        r0: 0.1 + i * 0.28,
        speed: 0.02 + rand() * 0.03,
        phase: rand() * Math.PI * 2,
        dir: i % 2 ? -1 : 1,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!rings.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const cx = w * 0.5;
    const cy = h * 0.55;
    const R = Math.max(w, h) * (0.55 + params.intensity * 0.35);
    const pal = [c.primary, c.accent, c.warning];

    rings.forEach((ring, ri) => {
      const rot = ring.phase + t * ring.speed * ring.dir;
      const inner = R * ring.r0;
      const outer = ri === rings.length - 1 ? R : R * rings[ri + 1].r0;
      const halfArc = Math.PI / ring.spokes;
      for (let k = 0; k < ring.spokes; k++) {
        const a = rot + (k / ring.spokes) * Math.PI * 2;
        c2d.fillStyle = rgbCss(pal[(k + ri) % pal.length]);
        c2d.beginPath();
        c2d.moveTo(cx + Math.cos(a - halfArc * 0.55) * inner, cy + Math.sin(a - halfArc * 0.55) * inner);
        c2d.lineTo(cx + Math.cos(a - halfArc * 0.55) * outer, cy + Math.sin(a - halfArc * 0.55) * outer);
        c2d.lineTo(cx + Math.cos(a + halfArc * 0.55) * outer, cy + Math.sin(a + halfArc * 0.55) * outer);
        c2d.lineTo(cx + Math.cos(a + halfArc * 0.55) * inner, cy + Math.sin(a + halfArc * 0.55) * inner);
        c2d.closePath();
        c2d.fill();
      }
    });

    // The hot core.
    const core = c2d.createRadialGradient(cx, cy, 0, cx, cy, R * 0.16);
    core.addColorStop(0, rgbaCss(c.accent, 0.95));
    core.addColorStop(1, rgbaCss(c.accent, 0));
    c2d.fillStyle = core;
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
      rings = [];
    },
  };
}
```

Register after `bluenote`:

```js
  starburst: { renderer: 'canvas2d', group: 'music', loader: () => import('./starburst.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/starburst.js src/presets/index.js test/music-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): starburst — counter-rotating funk rays ($STARBURST)"
bd close $STARBURST
git add .beads/issues.jsonl && git commit -m "chore(beads): close $STARBURST"
```

---

### Task 4: Preset `vinyl`

**Files:**
- Create: `src/presets/vinyl.js`
- Modify: `src/presets/index.js` (music block, after `starburst`), `test/music-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-2 helpers.
- Produces: registry key `vinyl` (canvas2d, music).

- [ ] **Step 1: Extend the failing tests**

`test/music-wave.spec.js` PRESETS: append `'vinyl'`.
`test/time-rule.spec.js` PRESETS: append `'vinyl'`.
`test/groups-unit.mjs` MUSIC_WAVE map: add `vinyl: 'music',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `vinyl` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/vinyl.js`:

```js
// vinyl — a record on the platter. Fine groove rings in seeded bands, a
// rotating two-tone label with an off-center highlight so the spin reads,
// radial micro-scratches that turn with the disc, and a fixed light sheen
// the grooves rotate under. Pure function of t. density = groove fineness,
// intensity = sheen strength.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let bands = [];
  let scratches = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 37);
    bands = [];
    let r = 0.34; // label edge, in disc-radius units
    while (r < 1) {
      const step = (0.02 + rand() * 0.05) * (1.3 - params.density * 0.6);
      bands.push({ r0: r, r1: Math.min(1, r + step), tight: rand() < 0.5 });
      r += step + 0.012;
    }
    scratches = [];
    for (let i = 0; i < 26; i++) {
      scratches.push({ a: rand() * Math.PI * 2, r0: 0.36 + rand() * 0.55, len: 0.02 + rand() * 0.05 });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!bands.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const R = Math.min(w, h) * 0.44;
    const spin = t * 0.9; // 33⅓-ish at speed 1

    // The disc: near-black wax derived from fg-on-bg so it works both themes.
    c2d.fillStyle = rgbCss(mix(c.fg, c.bg, 0.88));
    c2d.beginPath();
    c2d.arc(cx, cy, R, 0, Math.PI * 2);
    c2d.fill();

    // Groove bands: fine rings, tighter bands ring closer.
    for (const b of bands) {
      const rings = b.tight ? 5 : 3;
      for (let k = 0; k < rings; k++) {
        const rr = R * (b.r0 + ((b.r1 - b.r0) * k) / rings);
        c2d.strokeStyle = rgbaCss(c.fg, 0.16);
        c2d.lineWidth = 1 * px;
        c2d.beginPath();
        c2d.arc(cx, cy, rr, 0, Math.PI * 2);
        c2d.stroke();
      }
    }

    // Micro-scratches rotate with the disc — this is what sells the spin.
    c2d.strokeStyle = rgbaCss(c.fg, 0.28);
    c2d.lineWidth = 1 * px;
    for (const sc of scratches) {
      const a = sc.a + spin;
      c2d.beginPath();
      c2d.arc(cx, cy, R * sc.r0, a, a + sc.len);
      c2d.stroke();
    }

    // Label: primary disc, accent sector so rotation reads, spindle hole.
    const Rl = R * 0.32;
    c2d.fillStyle = rgbCss(c.primary);
    c2d.beginPath();
    c2d.arc(cx, cy, Rl, 0, Math.PI * 2);
    c2d.fill();
    c2d.fillStyle = rgbCss(c.accent);
    c2d.beginPath();
    c2d.moveTo(cx, cy);
    c2d.arc(cx, cy, Rl, spin, spin + Math.PI * 0.4);
    c2d.closePath();
    c2d.fill();
    c2d.fillStyle = rgbCss(c.bg);
    c2d.beginPath();
    c2d.arc(cx, cy, 3.5 * px, 0, Math.PI * 2);
    c2d.fill();

    // Fixed sheen: two soft wedges that do NOT rotate.
    for (const base of [-0.6, Math.PI - 0.6]) {
      const grad = c2d.createRadialGradient(cx, cy, Rl, cx, cy, R);
      const sheen = mix(c.bg, [1, 1, 1], 0.6);
      grad.addColorStop(0, rgbaCss(sheen, 0));
      grad.addColorStop(0.7, rgbaCss(sheen, 0.1 * params.intensity));
      grad.addColorStop(1, rgbaCss(sheen, 0));
      c2d.save();
      c2d.beginPath();
      c2d.moveTo(cx, cy);
      c2d.arc(cx, cy, R, base, base + 0.5);
      c2d.closePath();
      c2d.clip();
      c2d.fillStyle = grad;
      c2d.fillRect(cx - R, cy - R, R * 2, R * 2);
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
      bands = [];
      scratches = [];
    },
  };
}
```

Register after `starburst`:

```js
  vinyl: { renderer: 'canvas2d', group: 'music', loader: () => import('./vinyl.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/vinyl.js src/presets/index.js test/music-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): vinyl — spinning grooves under a fixed sheen ($VINYL)"
bd close $VINYL
git add .beads/issues.jsonl && git commit -m "chore(beads): close $VINYL"
```

---

### Task 5: Preset `prism`

**Files:**
- Create: `src/presets/prism.js`
- Modify: `src/presets/index.js` (music block, after `vinyl`), `test/music-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-2 helpers.
- Produces: registry key `prism` (canvas2d, music).

- [ ] **Step 1: Extend the failing tests**

`test/music-wave.spec.js` PRESETS: append `'prism'`.
`test/time-rule.spec.js` PRESETS: append `'prism'`.
`test/groups-unit.mjs` MUSIC_WAVE map: add `prism: 'music',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `prism` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/prism.js`:

```js
// prism — the Hipgnosis triangle. A thin beam enters the left face of a
// centered prism and leaves the right face as a six-band spectrum fan; the
// entry angle drifts a few degrees and the bands shimmer. Spectrum bands
// are theme colors (plus one mixed sixth), so the sleeve reads on any
// ground. Pure function of t. density = fan spread, intensity = band
// brightness. seed nudges the prism off exact center.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let off = null;

  function ensure(params) {
    if (off && off.seed === (params.seed | 0)) return;
    const rand = mulberry32(params.seed | 0 || 41);
    off = { seed: params.seed | 0, dx: (rand() - 0.5) * 0.08, dy: (rand() - 0.5) * 0.06 };
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const cx = w * (0.5 + off.dx);
    const cy = h * (0.52 + off.dy);
    const T = s * 0.22; // prism half-size

    // Prism vertices: equilateral, point up.
    const top = [cx, cy - T];
    const left = [cx - T * 0.87, cy + T * 0.5];
    const right = [cx + T * 0.87, cy + T * 0.5];

    // Incoming beam to the midpoint of the left face; angle drifts.
    const entry = [(top[0] + left[0]) / 2, (top[1] + left[1]) / 2];
    const drift = Math.sin(t * 0.15) * 0.07;
    const beamA = Math.atan2(entry[1] - cy * 0.2, entry[0] + w * 0.1) + drift;
    c2d.strokeStyle = rgbaCss(c.fg, 0.9);
    c2d.lineWidth = 2 * px;
    c2d.beginPath();
    c2d.moveTo(entry[0] - Math.cos(beamA) * w, entry[1] - Math.sin(beamA) * w);
    c2d.lineTo(entry[0], entry[1]);
    c2d.stroke();

    // Refraction hint inside the glass.
    const exit = [(top[0] + right[0]) / 2, (top[1] + right[1]) / 2];
    c2d.strokeStyle = rgbaCss(c.fg, 0.25);
    c2d.beginPath();
    c2d.moveTo(entry[0], entry[1]);
    c2d.lineTo(exit[0], exit[1]);
    c2d.stroke();

    // The spectrum fan.
    const pal = [c.primary, c.accent, c.info, c.success, c.warning, mix(c.primary, c.info, 0.5)];
    const spread = 0.28 + params.density * 0.3;
    const base = Math.atan2(exit[1] - entry[1], exit[0] - entry[0]) - spread / 2 + drift * 0.4;
    const reach = Math.hypot(w, h);
    for (let i = 0; i < pal.length; i++) {
      const a0 = base + (i / pal.length) * spread;
      const a1 = base + ((i + 1) / pal.length) * spread;
      const shimmer = 0.75 + 0.15 * Math.sin(t * 0.6 + i * 0.9);
      c2d.fillStyle = rgbaCss(pal[i], (0.45 + params.intensity * 0.45) * shimmer);
      c2d.beginPath();
      c2d.moveTo(exit[0], exit[1]);
      c2d.lineTo(exit[0] + Math.cos(a0) * reach, exit[1] + Math.sin(a0) * reach);
      c2d.lineTo(exit[0] + Math.cos(a1) * reach, exit[1] + Math.sin(a1) * reach);
      c2d.closePath();
      c2d.fill();
    }

    // The prism outline sits on top of everything.
    c2d.strokeStyle = rgbaCss(c.fg, 0.95);
    c2d.lineWidth = 2.5 * px;
    c2d.beginPath();
    c2d.moveTo(top[0], top[1]);
    c2d.lineTo(right[0], right[1]);
    c2d.lineTo(left[0], left[1]);
    c2d.closePath();
    c2d.stroke();
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
      off = null;
    },
  };
}
```

Register after `vinyl`:

```js
  prism: { renderer: 'canvas2d', group: 'music', loader: () => import('./prism.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/prism.js src/presets/index.js test/music-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): prism — beam into spectrum fan ($PRISM)"
bd close $PRISM
git add .beads/issues.jsonl && git commit -m "chore(beads): close $PRISM"
```

---

### Task 6: Preset `laser-show`

**Files:**
- Create: `src/presets/laser-show.js`
- Modify: `src/presets/index.js` (music block, after `prism`), `test/music-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-2 helpers.
- Produces: registry key `'laser-show'` (canvas2d, music).

- [ ] **Step 1: Extend the failing tests**

`test/music-wave.spec.js` PRESETS: append `'laser-show'`.
`test/time-rule.spec.js` PRESETS: append `'laser-show'`.
`test/groups-unit.mjs` MUSIC_WAVE map: add `'laser-show': 'music',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `laser-show` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/laser-show.js`:

```js
// laser-show — Laserium. Colored beams sweep as lissajous fans through
// haze: each projector fans a sheaf of lines between two endpoints that
// trace their own slow curves. Beams are theme colors (never bare fg), so
// the show reads on light grounds as colored ink. Pure function of t.
// density = projector count, intensity = beam brightness.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';

const FAN = 12; // lines per beam sheaf

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let beams = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 43);
    const n = 2 + Math.round(params.density * 2); // 2..4 projectors
    beams = [];
    for (let i = 0; i < n; i++) {
      beams.push({
        ox: 0.15 + rand() * 0.7, // projector on the floor line
        fa: 0.21 + rand() * 0.3, // lissajous frequencies for the two ends
        fb: 0.13 + rand() * 0.24,
        pa: rand() * Math.PI * 2,
        pb: rand() * Math.PI * 2,
        ci: (rand() * 3) | 0,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!beams.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.info];

    // Haze rises from the floor.
    const haze = c2d.createLinearGradient(0, h, 0, h * 0.3);
    haze.addColorStop(0, rgbaCss(c.primary, 0.1));
    haze.addColorStop(1, rgbaCss(c.primary, 0));
    c2d.fillStyle = haze;
    c2d.fillRect(0, 0, w, h);

    c2d.lineCap = 'round';
    for (const b of beams) {
      const col = pal[b.ci % pal.length];
      const ox = b.ox * w;
      const oy = h * 0.96;
      // Two sweeping endpoints along the ceiling region.
      const e1x = w * (0.5 + 0.45 * Math.sin(t * b.fa + b.pa));
      const e1y = h * (0.12 + 0.15 * Math.sin(t * b.fb * 1.7 + b.pb));
      const e2x = w * (0.5 + 0.45 * Math.sin(t * b.fa + b.pa + 0.55));
      const e2y = h * (0.12 + 0.15 * Math.sin(t * b.fb * 1.7 + b.pb + 0.7));
      const alpha = 0.05 + params.intensity * 0.08;
      for (let k = 0; k < FAN; k++) {
        const u = k / (FAN - 1);
        c2d.strokeStyle = rgbaCss(col, alpha * (0.6 + 0.4 * Math.sin(u * Math.PI)));
        c2d.lineWidth = 1.4 * px;
        c2d.beginPath();
        c2d.moveTo(ox, oy);
        c2d.lineTo(e1x + (e2x - e1x) * u, e1y + (e2y - e1y) * u);
        c2d.stroke();
      }
      // The hot center line of the sheaf.
      c2d.strokeStyle = rgbaCss(col, 0.85);
      c2d.lineWidth = 2 * px;
      c2d.beginPath();
      c2d.moveTo(ox, oy);
      c2d.lineTo((e1x + e2x) / 2, (e1y + e2y) / 2);
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
      beams = [];
    },
  };
}
```

Register after `prism`:

```js
  'laser-show': { renderer: 'canvas2d', group: 'music', loader: () => import('./laser-show.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/laser-show.js src/presets/index.js test/music-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): laser-show — lissajous beam fans in haze ($LASER)"
bd close $LASER
git add .beads/issues.jsonl && git commit -m "chore(beads): close $LASER"
```

---

### Task 7: Preset `scanimate`

**Files:**
- Create: `src/presets/scanimate.js`
- Modify: `src/presets/index.js` (music block, after `laser-show`), `test/music-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-2 helpers.
- Produces: registry key `scanimate` (canvas2d, music).

- [ ] **Step 1: Extend the failing tests**

`test/music-wave.spec.js` PRESETS: append `'scanimate'`.
`test/time-rule.spec.js` PRESETS: append `'scanimate'`.
`test/groups-unit.mjs` MUSIC_WAVE map: add `scanimate: 'music',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `scanimate` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/scanimate.js`:

```js
// scanimate — the analog motion-graphics title sweep. Glowing ribbon curves
// (stacked sine harmonics) draw themselves across the frame and fade behind
// their own sweep head, staggered per ribbon; hot core over colored falloff,
// exactly the 70s TV-ident look. The sweep position is (t*rate + phase) mod
// a cycle — pure in t, and mid-sweep at t=0 (frozen-t rule). density =
// ribbon count, intensity = glow width.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const CYCLE = 1.6; // sweep cycle length in normalized x (>1 leaves a gap)
const SEG = 24; // polyline segments per ribbon

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let ribbons = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 47);
    const n = 3 + Math.round(params.density * 2); // 3..5 ribbons
    ribbons = [];
    for (let i = 0; i < n; i++) {
      ribbons.push({
        yc: 0.2 + (i + 0.5) * (0.6 / n),
        f1: 2 + rand() * 3,
        f2: 5 + rand() * 5,
        a1: 0.04 + rand() * 0.05,
        a2: 0.01 + rand() * 0.02,
        rate: 0.08 + rand() * 0.06,
        // Start phases stagger the ribbons AND keep every ribbon mid-sweep
        // somewhere on screen at t=0.
        phase: 0.3 + rand() * 0.6,
        wob: rand() * Math.PI * 2,
        ci: (rand() * 3) | 0,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!ribbons.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.info];
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';

    for (const r of ribbons) {
      const head = (r.phase + t * r.rate) % CYCLE; // sweep head, in x units
      const col = pal[r.ci % pal.length];
      const yOf = (x) =>
        (r.yc + r.a1 * Math.sin(x * r.f1 * Math.PI + r.wob + t * 0.2) + r.a2 * Math.sin(x * r.f2 * Math.PI - t * 0.3)) * h;
      // Draw only behind the head, fading toward the tail.
      for (const pass of [
        { lw: (6 + params.intensity * 8) * px, a: 0.18, tint: col },
        { lw: 2.2 * px, a: 0.95, tint: mix(col, [1, 1, 1], 0.45) },
      ]) {
        c2d.strokeStyle = rgbaCss(pass.tint, pass.a);
        c2d.lineWidth = pass.lw;
        c2d.beginPath();
        let started = false;
        for (let k = 0; k <= SEG; k++) {
          const x = (k / SEG) * Math.min(head, 1);
          const tail = head - x; // distance behind the sweep head
          if (tail > 0.85) continue; // faded out
          const X = x * w;
          const Y = yOf(x);
          if (!started) {
            c2d.moveTo(X, Y);
            started = true;
          } else c2d.lineTo(X, Y);
        }
        c2d.stroke();
      }
      // The sweep head glint.
      if (head <= 1) {
        c2d.fillStyle = rgbaCss(mix(col, [1, 1, 1], 0.6), 0.95);
        c2d.beginPath();
        c2d.arc(head * w, yOf(head), 3.2 * px, 0, Math.PI * 2);
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
      ribbons = [];
    },
  };
}
```

Register after `laser-show`:

```js
  scanimate: { renderer: 'canvas2d', group: 'music', loader: () => import('./scanimate.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/scanimate.js src/presets/index.js test/music-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): scanimate — glowing ident ribbon sweeps ($SCANIMATE)"
bd close $SCANIMATE
git add .beads/issues.jsonl && git commit -m "chore(beads): close $SCANIMATE"
```

---

### Task 8: Preset `airbrush`

**Files:**
- Create: `src/presets/airbrush.js`
- Modify: `src/presets/index.js` (music block, after `scanimate`), `test/music-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-2 helpers.
- Produces: registry key `airbrush` (canvas2d, music).

- [ ] **Step 1: Extend the failing tests**

`test/music-wave.spec.js` PRESETS: append `'airbrush'`.
`test/time-rule.spec.js` PRESETS: append `'airbrush'`.
`test/groups-unit.mjs` MUSIC_WAVE map: add `airbrush: 'music',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `airbrush` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/airbrush.js`:

```js
// airbrush — the prog-sleeve gatefold. Soft radial orbs, a hazy horizon
// band, and wide sweeping arcs, all gradient-edged and slowly adrift —
// Roger-Dean-adjacent without the figuration. Everything is a gradient;
// nothing has a hard edge. Pure function of t. density = element count,
// intensity = tint strength.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let orbs = [];
  let arcs = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 53);
    const no = 2 + Math.round(params.density * 3); // 2..5 orbs
    orbs = [];
    for (let i = 0; i < no; i++) {
      orbs.push({
        x: 0.15 + rand() * 0.7,
        y: 0.12 + rand() * 0.45,
        r: 0.1 + rand() * 0.16,
        ci: (rand() * 3) | 0,
        drift: 0.05 + rand() * 0.08,
        phase: rand() * Math.PI * 2,
      });
    }
    arcs = [];
    for (let i = 0; i < 2 + ((rand() * 2) | 0); i++) {
      arcs.push({
        cx: 0.2 + rand() * 0.6,
        cy: 0.9 + rand() * 0.4,
        r: 0.45 + rand() * 0.4,
        a0: Math.PI * (1.05 + rand() * 0.3),
        a1: Math.PI * (1.6 + rand() * 0.3),
        lw: 0.02 + rand() * 0.035,
        ci: (rand() * 3) | 0,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!orbs.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const s = Math.min(w, h);
    const pal = [c.primary, c.accent, c.info];
    const tint = 0.35 + params.intensity * 0.45;

    // Horizon band: a soft belt of primary across the lower third.
    const hy = h * 0.66;
    const belt = c2d.createLinearGradient(0, hy - s * 0.18, 0, hy + s * 0.22);
    belt.addColorStop(0, rgbaCss(c.primary, 0));
    belt.addColorStop(0.5, rgbaCss(mix(c.primary, c.bg, 0.35), tint * 0.7));
    belt.addColorStop(1, rgbaCss(c.primary, 0));
    c2d.fillStyle = belt;
    c2d.fillRect(0, 0, w, h);

    // Orbs: soft radial pools that drift.
    for (const o of orbs) {
      const x = (o.x + Math.sin(t * o.drift + o.phase) * 0.02) * w;
      const y = (o.y + Math.cos(t * o.drift * 0.8 + o.phase) * 0.015) * h;
      const R = o.r * s;
      const g = c2d.createRadialGradient(x, y, 0, x, y, R);
      const col = mix(pal[o.ci % pal.length], c.bg, 0.25);
      g.addColorStop(0, rgbaCss(col, tint));
      g.addColorStop(0.7, rgbaCss(col, tint * 0.35));
      g.addColorStop(1, rgbaCss(col, 0));
      c2d.fillStyle = g;
      c2d.fillRect(x - R, y - R, R * 2, R * 2);
    }

    // Arcs: wide soft ring segments sweeping the sky, breathing slightly.
    for (const a of arcs) {
      const R = a.r * s;
      const lw = a.lw * s * (1 + 0.1 * Math.sin(t * 0.2 + a.phase));
      const col = mix(pal[a.ci % pal.length], c.bg, 0.3);
      for (const [width, alpha] of [
        [lw * 2.2, tint * 0.25],
        [lw, tint * 0.6],
      ]) {
        c2d.strokeStyle = rgbaCss(col, alpha);
        c2d.lineWidth = width;
        c2d.lineCap = 'round';
        c2d.beginPath();
        c2d.arc(a.cx * w, a.cy * h, R, a.a0, a.a1);
        c2d.stroke();
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
      orbs = [];
      arcs = [];
    },
  };
}
```

Register after `scanimate`:

```js
  airbrush: { renderer: 'canvas2d', group: 'music', loader: () => import('./airbrush.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/airbrush.js src/presets/index.js test/music-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): airbrush — soft prog-sleeve orbs and arcs ($AIRBRUSH)"
bd close $AIRBRUSH
git add .beads/issues.jsonl && git commit -m "chore(beads): close $AIRBRUSH"
```

---

### Task 9: Preset `video-feedback`

**Files:**
- Create: `src/presets/video-feedback.js`
- Modify: `src/presets/index.js` (music block, after `airbrush`), `test/music-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-2 helpers.
- Produces: registry key `'video-feedback'` (canvas2d, music).

- [ ] **Step 1: Extend the failing tests**

`test/music-wave.spec.js` PRESETS: append `'video-feedback'`.
`test/time-rule.spec.js` PRESETS: append `'video-feedback'`.
`test/groups-unit.mjs` MUSIC_WAVE map: add `'video-feedback': 'music',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `video-feedback` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/video-feedback.js`:

```js
// video-feedback — the camera pointed at its own monitor. The recursion is
// rendered PURELY: every frame draws N nested monitor frames, each scaled
// and rotated one step further and tinted a step along
// primary→accent→info, with the deeper layers spun further by t. No
// accumulation buffer, so frozen frames are rock stable (the trail-fade
// class of bug cannot exist here by construction). density = layer count,
// intensity = zoom/rotate step.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let jitter = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 59);
    jitter = [];
    for (let i = 0; i < 24; i++) jitter.push((rand() - 0.5) * 0.02);
    lastKey = `${params.seed}`;
  }

  function ensure(params) {
    const key = `${params.seed}`;
    if (!jitter.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const layers = 8 + Math.round(params.density * 8); // 8..16 echoes
    const rotStep = 0.06 + params.intensity * 0.12;
    const scaleStep = 0.86;
    const cx = w / 2;
    const cy = h / 2;
    const baseW = w * 0.86;
    const baseH = h * 0.86;

    for (let i = 0; i < layers; i++) {
      const u = i / Math.max(1, layers - 1);
      const sc = Math.pow(scaleStep, i);
      // Deeper layers have spun further — the echo lags the camera.
      const rot = i * rotStep + t * 0.15 * u + (jitter[i % jitter.length] || 0);
      // Two-stage tint walk: primary → accent → info.
      const col =
        u < 0.5 ? mix(c.primary, c.accent, u * 2) : mix(c.accent, c.info, (u - 0.5) * 2);
      c2d.save();
      c2d.translate(cx, cy);
      c2d.rotate(rot);
      c2d.scale(sc, sc);
      c2d.strokeStyle = rgbaCss(col, 0.85 - u * 0.3);
      c2d.lineWidth = Math.max(1, 3 * px * (1 - u * 0.5));
      c2d.strokeRect(-baseW / 2, -baseH / 2, baseW, baseH);
      // The scanline bar inside each echo, drifting downward with depth.
      const barY = (-0.5 + (((i * 0.13 + t * 0.05) % 1) + 1) % 1) * baseH;
      c2d.fillStyle = rgbaCss(col, 0.18);
      c2d.fillRect(-baseW / 2, barY, baseW, baseH * 0.06);
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
      jitter = [];
    },
  };
}
```

Register after `airbrush`:

```js
  'video-feedback': { renderer: 'canvas2d', group: 'music', loader: () => import('./video-feedback.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/video-feedback.js src/presets/index.js test/music-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): video-feedback — pure nested monitor recursion ($FEEDBACK)"
bd close $FEEDBACK
git add .beads/issues.jsonl && git commit -m "chore(beads): close $FEEDBACK"
```

---

### Task 10: Preset `stage-lights`

**Files:**
- Create: `src/presets/stage-lights.js`
- Modify: `src/presets/index.js` (music block, after `video-feedback`), `test/music-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-2 helpers.
- Produces: registry key `'stage-lights'` (canvas2d, music).

- [ ] **Step 1: Extend the failing tests**

`test/music-wave.spec.js` PRESETS: append `'stage-lights'`.
`test/time-rule.spec.js` PRESETS: append `'stage-lights'`.
`test/groups-unit.mjs` MUSIC_WAVE map: add `'stage-lights': 'music',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `stage-lights` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/stage-lights.js`:

```js
// stage-lights — the concert opener. Par cans along the stage edge sweep
// colored cones up through the haze; dust motes drift where the beams
// live. Cones are colored theme ink at low alpha so overlaps feel additive
// and the rig reads on light grounds. Pure function of t. density = can
// count, intensity = beam brightness.

import { mulberry32 } from '../util/pause.js';
import { clearAndFill } from '../renderer/canvas2d.js';
import { rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let cans = [];
  let motes = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 61);
    const n = 3 + Math.round(params.density * 2); // 3..5 cans
    cans = [];
    for (let i = 0; i < n; i++) {
      cans.push({
        x: (i + 0.5) / n + (rand() - 0.5) * 0.06,
        sweep: 0.35 + rand() * 0.25, // sweep half-angle envelope
        rate: 0.12 + rand() * 0.14,
        phase: rand() * Math.PI * 2,
        ci: (rand() * 3) | 0,
      });
    }
    motes = [];
    for (let i = 0; i < 60; i++) {
      motes.push({ x: rand(), y: rand() * 0.8, r: (0.6 + rand()) * px, drift: 0.01 + rand() * 0.02, phase: rand() * Math.PI * 2 });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!cans.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    clearAndFill(c2d, w, h, c.bg);
    const pal = [c.primary, c.accent, c.info];
    const floorY = h * 0.9;
    const bright = 0.16 + params.intensity * 0.2;

    // Haze.
    const haze = c2d.createLinearGradient(0, h, 0, 0);
    haze.addColorStop(0, rgbaCss(mix(c.primary, c.bg, 0.6), 0.12));
    haze.addColorStop(1, rgbaCss(c.primary, 0));
    c2d.fillStyle = haze;
    c2d.fillRect(0, 0, w, h);

    // Beams: cones from each can, swept by t.
    for (const can of cans) {
      const col = pal[can.ci % pal.length];
      const ox = can.x * w;
      const angle = -Math.PI / 2 + Math.sin(t * can.rate + can.phase) * can.sweep;
      const len = h * 1.15;
      const half = len * 0.14;
      const tipX = ox + Math.cos(angle) * len;
      const tipY = floorY + Math.sin(angle) * len;
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      const grad = c2d.createLinearGradient(ox, floorY, tipX, tipY);
      grad.addColorStop(0, rgbaCss(col, bright));
      grad.addColorStop(1, rgbaCss(col, 0));
      c2d.fillStyle = grad;
      c2d.beginPath();
      c2d.moveTo(ox, floorY);
      c2d.lineTo(tipX + nx * half, tipY + ny * half);
      c2d.lineTo(tipX - nx * half, tipY - ny * half);
      c2d.closePath();
      c2d.fill();
      // The can itself.
      c2d.fillStyle = rgbaCss(c.fg, 0.85);
      c2d.beginPath();
      c2d.arc(ox, floorY, 4 * px, 0, Math.PI * 2);
      c2d.fill();
    }

    // Dust motes drifting above the stage.
    for (const m of motes) {
      const x = (m.x + Math.sin(t * m.drift + m.phase) * 0.02) * w;
      const y = (m.y + Math.cos(t * m.drift * 0.7 + m.phase) * 0.02) * h;
      c2d.fillStyle = rgbaCss(mix(c.accent, c.bg, 0.3), 0.25);
      c2d.beginPath();
      c2d.arc(x, y, m.r, 0, Math.PI * 2);
      c2d.fill();
    }

    // The stage edge.
    c2d.fillStyle = rgbaCss(mix(c.bg, [0, 0, 0], 0.45), 0.9);
    c2d.fillRect(0, floorY, w, h - floorY);
    c2d.fillStyle = rgbaCss(c.accent, 0.5);
    c2d.fillRect(0, floorY, w, 2 * px);
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
      cans = [];
      motes = [];
    },
  };
}
```

Register after `video-feedback`:

```js
  'stage-lights': { renderer: 'canvas2d', group: 'music', loader: () => import('./stage-lights.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/stage-lights.js src/presets/index.js test/music-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): stage-lights — par-can cones in haze ($STAGE)"
bd close $STAGE
git add .beads/issues.jsonl && git commit -m "chore(beads): close $STAGE"
```

---

### Task 11: Preset `chrome`

**Files:**
- Create: `src/presets/chrome.js`
- Modify: `src/presets/index.js` (music block, after `stage-lights`), `test/music-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: `makeShaderPreset` (uniforms u_res, u_time, u_intensity, u_density, u_c1, u_bg, u_fg only).
- Produces: registry key `chrome` (webgl, music). NOT in time-rule.

- [ ] **Step 1: Extend the failing tests**

`test/music-wave.spec.js` PRESETS: append `'chrome'` (final list: 11 entries).
`test/groups-unit.mjs` MUSIC_WAVE map: add `chrome: 'music',` (map reaches 11).

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/music-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `chrome` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/chrome.js`:

```js
// chrome — 80s airbrushed logo metal. A mirrored horizon: banded sky
// gradient above, compressed darker reflection below, hot horizon line,
// and a specular sweep traveling the band. Bands derive from the theme
// primary mixed toward white/black so the metal reads in any theme.
// Pure function of u_time. density = band count, intensity = specular heat.

import { makeShaderPreset } from '../renderer/shader-preset.js';

const FS = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_density;
uniform vec3 u_c1;
uniform vec3 u_bg;
uniform vec3 u_fg;

void main() {
  float horizon = 0.55;
  float y = v_uv.y;
  // Fold the reflection: below the horizon we sample the sky, compressed.
  float sky = y > horizon ? (y - horizon) / (1.0 - horizon)
                          : (horizon - y) / horizon * 0.7;
  float refl = y > horizon ? 0.0 : 1.0;

  // Banded metal: the sky gradient carries harmonic bands.
  float bands = 3.0 + u_density * 6.0;
  float band = 0.5 + 0.5 * sin(sky * bands * 3.14159 + 1.3);
  vec3 hi = mix(u_c1, vec3(1.0), 0.75);
  vec3 lo = mix(u_c1, vec3(0.0), 0.55);
  vec3 col = mix(lo, hi, smoothstep(0.0, 1.0, sky) * 0.6 + band * 0.4);
  // The reflection is darker and slightly tinted toward the ground color.
  col = mix(col, mix(col, u_bg, 0.45) * 0.7, refl);

  // Hot horizon line.
  float line = exp(-abs(y - horizon) * 90.0);
  col += mix(u_c1, vec3(1.0), 0.85) * line * (0.5 + 0.5 * u_intensity);

  // Specular sweep: a bright spot traveling the horizon.
  float sweepX = fract(u_time * 0.06);
  float spot = exp(-pow((v_uv.x - sweepX) * 7.0, 2.0)) * exp(-abs(y - horizon) * 14.0);
  col += vec3(1.0) * spot * (0.35 + 0.5 * u_intensity);

  // Thin streak highlights in the upper sky.
  float streak = smoothstep(0.985, 1.0, sin(y * 60.0 + 3.0)) * step(horizon, y);
  col += mix(u_c1, vec3(1.0), 0.6) * streak * 0.25;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const create = makeShaderPreset(FS, [
  'u_res',
  'u_time',
  'u_intensity',
  'u_density',
  'u_c1',
  'u_bg',
  'u_fg',
]);
```

Register after `stage-lights`:

```js
  chrome: { renderer: 'webgl', group: 'music', loader: () => import('./chrome.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/music-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (11 music-wave entries; the groups test's exact-count assertion now sees 11).

- [ ] **Step 5: Commit**

```bash
git add src/presets/chrome.js src/presets/index.js test/music-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): chrome — mirrored horizon metal ($CHROME)"
bd close $CHROME
git add .beads/issues.jsonl && git commit -m "chore(beads): close $CHROME"
```

---

### Task 12: API reference — the Music section

**Files:**
- Modify: `docs/api.html` (insert a new group section after the last preset-group table; the group tables live inside the presets section as `<h3>… presets</h3>` + `<div class="table-wrap"><table>…` blocks — match that markup exactly)

**Interfaces:**
- Consumes: the 11 registered names from Tasks 1–11.
- Produces: 179/179 catalog coverage.

- [ ] **Step 1: Add the section**

Insert after the last existing group table (same markup shape as "Print art presets"):

```html
      <h3>Music presets</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Visual</th><th>Tokens used</th></tr></thead>
          <tbody>
            <tr><td><code>liquid-light</code></td><td>Oil-projection dye blobs swirling on a warped field, blooming to white where they overlap</td><td>primary, accent, info, background</td></tr>
            <tr><td><code>bluenote</code></td><td>Reid Miles jazz sleeve &mdash; duotone tone blocks, thick rules, oversized dot row; one block slides</td><td>primary, accent, foreground, background</td></tr>
            <tr><td><code>starburst</code></td><td>Funk ray burst &mdash; concentric counter-rotating spoke rings around a hot core</td><td>primary, accent, warning, background</td></tr>
            <tr><td><code>vinyl</code></td><td>A spinning record &mdash; grooves and rotating label under a fixed light sheen</td><td>primary, accent, foreground, background</td></tr>
            <tr><td><code>prism</code></td><td>A beam refracting through a prism into a six-band spectrum fan; the entry angle drifts</td><td>primary, accent, info, success, warning, foreground, background</td></tr>
            <tr><td><code>laser-show</code></td><td>Laserium beam fans sweeping lissajous paths through haze</td><td>primary, accent, info, background</td></tr>
            <tr><td><code>scanimate</code></td><td>Analog ident sweeps &mdash; glowing ribbon curves drawing themselves across the frame</td><td>primary, accent, info, background</td></tr>
            <tr><td><code>airbrush</code></td><td>Prog-sleeve gatefold &mdash; soft gradient orbs, a horizon belt, and sweeping arcs adrift</td><td>primary, accent, info, background</td></tr>
            <tr><td><code>video-feedback</code></td><td>Camera-at-monitor recursion &mdash; nested spinning frames tinted primary&rarr;accent&rarr;info</td><td>primary, accent, info, background</td></tr>
            <tr><td><code>stage-lights</code></td><td>Par-can cones sweeping colored beams through haze over a stage edge</td><td>primary, accent, info, foreground, background</td></tr>
            <tr><td><code>chrome</code></td><td>Airbrushed 80s logo metal &mdash; mirrored banded horizon with a traveling specular sweep</td><td>primary, foreground, background</td></tr>
          </tbody>
        </table>
      </div>
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

Expected: `179 registered; 0 missing: []`

- [ ] **Step 3: Commit**

```bash
git add docs/api.html
git commit -m "docs(api): Music presets section — eleven music-wave rows"
```

---

### Task 13: Container baselines for the eleven (+ light-ground & gallery-tab checks)

**Files:**
- Create: `test/visual.spec.js-snapshots/{liquid-light,bluenote,starburst,vinyl,prism,laser-show,scanimate,airbrush,video-feedback,stage-lights,chrome}-visual-linux.png`

**Interfaces:**
- Consumes: Docker (`docker info --format ok`; if not running `open -a OrbStack`, wait, retry) + `mcr.microsoft.com/playwright:v1.60.0-jammy`.

- [ ] **Step 1: Generate (anchored filter)**

```bash
docker run --rm --ipc=host --platform=linux/amd64 -v "$PWD:/work" -v /work/node_modules \
  -w /work mcr.microsoft.com/playwright:v1.60.0-jammy \
  bash -lc "npm ci --no-audit --no-fund >/dev/null 2>&1 && npx playwright test --project=visual --update-snapshots -g '(^| )(liquid-light|bluenote|starburst|vinyl|prism|laser-show|scanimate|airbrush|video-feedback|stage-lights|chrome)$'"
```

Expected: 11 pass, 11 `writing actual`; `git status --porcelain test/visual.spec.js-snapshots/` shows exactly eleven new files, zero modified.

- [ ] **Step 2: Verify determinism**

Re-run the exact command from Step 1 with `--update-snapshots` REMOVED. Expected: 11/11 pass.

- [ ] **Step 3: Light-ground + frozen-t inspection**

Read all eleven PNGs. Each must clearly show its phenomenon on the light baseline theme at frozen t — pay special attention to prism (spectrum fan present), laser-show (beams visible), stage-lights (cones visible), liquid-light (dyes visible), scanimate (ribbons mid-sweep, not blank). A blank or near-uniform PNG = STOP, report DONE_WITH_CONCERNS naming the preset.

- [ ] **Step 4: Gallery tab check**

```bash
npx playwright test test/gallery-context-budget.spec.js --project=main --reporter=line
```

Then confirm the music tab exists: with the dev server running via the test, simplest is a one-off assertion — run:

```bash
node --input-type=module -e "
import { listGroups } from './src/presets/index.js';
const g = listGroups().find((x) => x.id === 'music');
if (!g || g.presets.length !== 11) { console.error('music group wrong:', g && g.presets.length); process.exit(1); }
console.log('music tab OK with', g.presets.length, 'presets');
"
```

Expected: gallery spec passes (budget unaffected — only 2 WebGL of 11); `music tab OK with 11 presets`.

- [ ] **Step 5: Commit**

```bash
git add test/visual.spec.js-snapshots/
git commit -m "test(visual): baselines for the eleven music-wave presets"
```

---

### Task 14: Demo `record-shop.html`

**Files:**
- Create: `demos/record-shop.html`
- Modify: `demos/index.html` (append a `.bw-card` tile after the current last card)

**Interfaces:**
- Consumes: presets `prism`, `bluenote`, `starburst`, `airbrush`, `vinyl`.

- [ ] **Step 1: Write the page**

Create `demos/record-shop.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Record Shop &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Righteous&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* Crate digging: the sleeve everyone owns, then four finds. Each
       section is a full-bleed sleeve; the credit card is the price tag. */
    :root {
      --color-background: #16121c;  /* shop after hours */
      --color-foreground: #efe8db;
      --color-primary: #7a4fd0;     /* purple wax */
      --color-accent: #f0a638;      /* amber sleeve */
      --color-info: #3fa7b8;        /* teal label */
      --color-success: #58b06a;
      --color-warning: #e0653a;
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    sleeve-credit {
      display: block; position: absolute; max-width: 380px; padding: 16px 24px;
      background: rgba(22, 18, 28, 0.82); border: 1px solid rgba(239, 232, 219, 0.3); border-radius: 6px;
    }
    sleeve-credit[data-at="bl"] { left: clamp(24px, 5vw, 72px); bottom: clamp(28px, 8vh, 76px); }
    sleeve-credit[data-at="br"] { right: clamp(24px, 5vw, 72px); bottom: clamp(28px, 8vh, 76px); }
    sleeve-credit[data-at="tl"] { left: clamp(24px, 5vw, 72px); top: clamp(56px, 10vh, 96px); }
    credit-label { display: block; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 6px; }
    sleeve-credit h1, sleeve-credit h2 { font-family: Righteous, sans-serif; font-weight: 400; margin: 0 0 6px; line-height: 1.02; }
    sleeve-credit h1 { font-size: clamp(36px, 5.5vw, 64px); }
    sleeve-credit h2 { font-size: clamp(26px, 3.8vw, 44px); }
    sleeve-credit p { margin: 0; font-weight: 300; line-height: 1.6; font-size: 14px; }
    code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(239, 232, 219, 0.12); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="prism" data-background-intensity="0.75" data-background-seed="7" data-background-speed="0.5">
    <sleeve-credit data-at="bl">
      <credit-label>Bin 1 &middot; the one everyone owns</credit-label>
      <h1>Record Shop</h1>
      <p>Side two, track five, lights off. <code>data-background="prism"</code></p>
    </sleeve-credit>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="bluenote" data-background-intensity="0.65" data-background-seed="12" data-background-speed="0.5">
    <sleeve-credit data-at="br">
      <credit-label>Bin 2 &middot; hard bop, 1958</credit-label>
      <h2>The Duotone Session</h2>
      <p>The designer got equal billing and earned it. <code>data-background="bluenote"</code></p>
    </sleeve-credit>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="starburst" data-background-intensity="0.7" data-background-seed="4" data-background-speed="0.6">
    <sleeve-credit data-at="tl">
      <credit-label>Bin 3 &middot; funk 45</credit-label>
      <h2>Solar Riff</h2>
      <p>The horn section hits and the sleeve does this. <code>data-background="starburst"</code></p>
    </sleeve-credit>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="airbrush" data-background-intensity="0.7" data-background-seed="19" data-background-speed="0.5">
    <sleeve-credit data-at="bl">
      <credit-label>Bin 4 &middot; prog gatefold</credit-label>
      <h2>Chronologies III</h2>
      <p>Twenty-two minutes a side; worlds on the cover. <code>data-background="airbrush"</code></p>
    </sleeve-credit>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="vinyl" data-background-intensity="0.6" data-background-seed="9" data-background-speed="0.8">
    <sleeve-credit data-at="br">
      <credit-label>The listening table</credit-label>
      <h2>Drop the Needle</h2>
      <p>Every find ends up here eventually. <code>data-background="vinyl"</code></p>
    </sleeve-credit>
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
        <browser-window mode="dark" shadow data-demo-src="./record-shop.html" title="Record Shop"
                        url="profpowell.github.io/bg-wc/demos/record-shop.html"></browser-window>
        <a class="bw-open" href="./record-shop.html" aria-label="Open the Record Shop demo"></a>
        <div class="meta"><span class="name">Record Shop</span><span class="desc">five sleeves from the crates</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "record-shop"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/record-shop.html demos/index.html
git commit -m "docs(demos): record-shop — five sleeves from the crates ($SHOP)"
bd close $SHOP
git add .beads/issues.jsonl && git commit -m "chore(beads): close $SHOP"
```

---

### Task 15: Demo `the-tour.html`

**Files:**
- Create: `demos/the-tour.html`
- Modify: `demos/index.html` (append a `.bw-card` tile)

**Interfaces:**
- Consumes: presets `stage-lights`, `laser-show`, `liquid-light`.

- [ ] **Step 1: Write the page**

Create `demos/the-tour.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Tour &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Monoton&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* One night in three acts: doors, the planetarium set, the encore's
       oil projection. The laminate pass rides every section. */
    :root {
      --color-background: #0d0a14;  /* house lights down */
      --color-foreground: #ece5f2;
      --color-primary: #d24a8c;     /* magenta wash */
      --color-accent: #f2b23a;      /* amber spot */
      --color-info: #45b8c9;        /* cyan beam */
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    tour-pass {
      display: block; position: absolute; left: 50%; transform: translateX(-50%);
      max-width: 430px; text-align: center; padding: 18px 28px;
      background: rgba(13, 10, 20, 0.78); border: 1px solid rgba(236, 229, 242, 0.28); border-radius: 10px;
    }
    tour-pass[data-at="low"] { bottom: clamp(28px, 8vh, 80px); }
    tour-pass[data-at="high"] { top: clamp(52px, 10vh, 96px); }
    pass-act { display: block; font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--color-info); margin-bottom: 8px; }
    tour-pass h1, tour-pass h2 { font-family: Monoton, cursive; font-weight: 400; margin: 0 0 8px; letter-spacing: 0.06em; }
    tour-pass h1 { font-size: clamp(30px, 5vw, 58px); line-height: 1.1; }
    tour-pass h2 { font-size: clamp(22px, 3.4vw, 40px); }
    tour-pass p { margin: 0; font-weight: 300; line-height: 1.65; font-size: 14px; }
    code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(236, 229, 242, 0.12); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="stage-lights" data-background-intensity="0.75" data-background-seed="6" data-background-speed="0.8">
    <tour-pass data-at="high">
      <pass-act>Act I &middot; doors at eight</pass-act>
      <h1>The Tour</h1>
      <p>The rig warms up before the room does. <code>data-background="stage-lights"</code></p>
    </tour-pass>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="laser-show" data-background-intensity="0.7" data-background-seed="14" data-background-speed="0.7">
    <tour-pass data-at="low">
      <pass-act>Act II &middot; the planetarium set</pass-act>
      <h2>Lasers Over Side One</h2>
      <p>Nobody claps between movements; everybody exhales. <code>data-background="laser-show"</code></p>
    </tour-pass>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="liquid-light" data-background-intensity="0.75" data-background-seed="3" data-background-speed="0.6">
    <tour-pass data-at="low">
      <pass-act>Encore &middot; the oil wheel</pass-act>
      <h2>Liquid Light</h2>
      <p>Two slides, a clock face of dye, and a very steady hand. <code>data-background="liquid-light"</code></p>
    </tour-pass>
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
        <browser-window mode="dark" shadow data-demo-src="./the-tour.html" title="The Tour"
                        url="profpowell.github.io/bg-wc/demos/the-tour.html"></browser-window>
        <a class="bw-open" href="./the-tour.html" aria-label="Open the Tour demo"></a>
        <div class="meta"><span class="name">The Tour</span><span class="desc">doors, lasers, the oil wheel</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "the-tour"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/the-tour.html demos/index.html
git commit -m "docs(demos): the-tour — doors, lasers, the oil wheel ($TOUR)"
bd close $TOUR
git add .beads/issues.jsonl && git commit -m "chore(beads): close $TOUR"
```

---

### Task 16: Demo `video-age.html`

**Files:**
- Create: `demos/video-age.html`
- Modify: `demos/index.html` (append a `.bw-card` tile)

**Interfaces:**
- Consumes: presets `video-feedback`, `scanimate`, `chrome`.

- [ ] **Step 1: Write the page**

Create `demos/video-age.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Video Age &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Audiowide&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* The ident reel: feedback tunnel, the scanimate sweep, chrome logo
       metal. Broadcast slates carry the copy. */
    :root {
      --color-background: #101018;  /* studio black */
      --color-foreground: #e8ecf2;
      --color-primary: #c94f7c;     /* broadcast magenta */
      --color-accent: #e8c53a;      /* caption gold */
      --color-info: #4aa8d8;        /* chroma blue */
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    ident-slate {
      display: block; position: absolute; max-width: 400px; padding: 18px 26px;
      background: rgba(16, 16, 24, 0.8); border-top: 3px solid var(--color-accent);
    }
    ident-slate[data-at="bl"] { left: clamp(24px, 5vw, 72px); bottom: clamp(28px, 8vh, 76px); }
    ident-slate[data-at="tr"] { right: clamp(24px, 5vw, 72px); top: clamp(56px, 10vh, 96px); }
    slate-mark { display: block; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 8px; }
    ident-slate h1, ident-slate h2 { font-family: Audiowide, sans-serif; font-weight: 400; margin: 0 0 8px; line-height: 1.05; }
    ident-slate h1 { font-size: clamp(30px, 4.6vw, 54px); }
    ident-slate h2 { font-size: clamp(22px, 3.4vw, 40px); }
    ident-slate p { margin: 0; font-weight: 300; line-height: 1.65; font-size: 14px; }
    code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(232, 236, 242, 0.12); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="video-feedback" data-background-intensity="0.65" data-background-seed="5" data-background-speed="0.7">
    <ident-slate data-at="bl">
      <slate-mark>Reel 1 &middot; camera on monitor</slate-mark>
      <h1>Video Age</h1>
      <p>Point it at itself and hold very still. <code>data-background="video-feedback"</code></p>
    </ident-slate>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="scanimate" data-background-intensity="0.7" data-background-seed="11" data-background-speed="0.7">
    <ident-slate data-at="tr">
      <slate-mark>Reel 2 &middot; the analog computer</slate-mark>
      <h2>Tonight, In Color</h2>
      <p>One oscillator per glowing letter. <code>data-background="scanimate"</code></p>
    </ident-slate>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="chrome" data-background-intensity="0.7" data-background-seed="8" data-background-speed="0.6">
    <ident-slate data-at="bl">
      <slate-mark>Reel 3 &middot; the station ident</slate-mark>
      <h2>Broadcast Metal</h2>
      <p>Airbrushed until it reflects a sunset that never happened. <code>data-background="chrome"</code></p>
    </ident-slate>
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
        <browser-window mode="dark" shadow data-demo-src="./video-age.html" title="Video Age"
                        url="profpowell.github.io/bg-wc/demos/video-age.html"></browser-window>
        <a class="bw-open" href="./video-age.html" aria-label="Open the Video Age demo"></a>
        <div class="meta"><span class="name">Video Age</span><span class="desc">the ident reel, three ways</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "video-age"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/video-age.html demos/index.html
git commit -m "docs(demos): video-age — the ident reel, three ways ($VIDEOAGE)"
bd close $VIDEOAGE
git add .beads/issues.jsonl && git commit -m "chore(beads): close $VIDEOAGE"
```

---

### Task 17: Final gates, coverage, push

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

Expected: `registered 179  demoed 179  missing []`.

- [ ] **Step 3: Push (MANDATORY)**

```bash
git pull --rebase
git push
git status   # MUST be up to date with origin
bd ready     # no music-wave issues left open
```

Then watch CI and the gated Pages deploy; spot-check one new demo and the gallery's music tab live.
