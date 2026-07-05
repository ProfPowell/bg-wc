# Dimensional Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 CSS-3D presets to the `dimensional` group (2 → 10; registry 179 → 187) plus 2 demo homes.

**Architecture:** Every preset follows the explode/fly-through css3d contract: `create({ host, css3d, getColors, getParams })` builds a DOM scene ONCE from create-time params (seeded with `mulberry32`), mounts a scoped STYLE containing the shared PAUSE_RULE, and returns `{ setPlaying, frame, resize, dispose }` where `frame()` is a vars-only `reconcile()` (colors → CSS custom properties, speed → duration vars, intensity → opacity vars) and `resize` scales the scene via stage font-size. Motion lives entirely in CSS `@keyframes` with NEGATIVE animation-delays so paused stills land mid-motion.

**Tech Stack:** Vanilla JS ES modules, CSS 3D transforms + keyframes, Playwright, node:test, pinned Playwright Docker container.

**Spec:** `docs/superpowers/specs/2026-07-05-dimensional-wave-design.md`

## Global Constraints

- css3d contract exactly as explode.js models it: scene built once at create; `reconcile()` re-reads `getParams()`/`getColors()` every call and `css3d.setVars` (color vars behind a change-key like explode.js:99-103); `setPlaying` → `css3d.setPlaying`; `dispose` → `css3d.dispose()`; `resize(w,h)` → `stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px``.
- Every STYLE includes: `` const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`; `` interpolated at the end of the STYLE template.
- Paused-still rule: every `animation` shorthand carries a NEGATIVE delay landing mid-motion (never the 0% keyframe).
- Speed: durations computed in reconcile as `base / Math.max(0.05, params.speed)` seconds (explode.js:94 idiom). Never multiply motion by speed anywhere else.
- Colors: `rgbCss as rgb` (and `rgbaCss as rgba` where alpha needed) from `../renderer/tokens.js` written into CSS vars; `mix` from `./_dots.js` for derived tones. `mulberry32` imported from `../util/pause.js` — NOT a local copy.
- Element budget ≤ ~220 nodes per scene. No `mode` attributes (fly-through keeps its own; new presets add none).
- Before each commit: `set -o pipefail; npm run lint && npm run format:check && npm run cem:check` (prettier --write first if needed; commit regenerated custom-elements.json). After `bd close <id>`, commit `.beads/issues.jsonl`; `git status --porcelain .beads/` clean before reporting. BOTH commits carry the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` — verify with `git log -2 --format="%(trailers)"`.
- Demos: zero `<div>`/`class=`, binder-only backgrounds, script block `import 'vanilla-breeze/css'` then `import '../src/data-background.js'`, crumbs carry `target="_top"`.
- Do NOT run `git pull`/`git push` mid-task — the controller owns branch sync.

---

### Task 0: File bd issues

**Files:** none (tracker only)

**Interfaces:**
- Produces: ten issue IDs referenced later as `$CAROUSEL`, `$GYRO`, `$MONOLITH`, `$SHARDS`, `$CUBEWAVE`, `$SKYLINE`, `$CHAMBER`, `$SATELLITES`, `$HALL`, `$DIORAMA`.

- [ ] **Step 1: Create the issues**

```bash
for t in \
  "Preset: carousel (css3d, dimensional)" \
  "Preset: gyroscope (css3d, dimensional)" \
  "Preset: monolith (css3d, dimensional)" \
  "Preset: shards (css3d, dimensional)" \
  "Preset: cube-wave (css3d, dimensional)" \
  "Preset: skyline (css3d, dimensional)" \
  "Preset: chamber (css3d, dimensional)" \
  "Preset: satellites (css3d, dimensional)" \
  "Demo: sculpture-hall.html (carousel, gyroscope, shards, monolith)" \
  "Demo: diorama.html (cube-wave, skyline, chamber, satellites)"; do
  bd create --type=task --priority=2 --title="$t" --description="Dimensional wave, per spec docs/superpowers/specs/2026-07-05-dimensional-wave-design.md"
done
```

Record the ten printed IDs.

---

### Task 1: Preset `carousel` (creates the wave's test scaffolding)

**Files:**
- Create: `src/presets/carousel.js`, `test/dimensional-wave.spec.js`
- Modify: `src/presets/index.js` (dimensional block, after `fly-through`/`explode`), `test/groups-unit.mjs` (append the wave test)

**Interfaces:**
- Consumes: css3d context (`css3d.stage`, `mountStyle`, `setVars`, `setPlaying`, `dispose`); `mulberry32` from `../util/pause.js`; `rgbCss as rgb`, `rgbaCss as rgba` from `../renderer/tokens.js`; `mix` from `./_dots.js`.
- Produces: registry key `carousel` (css3d, dimensional); `test/dimensional-wave.spec.js` whose `PRESETS` array later tasks extend; `DIMENSIONAL_WAVE` map in groups-unit that later tasks extend. NOT in time-rule (CSS keyframe motion).

- [ ] **Step 1: Write the failing tests**

Create `test/dimensional-wave.spec.js`:

```js
import { test, expect } from '@playwright/test';

// Smoke for the 2026-07-05 dimensional-wave css3d presets: each must mount a
// stage (not a canvas), build a non-trivial scene, and ship the shared pause
// rule so reduced-motion / paused stills freeze the keyframes (visual
// baselines rely on it). Motion lives in CSS, so these are NOT in time-rule.

const PRESETS = ['carousel'];

