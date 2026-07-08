# Parrish Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 12 luminous/calming/deco presets (registry 187 → 199) and 3 demo homes.

**Architecture:** Standard canvas wave: one file + one REGISTRY entry per preset, all pure functions of `t`; eleven canvas2d + one WebGL shader (`halcyon`). New self-contained `test/parrish-wave.spec.js`; eleven canvas2d newcomers join time-rule; PARRISH_WAVE map test in groups-unit. Luminous skies derive tones by mixing theme colors toward warm/cool anchor tuples — a documented deviation (cyanotype precedent) — but every tone still moves with the theme.

**Tech Stack:** Vanilla JS ES modules, Canvas2D + WebGL, Playwright, node:test, pinned Playwright Docker container.

**Spec:** `docs/superpowers/specs/2026-07-06-parrish-wave-design.md`

## Global Constraints

- Preset contract: colors from `getColors()` EVERY frame; motion PURE in pre-scaled `t` (no lastT/accumulation; never multiply by `params.speed`); `mulberry32(params.seed)` layouts; `staticFrame(params)`; `dispose()`; no `mode` attributes.
- Color strings only via `rgbCss`/`rgbaCss` from `../renderer/tokens.js`; blends via `mix` from `./_dots.js`. Anchor-tuple mixes (e.g. `mix(c.primary, [0.1, 0.2, 0.5], 0.5)`) are allowed ONLY where the preset header documents the deviation.
- Light-ground rule (gl-wc-0eq6): everything must stay legible on the light baseline theme — colored ink, never fg-alpha-only glows; remember the screen/multiply luminance lessons for anything luminous.
- Frozen-`t` rule: every animation envelope visibly non-zero at `t = 0`.
- Before each commit: `set -o pipefail; npm run lint && npm run format:check && npm run cem:check` (prettier --write first if needed; commit regenerated custom-elements.json). After `bd close <id>`, commit `.beads/issues.jsonl` immediately; `git status --porcelain .beads/` clean before reporting. BOTH commits carry the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` — verify with `git log -2 --format="%(trailers)"`.
- Demos: zero `<div>`/`class=`, binder-only backgrounds, script block `import 'vanilla-breeze/css'` then `import '../src/data-background.js'`, crumbs carry `target="_top"`.
- Do NOT run `git pull`/`git push` mid-task — the controller owns branch sync.

---

### Task 0: File bd issues

**Files:** none (tracker only)

**Interfaces:**
- Produces: fifteen issue IDs referenced later as `$CUMULUS`, `$TERRACE`, `$OILSKY`, `$MOONRISE`, `$LILY`, `$MEADOW`, `$TIDE`, `$HALCYON`, `$FANDECO`, `$SPIRES`, `$PEACOCK`, `$GILDED`, `$DAYBREAK`, `$RETREAT`, `$FOYER`.

- [ ] **Step 1: Create the issues**

```bash
for t in \
  "Preset: cumulus (canvas2d, atmospheric)" \
  "Preset: terrace (canvas2d, art)" \
  "Preset: oil-sky (canvas2d, art)" \
  "Preset: moonrise (canvas2d, atmospheric)" \
  "Preset: lily-pond (canvas2d, nature)" \
  "Preset: meadow (canvas2d, nature)" \
  "Preset: tide (canvas2d, nature)" \
  "Preset: halcyon (webgl, gradient)" \
  "Preset: fan-deco (canvas2d, pop)" \
  "Preset: deco-spires (canvas2d, pop)" \
  "Preset: peacock (canvas2d, pop)" \
  "Preset: gilded (canvas2d, ornamental)" \
  "Demo: daybreak.html (cumulus, terrace, oil-sky, moonrise)" \
  "Demo: the-retreat.html (lily-pond, meadow, tide, halcyon)" \
  "Demo: grand-foyer.html (deco-spires, fan-deco, peacock, gilded)"; do
  bd create --type=task --priority=2 --title="$t" --description="Parrish wave, per spec docs/superpowers/specs/2026-07-06-parrish-wave-design.md"
done
```

Record the fifteen printed IDs.

---

### Task 1: Preset `cumulus` (creates the wave's test scaffolding)

**Files:**
- Create: `src/presets/cumulus.js`, `test/parrish-wave.spec.js`
- Modify: `src/presets/index.js` (atmospheric block, next to `aurora`), `test/time-rule.spec.js` (PRESETS), `test/groups-unit.mjs` (append the wave test)

**Interfaces:**
- Consumes: `mulberry32` from `../util/pause.js`; `clearAndFill` from `../renderer/canvas2d.js`; `rgbCss`/`rgbaCss` from `../renderer/tokens.js`; `mix` from `./_dots.js`.
- Produces: registry key `cumulus`; `test/parrish-wave.spec.js` whose `PRESETS` array later tasks extend; `PARRISH_WAVE` map in groups-unit that later tasks extend.

- [ ] **Step 1: Write the failing tests**

Create `test/parrish-wave.spec.js`:

```js
import { test, expect } from '@playwright/test';

// Render smoke for the 2026-07-07 parrish-wave presets: each must mount
// without fallback and produce a non-blank still. Baselines live in the
// visual project; the eleven canvas2d presets are pinned pure-in-t by
// time-rule.spec.js; halcyon is pure u_time by construction.

const PRESETS = ['cumulus'];

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

`test/time-rule.spec.js`: append `'cumulus'` to the PRESETS array.

Append to `test/groups-unit.mjs` (after the DIMENSIONAL_WAVE test):

```js
test('parrish-wave presets landed in their groups (2026-07-07)', () => {
  const PARRISH_WAVE = {
    cumulus: 'atmospheric',
  };
  const byName = new Map(listPresets().map((p) => [p.name, p.group]));
  for (const [name, group] of Object.entries(PARRISH_WAVE)) {
    assert.equal(byName.get(name), group, `${name} in ${group}`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `cumulus` cases FAIL; node wave test FAILS.

- [ ] **Step 3: Write the preset**

Create `src/presets/cumulus.js`:

```js
// cumulus — the Parrish sky. Stacked billowing cloud masses, each a seeded
// cluster of soft discs shaded bright-top/shadow-bottom with a warm rim on
// the sun side, drifting glacially across a saturated two-stop sky.
// DESIGN NOTE (documented deviation, cyanotype precedent): the sky ramp
// mixes theme colors toward fixed warm/cool anchors — Parrish light IS a
// deep ultramarine-to-gold ramp; the theme still tints both ends.
// density = cloud count, intensity = rim-light strength.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const COOL = [0.08, 0.18, 0.45]; // ultramarine anchor
const WARM = [1, 0.82, 0.55]; // gold anchor

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let masses = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 101);
    const n = 3 + Math.round(params.density * 2); // 3..5 masses
    masses = [];
    for (let i = 0; i < n; i++) {
      const puffs = [];
      const nb = 6 + ((rand() * 6) | 0);
      for (let k = 0; k < nb; k++) {
        puffs.push({
          dx: (rand() - 0.5) * 0.22,
          dy: (rand() - 0.5) * 0.07 - k * 0.004,
          r: 0.035 + rand() * 0.05,
        });
      }
      // Flat base: sort puffs so lower ones render first and clip a common floor.
      puffs.sort((a, b) => b.dy - a.dy);
      masses.push({
        y: 0.18 + rand() * 0.42,
        off: rand(),
        v: 0.008 + rand() * 0.012,
        scale: 0.7 + rand() * 0.7,
        puffs,
        phase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!masses.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);

    // The Parrish ramp: cool zenith to warm horizon.
    const top = mix(c.primary, COOL, 0.55);
    const hor = mix(c.accent, WARM, 0.45);
    const sky = c2d.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgbCss(top));
    sky.addColorStop(0.75, rgbCss(mix(top, hor, 0.65)));
    sky.addColorStop(1, rgbCss(hor));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    const rim = 0.35 + params.intensity * 0.45;
    for (const m of masses) {
      const mx = (((m.off + t * m.v) % 1.3) - 0.15) * w;
      const my = m.y * h;
      const breathe = 1 + 0.08 * Math.sin(t * 0.13 + m.phase);
      for (const p of m.puffs) {
        const x = mx + p.dx * s * m.scale * 2.2;
        const y = my + p.dy * s * m.scale * 2.2;
        const r = p.r * s * m.scale;
        // Body: bright top fading to sky-shadow bottom.
        const g = c2d.createLinearGradient(0, y - r, 0, y + r);
        g.addColorStop(0, rgbCss(mix([1, 1, 1], top, 0.08)));
        g.addColorStop(0.7, rgbCss(mix([1, 1, 1], top, 0.3)));
        g.addColorStop(1, rgbCss(mix(top, hor, 0.5)));
        c2d.fillStyle = g;
        c2d.beginPath();
        c2d.arc(x, y, r, 0, Math.PI * 2);
        c2d.fill();
        // Warm rim on the sun (lower-left) side.
        c2d.strokeStyle = rgbaCss(hor, rim * breathe * 0.5);
        c2d.lineWidth = Math.max(1.5, r * 0.12) * px;
        c2d.beginPath();
        c2d.arc(x, y, r * 0.97, Math.PI * 0.45, Math.PI * 1.05);
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
      masses = [];
    },
  };
}
```

Register in the atmospheric block next to `aurora`:

```js
  cumulus: { renderer: 'canvas2d', group: 'atmospheric', loader: () => import('./cumulus.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/cumulus.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): cumulus — rim-lit Parrish clouds ($CUMULUS)"
bd close $CUMULUS
git add .beads/issues.jsonl && git commit -m "chore(beads): close $CUMULUS"
```

---

### Task 2: Preset `terrace`

**Files:**
- Create: `src/presets/terrace.js`
- Modify: `src/presets/index.js` (art block, next to `brushstroke`), `test/parrish-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers (incl. COOL/WARM-style anchors — declare locally).
- Produces: registry key `terrace` (canvas2d, art).

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'terrace'`.
`test/time-rule.spec.js` PRESETS: append `'terrace'`.
`test/groups-unit.mjs` PARRISH_WAVE map: add `terrace: 'art',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `terrace` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/terrace.js`:

```js
// terrace — the classical Parrish stage. Dark column silhouettes and an urn
// frame a luminous sky; a balustrade closes the foreground; the light
// breathes gently through the opening. Architecture only, never figures.
// DESIGN NOTE (documented deviation): the sky ramp mixes theme colors
// toward warm/cool anchors, as in cumulus — the theme tints both ends.
// density = column count, intensity = glow strength.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const COOL = [0.08, 0.18, 0.45];
const WARM = [1, 0.82, 0.55];

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let cols = [];
  let urnX = 0.7;
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 103);
    const n = 2 + Math.round(params.density); // 2..3 columns
    cols = [];
    for (let i = 0; i < n; i++) {
      // Columns hug the frame edges, leaving the sky open.
      const side = i % 2 === 0 ? 0.06 + rand() * 0.1 : 0.84 + rand() * 0.1;
      cols.push({ x: side, cw: 0.055 + rand() * 0.02 });
    }
    urnX = 0.3 + rand() * 0.4;
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!cols.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);

    const top = mix(c.primary, COOL, 0.55);
    const hor = mix(c.accent, WARM, 0.5);
    const sky = c2d.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgbCss(top));
    sky.addColorStop(0.7, rgbCss(mix(top, hor, 0.7)));
    sky.addColorStop(1, rgbCss(hor));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    // The breathing glow at the heart of the opening.
    const glowA = (0.1 + params.intensity * 0.14) * (1 + 0.25 * Math.sin(t * 0.2));
    const glow = c2d.createRadialGradient(w * 0.5, h * 0.58, 0, w * 0.5, h * 0.58, s * 0.55);
    glow.addColorStop(0, rgbaCss(mix(hor, [1, 1, 1], 0.5), glowA));
    glow.addColorStop(1, rgbaCss(hor, 0));
    c2d.fillStyle = glow;
    c2d.fillRect(0, 0, w, h);

    // Silhouette ink: near-black derived from fg so it works in any theme.
    const ink = rgbCss(mix(c.fg, [0, 0, 0], 0.55));
    const baluY = h * 0.82;

    for (const col of cols) {
      const cw = col.cw * w;
      const x = col.x * w - cw / 2;
      c2d.fillStyle = ink;
      c2d.fillRect(x, 0, cw, baluY); // shaft
      c2d.fillRect(x - cw * 0.25, 0, cw * 1.5, h * 0.035); // capital
      c2d.fillRect(x - cw * 0.18, h * 0.05, cw * 1.36, h * 0.015); // astragal
      c2d.fillRect(x - cw * 0.25, baluY - h * 0.03, cw * 1.5, h * 0.03); // base
    }

    // Urn on the balustrade.
    const ux = urnX * w;
    const ur = s * 0.045;
    c2d.fillStyle = ink;
    c2d.beginPath();
    c2d.ellipse(ux, baluY - ur * 1.4, ur, ur * 0.85, 0, 0, Math.PI * 2);
    c2d.fill();
    c2d.fillRect(ux - ur * 0.55, baluY - ur * 0.7, ur * 1.1, ur * 0.7); // bowl base
    c2d.fillRect(ux - ur * 0.8, baluY - ur * 2.5, ur * 1.6, ur * 0.18); // lip
    c2d.fillRect(ux - ur * 0.12, baluY - ur * 2.5, ur * 0.24, ur * 1.2); // stem

    // Balustrade: rail, posts, plinth.
    c2d.fillStyle = ink;
    c2d.fillRect(0, baluY, w, h * 0.03);
    const posts = 9;
    for (let k = 0; k <= posts; k++) {
      const bx = (k / posts) * w;
      c2d.fillRect(bx - 2.5 * px, baluY + h * 0.03, 5 * px, h * 0.08);
    }
    c2d.fillRect(0, baluY + h * 0.11, w, h - (baluY + h * 0.11));
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
      cols = [];
    },
  };
}
```

Register in the art block next to `brushstroke`:

```js
  terrace: { renderer: 'canvas2d', group: 'art', loader: () => import('./terrace.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/terrace.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): terrace — columns framing luminous sky ($TERRACE)"
bd close $TERRACE
git add .beads/issues.jsonl && git commit -m "chore(beads): close $TERRACE"
```

---

### Task 3: Preset `oil-sky`

**Files:**
- Create: `src/presets/oil-sky.js`
- Modify: `src/presets/index.js` (art block, after `terrace`), `test/parrish-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `'oil-sky'` (canvas2d, art).

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'oil-sky'`.
`test/time-rule.spec.js` PRESETS: append `'oil-sky'`.
`test/groups-unit.mjs` PARRISH_WAVE map: add `'oil-sky': 'art',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `oil-sky` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/oil-sky.js`:

```js
// oil-sky — a skyscape in visible strokes. Horizontal banded brushwork,
// warm at the horizon rising to cool at the zenith, every stroke a short
// rounded dab with seeded misalignment and its own faint shimmer. Distinct
// from `brushstroke` (abstract swirl field): this one paints a SKY.
// DESIGN NOTE (documented deviation): band tones mix theme colors toward
// warm/cool anchors — the theme tints the whole canvas.
// density = strokes per band, intensity = stroke contrast.

import { mulberry32 } from '../util/pause.js';
import { rgbCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const COOL = [0.12, 0.2, 0.42];
const WARM = [1, 0.78, 0.5];
const BANDS = 5;

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let strokes = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 107);
    const per = Math.floor(26 + params.density * 40); // strokes per band
    strokes = [];
    for (let b = 0; b < BANDS; b++) {
      for (let k = 0; k < per; k++) {
        strokes.push({
          band: b,
          x: rand() * 1.1 - 0.05,
          y: (b + rand()) / BANDS,
          len: 0.05 + rand() * 0.09,
          lw: (4 + rand() * 6) * px,
          tilt: (rand() - 0.5) * 0.12,
          tone: rand(), // where this dab sits between band color and its lightened kin
          phase: rand() * Math.PI * 2,
          w2: 0.3 + rand() * 0.8,
        });
      }
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!strokes.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();

    // Underpainting: the smooth ramp the dabs sit on.
    const top = mix(c.primary, COOL, 0.5);
    const hor = mix(c.accent, WARM, 0.45);
    const base = c2d.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, rgbCss(top));
    base.addColorStop(1, rgbCss(hor));
    c2d.fillStyle = base;
    c2d.fillRect(0, 0, w, h);

    const contrast = 0.2 + params.intensity * 0.35;
    c2d.lineCap = 'round';
    for (const st of strokes) {
      const bandMix = st.band / (BANDS - 1); // 0 = zenith band, 1 = horizon
      const bandCol = mix(top, hor, bandMix);
      const lit = mix(bandCol, [1, 1, 1], contrast * st.tone);
      const shaded = mix(bandCol, COOL, contrast * (1 - st.tone) * 0.5);
      const col = st.tone > 0.5 ? lit : shaded;
      const shimmer = 1 + 0.06 * Math.sin(t * st.w2 + st.phase);
      c2d.strokeStyle = rgbCss(col);
      c2d.lineWidth = st.lw * shimmer;
      const x = st.x * w;
      const y = st.y * h;
      const L = st.len * w;
      c2d.beginPath();
      c2d.moveTo(x, y);
      c2d.lineTo(x + L, y + L * st.tilt);
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
    },
  };
}
```

Register after `terrace`:

```js
  'oil-sky': { renderer: 'canvas2d', group: 'art', loader: () => import('./oil-sky.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/oil-sky.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): oil-sky — banded brushwork skyscape ($OILSKY)"
bd close $OILSKY
git add .beads/issues.jsonl && git commit -m "chore(beads): close $OILSKY"
```

---

### Task 4: Preset `moonrise`

**Files:**
- Create: `src/presets/moonrise.js`
- Modify: `src/presets/index.js` (atmospheric block, after `cumulus`), `test/parrish-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `moonrise` (canvas2d, atmospheric).

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'moonrise'`.
`test/time-rule.spec.js` PRESETS: append `'moonrise'`.
`test/groups-unit.mjs` PARRISH_WAVE map: add `moonrise: 'atmospheric',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `moonrise` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/moonrise.js`:

```js
// moonrise — calm night. A big low moon with a soft halo, thin luminous
// cloud bands drifting across it, faint seeded stars, and a shimmering
// reflection column below the horizon. Everything glacial.
// DESIGN NOTE (documented deviation): the night ramp mixes the theme
// primary toward a deep-night anchor; the moon face mixes fg toward white.
// density = cloud band count, intensity = halo/reflection strength.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const NIGHT = [0.05, 0.08, 0.2];

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let bands = [];
  let stars = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 109);
    const n = 2 + Math.round(params.density * 2); // 2..4 bands
    bands = [];
    for (let i = 0; i < n; i++) {
      bands.push({
        y: 0.22 + rand() * 0.34,
        th: 0.012 + rand() * 0.02,
        off: rand(),
        v: 0.006 + rand() * 0.008,
        span: 0.35 + rand() * 0.4,
      });
    }
    stars = [];
    for (let i = 0; i < 40; i++) {
      stars.push({ x: rand(), y: rand() * 0.6, tw: 0.4 + rand() * 1.4, phase: rand() * Math.PI * 2 });
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
    const s = Math.min(w, h);
    const horizon = h * 0.72;
    const mx = w * 0.62;
    const my = h * 0.38;
    const mr = s * 0.13;

    const nightTop = mix(c.primary, NIGHT, 0.65);
    const nightHor = mix(c.primary, NIGHT, 0.35);
    const sky = c2d.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, rgbCss(nightTop));
    sky.addColorStop(1, rgbCss(nightHor));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, horizon);
    // The water below is the sky, darker.
    c2d.fillStyle = rgbCss(mix(nightHor, [0, 0, 0], 0.35));
    c2d.fillRect(0, horizon, w, h - horizon);

    // Stars.
    for (const st of stars) {
      const a = 0.25 + 0.3 * Math.sin(t * st.tw + st.phase);
      c2d.fillStyle = rgbaCss(c.fg, Math.max(0.05, a));
      c2d.fillRect(st.x * w, st.y * h, 1.2 * px, 1.2 * px);
    }

    // Halo, then the moon face.
    const moon = mix(c.fg, [1, 1, 1], 0.7);
    const haloA = (0.18 + params.intensity * 0.2) * (1 + 0.12 * Math.sin(t * 0.17));
    const halo = c2d.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2);
    halo.addColorStop(0, rgbaCss(moon, haloA));
    halo.addColorStop(1, rgbaCss(moon, 0));
    c2d.fillStyle = halo;
    c2d.fillRect(0, 0, w, horizon);
    c2d.fillStyle = rgbCss(moon);
    c2d.beginPath();
    c2d.arc(mx, my, mr, 0, Math.PI * 2);
    c2d.fill();
    // Two faint maria to keep it a moon, not a dot.
    c2d.fillStyle = rgbaCss(mix(moon, nightTop, 0.35), 0.6);
    c2d.beginPath();
    c2d.arc(mx - mr * 0.3, my - mr * 0.15, mr * 0.22, 0, Math.PI * 2);
    c2d.arc(mx + mr * 0.22, my + mr * 0.28, mr * 0.16, 0, Math.PI * 2);
    c2d.fill();

    // Luminous cloud bands drifting across.
    for (const b of bands) {
      const bx = (((b.off + t * b.v) % 1.4) - 0.2) * w;
      const by = b.y * h;
      const bw = b.span * w;
      const grad = c2d.createLinearGradient(bx, 0, bx + bw, 0);
      const lum = mix(moon, nightHor, 0.45);
      grad.addColorStop(0, rgbaCss(lum, 0));
      grad.addColorStop(0.5, rgbaCss(lum, 0.5));
      grad.addColorStop(1, rgbaCss(lum, 0));
      c2d.fillStyle = grad;
      c2d.fillRect(bx, by - (b.th * h) / 2, bw, b.th * h);
    }

    // Reflection column: breathing width, broken shimmer.
    const refA = 0.12 + params.intensity * 0.18;
    for (let k = 0; k < 14; k++) {
      const ry = horizon + ((k + 0.5) / 14) * (h - horizon);
      const wob = Math.sin(t * 0.6 + k * 1.7) * mr * 0.25;
      const rw = mr * (1.1 - (k / 14) * 0.5) * (1 + 0.2 * Math.sin(t * 0.3 + k));
      c2d.fillStyle = rgbaCss(moon, refA * (1 - k / 16));
      c2d.fillRect(mx - rw / 2 + wob, ry, rw, (h - horizon) / 22);
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
      stars = [];
    },
  };
}
```

Register after `cumulus`:

```js
  moonrise: { renderer: 'canvas2d', group: 'atmospheric', loader: () => import('./moonrise.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/moonrise.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): moonrise — big moon, thin clouds, still water ($MOONRISE)"
bd close $MOONRISE
git add .beads/issues.jsonl && git commit -m "chore(beads): close $MOONRISE"
```

---

### Task 5: Preset `lily-pond`

**Files:**
- Create: `src/presets/lily-pond.js`
- Modify: `src/presets/index.js` (nature block, next to `leaves`), `test/parrish-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `'lily-pond'` (canvas2d, nature).

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'lily-pond'`.
`test/time-rule.spec.js` PRESETS: append `'lily-pond'`.
`test/groups-unit.mjs` PARRISH_WAVE map: add `'lily-pond': 'nature',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `lily-pond` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/lily-pond.js`:

```js
// lily-pond — Monet water. Vertical reflection smears of mixed sky tones,
// seeded lily-pad clusters adrift by millimeters, and slow ripple rings
// expanding on cyclic (t*v+phase)%1 clocks. Pads read as colored ink on
// any ground. density = pad clusters, intensity = reflection contrast.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let smears = [];
  let clusters = [];
  let ripples = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 113);
    smears = [];
    for (let i = 0; i < 26; i++) {
      smears.push({
        x: rand(),
        wd: 0.02 + rand() * 0.07,
        tone: rand(),
        sway: 0.15 + rand() * 0.5,
        phase: rand() * Math.PI * 2,
      });
    }
    const n = 5 + Math.round(params.density * 4); // 5..9 clusters
    clusters = [];
    for (let i = 0; i < n; i++) {
      const pads = [];
      const np = 2 + ((rand() * 3) | 0);
      for (let k = 0; k < np; k++) {
        pads.push({
          dx: (rand() - 0.5) * 0.09,
          dy: (rand() - 0.5) * 0.05,
          r: 0.02 + rand() * 0.03,
          notch: rand() * Math.PI * 2,
        });
      }
      clusters.push({ x: rand(), y: 0.15 + rand() * 0.75, pads, drift: rand() * Math.PI * 2 });
    }
    ripples = [];
    for (let i = 0; i < 3; i++) {
      ripples.push({ x: rand(), y: 0.2 + rand() * 0.6, v: 0.05 + rand() * 0.04, phase: rand() });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!smears.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);

    // Water ground.
    const deep = mix(c.info, c.bg, 0.35);
    c2d.fillStyle = rgbCss(deep);
    c2d.fillRect(0, 0, w, h);

    // Reflection smears: vertical soft columns of sky tones.
    const contrast = 0.25 + params.intensity * 0.35;
    for (const sm of smears) {
      const tone = mix(
        sm.tone < 0.5 ? c.primary : c.accent,
        deep,
        1 - contrast * (0.5 + Math.abs(sm.tone - 0.5))
      );
      const x = (sm.x + 0.004 * Math.sin(t * sm.sway + sm.phase)) * w;
      const grad = c2d.createLinearGradient(x, 0, x + sm.wd * w, 0);
      grad.addColorStop(0, rgbaCss(tone, 0));
      grad.addColorStop(0.5, rgbaCss(tone, 0.5));
      grad.addColorStop(1, rgbaCss(tone, 0));
      c2d.fillStyle = grad;
      c2d.fillRect(x, 0, sm.wd * w, h);
    }

    // Ripple rings.
    for (const r of ripples) {
      const p = (r.phase + t * r.v) % 1;
      const rr = p * s * 0.28;
      c2d.strokeStyle = rgbaCss(mix(c.fg, deep, 0.4), 0.35 * (1 - p));
      c2d.lineWidth = 1.2 * px;
      c2d.beginPath();
      c2d.ellipse(r.x * w, r.y * h, rr, rr * 0.35, 0, 0, Math.PI * 2);
      c2d.stroke();
    }

    // Lily pads: green derived from success mixed toward the water.
    const padCol = mix(c.success, deep, 0.25);
    const padLit = mix(padCol, [1, 1, 1], 0.2);
    for (const cl of clusters) {
      const cx = (cl.x + 0.006 * Math.sin(t * 0.11 + cl.drift)) * w;
      const cy = (cl.y + 0.004 * Math.cos(t * 0.09 + cl.drift)) * h;
      for (const p of cl.pads) {
        const x = cx + p.dx * s * 2;
        const y = cy + p.dy * s * 2;
        const r = p.r * s;
        c2d.fillStyle = rgbCss(p.dy < 0 ? padLit : padCol);
        c2d.beginPath();
        c2d.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
        c2d.fill();
        // The pad's notch: a wedge of water.
        c2d.fillStyle = rgbCss(deep);
        c2d.beginPath();
        c2d.moveTo(x, y);
        c2d.arc(x, y, r * 1.05, p.notch, p.notch + 0.5);
        c2d.closePath();
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
      smears = [];
      clusters = [];
      ripples = [];
    },
  };
}
```

Register in the nature block next to `leaves`:

```js
  'lily-pond': { renderer: 'canvas2d', group: 'nature', loader: () => import('./lily-pond.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/lily-pond.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): lily-pond — Monet water and drifting pads ($LILY)"
bd close $LILY
git add .beads/issues.jsonl && git commit -m "chore(beads): close $LILY"
```

---

### Task 6: Preset `meadow`

**Files:**
- Create: `src/presets/meadow.js`
- Modify: `src/presets/index.js` (nature block, after `lily-pond`), `test/parrish-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `meadow` (canvas2d, nature).

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'meadow'`.
`test/time-rule.spec.js` PRESETS: append `'meadow'`.
`test/groups-unit.mjs` PARRISH_WAVE map: add `meadow: 'nature',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `meadow` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/meadow.js`:

```js
// meadow — dusk grassland. Three parallax layers of curved grass blades
// swaying gently against a warm gradient, seed heads catching the last
// light. Nearer layers are darker and sway more. DESIGN NOTE (documented
// deviation): the dusk ramp mixes theme colors toward a warm anchor.
// density = blades per layer, intensity = sway depth.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const DUSK = [1, 0.72, 0.45];
const LAYERS = 3;

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let layers = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 127);
    layers = [];
    for (let l = 0; l < LAYERS; l++) {
      const blades = [];
      const n = Math.floor(30 + params.density * 50);
      for (let k = 0; k < n; k++) {
        blades.push({
          x: rand() * 1.05 - 0.025,
          len: 0.12 + rand() * 0.16 + l * 0.05,
          curve: (rand() - 0.5) * 0.5,
          swayW: 0.4 + rand() * 0.5,
          phase: rand() * Math.PI * 2,
          seedHead: rand() < 0.12,
        });
      }
      layers.push({ baseY: 0.78 + l * 0.09, blades });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!layers.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);

    const top = mix(c.primary, c.bg, 0.35);
    const low = mix(c.accent, DUSK, 0.45);
    const sky = c2d.createLinearGradient(0, 0, 0, h * 0.9);
    sky.addColorStop(0, rgbCss(top));
    sky.addColorStop(1, rgbCss(low));
    c2d.fillStyle = sky;
    c2d.fillRect(0, 0, w, h);

    const swayAmp = (0.015 + params.intensity * 0.02) * s;
    c2d.lineCap = 'round';
    layers.forEach((layer, l) => {
      const depth = l / (LAYERS - 1); // 0 far, 1 near
      const col = mix(mix(c.fg, [0, 0, 0], 0.3), low, 0.55 - depth * 0.45);
      const lw = (1 + depth * 1.6) * px;
      for (const b of layer.blades) {
        const bx = b.x * w;
        const by = layer.baseY * h;
        const L = b.len * s;
        // A shared breeze plus per-blade jitter; nearer layers move more.
        const sway =
          swayAmp * (0.5 + depth) * (Math.sin(t * 0.3 + bx * 0.01) * 0.6 + Math.sin(t * b.swayW + b.phase) * 0.4);
        const tipX = bx + b.curve * L + sway;
        const tipY = by - L;
        c2d.strokeStyle = rgbCss(col);
        c2d.lineWidth = lw;
        c2d.beginPath();
        c2d.moveTo(bx, by);
        c2d.quadraticCurveTo(bx + (b.curve * L) / 2, by - L * 0.55, tipX, tipY);
        c2d.stroke();
        if (b.seedHead) {
          c2d.fillStyle = rgbaCss(mix(c.warning, low, 0.3), 0.9);
          c2d.beginPath();
          c2d.arc(tipX, tipY, (1.4 + depth) * px, 0, Math.PI * 2);
          c2d.fill();
        }
      }
    });
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
      layers = [];
    },
  };
}
```

Register after `lily-pond`:

```js
  meadow: { renderer: 'canvas2d', group: 'nature', loader: () => import('./meadow.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/meadow.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): meadow — swaying dusk grassland ($MEADOW)"
bd close $MEADOW
git add .beads/issues.jsonl && git commit -m "chore(beads): close $MEADOW"
```

---

### Task 7: Preset `tide`

**Files:**
- Create: `src/presets/tide.js`
- Modify: `src/presets/index.js` (nature block, after `meadow`), `test/parrish-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `tide` (canvas2d, nature).

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'tide'`.
`test/time-rule.spec.js` PRESETS: append `'tide'`.
`test/groups-unit.mjs` PARRISH_WAVE map: add `tide: 'nature',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `tide` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/tide.js`:

```js
// tide — a breathing shoreline seen flat-on. The sea holds the upper frame;
// two or three translucent wave sheets advance and retreat on offset sin(t)
// cycles, each trailing a bright foam edge and a darker wet-sand stain.
// DESIGN NOTE (documented deviation): sand mixes the theme warning toward a
// sand anchor; the sea derives from info. density = sheet count,
// intensity = sheet opacity.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const SAND = [0.93, 0.85, 0.68];

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let sheets = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 131);
    const n = 2 + Math.round(params.density); // 2..3 sheets
    sheets = [];
    for (let i = 0; i < n; i++) {
      sheets.push({
        base: 0.4 + i * 0.14, // resting edge (fraction of h)
        amp: 0.06 + rand() * 0.06,
        wv: 0.16 + rand() * 0.1,
        phase: rand() * Math.PI * 2,
        f: 2 + rand() * 3, // edge waviness across x
        fphase: rand() * Math.PI * 2,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!sheets.length || key !== lastKey) rebuild(params);
  }

  function edgeY(sheet, x, t) {
    return (
      sheet.base +
      sheet.amp * Math.sin(t * sheet.wv + sheet.phase) +
      0.02 * Math.sin((x / w) * sheet.f * Math.PI * 2 + sheet.fphase + t * 0.1)
    );
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();

    // Sand ground with a wet band near the sea.
    const sand = mix(c.warning, SAND, 0.55);
    c2d.fillStyle = rgbCss(sand);
    c2d.fillRect(0, 0, w, h);
    const wet = mix(sand, mix(c.info, c.bg, 0.3), 0.35);
    const wetG = c2d.createLinearGradient(0, h * 0.35, 0, h * 0.75);
    wetG.addColorStop(0, rgbCss(wet));
    wetG.addColorStop(1, rgbaCss(wet, 0));
    c2d.fillStyle = wetG;
    c2d.fillRect(0, 0, w, h);

    // The sea behind everything.
    const sea = mix(c.info, c.bg, 0.15);
    c2d.fillStyle = rgbCss(sea);
    c2d.fillRect(0, 0, w, h * 0.32);

    // Sheets from back to front.
    const op = 0.25 + params.intensity * 0.3;
    const foam = mix([1, 1, 1], sea, 0.15);
    for (let i = sheets.length - 1; i >= 0; i--) {
      const sh = sheets[i];
      const steps = 24;
      c2d.beginPath();
      c2d.moveTo(0, 0);
      for (let k = 0; k <= steps; k++) {
        const x = (k / steps) * w;
        c2d.lineTo(x, edgeY(sh, x, t) * h);
      }
      c2d.lineTo(w, 0);
      c2d.closePath();
      c2d.fillStyle = rgbaCss(mix(sea, [1, 1, 1], i * 0.12), op);
      c2d.fill();
      // Foam edge.
      c2d.strokeStyle = rgbaCss(foam, 0.75);
      c2d.lineWidth = (1.6 + i * 0.6) * px;
      c2d.beginPath();
      for (let k = 0; k <= steps; k++) {
        const x = (k / steps) * w;
        const y = edgeY(sh, x, t) * h;
        if (k === 0) c2d.moveTo(x, y);
        else c2d.lineTo(x, y);
      }
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
      sheets = [];
    },
  };
}
```

Register after `meadow`:

```js
  tide: { renderer: 'canvas2d', group: 'nature', loader: () => import('./tide.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/tide.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): tide — breathing shoreline sheets ($TIDE)"
bd close $TIDE
git add .beads/issues.jsonl && git commit -m "chore(beads): close $TIDE"
```

---

### Task 8: Preset `halcyon` (the wave's WebGL shader)

**Files:**
- Create: `src/presets/halcyon.js`
- Modify: `src/presets/index.js` (gradient block, next to `mesh-gradient`), `test/parrish-wave.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: `makeShaderPreset` (uniforms u_res, u_time, u_intensity, u_density, u_c1, u_c2, u_c3, u_bg only).
- Produces: registry key `halcyon` (webgl, gradient). NOT in time-rule.

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'halcyon'`.
`test/groups-unit.mjs` PARRISH_WAVE map: add `halcyon: 'gradient',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `halcyon` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/halcyon.js`:

```js
// halcyon — the catalog's most restful entry. Enormous soft color fields
// (theme colors pulled far toward the ground) breathe into one another on
// very low-frequency fbm; no structure survives a squint, but a floor on
// the field contrast keeps it from reading blank (baseline requirement).
// Pure u_time. density = field scale, intensity = field presence.

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
  float a = 0.6;
  for (int k = 0; k < 3; k++) {
    v += a * vnoise(p);
    p = p * 1.9 + vec2(11.0, 7.0);
    a *= 0.5;
  }
  return v;
}

void main() {
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  float scale = 1.1 + u_density * 1.2;

  float f1 = fbm(p * scale + vec2(u_time * 0.008, u_time * 0.005));
  float f2 = fbm(p * scale * 0.8 + vec2(-u_time * 0.006, u_time * 0.009) + 31.0);
  float f3 = fbm(p * scale * 1.3 + vec2(u_time * 0.004, -u_time * 0.007) + 63.0);

  // presence keeps a visible floor (0.35) so the field never goes blank.
  float presence = 0.35 + 0.45 * u_intensity;
  vec3 t1 = mix(u_bg, u_c1, 0.4);
  vec3 t2 = mix(u_bg, u_c2, 0.35);
  vec3 t3 = mix(u_bg, u_c3, 0.3);

  vec3 col = u_bg;
  col = mix(col, t1, smoothstep(0.35, 0.75, f1) * presence);
  col = mix(col, t2, smoothstep(0.4, 0.8, f2) * presence * 0.8);
  col = mix(col, t3, smoothstep(0.45, 0.85, f3) * presence * 0.6);

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

Register in the gradient block next to `mesh-gradient`:

```js
  halcyon: { renderer: 'webgl', group: 'gradient', loader: () => import('./halcyon.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/halcyon.js src/presets/index.js test/parrish-wave.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): halcyon — breathing mist fields ($HALCYON)"
bd close $HALCYON
git add .beads/issues.jsonl && git commit -m "chore(beads): close $HALCYON"
```

---

### Task 9: Preset `fan-deco`

**Files:**
- Create: `src/presets/fan-deco.js`
- Modify: `src/presets/index.js` (pop block, next to `deco`), `test/parrish-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `'fan-deco'` (canvas2d, pop).

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'fan-deco'`.
`test/time-rule.spec.js` PRESETS: append `'fan-deco'`.
`test/groups-unit.mjs` PARRISH_WAVE map: add `'fan-deco': 'pop',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `fan-deco` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/fan-deco.js`:

```js
// fan-deco — Erté's scalloped shell-fans in a staggered repeat: half-disc
// fans with radiating ribs and scallop border arcs, gold-derived on a deep
// field, shimmering row by row. Gold = accent pulled toward white; the deep
// field = primary pulled toward the ground. density = fan size,
// intensity = gold brightness.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

const RIBS = 9;

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let jitters = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 137);
    jitters = [];
    for (let i = 0; i < 64; i++) jitters.push(rand());
    lastKey = `${params.seed}`;
  }

  function ensure(params) {
    if (!jitters.length || `${params.seed}` !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);
    const R = s * (0.16 - params.density * 0.06 + 0.06); // fan radius by density

    const field = mix(c.primary, c.bg, 0.55);
    c2d.fillStyle = rgbCss(field);
    c2d.fillRect(0, 0, w, h);

    const goldHi = mix(c.accent, [1, 1, 1], 0.25 + params.intensity * 0.25);
    const goldLo = mix(c.accent, field, 0.35);

    const stepX = R * 2;
    const stepY = R * 1.05;
    let row = 0;
    for (let y = 0; y < h + stepY; y += stepY, row++) {
      const offX = row % 2 ? R : 0;
      const shimmer = 0.75 + 0.25 * Math.sin(t * 0.4 + row * 0.9);
      let col = 0;
      for (let x = -R + offX; x < w + R; x += stepX, col++) {
        const j = jitters[(row * 13 + col) % jitters.length];
        // The shell: filled half-disc rising from its baseline.
        c2d.fillStyle = rgbCss(mix(goldLo, field, 0.25 + j * 0.2));
        c2d.beginPath();
        c2d.arc(x, y, R, Math.PI, 0);
        c2d.closePath();
        c2d.fill();
        // Radiating ribs.
        c2d.strokeStyle = rgbaCss(goldHi, 0.8 * shimmer);
        c2d.lineWidth = 1.4 * px;
        for (let k = 0; k <= RIBS; k++) {
          const a = Math.PI + (k / RIBS) * Math.PI;
          c2d.beginPath();
          c2d.moveTo(x, y);
          c2d.lineTo(x + Math.cos(a) * R * 0.94, y + Math.sin(a) * R * 0.94);
          c2d.stroke();
        }
        // Scallop border: three concentric arcs.
        for (const rr of [1, 0.82, 0.64]) {
          c2d.strokeStyle = rgbaCss(goldHi, (rr === 1 ? 0.95 : 0.5) * shimmer);
          c2d.lineWidth = (rr === 1 ? 2 : 1.2) * px;
          c2d.beginPath();
          c2d.arc(x, y, R * rr, Math.PI, 0);
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
    dispose() {
      jitters = [];
    },
  };
}
```

Register in the pop block next to `deco`:

```js
  'fan-deco': { renderer: 'canvas2d', group: 'pop', loader: () => import('./fan-deco.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/fan-deco.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): fan-deco — Erté shell-fan repeat ($FANDECO)"
bd close $FANDECO
git add .beads/issues.jsonl && git commit -m "chore(beads): close $FANDECO"
```

---

### Task 10: Preset `deco-spires`

**Files:**
- Create: `src/presets/deco-spires.js`
- Modify: `src/presets/index.js` (pop block, after `fan-deco`), `test/parrish-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `'deco-spires'` (canvas2d, pop).

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'deco-spires'`.
`test/time-rule.spec.js` PRESETS: append `'deco-spires'`.
`test/groups-unit.mjs` PARRISH_WAVE map: add `'deco-spires': 'pop',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `deco-spires` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/deco-spires.js`:

```js
// deco-spires — the Chrysler poster. Stepped-setback skyscraper silhouettes
// against gold ray bursts wheeling imperceptibly behind the tallest spire;
// thin gold outlines and seeded lit-window slits. density = building count,
// intensity = ray brightness.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let spires = [];
  let tallX = 0.5;
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 139);
    const n = 5 + Math.round(params.density * 4); // 5..9 spires
    spires = [];
    let tallest = 0;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n + (rand() - 0.5) * 0.05;
      const height = 0.35 + rand() * 0.5;
      const tiers = 3 + ((rand() * 3) | 0);
      const bw = 0.05 + rand() * 0.05;
      const windows = [];
      for (let k = 0; k < 14; k++) windows.push(rand() < 0.55);
      spires.push({ x, height, tiers, bw, windows, needle: rand() < 0.4 });
      if (height > tallest) {
        tallest = height;
        tallX = x;
      }
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!spires.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);

    const field = mix(c.primary, c.bg, 0.6);
    c2d.fillStyle = rgbCss(field);
    c2d.fillRect(0, 0, w, h);

    const gold = mix(c.accent, [1, 1, 1], 0.3);
    const rayA = 0.06 + params.intensity * 0.1;
    const cx = tallX * w;
    const cy = h * 0.42;
    const rot = t * 0.008; // imperceptible wheel — nonzero at every t
    for (let k = 0; k < 18; k++) {
      const a = rot + (k / 18) * Math.PI * 2;
      c2d.fillStyle = rgbaCss(gold, rayA * (k % 2 ? 1 : 0.55));
      c2d.beginPath();
      c2d.moveTo(cx, cy);
      c2d.arc(cx, cy, Math.hypot(w, h), a, a + Math.PI / 26);
      c2d.closePath();
      c2d.fill();
    }

    const ink = mix(c.fg, [0, 0, 0], 0.4);
    const glowWin = mix(c.accent, [1, 1, 1], 0.15);
    for (const sp of spires) {
      const bw = sp.bw * w;
      const baseY = h;
      const topY = h - sp.height * h;
      // Stepped tiers, symmetric setbacks.
      for (let tier = 0; tier < sp.tiers; tier++) {
        const f = tier / sp.tiers;
        const tw = bw * (1 - f * 0.55);
        const y0 = baseY - (sp.height * h * (tier + 1)) / sp.tiers;
        const th = (sp.height * h) / sp.tiers;
        c2d.fillStyle = rgbCss(ink);
        c2d.fillRect(sp.x * w - tw / 2, y0, tw, th + 1);
        c2d.strokeStyle = rgbaCss(gold, 0.6);
        c2d.lineWidth = 1 * px;
        c2d.strokeRect(sp.x * w - tw / 2, y0, tw, th + 1);
      }
      if (sp.needle) {
        c2d.strokeStyle = rgbaCss(gold, 0.9);
        c2d.lineWidth = 1.4 * px;
        c2d.beginPath();
        c2d.moveTo(sp.x * w, topY);
        c2d.lineTo(sp.x * w, topY - s * 0.06);
        c2d.stroke();
      }
      // Window slits on the lowest tier.
      const rows = 7;
      for (let k = 0; k < 14; k++) {
        if (!sp.windows[k]) continue;
        const col = k % 2;
        const rowk = (k / 2) | 0;
        if (rowk >= rows) continue;
        const wx = sp.x * w - bw * 0.28 + col * bw * 0.42;
        const wy = baseY - sp.height * h * 0.3 + rowk * (sp.height * h * 0.28) / rows;
        c2d.fillStyle = rgbaCss(glowWin, 0.85);
        c2d.fillRect(wx, wy, bw * 0.14, 2 * px);
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
      spires = [];
    },
  };
}
```

Register after `fan-deco`:

```js
  'deco-spires': { renderer: 'canvas2d', group: 'pop', loader: () => import('./deco-spires.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/deco-spires.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): deco-spires — stepped spires and gold rays ($SPIRES)"
bd close $SPIRES
git add .beads/issues.jsonl && git commit -m "chore(beads): close $SPIRES"
```

---

### Task 11: Preset `peacock`

**Files:**
- Create: `src/presets/peacock.js`
- Modify: `src/presets/index.js` (pop block, after `deco-spires`), `test/parrish-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `peacock` (canvas2d, pop).

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'peacock'`.
`test/time-rule.spec.js` PRESETS: append `'peacock'`.
`test/groups-unit.mjs` PARRISH_WAVE map: add `peacock: 'pop',`.

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `peacock` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/peacock.js`:

```js
// peacock — the deco plume fan. Gold-ribbed feather curves rising from the
// lower centre, each ending in a concentric eye (accent/info/primary); the
// whole fan sways as one. The midnight ground derives from primary toward
// the theme bg, so it deepens rather than fixes. density = plume count,
// intensity = gold brightness.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let plumes = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 149);
    const n = 7 + Math.round(params.density * 4); // 7..11 plumes
    plumes = [];
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1); // 0..1 across the fan
      plumes.push({
        angle: -Math.PI / 2 + (u - 0.5) * Math.PI * 0.85,
        len: 0.5 + rand() * 0.2 + (0.5 - Math.abs(u - 0.5)) * 0.25, // centre plumes taller
        bow: (u - 0.5) * 0.35 + (rand() - 0.5) * 0.06,
        eye: 0.032 + rand() * 0.012,
      });
    }
    lastKey = `${params.seed}|${params.density}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}`;
    if (!plumes.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();
    const s = Math.min(w, h);
    const ox = w * 0.5;
    const oy = h * 1.02;

    c2d.fillStyle = rgbCss(mix(c.primary, c.bg, 0.62));
    c2d.fillRect(0, 0, w, h);

    const gold = mix(c.accent, [1, 1, 1], 0.2 + params.intensity * 0.25);
    const sway = 0.05 * Math.sin(t * 0.22) + 0.02 * Math.sin(t * 0.13 + 1);
    c2d.lineCap = 'round';

    for (const p of plumes) {
      const a = p.angle + sway;
      const L = p.len * s;
      const tipX = ox + Math.cos(a) * L + p.bow * L * -Math.sin(a);
      const tipY = oy + Math.sin(a) * L + p.bow * L * Math.cos(a);
      const cxp = ox + Math.cos(a) * L * 0.55 + p.bow * L * 0.8 * -Math.sin(a);
      const cyp = oy + Math.sin(a) * L * 0.55 + p.bow * L * 0.8 * Math.cos(a);
      // Rib.
      c2d.strokeStyle = rgbaCss(gold, 0.9);
      c2d.lineWidth = 2 * px;
      c2d.beginPath();
      c2d.moveTo(ox, oy);
      c2d.quadraticCurveTo(cxp, cyp, tipX, tipY);
      c2d.stroke();
      // Barbs: short gold ticks along the rib.
      c2d.lineWidth = 1 * px;
      for (let k = 2; k <= 8; k++) {
        const u = k / 10;
        const bx = (1 - u) * (1 - u) * ox + 2 * (1 - u) * u * cxp + u * u * tipX;
        const by = (1 - u) * (1 - u) * oy + 2 * (1 - u) * u * cyp + u * u * tipY;
        const na = a + Math.PI / 2;
        const bl = s * 0.018 * (1 - u * 0.4);
        c2d.strokeStyle = rgbaCss(gold, 0.45);
        c2d.beginPath();
        c2d.moveTo(bx - Math.cos(na) * bl, by - Math.sin(na) * bl);
        c2d.lineTo(bx + Math.cos(na) * bl, by + Math.sin(na) * bl);
        c2d.stroke();
      }
      // The eye: concentric ovals, deco-flat.
      const er = p.eye * s;
      const eyeA = Math.atan2(tipY - cyp, tipX - cxp);
      c2d.save();
      c2d.translate(tipX, tipY);
      c2d.rotate(eyeA + Math.PI / 2);
      for (const [rr, col] of [
        [1.8, gold],
        [1.35, c.info],
        [0.9, c.accent],
        [0.45, c.primary],
      ]) {
        c2d.fillStyle = rgbCss(rr === 1.8 ? gold : mix(col, c.bg, 0.1));
        c2d.beginPath();
        c2d.ellipse(0, 0, er * rr * 0.75, er * rr, 0, 0, Math.PI * 2);
        c2d.fill();
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
      plumes = [];
    },
  };
}
```

Register after `deco-spires`:

```js
  peacock: { renderer: 'canvas2d', group: 'pop', loader: () => import('./peacock.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/presets/peacock.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): peacock — deco plume fan with eyes ($PEACOCK)"
bd close $PEACOCK
git add .beads/issues.jsonl && git commit -m "chore(beads): close $PEACOCK"
```

---

### Task 12: Preset `gilded`

**Files:**
- Create: `src/presets/gilded.js`
- Modify: `src/presets/index.js` (ornamental block, next to `mudcloth`), `test/parrish-wave.spec.js`, `test/time-rule.spec.js`, `test/groups-unit.mjs`

**Interfaces:**
- Consumes: Task-1 helpers.
- Produces: registry key `gilded` (canvas2d, ornamental).

- [ ] **Step 1: Extend the failing tests**

`test/parrish-wave.spec.js` PRESETS: append `'gilded'` (final list: 12).
`test/time-rule.spec.js` PRESETS: append `'gilded'` (11 canvas2d from this wave).
`test/groups-unit.mjs` PARRISH_WAVE map: add `gilded: 'ornamental',` (map reaches 12).

- [ ] **Step 2: Run tests to verify the new cases fail**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
```

Expected: `gilded` cases FAIL; earlier PASS.

- [ ] **Step 3: Write the preset**

Create `src/presets/gilded.js`:

```js
// gilded — a Klimt-adjacent gold-leaf field. A seeded patchwork of motifs —
// arc spirals, concentric squares, fleck clusters — in layered gold tones
// (accent and warning pulled toward white and toward the ground), each
// patch shimmering on its own slow clock. density = patch fineness,
// intensity = shimmer depth.

import { mulberry32 } from '../util/pause.js';
import { rgbCss, rgbaCss } from '../renderer/tokens.js';
import { mix } from './_dots.js';

export function create({ c2d, getColors, pxScale }) {
  const px = pxScale || 1;
  let w = 1,
    h = 1;
  let patches = [];
  let lastKey = '';

  function rebuild(params) {
    const rand = mulberry32(params.seed | 0 || 151);
    const s = Math.min(w, h);
    const cell = Math.max(44, s * (0.24 - params.density * 0.1));
    patches = [];
    for (let y = 0; y < h + cell; y += cell) {
      for (let x = 0; x < w + cell; x += cell) {
        patches.push({
          x: x + (rand() - 0.5) * cell * 0.2,
          y: y + (rand() - 0.5) * cell * 0.2,
          size: cell * (0.7 + rand() * 0.5),
          kind: (rand() * 3) | 0, // spiral / squares / flecks
          tone: (rand() * 3) | 0,
          w2: 0.15 + rand() * 0.35,
          phase: rand() * Math.PI * 2,
          turns: 2.2 + rand() * 1.6,
        });
      }
    }
    lastKey = `${params.seed}|${params.density}|${w}x${h}`;
  }

  function ensure(params) {
    const key = `${params.seed}|${params.density}|${w}x${h}`;
    if (!patches.length || key !== lastKey) rebuild(params);
  }

  function frame(t, params) {
    ensure(params);
    const c = getColors();

    const ground = mix(c.primary, c.bg, 0.7);
    c2d.fillStyle = rgbCss(ground);
    c2d.fillRect(0, 0, w, h);

    const golds = [
      mix(c.accent, [1, 1, 1], 0.35),
      mix(c.accent, ground, 0.25),
      mix(c.warning, [1, 1, 1], 0.25),
    ];
    const depth = 0.25 + params.intensity * 0.3;

    for (const p of patches) {
      const gold = golds[p.tone];
      const a = 1 - depth + depth * (0.5 + 0.5 * Math.sin(t * p.w2 + p.phase));
      const r = p.size / 2;
      if (p.kind === 0) {
        // Arc spiral.
        c2d.strokeStyle = rgbaCss(gold, a);
        c2d.lineWidth = 1.6 * px;
        c2d.beginPath();
        const steps = 40;
        for (let k = 0; k <= steps; k++) {
          const u = k / steps;
          const ang = u * p.turns * Math.PI * 2;
          const rr = r * 0.85 * u;
          const X = p.x + Math.cos(ang) * rr;
          const Y = p.y + Math.sin(ang) * rr;
          if (k === 0) c2d.moveTo(X, Y);
          else c2d.lineTo(X, Y);
        }
        c2d.stroke();
      } else if (p.kind === 1) {
        // Concentric squares.
        c2d.strokeStyle = rgbaCss(gold, a);
        c2d.lineWidth = 1.4 * px;
        for (let k = 0; k < 4; k++) {
          const rr = r * 0.85 * (1 - k * 0.22);
          c2d.strokeRect(p.x - rr, p.y - rr, rr * 2, rr * 2);
        }
      } else {
        // Fleck cluster.
        c2d.fillStyle = rgbaCss(gold, a);
        for (let k = 0; k < 9; k++) {
          const ang = (k / 9) * Math.PI * 2 + p.phase;
          const rr = r * (0.15 + 0.55 * ((k * 37) % 9) / 9);
          c2d.beginPath();
          c2d.arc(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr, (1.5 + (k % 3)) * px, 0, Math.PI * 2);
          c2d.fill();
        }
      }
    }
  }

  return {
    resize(nw, nh) {
      w = nw;
      h = nh;
      patches = [];
    },
    frame,
    staticFrame(params) {
      frame(0, params);
    },
    dispose() {
      patches = [];
    },
  };
}
```

Register in the ornamental block next to `mudcloth`:

```js
  gilded: { renderer: 'canvas2d', group: 'ornamental', loader: () => import('./gilded.js') },
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx playwright test test/parrish-wave.spec.js test/time-rule.spec.js --project=main --reporter=line
npm run test:node
set -o pipefail; npm run lint && npm run format:check && npm run cem:check
```

Expected: all PASS (12 parrish smokes; time-rule +11).

- [ ] **Step 5: Commit**

```bash
git add src/presets/gilded.js src/presets/index.js test/parrish-wave.spec.js test/time-rule.spec.js test/groups-unit.mjs custom-elements.json
git commit -m "feat(presets): gilded — shimmering gold-leaf patchwork ($GILDED)"
bd close $GILDED
git add .beads/issues.jsonl && git commit -m "chore(beads): close $GILDED"
```

---

### Task 13: API reference rows

**Files:**
- Modify: `docs/api.html` (six group tables: atmospheric ×2, art ×2 rows in the art table, nature ×3, gradient... place each row in its group's existing table matching neighbors)

**Interfaces:**
- Consumes: the 12 registered names.
- Produces: 199/199 catalog coverage.

- [ ] **Step 1: Add the rows** (each in its group's table, matching the single-line `<tr>` style)

Atmospheric table:

```html
            <tr><td><code>cumulus</code></td><td>Stacked rim-lit clouds drifting across a Parrish ultramarine-to-gold sky</td><td>primary, accent, background</td></tr>
            <tr><td><code>moonrise</code></td><td>A big low moon with halo, thin luminous cloud bands, a shimmering reflection column</td><td>primary, foreground, background</td></tr>
```

Art presets table:

```html
            <tr><td><code>terrace</code></td><td>Classical column and urn silhouettes framing a breathing luminous sky</td><td>primary, accent, foreground, background</td></tr>
            <tr><td><code>oil-sky</code></td><td>A skyscape of visible oil dabs &mdash; warm horizon rising through banded brushwork to cool zenith</td><td>primary, accent, background</td></tr>
```

Nature table:

```html
            <tr><td><code>lily-pond</code></td><td>Monet water &mdash; vertical reflection smears, drifting pads, slow ripple rings</td><td>primary, accent, info, success, foreground, background</td></tr>
            <tr><td><code>meadow</code></td><td>Dusk grassland in three swaying parallax layers, seed heads catching light</td><td>primary, accent, warning, foreground, background</td></tr>
            <tr><td><code>tide</code></td><td>A breathing shoreline &mdash; translucent wave sheets advancing over sand with foam edges</td><td>info, warning, background</td></tr>
```

WebGL shader presets table (gradient group rows live there; place near `mesh-gradient`):

```html
            <tr><td><code>halcyon</code></td><td>Enormous soft color fields breathing into one another &mdash; the catalog's most restful entry</td><td>primary, accent, info, background</td></tr>
```

Pop table:

```html
            <tr><td><code>fan-deco</code></td><td>Ert&eacute; scalloped shell-fans with radiating gold ribs in a staggered repeat</td><td>primary, accent, background</td></tr>
            <tr><td><code>deco-spires</code></td><td>Stepped-setback spires with lit window slits against wheeling gold rays</td><td>primary, accent, foreground, background</td></tr>
            <tr><td><code>peacock</code></td><td>A deco plume fan &mdash; gold ribs and barbs ending in concentric eyes, swaying as one</td><td>primary, accent, info, background</td></tr>
```

Ornamental table:

```html
            <tr><td><code>gilded</code></td><td>Klimt-adjacent gold-leaf patchwork &mdash; spirals, squares, flecks shimmering patch by patch</td><td>primary, accent, warning, background</td></tr>
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

Expected: `199 registered; 0 missing: []`

- [ ] **Step 3: Commit**

```bash
git add docs/api.html
git commit -m "docs(api): rows for the twelve parrish-wave presets"
```

---

### Task 14: Container baselines (+ light-ground & frozen-t inspection)

**Files:**
- Create: `test/visual.spec.js-snapshots/{cumulus,terrace,oil-sky,moonrise,lily-pond,meadow,tide,halcyon,fan-deco,deco-spires,peacock,gilded}-visual-linux.png`

**Interfaces:**
- Consumes: Docker (`docker info --format ok`; else `open -a OrbStack`, wait, retry) + `mcr.microsoft.com/playwright:v1.60.0-jammy`.

- [ ] **Step 1: Generate (anchored filter)**

```bash
docker run --rm --ipc=host --platform=linux/amd64 -v "$PWD:/work" -v /work/node_modules \
  -w /work mcr.microsoft.com/playwright:v1.60.0-jammy \
  bash -lc "npm ci --no-audit --no-fund >/dev/null 2>&1 && npx playwright test --project=visual --update-snapshots -g '(^| )(cumulus|terrace|oil-sky|moonrise|lily-pond|meadow|tide|halcyon|fan-deco|deco-spires|peacock|gilded)$'"
```

Expected: 12 pass, 12 `writing actual`; exactly twelve new snapshot files.

- [ ] **Step 2: Verify determinism**

Re-run the Step 1 command with `--update-snapshots` REMOVED. Expected: 12/12 pass.

- [ ] **Step 3: Inspection**

Read all twelve PNGs against the light baseline theme at frozen t. Each must clearly show its scene: cumulus rim-lit clouds on a graded sky, terrace silhouettes + glow, oil-sky banded dabs, moonrise moon + reflection, lily-pond pads + smears, meadow blades, tide sheets + foam, halcyon a VISIBLE soft field (not blank — it has a contrast floor by design), fan-deco fans, deco-spires spires + rays, peacock plumes + eyes, gilded motif patchwork. Blank/collapsed = STOP, DONE_WITH_CONCERNS naming the preset.

- [ ] **Step 4: Commit**

```bash
git add test/visual.spec.js-snapshots/
git commit -m "test(visual): baselines for the twelve parrish-wave presets"
```

---

### Task 15: Demo `daybreak.html`

**Files:**
- Create: `demos/daybreak.html`
- Modify: `demos/index.html` (append a `.bw-card` tile after the current last card)

**Interfaces:**
- Consumes: presets `cumulus`, `terrace`, `oil-sky`, `moonrise`.

- [ ] **Step 1: Write the page**

Create `demos/daybreak.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Daybreak &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* One day in four paintings: morning clouds, the golden-hour terrace,
       a painted dusk, then moonrise. Gallery plates carry the captions. */
    :root {
      --color-background: #1a2340;  /* Parrish ultramarine, deep */
      --color-foreground: #f2ead8;
      --color-primary: #35509e;     /* parrish blue */
      --color-accent: #e8b458;      /* gold light */
      --color-info: #6a8fc0;
      --color-success: #5d8a6e;
      --color-warning: #d9a13b;
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    gallery-plate {
      display: block; position: absolute; left: 50%; transform: translateX(-50%);
      bottom: clamp(26px, 7vh, 60px); max-width: 430px; text-align: center;
      padding: 14px 26px; background: rgba(26, 35, 64, 0.72);
      border: 1px solid rgba(242, 234, 216, 0.35);
    }
    plate-no { display: block; font-size: 11px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 6px; }
    gallery-plate h1, gallery-plate h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; margin: 0 0 6px; line-height: 1.05; }
    gallery-plate h1 { font-size: clamp(34px, 5.2vw, 60px); }
    gallery-plate h2 { font-size: clamp(26px, 3.8vw, 44px); }
    gallery-plate p { margin: 0; font-weight: 300; line-height: 1.6; font-size: 14px; font-style: italic; font-family: 'Cormorant Garamond', Georgia, serif; }
    code { font-family: ui-monospace, monospace; font-size: 0.8em; font-style: normal; background: rgba(242, 234, 216, 0.12); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="cumulus" data-background-intensity="0.7" data-background-seed="7" data-background-speed="0.6">
    <gallery-plate>
      <plate-no>I &middot; morning</plate-no>
      <h1>Daybreak</h1>
      <p>The clouds arrive before anyone is awake to deserve them. <code>data-background="cumulus"</code></p>
    </gallery-plate>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="terrace" data-background-intensity="0.7" data-background-seed="3" data-background-speed="0.5">
    <gallery-plate>
      <plate-no>II &middot; golden hour</plate-no>
      <h2>The Terrace</h2>
      <p>Columns hold the light the way vases hold water. <code>data-background="terrace"</code></p>
    </gallery-plate>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="oil-sky" data-background-intensity="0.65" data-background-seed="12" data-background-speed="0.5">
    <gallery-plate>
      <plate-no>III &middot; dusk, in oils</plate-no>
      <h2>Wet Paint</h2>
      <p>Every stroke still deciding what color evening is. <code>data-background="oil-sky"</code></p>
    </gallery-plate>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="moonrise" data-background-intensity="0.7" data-background-seed="9" data-background-speed="0.5">
    <gallery-plate>
      <plate-no>IV &middot; night</plate-no>
      <h2>Moonrise</h2>
      <p>The lake keeps a second moon, in case. <code>data-background="moonrise"</code></p>
    </gallery-plate>
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
        <browser-window mode="dark" shadow data-demo-src="./daybreak.html" title="Daybreak"
                        url="profpowell.github.io/bg-wc/demos/daybreak.html"></browser-window>
        <a class="bw-open" href="./daybreak.html" aria-label="Open the Daybreak demo"></a>
        <div class="meta"><span class="name">Daybreak</span><span class="desc">one day in four paintings</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "daybreak"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/daybreak.html demos/index.html
git commit -m "docs(demos): daybreak — one day in four paintings ($DAYBREAK)"
bd close $DAYBREAK
git add .beads/issues.jsonl && git commit -m "chore(beads): close $DAYBREAK"
```

---

### Task 16: Demo `the-retreat.html`

**Files:**
- Create: `demos/the-retreat.html`
- Modify: `demos/index.html` (append a `.bw-card` tile)

**Interfaces:**
- Consumes: presets `lily-pond`, `meadow`, `tide`, `halcyon`.

- [ ] **Step 1: Write the page**

Create `demos/the-retreat.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Retreat &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital@0;1&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* A quiet weekend in four entries: the pond, the meadow, the shore,
       and the long exhale. Journal cards, soft daylight palette. */
    :root {
      --color-background: #eef0e9;  /* morning paper */
      --color-foreground: #37403a;
      --color-primary: #7d97b8;     /* soft sky */
      --color-accent: #c9a86a;      /* dry grass gold */
      --color-info: #7fa8a0;        /* pond glass */
      --color-success: #7c9a72;     /* pad green */
      --color-warning: #d2b48c;     /* sand */
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    journal-card {
      display: block; position: absolute; max-width: 400px; padding: 18px 26px;
      background: rgba(238, 240, 233, 0.88); border: 1px solid rgba(55, 64, 58, 0.35);
      border-radius: 3px;
    }
    journal-card[data-at="tl"] { top: clamp(56px, 9vh, 88px); left: clamp(24px, 5vw, 72px); }
    journal-card[data-at="br"] { bottom: clamp(26px, 7vh, 64px); right: clamp(24px, 5vw, 72px); }
    entry-day { display: block; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 6px; }
    journal-card h1, journal-card h2 { font-family: 'EB Garamond', Georgia, serif; font-weight: 400; margin: 0 0 6px; line-height: 1.05; }
    journal-card h1 { font-size: clamp(32px, 5vw, 56px); }
    journal-card h2 { font-size: clamp(24px, 3.6vw, 40px); }
    journal-card p { margin: 0; font-weight: 300; line-height: 1.65; font-size: 15px; font-family: 'EB Garamond', Georgia, serif; font-style: italic; }
    code { font-family: ui-monospace, monospace; font-size: 0.78em; font-style: normal; background: rgba(55, 64, 58, 0.08); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="lily-pond" data-background-intensity="0.65" data-background-seed="5" data-background-speed="0.5">
    <journal-card data-at="tl">
      <entry-day>Saturday &middot; early</entry-day>
      <h1>The Retreat</h1>
      <p>Sat by the pond until the pond stopped noticing me. <code>data-background="lily-pond"</code></p>
    </journal-card>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="meadow" data-background-intensity="0.7" data-background-seed="11" data-background-speed="0.6">
    <journal-card data-at="br">
      <entry-day>Saturday &middot; before dinner</entry-day>
      <h2>Through the Grass</h2>
      <p>The whole field agreed on the direction of the wind. <code>data-background="meadow"</code></p>
    </journal-card>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="tide" data-background-intensity="0.6" data-background-seed="8" data-background-speed="0.5">
    <journal-card data-at="tl">
      <entry-day>Sunday &middot; the shore</entry-day>
      <h2>Between Waves</h2>
      <p>Counted eleven; forgave all of them. <code>data-background="tide"</code></p>
    </journal-card>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="halcyon" data-background-intensity="0.65" data-background-seed="2" data-background-speed="0.5">
    <journal-card data-at="br">
      <entry-day>Sunday &middot; the long exhale</entry-day>
      <h2>Halcyon</h2>
      <p>Nothing happened, at great length, beautifully. <code>data-background="halcyon"</code></p>
    </journal-card>
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
        <browser-window mode="light" shadow data-demo-src="./the-retreat.html" title="The Retreat"
                        url="profpowell.github.io/bg-wc/demos/the-retreat.html"></browser-window>
        <a class="bw-open" href="./the-retreat.html" aria-label="Open the Retreat demo"></a>
        <div class="meta"><span class="name">The Retreat</span><span class="desc">a quiet weekend, four entries</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "the-retreat"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/the-retreat.html demos/index.html
git commit -m "docs(demos): the-retreat — a quiet weekend, four entries ($RETREAT)"
bd close $RETREAT
git add .beads/issues.jsonl && git commit -m "chore(beads): close $RETREAT"
```

---

### Task 17: Demo `grand-foyer.html`

**Files:**
- Create: `demos/grand-foyer.html`
- Modify: `demos/index.html` (append a `.bw-card` tile)

**Interfaces:**
- Consumes: presets `deco-spires`, `fan-deco`, `peacock`, `gilded`.

- [ ] **Step 1: Write the page**

Create `demos/grand-foyer.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Grand Foyer &mdash; bg-wc demos</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poiret+One&family=Karla:wght@300;600&display=swap" rel="stylesheet">
  <style>
    /* An evening in four rooms: the view, the ballroom, the lounge, the
       bar. Engraved invitations, gold on midnight. */
    :root {
      --color-background: #14121c;  /* midnight lacquer */
      --color-foreground: #ece5d3;
      --color-primary: #2e3d6b;     /* deep deco blue */
      --color-accent: #d4af5a;      /* gold leaf */
      --color-info: #4e7d84;        /* verdigris */
      --color-warning: #c9963f;
    }
    body { background: var(--color-background); color: var(--color-foreground); font-family: Karla, system-ui, sans-serif; }

    body > nav { position: fixed; top: 20px; left: 28px; z-index: 20; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }
    body > nav a { color: var(--color-foreground); opacity: 0.65; text-decoration: none; }
    body > nav a:hover { opacity: 1; }

    section { position: relative; }

    invitation-card {
      display: block; position: absolute; left: 50%; transform: translateX(-50%);
      bottom: clamp(28px, 8vh, 68px); max-width: 420px; text-align: center;
      padding: 18px 30px; background: rgba(20, 18, 28, 0.78);
      border: 1px solid var(--color-accent); outline: 1px solid rgba(212, 175, 90, 0.35);
      outline-offset: 4px;
    }
    invite-line { display: block; font-size: 11px; letter-spacing: 0.34em; text-transform: uppercase; color: var(--color-accent); margin-bottom: 8px; }
    invitation-card h1, invitation-card h2 { font-family: 'Poiret One', cursive; font-weight: 400; margin: 0 0 6px; letter-spacing: 0.08em; }
    invitation-card h1 { font-size: clamp(34px, 5.4vw, 62px); }
    invitation-card h2 { font-size: clamp(26px, 3.8vw, 46px); }
    invitation-card p { margin: 0; font-weight: 300; line-height: 1.65; font-size: 14px; }
    code { font-family: ui-monospace, monospace; font-size: 0.82em; background: rgba(236, 229, 211, 0.12); padding: 2px 7px; border-radius: 3px; }
  </style>
</head>
<body>
  <nav><a target="_top" href="./index.html">&larr; bg-wc demos</a></nav>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="deco-spires" data-background-intensity="0.7" data-background-seed="6" data-background-speed="0.5">
    <invitation-card>
      <invite-line>You are cordially invited</invite-line>
      <h1>Grand Foyer</h1>
      <p>Sixty-first floor. The city dresses for the occasion. <code>data-background="deco-spires"</code></p>
    </invitation-card>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="fan-deco" data-background-intensity="0.65" data-background-seed="13" data-background-speed="0.5">
    <invitation-card>
      <invite-line>The ballroom</invite-line>
      <h2>Under the Fans</h2>
      <p>The orchestra tunes; the walls already dance. <code>data-background="fan-deco"</code></p>
    </invitation-card>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="peacock" data-background-intensity="0.7" data-background-seed="4" data-background-speed="0.5">
    <invitation-card>
      <invite-line>The lounge</invite-line>
      <h2>The Peacock Room</h2>
      <p>Every eye in the plumage has seen worse behavior. <code>data-background="peacock"</code></p>
    </invitation-card>
  </section>

  <section data-layout="cover" data-layout-min="100vh" data-layout-padding="none"
           data-background="gilded" data-background-intensity="0.65" data-background-seed="17" data-background-speed="0.5">
    <invitation-card>
      <invite-line>The bar &middot; last pour at two</invite-line>
      <h2>Gold Leaf</h2>
      <p>The wall got the first coat; the evening gets the rest. <code>data-background="gilded"</code></p>
    </invitation-card>
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
        <browser-window mode="dark" shadow data-demo-src="./grand-foyer.html" title="Grand Foyer"
                        url="profpowell.github.io/bg-wc/demos/grand-foyer.html"></browser-window>
        <a class="bw-open" href="./grand-foyer.html" aria-label="Open the Grand Foyer demo"></a>
        <div class="meta"><span class="name">Grand Foyer</span><span class="desc">an evening in four deco rooms</span></div>
      </div>
```

- [ ] **Step 3: Verify**

```bash
npm run build:site
npx playwright test test/demos-smoke.spec.js --project=main --reporter=line -g "grand-foyer"
npx playwright test test/demos-hub.spec.js --project=main --reporter=line
npm run test:node
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add demos/grand-foyer.html demos/index.html
git commit -m "docs(demos): grand-foyer — an evening in four deco rooms ($FOYER)"
bd close $FOYER
git add .beads/issues.jsonl && git commit -m "chore(beads): close $FOYER"
```

---

### Task 18: Final gates, coverage, push

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

Expected: `registered 199  demoed 199  missing []`.

- [ ] **Step 3: Push (MANDATORY)**

```bash
git pull --rebase
git push
git status   # MUST be up to date with origin
bd ready     # no parrish-wave issues left open
```

Then watch CI and the gated Pages deploy; spot-check daybreak and the gallery live.