for (const name of PRESETS) {
  test(`${name} mounts a css3d scene with the pause rule`, async ({ page }) => {
    await page.goto('/test/new-presets-page.html');
    const r = await page.evaluate(async (n) => {
      const el = document.getElementById('wc');
      el.setAttribute('seed', '7');
      el.setAttribute('preset', n);
      await el.ready;
      const root = el.shadowRoot;
      const stage = root.querySelector('div.stage[part="stage"]');
      return {
        fallback: el.hasAttribute('data-fallback'),
        hasStage: !!stage,
        hasCanvas: !!root.querySelector('canvas'),
        sceneNodes: stage ? stage.querySelectorAll('*').length : 0,
        pauseRule: stage ? /data-playing="0"/.test(stage.querySelector('style')?.textContent || '') : false,
      };
    }, name);
    expect(r.fallback, `${name} must not fall back`).toBe(false);
    expect(r.hasStage, 'css3d stage must mount').toBe(true);
    expect(r.hasCanvas, 'css3d must not create a canvas').toBe(false);
    expect(r.sceneNodes, 'scene must be non-trivial').toBeGreaterThanOrEqual(10);
    expect(r.pauseRule, 'STYLE must include the pause rule').toBe(true);
  });
}
```

Append to `test/groups-unit.mjs` (after the MUSIC_WAVE test):

```js
test('dimensional-wave presets landed in the dimensional group (2026-07-05)', () => {
  const DIMENSIONAL_WAVE = {
    carousel: 'dimensional',
  };
  const byName = new Map(listPresets().map((p) => [p.name, p.group]));
  for (const [name, group] of Object.entries(DIMENSIONAL_WAVE)) {
    assert.equal(byName.get(name), group, `${name} in ${group}`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `carousel` smoke FAILS (unknown preset → fallback); node wave test FAILS.

- [ ] **Step 3: Write the preset**

Create `src/presets/carousel.js`:

```js
// carousel — a rolodex of theme-gradient cards orbiting the camera. The ring
// spins on a long loop and precesses (a slow tilt wobble) so the composition
// never sits still; cards are double-sided with dimmer backfaces. Scene is
// built once from create-time params; reconcile only touches vars.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 36em; overflow: hidden; display: grid; place-items: center; }
  .tilt { transform-style: preserve-3d;
    animation: caPrecess var(--ca-predur, 41s) ease-in-out -12s infinite alternate; }
  .ring { position: relative; transform-style: preserve-3d;
    animation: caSpin var(--ca-dur, 60s) linear -21s infinite; }
  .card { position: absolute; width: 6em; height: 9em; left: -3em; top: -4.5em;
    border-radius: 0.4em; opacity: var(--ca-op, 0.92);
    background-image: linear-gradient(160deg, var(--a), var(--b)); }
  @keyframes caSpin { to { transform: rotateY(360deg); } }
  @keyframes caPrecess {
    from { transform: rotateX(6deg) rotateZ(-3deg); }
    to { transform: rotateX(-8deg) rotateZ(3deg); }
  }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 63);
  const n = 10 + Math.round(p.density * 4); // 10..14 cards
  const radius = 13 + rand() * 3;

  const tilt = document.createElement('div');
  tilt.className = 'tilt';
  const ring = document.createElement('div');
  ring.className = 'ring';
  tilt.appendChild(ring);
  for (let i = 0; i < n; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.transform = `rotateY(${(i * 360) / n}deg) translateZ(${radius.toFixed(2)}em)`;
    // Three gradient families cycle around the ring.
    card.style.setProperty('--a', `var(--ca-g${i % 3}a)`);
    card.style.setProperty('--b', `var(--ca-g${i % 3}b)`);
    ring.appendChild(card);
  }
  css3d.stage.appendChild(tilt);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--ca-dur': `${(60 / sp).toFixed(2)}s`,
      '--ca-predur': `${(41 / sp).toFixed(2)}s`,
      '--ca-op': (0.65 + params.intensity * 0.3).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.accent) + rgb(c.info) + rgb(c.bg);
    if (key !== lastKey) {
      lastKey = key;
      const pal = [c.primary, c.accent, c.info];
      const vars = {};
      pal.forEach((col, k) => {
        vars[`--ca-g${k}a`] = rgb(col);
        vars[`--ca-g${k}b`] = rgb(mix(col, c.bg, 0.55));
      });
      css3d.setVars(vars);
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
    resize(w, h) {
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
```

Register in the dimensional block right after `explode`:

```js
  carousel: { renderer: 'css3d', group: 'dimensional', loader: () => import('./carousel.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/carousel.js src/presets/index.js test/dimensional-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): carousel — orbiting gradient rolodex ($CAROUSEL)"
bd close $CAROUSEL
git add .beads/issues.jsonl && git commit -m "chore(beads): close $CAROUSEL"
```

---

### Task 2: Preset `gyroscope`

**Files:**
- Create: `src/presets/gyroscope.js`
- Modify: `src/presets/index.js` (after `carousel`), `test/dimensional-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers and contract.
- Produces: registry key `gyroscope` (css3d, dimensional).

- [ ] **Step 1: Extend the failing tests**

`test/dimensional-wave.spec.js` PRESETS: append `'gyroscope'`.
`test/groups-unit.mjs` DIMENSIONAL_WAVE map: add `gyroscope: 'dimensional',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `gyroscope` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/gyroscope.js`:

```js
// gyroscope — nested wireframe rings spinning on different axes around a
// glowing core, grounded by a faint equatorial disc. Each ring's spin axis
// lives in CSS vars consumed inside the keyframe (the explode --tx idiom),
// so one keyframe animates every ring. Scene built once; reconcile is vars.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb, rgbaCss as rgba } from '../renderer/tokens.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 40em; overflow: hidden; display: grid; place-items: center; }
  .rig { position: relative; transform-style: preserve-3d;
    animation: gyDrift var(--gy-driftdur, 87s) linear -30s infinite; }
  .ring { position: absolute; border-radius: 50%; border-style: solid;
    transform-style: preserve-3d;
    animation: gySpin var(--dur, 20s) linear var(--delay, -7s) infinite; }
  .core { position: absolute; width: 3.4em; height: 3.4em; left: -1.7em; top: -1.7em;
    border-radius: 50%;
    background-image: radial-gradient(var(--gy-core), transparent 65%);
    animation: gyPulse var(--gy-pulsedur, 9s) ease-in-out -4s infinite alternate; }
  .equator { position: absolute; border-radius: 50%;
    border: 1px solid var(--gy-eq); transform: rotateX(90deg); opacity: 0.5; }
  @keyframes gySpin { to { transform: rotate3d(var(--ax), var(--ay), var(--az), 360deg); } }
  @keyframes gyDrift { to { transform: rotateY(360deg); } }
  @keyframes gyPulse { from { opacity: var(--gy-oplo, 0.5); } to { opacity: 1; } }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 67);
  const n = 3 + Math.round(p.density * 2); // 3..5 rings

  const rig = document.createElement('div');
  rig.className = 'rig';
  const core = document.createElement('div');
  core.className = 'core';
  rig.appendChild(core);
  for (let i = 0; i < n; i++) {
    const ring = document.createElement('div');
    ring.className = 'ring';
    const d = 9 + i * 4.5; // em diameter
    ring.style.width = `${d}em`;
    ring.style.height = `${d}em`;
    ring.style.left = `${-d / 2}em`;
    ring.style.top = `${-d / 2}em`;
    ring.style.borderWidth = '0.32em';
    ring.style.borderColor = `var(--gy-c${i % 3})`;
    // A distinct, seeded spin axis per ring.
    ring.style.setProperty('--ax', (rand() * 2 - 1).toFixed(2));
    ring.style.setProperty('--ay', (rand() * 2 - 1).toFixed(2));
    ring.style.setProperty('--az', (rand() * 0.6).toFixed(2));
    ring.style.setProperty('--dur', `calc(var(--gy-base, 20s) * ${(0.7 + i * 0.35).toFixed(2)})`);
    ring.style.setProperty('--delay', `${(-3 - rand() * 9).toFixed(2)}s`);
    rig.appendChild(ring);
  }
  const eq = document.createElement('div');
  eq.className = 'equator';
  const ed = 9 + (n - 1) * 4.5 + 6;
  eq.style.width = `${ed}em`;
  eq.style.height = `${ed}em`;
  eq.style.left = `${-ed / 2}em`;
  eq.style.top = `${-ed / 2}em`;
  rig.appendChild(eq);
  css3d.stage.appendChild(rig);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--gy-base': `${(20 / sp).toFixed(2)}s`,
      '--gy-driftdur': `${(87 / sp).toFixed(2)}s`,
      '--gy-pulsedur': `${(9 / sp).toFixed(2)}s`,
      '--gy-oplo': (0.35 + params.intensity * 0.3).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.accent) + rgb(c.info) + rgb(c.fg);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--gy-c0': rgb(c.primary),
        '--gy-c1': rgb(c.accent),
        '--gy-c2': rgb(c.info),
        '--gy-core': rgb(c.accent),
        '--gy-eq': rgba(c.fg, 0.4),
      });
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
    resize(w, h) {
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
```

Register after `carousel`:

```js
  gyroscope: { renderer: 'css3d', group: 'dimensional', loader: () => import('./gyroscope.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/gyroscope.js src/presets/index.js test/dimensional-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): gyroscope — nested rings on seeded axes ($GYRO)"
bd close $GYRO
git add .beads/issues.jsonl && git commit -m "chore(beads): close $GYRO"
```

---

### Task 3: Preset `monolith`

**Files:**
- Create: `src/presets/monolith.js`
- Modify: `src/presets/index.js` (after `gyroscope`), `test/dimensional-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers and contract.
- Produces: registry key `monolith` (css3d, dimensional).

- [ ] **Step 1: Extend the failing tests**

`test/dimensional-wave.spec.js` PRESETS: append `'monolith'`.
`test/groups-unit.mjs` DIMENSIONAL_WAVE map: add `monolith: 'dimensional',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `monolith` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/monolith.js`:

```js
// monolith — dark slabs floating and slowly tumbling over a floor grid
// (explode's floor idiom). Each slab is a six-face cuboid; its tumble axis
// rides CSS vars inside a shared keyframe, staggered by negative delays so
// paused stills catch every slab mid-tumble. Slab faces are fg-derived
// near-dark with a primary edge sheen — legible on light and dark grounds.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb, rgbaCss as rgba } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 34em; overflow: hidden; display: grid; place-items: center; }
  .scene { position: relative; transform-style: preserve-3d;
    animation: moOrbit var(--mo-orbitdur, 150s) linear -50s infinite; }
  .floor { position: absolute; inset: -30em; transform: rotateX(-90deg) translateZ(9em);
    background-image:
      radial-gradient(transparent, var(--mo-bg) 30em),
      repeating-linear-gradient(90deg, var(--mo-rule) 0 1px, transparent 0 2em),
      repeating-linear-gradient(var(--mo-rule) 0 1px, transparent 0 2em);
    opacity: var(--mo-floor, 0.35); }
  .slab { position: absolute; transform-style: preserve-3d;
    animation: moTumble var(--dur, 60s) linear var(--delay, -17s) infinite; }
  .face { position: absolute; background: var(--mo-face);
    box-shadow: inset 0 0 0.5em var(--mo-sheen); }
  @keyframes moOrbit { to { transform: rotateY(360deg); } }
  @keyframes moTumble {
    from { transform: translate3d(var(--x), var(--y), var(--z)) rotate3d(var(--ax), var(--ay), var(--az), 0deg); }
    to { transform: translate3d(var(--x), var(--y), var(--z)) rotate3d(var(--ax), var(--ay), var(--az), 360deg); }
  }
  ${PAUSE_RULE}
`;

// Build one w×h×d cuboid out of six positioned faces.
function cuboid(w, h, d) {
  const slab = document.createElement('div');
  slab.className = 'slab';
  const faces = [
    [`${w}em`, `${h}em`, `translate3d(${-w / 2}em, ${-h / 2}em, ${d / 2}em)`],
    [`${w}em`, `${h}em`, `translate3d(${-w / 2}em, ${-h / 2}em, ${-d / 2}em) rotateY(180deg)`],
    [`${d}em`, `${h}em`, `translate3d(${-d / 2}em, ${-h / 2}em, 0) rotateY(90deg) translateZ(${w / 2}em)`],
    [`${d}em`, `${h}em`, `translate3d(${-d / 2}em, ${-h / 2}em, 0) rotateY(-90deg) translateZ(${w / 2}em)`],
    [`${w}em`, `${d}em`, `translate3d(${-w / 2}em, ${-d / 2}em, 0) rotateX(90deg) translateZ(${h / 2}em)`],
    [`${w}em`, `${d}em`, `translate3d(${-w / 2}em, ${-d / 2}em, 0) rotateX(-90deg) translateZ(${h / 2}em)`],
  ];
  for (const [fw, fh, tf] of faces) {
    const f = document.createElement('div');
    f.className = 'face';
    f.style.width = fw;
    f.style.height = fh;
    f.style.transform = tf;
    slab.appendChild(f);
  }
  return slab;
}

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 71);
  const n = 3 + Math.round(p.density * 2); // 3..5 slabs

  const scene = document.createElement('div');
  scene.className = 'scene';
  const floor = document.createElement('div');
  floor.className = 'floor';
  scene.appendChild(floor);

  for (let i = 0; i < n; i++) {
    const slab = cuboid(2.2 + rand() * 1.6, 5.5 + rand() * 3, 0.8 + rand() * 0.6);
    slab.style.setProperty('--x', `${((i - (n - 1) / 2) * 7 + (rand() - 0.5) * 3).toFixed(1)}em`);
    slab.style.setProperty('--y', `${(-(1 + rand() * 4)).toFixed(1)}em`);
    slab.style.setProperty('--z', `${((rand() - 0.5) * 10).toFixed(1)}em`);
    slab.style.setProperty('--ax', (rand() * 0.5).toFixed(2));
    slab.style.setProperty('--ay', (0.6 + rand() * 0.4).toFixed(2));
    slab.style.setProperty('--az', (rand() * 0.3).toFixed(2));
    slab.style.setProperty('--dur', `calc(var(--mo-base, 60s) * ${(0.8 + rand() * 0.7).toFixed(2)})`);
    slab.style.setProperty('--delay', `${(-5 - rand() * 40).toFixed(1)}s`);
    scene.appendChild(slab);
  }
  css3d.stage.appendChild(scene);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--mo-base': `${(60 / sp).toFixed(2)}s`,
      '--mo-orbitdur': `${(150 / sp).toFixed(2)}s`,
      '--mo-floor': (0.2 + params.intensity * 0.3).toFixed(2),
    });
    const key = rgb(c.fg) + rgb(c.bg) + rgb(c.primary);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--mo-face': rgb(mix(c.fg, c.bg, 0.12)),
        '--mo-sheen': rgba(c.primary, 0.55),
        '--mo-bg': rgb(c.bg),
        '--mo-rule': rgba(c.fg, 0.5),
      });
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
    resize(w, h) {
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
```

Register after `gyroscope`:

```js
  monolith: { renderer: 'css3d', group: 'dimensional', loader: () => import('./monolith.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/monolith.js src/presets/index.js test/dimensional-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): monolith — tumbling slabs over the floor grid ($MONOLITH)"
bd close $MONOLITH
git add .beads/issues.jsonl && git commit -m "chore(beads): close $MONOLITH"
```

---

### Task 4: Preset `shards`

**Files:**
- Create: `src/presets/shards.js`
- Modify: `src/presets/index.js` (after `monolith`), `test/dimensional-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers and contract.
- Produces: registry key `shards` (css3d, dimensional).

- [ ] **Step 1: Extend the failing tests**

`test/dimensional-wave.spec.js` PRESETS: append `'shards'`.
`test/groups-unit.mjs` DIMENSIONAL_WAVE map: add `shards: 'dimensional',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `shards` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/shards.js`:

```js
// shards — a slow-motion cloud of translucent crystal fragments on a
// spherical shell, the whole cloud rotating while each shard shimmers on
// its own staggered cycle. Shards are clip-path'd gradient planes in the
// three theme colors, double-sided so the far side of the shell reads.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb } from '../renderer/tokens.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 38em; overflow: hidden; display: grid; place-items: center; }
  .cloud { position: relative; transform-style: preserve-3d;
    animation: shTurn var(--sh-dur, 75s) linear -26s infinite; }
  .shard { position: absolute; width: 5em; height: 5em; left: -2.5em; top: -2.5em;
    background-image: linear-gradient(var(--ang, 30deg), var(--col), transparent 75%);
    clip-path: polygon(var(--clip));
    animation: shShimmer var(--sh-shimdur, 11s) ease-in-out var(--delay, -4s) infinite alternate; }
  @keyframes shTurn { to { transform: rotateY(360deg) rotateX(14deg); } }
  @keyframes shShimmer {
    from { opacity: var(--sh-oplo, 0.25); }
    to { opacity: var(--sh-ophi, 0.85); }
  }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 73);
  const n = 16 + Math.round(p.density * 12); // 16..28 shards

  const cloud = document.createElement('div');
  cloud.className = 'cloud';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'shard';
    const theta = rand() * 360;
    const phi = (rand() - 0.5) * 140;
    const r = 9 + rand() * 5;
    s.style.transform = `rotateY(${theta.toFixed(1)}deg) rotateX(${phi.toFixed(1)}deg) translateZ(${r.toFixed(1)}em) rotate(${(rand() * 360).toFixed(0)}deg)`;
    // A seeded triangle or quad.
    const pts =
      rand() < 0.5
        ? `${(rand() * 40).toFixed(0)}% 0%, 100% ${(rand() * 60).toFixed(0)}%, ${(20 + rand() * 40).toFixed(0)}% 100%`
        : `${(rand() * 30).toFixed(0)}% 0%, 100% ${(rand() * 30).toFixed(0)}%, ${(60 + rand() * 40).toFixed(0)}% 100%, 0% ${(50 + rand() * 40).toFixed(0)}%`;
    s.style.setProperty('--clip', pts);
    s.style.setProperty('--ang', `${(rand() * 360).toFixed(0)}deg`);
    s.style.setProperty('--col', `var(--sh-c${i % 3})`);
    s.style.setProperty('--delay', `${(-rand() * 11).toFixed(2)}s`);
    cloud.appendChild(s);
  }
  css3d.stage.appendChild(cloud);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--sh-dur': `${(75 / sp).toFixed(2)}s`,
      '--sh-shimdur': `${(11 / sp).toFixed(2)}s`,
      '--sh-oplo': (0.15 + params.intensity * 0.2).toFixed(2),
      '--sh-ophi': (0.55 + params.intensity * 0.4).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.accent) + rgb(c.info);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({ '--sh-c0': rgb(c.primary), '--sh-c1': rgb(c.accent), '--sh-c2': rgb(c.info) });
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
    resize(w, h) {
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
```

Register after `monolith`:

```js
  shards: { renderer: 'css3d', group: 'dimensional', loader: () => import('./shards.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/shards.js src/presets/index.js test/dimensional-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): shards — rotating crystal cloud ($SHARDS)"
bd close $SHARDS
git add .beads/issues.jsonl && git commit -m "chore(beads): close $SHARDS"
```

---

### Task 5: Preset `cube-wave`

**Files:**
- Create: `src/presets/cube-wave.js`
- Modify: `src/presets/index.js` (after `shards`), `test/dimensional-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers and contract.
- Produces: registry key `'cube-wave'` (css3d, dimensional).

- [ ] **Step 1: Extend the failing tests**

`test/dimensional-wave.spec.js` PRESETS: append `'cube-wave'`.
`test/groups-unit.mjs` DIMENSIONAL_WAVE map: add `'cube-wave': 'dimensional',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `cube-wave` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/cube-wave.js`:

```js
// cube-wave — the isometric traveling-wave classic, with real boxes. An n×n
// board of small cubes viewed from a fixed dimetric angle; each cube bobs in
// translateZ with a negative delay proportional to its distance from center,
// so the wave radiates outward and a paused still catches it mid-swell. The
// board breathes a few degrees so the composition never freezes visually.
// Three visible faces per cube (top/left/right) keep the node budget at
// 3n²+2 (≤ 194 at max density).

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const CELL = 2.4; // em pitch
const SIZE = 1.8; // em cube edge

const STYLE = `
  .stage { perspective: 60em; overflow: hidden; display: grid; place-items: center; }
  .breathe { transform-style: preserve-3d;
    animation: cwBreathe var(--cw-breathedur, 33s) ease-in-out -12s infinite alternate; }
  .board { position: relative; transform-style: preserve-3d;
    transform: rotateX(58deg) rotateZ(45deg); }
  .cube { position: absolute; transform-style: preserve-3d;
    animation: cwBob var(--cw-dur, 4.5s) ease-in-out var(--delay, 0s) infinite alternate; }
  .t, .l, .r { position: absolute; width: ${SIZE}em; height: ${SIZE}em; }
  .t { background: var(--cw-top); transform: translateZ(${SIZE}em); }
  .l { background: var(--cw-left); transform: rotateX(-90deg) translateZ(${-SIZE / 2}em) translateY(${SIZE / 2}em); }
  .r { background: var(--cw-right); transform: rotateY(90deg) translateZ(${SIZE / 2}em) translateX(${SIZE / 2}em); }
  @keyframes cwBob { from { transform: translate3d(var(--x), var(--y), 0); }
    to { transform: translate3d(var(--x), var(--y), var(--cw-amp, 1.6em)); } }
  @keyframes cwBreathe { from { transform: rotateX(-4deg); } to { transform: rotateX(4deg); } }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 79);
  const side = 5 + Math.round(p.density * 3); // 5..8 per side

  const breathe = document.createElement('div');
  breathe.className = 'breathe';
  const board = document.createElement('div');
  board.className = 'board';
  breathe.appendChild(board);
  const mid = (side - 1) / 2;
  for (let i = 0; i < side; i++) {
    for (let j = 0; j < side; j++) {
      const cube = document.createElement('div');
      cube.className = 'cube';
      cube.style.setProperty('--x', `${((i - mid) * CELL).toFixed(2)}em`);
      cube.style.setProperty('--y', `${((j - mid) * CELL).toFixed(2)}em`);
      // Wave radiates from center; tiny seeded jitter keeps rings organic.
      const dist = Math.hypot(i - mid, j - mid) + rand() * 0.15;
      cube.style.setProperty('--delay', `calc(var(--cw-step, -0.35s) * ${dist.toFixed(2)} - 2s)`);
      for (const cls of ['t', 'l', 'r']) {
        const f = document.createElement('div');
        f.className = cls;
        cube.appendChild(f);
      }
      board.appendChild(cube);
    }
  }
  css3d.stage.appendChild(breathe);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--cw-dur': `${(4.5 / sp).toFixed(2)}s`,
      '--cw-breathedur': `${(33 / sp).toFixed(2)}s`,
      '--cw-step': `${(-0.35 / sp).toFixed(3)}s`,
      '--cw-amp': `${(0.8 + params.intensity * 1.4).toFixed(2)}em`,
    });
    const key = rgb(c.primary) + rgb(c.bg);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--cw-top': rgb(c.primary),
        '--cw-left': rgb(mix(c.primary, c.bg, 0.45)),
        '--cw-right': rgb(mix(c.primary, c.bg, 0.65)),
      });
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
    resize(w, h) {
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
```

Register after `shards`:

```js
  'cube-wave': { renderer: 'css3d', group: 'dimensional', loader: () => import('./cube-wave.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/cube-wave.js src/presets/index.js test/dimensional-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): cube-wave — traveling wave of real boxes ($CUBEWAVE)"
bd close $CUBEWAVE
git add .beads/issues.jsonl && git commit -m "chore(beads): close $CUBEWAVE"
```

---

### Task 6: Preset `skyline`

**Files:**
- Create: `src/presets/skyline.js`
- Modify: `src/presets/index.js` (after `cube-wave`), `test/dimensional-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers and contract.
- Produces: registry key `skyline` (css3d, dimensional).

- [ ] **Step 1: Extend the failing tests**

`test/dimensional-wave.spec.js` PRESETS: append `'skyline'`.
`test/groups-unit.mjs` DIMENSIONAL_WAVE map: add `skyline: 'dimensional',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `skyline` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/skyline.js`:

```js
// skyline — extruded city blocks in two depth rows over a ground plane, the
// camera panning laterally on a long alternate loop (negative delay lands
// mid-pan). Buildings are 5-face cuboids with window stripes; a seeded few
// get an accent roof glow. ~24 blocks × 5 faces + ground ≈ 122 nodes.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb, rgbaCss as rgba } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 30em; overflow: hidden; display: grid; place-items: center; }
  .world { position: relative; transform-style: preserve-3d;
    transform: rotateX(12deg);
    animation: skPan var(--sk-dur, 45s) ease-in-out -16s infinite alternate; }
  .ground { position: absolute; inset: -34em; transform: rotateX(-90deg) translateZ(6em);
    background-image:
      radial-gradient(transparent, var(--sk-bg) 30em),
      repeating-linear-gradient(90deg, var(--sk-rule) 0 1px, transparent 0 3em);
    opacity: 0.3; }
  .bldg { position: absolute; transform-style: preserve-3d; }
  .bf { position: absolute;
    background-image: repeating-linear-gradient(var(--sk-win) 0 0.22em, var(--sk-wall) 0.22em 0.66em);
    opacity: var(--sk-op, 0.95); }
  .roof { position: absolute; background: var(--sk-wall); }
  .roof[data-glow] { box-shadow: 0 0 1.2em var(--sk-glow); background: var(--sk-glow); }
  @keyframes skPan { from { transform: rotateX(12deg) translateX(9em); }
    to { transform: rotateX(12deg) translateX(-9em); } }
  ${PAUSE_RULE}
`;

// A 5-face building (4 sides + roof), w×h×d em, base sitting on y=6em plane.
function building(w, h, d) {
  const b = document.createElement('div');
  b.className = 'bldg';
  const faces = [
    [w, h, `translate3d(${-w / 2}em, ${6 - h}em, ${d / 2}em)`],
    [w, h, `translate3d(${-w / 2}em, ${6 - h}em, ${-d / 2}em) rotateY(180deg)`],
    [d, h, `translate3d(${-d / 2}em, ${6 - h}em, 0) rotateY(90deg) translateZ(${w / 2}em)`],
    [d, h, `translate3d(${-d / 2}em, ${6 - h}em, 0) rotateY(-90deg) translateZ(${w / 2}em)`],
  ];
  for (const [fw, fh, tf] of faces) {
    const f = document.createElement('div');
    f.className = 'bf';
    f.style.width = `${fw}em`;
    f.style.height = `${fh}em`;
    f.style.transform = tf;
    b.appendChild(f);
  }
  const roof = document.createElement('div');
  roof.className = 'roof';
  roof.style.width = `${w}em`;
  roof.style.height = `${d}em`;
  roof.style.transform = `translate3d(${-w / 2}em, ${-d / 2}em, 0) rotateX(90deg) translateZ(${-(6 - h) - d / 2}em)`;
  b.appendChild(roof);
  return { b, roof };
}

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 83);
  const perRow = 9 + Math.round(p.density * 3); // 9..12 per row, 2 rows

  const world = document.createElement('div');
  world.className = 'world';
  const ground = document.createElement('div');
  ground.className = 'ground';
  world.appendChild(ground);

  for (let row = 0; row < 2; row++) {
    const z = row === 0 ? -3 : 5;
    for (let i = 0; i < perRow; i++) {
      const w = 1.6 + rand() * 2.2;
      const h = 3 + rand() * 6;
      const d = 1.6 + rand() * 1.4;
      const { b, roof } = building(w, h, d);
      b.style.transform = `translate3d(${((i - (perRow - 1) / 2) * 4.6 + (rand() - 0.5) * 1.5).toFixed(1)}em, 0, ${z}em)`;
      if (rand() < 0.2) roof.setAttribute('data-glow', '');
      world.appendChild(b);
    }
  }
  css3d.stage.appendChild(world);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--sk-dur': `${(45 / sp).toFixed(2)}s`,
      '--sk-op': (0.75 + params.intensity * 0.25).toFixed(2),
    });
    const key = rgb(c.fg) + rgb(c.bg) + rgb(c.primary) + rgb(c.accent);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--sk-wall': rgb(mix(c.fg, c.bg, 0.25)),
        '--sk-win': rgb(mix(c.primary, c.bg, 0.25)),
        '--sk-glow': rgb(c.accent),
        '--sk-bg': rgb(c.bg),
        '--sk-rule': rgba(c.fg, 0.4),
      });
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
    resize(w, h) {
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
```

Register after `cube-wave`:

```js
  skyline: { renderer: 'css3d', group: 'dimensional', loader: () => import('./skyline.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/skyline.js src/presets/index.js test/dimensional-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): skyline — panning extruded city blocks ($SKYLINE)"
bd close $SKYLINE
git add .beads/issues.jsonl && git commit -m "chore(beads): close $SKYLINE"
```

---

### Task 7: Preset `chamber`

**Files:**
- Create: `src/presets/chamber.js`
- Modify: `src/presets/index.js` (after `skyline`), `test/dimensional-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers and contract.
- Produces: registry key `chamber` (css3d, dimensional).

- [ ] **Step 1: Extend the failing tests**

`test/dimensional-wave.spec.js` PRESETS: append `'chamber'`.
`test/groups-unit.mjs` DIMENSIONAL_WAVE map: add `chamber: 'dimensional',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `chamber` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/chamber.js`:

```js
// chamber — the camera lives inside a slowly rotating room. Six inward-facing
// gradient planes (backfaces hidden, so you always see the far interior) with
// fg rule lines like wainscoting; a soft light disc orbits counter to the
// room, drifting across the walls. The scene node count is tiny (~10) — the
// whole effect is gradients on big planes. Seed nudges wall hues.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb, rgbaCss as rgba } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const HALF = 21; // em half-room

const STYLE = `
  .stage { perspective: 18em; overflow: hidden; display: grid; place-items: center; }
  .room { position: relative; transform-style: preserve-3d;
    animation: chTurn var(--ch-dur, 140s) linear -47s infinite; }
  .wall { position: absolute; width: ${HALF * 2}em; height: ${HALF * 2}em;
    left: ${-HALF}em; top: ${-HALF}em;
    backface-visibility: hidden;
    background-image:
      repeating-linear-gradient(var(--ch-rule) 0 1px, transparent 1px ${HALF / 3}em),
      linear-gradient(var(--wa), var(--wb));
    opacity: var(--ch-op, 0.96); }
  .glow { position: absolute; width: 12em; height: 12em; left: -6em; top: -6em;
    border-radius: 50%;
    background-image: radial-gradient(var(--ch-glow), transparent 70%);
    animation: chOrbit var(--ch-glowdur, 61s) linear -20s infinite; }
  @keyframes chTurn { to { transform: rotateY(360deg); } }
  @keyframes chOrbit { from { transform: rotateY(0deg) translateZ(${HALF - 2}em); }
    to { transform: rotateY(-360deg) translateZ(${HALF - 2}em); } }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 89);
  const hueShuffle = rand() < 0.5; // seed swaps which walls get primary vs accent

  const room = document.createElement('div');
  room.className = 'room';
  // 4 walls + ceiling + floor, all facing inward.
  const placements = [
    `rotateY(0deg) translateZ(${-HALF}em)`,
    `rotateY(90deg) translateZ(${-HALF}em)`,
    `rotateY(180deg) translateZ(${-HALF}em)`,
    `rotateY(270deg) translateZ(${-HALF}em)`,
    `rotateX(90deg) translateZ(${-HALF}em)`,
    `rotateX(-90deg) translateZ(${-HALF}em)`,
  ];
  placements.forEach((tf, i) => {
    const wall = document.createElement('div');
    wall.className = 'wall';
    wall.style.transform = tf;
    const fam = (i + (hueShuffle ? 1 : 0)) % 2 === 0 ? 'p' : 'a';
    wall.style.setProperty('--wa', `var(--ch-${fam}a)`);
    wall.style.setProperty('--wb', `var(--ch-${fam}b)`);
    room.appendChild(wall);
  });
  const glow = document.createElement('div');
  glow.className = 'glow';
  room.appendChild(glow);
  css3d.stage.appendChild(room);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--ch-dur': `${(140 / sp).toFixed(2)}s`,
      '--ch-glowdur': `${(61 / sp).toFixed(2)}s`,
      '--ch-op': (0.85 + params.intensity * 0.15).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.accent) + rgb(c.bg) + rgb(c.fg);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--ch-pa': rgb(mix(c.primary, c.bg, 0.35)),
        '--ch-pb': rgb(mix(c.primary, c.bg, 0.75)),
        '--ch-aa': rgb(mix(c.accent, c.bg, 0.4)),
        '--ch-ab': rgb(mix(c.accent, c.bg, 0.8)),
        '--ch-glow': rgba(c.warning, 0.5),
        '--ch-rule': rgba(c.fg, 0.18),
      });
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
    resize(w, h) {
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
```

Register after `skyline`:

```js
  chamber: { renderer: 'css3d', group: 'dimensional', loader: () => import('./chamber.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

NOTE: chamber's scene is deliberately tiny (8 nodes: 6 walls + glow + room). The Task-1 smoke asserts `sceneNodes >= 10`, which counts the injected `<style>` and `.room` too — verify the actual count in the test output; if it lands at 9, add ONE structural element that serves the design (a second, dimmer counter-orbiting glow disc `.glow[data-dim]` with opacity 0.5 of the first) rather than weakening the assertion.

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/chamber.js src/presets/index.js test/dimensional-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): chamber — inside a rotating gradient room ($CHAMBER)"
bd close $CHAMBER
git add .beads/issues.jsonl && git commit -m "chore(beads): close $CHAMBER"
```

---

### Task 8: Preset `satellites`

**Files:**
- Create: `src/presets/satellites.js`
- Modify: `src/presets/index.js` (after `chamber`), `test/dimensional-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers and contract.
- Produces: registry key `satellites` (css3d, dimensional).

- [ ] **Step 1: Extend the failing tests**

`test/dimensional-wave.spec.js` PRESETS: append `'satellites'` (final list: 8 entries).
`test/groups-unit.mjs` DIMENSIONAL_WAVE map: add `satellites: 'dimensional',` (map reaches 8).

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `satellites` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/satellites.js`:

```js
// satellites — a tiny orrery. A planet approximated by stacked translucent
// discs, three seeded-tilt orbit rings each carrying a few themed cards
// circling at their own periods (negative delays scatter the phases). The
// whole system precesses slowly.

import { mulberry32 } from '../util/pause.js';
import { rgbCss as rgb, rgbaCss as rgba } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const PAUSE_RULE = `.stage[data-playing="0"] * { animation-play-state: paused !important; }`;

const STYLE = `
  .stage { perspective: 40em; overflow: hidden; display: grid; place-items: center; }
  .system { position: relative; transform-style: preserve-3d;
    animation: saPrecess var(--sa-predur, 120s) linear -40s infinite; }
  .disc { position: absolute; border-radius: 50%; background: var(--sa-planet);
    transform-style: preserve-3d; opacity: 0.55; }
  .orbit { position: absolute; transform-style: preserve-3d; }
  .track { position: absolute; border-radius: 50%; border: 1px solid var(--sa-track); }
  .spin { position: absolute; transform-style: preserve-3d;
    animation: saSpin var(--dur, 24s) linear var(--delay, -9s) infinite; }
  .sat { position: absolute; width: 1.6em; height: 2.3em; left: -0.8em; top: -1.15em;
    border-radius: 0.2em; background: var(--col);
    opacity: var(--sa-op, 0.95); }
  @keyframes saSpin { to { transform: rotateY(360deg); } }
  @keyframes saPrecess { to { transform: rotateY(360deg) rotateX(8deg); } }
  ${PAUSE_RULE}
`;

export function create({ css3d, getColors, getParams }) {
  css3d.mountStyle(STYLE);
  const p = getParams();
  const rand = mulberry32(p.seed | 0 || 97);

  const system = document.createElement('div');
  system.className = 'system';

  // Planet: stacked discs approximating a 5em-radius sphere.
  const R = 5;
  for (let k = -3; k <= 3; k++) {
    const z = (k / 3.5) * R;
    const r = Math.sqrt(Math.max(0.4, R * R - z * z));
    const disc = document.createElement('div');
    disc.className = 'disc';
    disc.style.width = `${(r * 2).toFixed(2)}em`;
    disc.style.height = `${(r * 2).toFixed(2)}em`;
    disc.style.left = `${-r.toFixed(2)}em`;
    disc.style.top = `${-r.toFixed(2)}em`;
    disc.style.transform = `rotateX(90deg) translateZ(${z.toFixed(2)}em)`;
    system.appendChild(disc);
  }

  // Three tilted orbits, each with 2-4 satellites (density adds passengers).
  for (let o = 0; o < 3; o++) {
    const orbit = document.createElement('div');
    orbit.className = 'orbit';
    orbit.style.transform = `rotate3d(${(rand() * 2 - 1).toFixed(2)}, 0.2, ${(rand() * 2 - 1).toFixed(2)}, ${(28 + rand() * 40).toFixed(0)}deg)`;
    const radius = 8.5 + o * 3;
    const track = document.createElement('div');
    track.className = 'track';
    track.style.width = `${radius * 2}em`;
    track.style.height = `${radius * 2}em`;
    track.style.left = `${-radius}em`;
    track.style.top = `${-radius}em`;
    track.style.transform = 'rotateX(90deg)';
    orbit.appendChild(track);
    const spin = document.createElement('div');
    spin.className = 'spin';
    spin.style.setProperty('--dur', `calc(var(--sa-base, 24s) * ${(0.7 + o * 0.5).toFixed(2)})`);
    spin.style.setProperty('--delay', `${(-rand() * 20).toFixed(1)}s`);
    const nSats = 2 + Math.round(p.density * 2); // 2..4 per orbit
    for (let s = 0; s < nSats; s++) {
      const sat = document.createElement('div');
      sat.className = 'sat';
      sat.style.setProperty('--col', `var(--sa-c${(o + s) % 3})`);
      sat.style.transform = `rotateY(${((s * 360) / nSats + rand() * 20).toFixed(0)}deg) translateZ(${radius}em)`;
      spin.appendChild(sat);
    }
    orbit.appendChild(spin);
    system.appendChild(orbit);
  }
  css3d.stage.appendChild(system);

  let lastKey = null;
  function reconcile() {
    const params = getParams();
    const c = getColors();
    const sp = Math.max(0.05, params.speed);
    css3d.setVars({
      '--sa-base': `${(24 / sp).toFixed(2)}s`,
      '--sa-predur': `${(120 / sp).toFixed(2)}s`,
      '--sa-op': (0.7 + params.intensity * 0.3).toFixed(2),
    });
    const key = rgb(c.primary) + rgb(c.accent) + rgb(c.info) + rgb(c.fg) + rgb(c.bg);
    if (key !== lastKey) {
      lastKey = key;
      css3d.setVars({
        '--sa-planet': rgb(mix(c.primary, c.bg, 0.45)),
        '--sa-track': rgba(c.fg, 0.3),
        '--sa-c0': rgb(c.primary),
        '--sa-c1': rgb(c.accent),
        '--sa-c2': rgb(c.info),
      });
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
    resize(w, h) {
      css3d.stage.style.fontSize = `${Math.min(16, Math.max(3, Math.min(w, h) / 30))}px`;
    },
    dispose() {
      css3d.dispose();
    },
  };
}
```

Register after `chamber`:

```js
  satellites: { renderer: 'css3d', group: 'dimensional', loader: () => import('./satellites.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/dimensional-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (8 dimensional-wave smokes).

- [ ] **Step 5: Commit**

```bash
git add src/presets/satellites.js src/presets/index.js test/dimensional-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): satellites — an orrery of themed cards ($SATELLITES)"
bd close $SATELLITES
git add .beads/issues.jsonl && git commit -m "chore(beads): close $SATELLITES"
```

---

### Task 9: API reference rows

**Files:**
- Modify: `docs/api.html` (the existing "Dimensional / CSS-3D presets" table)

**Interfaces:**
- Consumes: the 8 registered names.
- Produces: 187/187 catalog coverage.

- [ ] **Step 1: Add the rows** (after the existing `fly-through` row, matching its single-line `<tr>` markup)

```html
            <tr><td><code>carousel</code></td><td>A rolodex ring of theme-gradient cards orbiting the camera, precessing slowly</td><td>primary, accent, info, background</td></tr>
            <tr><td><code>gyroscope</code></td><td>Nested wireframe rings spinning on seeded axes around a pulsing core</td><td>primary, accent, info, foreground</td></tr>
            <tr><td><code>monolith</code></td><td>Dark slabs tumbling slowly over a floor grid, primary edge sheen</td><td>primary, foreground, background</td></tr>
            <tr><td><code>shards</code></td><td>A rotating shell of translucent crystal fragments, each shimmering on its own cycle</td><td>primary, accent, info</td></tr>
            <tr><td><code>cube-wave</code></td><td>An isometric board of real boxes bobbing in a wave radiating from center</td><td>primary, background</td></tr>
            <tr><td><code>skyline</code></td><td>Extruded window-striped city blocks the camera pans past; a few accent-lit roofs</td><td>primary, accent, foreground, background</td></tr>
            <tr><td><code>chamber</code></td><td>Inside a slowly rotating room of gradient walls with a drifting warm glow</td><td>primary, accent, warning, foreground, background</td></tr>
            <tr><td><code>satellites</code></td><td>A disc-built planet with three tilted orbits carrying themed cards</td><td>primary, accent, info, foreground, background</td></tr>
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

Expected: `187 registered; 0 missing: []`

- [ ] **Step 3: Commit**

```bash
git add docs/api.html
git commit -m "docs(api): rows for the eight dimensional-wave presets"
```

---

### Task 10: Container visual baselines (+ paused-still & light-ground inspection)

**Files:**
- Create: `test/visual.spec.js-snapshots/{carousel,gyroscope,monolith,shards,cube-wave,skyline,chamber,satellites}-visual-linux.png`

**Interfaces:**
- Consumes: Docker (`docker info --format ok`; else `open -a OrbStack`, wait, retry) + `mcr.microsoft.com/playwright:v1.60.0-jammy`. explode/fly-through prove css3d baselines are deterministic when animations pause on negative delays.

- [ ] **Step 1: Generate (anchored filter)**

```bash
docker run --rm --ipc=host --platform=linux/amd64 -v "$PWD:/work" -v /work/node_modules \
  -w /work mcr.microsoft.com/playwright:v1.60.0-jammy \
  bash -lc "npm ci --no-audit --no-fund >/dev/null 2>&1 && npx playwright test --project=visual --update-snapshots -g '(^| )(carousel|gyroscope|monolith|shards|cube-wave|skyline|chamber|satellites)$'"
```

Expected: 8 pass, 8 `writing actual`; `git status --porcelain test/visual.spec.js-snapshots/` shows exactly eight new files.

- [ ] **Step 2: Verify determinism**

Re-run the Step 1 command with `--update-snapshots` REMOVED. Expected: 8/8 pass.

- [ ] **Step 3: Paused-still + light-ground inspection**

Read all eight PNGs. Each must show its scene mid-motion (carousel cards fanned around the ring, gyroscope rings at oblique angles, monoliths tilted mid-tumble, the cube-wave mid-swell, satellites scattered around their orbits — NOT everything at a degenerate start pose) and legible on the light theme. A blank, collapsed-to-center, or all-at-0% still = STOP and report DONE_WITH_CONCERNS naming the preset and the suspect animation.

- [ ] **Step 4: Commit**

```bash
git add test/visual.spec.js-snapshots/
git commit -m "test(visual): baselines for the eight dimensional-wave presets"
```

---

### Task 11: Demo `sculpture-hall.html`

**Files:**
- Create: `demos/sculpture-hall.html`
- Modify: `demos/index.html` (append a `.bw-card` tile after the current last card)

**Interfaces:**
- Consumes: presets `carousel`, `gyroscope`, `shards`, `monolith`.

- [ ] **Step 1: Write the page**

Create `demos/sculpture-hall.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sculpture Hall &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* A hall of kinetic sculpture: four rooms, four machines, one placard
       each. Museum-dark palette so the pieces carry the light. */
    :root {
      --color-background: #121016;  /* gallery dusk */
      --color-foreground: #eae6dd;
      --color-primary: #8e6fd8;     /* amethyst */
      --color-accent: #d8a25a;      /* brass */
      --color-info: #5aa7c9;        /* verdigris */
      --color-warning: #d8c85a;
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    pedestal-placard {
      display: block; position: absolute; left: 50%; transform: translateX(-50%);
      bottom: clamp(26px, 7vh, 64px); max-width: 420px; text-align: center;
      padding: 16px 28px; background: rgba(18, 16, 22, 0.8);
      border: 1px solid rgba(234, 230, 221, 0.28); border-top: 3px solid var(--color-accent);
    }
    placard-no { display: block; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 6px; }
    pedestal-placard h1, pedestal-placard h2 { font-family: Marcellus, Georgia, serif; font-weight: 400; margin: 0 0 6px; line-height: 1.05; }
    pedestal-placard h1 { font-size: clamp(32px, 5vw, 56px); }
    pedestal-placard h2 { font-size: clamp(24px, 3.6vw, 40px); }
    pedestal-placard p { margin: 0; font-weight: 300; line-height: 1.6; font-size: 14px; }
    code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(234, 230, 221, 0.12); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="carousel" data-background-intensity="0.7" data-background-seed="5" data-background-speed="0.8">
    <pedestal-placard>
      <placard-no>No. 1 &middot; mixed media, motorized</placard-no>
      <h1>Sculpture Hall</h1>
      <p>&ldquo;Rolodex, Unbound&rdquo; &mdash; the artist declined to say which card is yours. <code>data-background="carousel"</code></p>
    </pedestal-placard>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="gyroscope" data-background-intensity="0.7" data-background-seed="11" data-background-speed="0.7">
    <pedestal-placard>
      <placard-no>No. 2 &middot; steel, patience</placard-no>
      <h2>Momentum, Conserved</h2>
      <p>Every ring disagrees about which way is up. <code>data-background="gyroscope"</code></p>
    </pedestal-placard>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="shards" data-background-intensity="0.75" data-background-seed="8" data-background-speed="0.6">
    <pedestal-placard>
      <placard-no>No. 3 &middot; glass, suspended</placard-no>
      <h2>The Slow Shatter</h2>
      <p>A window breaking over the course of a year. <code>data-background="shards"</code></p>
    </pedestal-placard>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="monolith" data-background-intensity="0.65" data-background-seed="14" data-background-speed="0.5">
    <pedestal-placard>
      <placard-no>No. 4 &middot; basalt, attributed</placard-no>
      <h2>Visitors</h2>
      <p>They were here before the museum. The museum is diplomatic about it. <code>data-background="monolith"</code></p>
    </pedestal-placard>
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
        <browser-window mode="dark" shadow data-demo-src="./sculpture-hall.html" title="Sculpture Hall"
                        url="profpowell.github.io/bg-wc/demos/sculpture-hall.html"></browser-window>
        <a class="bw-open" href="./sculpture-hall.html" aria-label="Open the Sculpture Hall demo"></a>
        <div class="meta"><span class="name">Sculpture Hall</span><span class="desc">four kinetic machines, one placard each</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "sculpture-hall"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/sculpture-hall.html demos/index.html
git commit -m "docs(demos): sculpture-hall — four kinetic machines ($HALL)"
bd close $HALL
git add .beads/issues.jsonl && git commit -m "chore(beads): close $HALL"
```

---

### Task 12: Demo `diorama.html`

**Files:**
- Create: `demos/diorama.html`
- Modify: `demos/index.html` (append a `.bw-card` tile)

**Interfaces:**
- Consumes: presets `cube-wave`, `skyline`, `chamber`, `satellites`.

- [ ] **Step 1: Write the page**

Create `demos/diorama.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Diorama &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,600&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* Model worlds under glass: four cases, four little universes, a brass
       case label on each. Natural-history palette. */
    :root {
      --color-background: #f2ede2;  /* museum daylight */
      --color-foreground: #2c2a24;
      --color-primary: #4a7a6a;     /* case-felt green */
      --color-accent: #c07840;      /* brass label */
      --color-info: #5878a0;        /* model-sea blue */
      --color-warning: #d0a43c;
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    case-label {
      display: block; position: absolute; max-width: 400px; padding: 16px 24px;
      background: var(--color-background); border: 1.5px solid var(--color-foreground);
      box-shadow: 4px 4px 0 rgba(44, 42, 36, 0.2);
    }
    case-label[data-at="tl"] { top: clamp(56px, 9vh, 88px); left: clamp(24px, 5vw, 72px); }
    case-label[data-at="br"] { bottom: clamp(26px, 7vh, 64px); right: clamp(24px, 5vw, 72px); }
    label-cat { display: block; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 6px; }
    case-label h1, case-label h2 { font-family: Fraunces, Georgia, serif; font-weight: 600; margin: 0 0 6px; line-height: 1.02; }
    case-label h1 { font-size: clamp(32px, 5vw, 56px); }
    case-label h2 { font-size: clamp(24px, 3.6vw, 40px); }
    case-label p { margin: 0; font-weight: 300; line-height: 1.6; font-size: 14px; }
    code { font-family: ui-monospace, monospace; font-size: 0.85em; background: rgba(44, 42, 36, 0.08); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="cube-wave" data-background-intensity="0.7" data-background-seed="6" data-background-speed="0.8">
    <case-label data-at="tl">
      <label-cat>Case I &middot; kinetic terrain</label-cat>
      <h1>Diorama</h1>
      <p>The ground does this when nobody watches. <code>data-background="cube-wave"</code></p>
    </case-label>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="skyline" data-background-intensity="0.7" data-background-seed="10" data-background-speed="0.6">
    <case-label data-at="br">
      <label-cat>Case II &middot; scale 1:5000</label-cat>
      <h2>Model City, Dusk</h2>
      <p>Somebody left the lights on in accounting. <code>data-background="skyline"</code></p>
    </case-label>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="chamber" data-background-intensity="0.75" data-background-seed="3" data-background-speed="0.6">
    <case-label data-at="tl">
      <label-cat>Case III &middot; interior, rotating</label-cat>
      <h2>The Room That Turns</h2>
      <p>Step in; the walls will come around to you. <code>data-background="chamber"</code></p>
    </case-label>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="satellites" data-background-intensity="0.7" data-background-seed="9" data-background-speed="0.7">
    <case-label data-at="br">
      <label-cat>Case IV &middot; orrery, brass &amp; card</label-cat>
      <h2>A Small Cosmos</h2>
      <p>Three orbits, no collisions on record. <code>data-background="satellites"</code></p>
    </case-label>
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
        <browser-window mode="light" shadow data-demo-src="./diorama.html" title="Diorama"
                        url="profpowell.github.io/bg-wc/demos/diorama.html"></browser-window>
        <a class="bw-open" href="./diorama.html" aria-label="Open the Diorama demo"></a>
        <div class="meta"><span class="name">Diorama</span><span class="desc">model worlds under glass</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "diorama"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/diorama.html demos/index.html
git commit -m "docs(demos): diorama — model worlds under glass ($DIORAMA)"
bd close $DIORAMA
git add .beads/issues.jsonl && git commit -m "chore(beads): close $DIORAMA"
```

---

### Task 13: Final gates, coverage, push

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

Expected: `registered 187  demoed 187  missing []`.

- [ ] **Step 3: Push (MANDATORY)**

```bash
git pull --rebase
git push
git status   # MUST be up to date with origin
bd ready     # no dimensional-wave issues left open
```

Then watch CI and the gated Pages deploy; spot-check one demo and the dimensional gallery tab live.
