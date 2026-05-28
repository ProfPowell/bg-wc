# border-wc effects catalog (14 new extreme effects)

**Date:** 2026-05-28
**Status:** Approved (design)
**Target repo:** `@profpowell/border-wc` (`~/src/border-wc`). Spec centralized here in gl-wc to match convention. The library + site changes happen in border-wc.
**Depends on:** existing border-wc architecture (effect modules + `src/registry.js` + `data-border-effect` binder + perimeter Phase 2).

---

## 1. Scope & goals

border-wc currently ships 3 effects: `squiggle`, `draw`, `sparks`. Expand the catalog to **17 total** (3 existing + 14 new) so the package matches its ambition as the "extreme border effects" tier of Decorated Layers. Every new effect is an extreme — needs SVG / Canvas / DOM beyond what CSS alone can do — and is **paired with vanilla-breeze's CSS base tier** (`spin`/`pulse`/`march`/`hue-cycle`/`breathe`/`corner-trace`), not duplicative.

All 14 effects ship as **one PR**, each as a self-contained module in `src/effects/`, registered via `src/registry.js`. The binder picks them up automatically (it derives the extreme set from the registry). The existing `<border-wc>` element + `data-border-effect` binder consume them with **no API changes**.

**Non-goals:**
- Themed demos for the new effects (separate follow-up — the user explicitly chose "effects first, demos after").
- New shape support beyond what perimeter Phase 2 already provides.
- Per-effect custom attributes beyond the existing param vocabulary (`color`, `thickness`, `speed`, `radius`, `animate`, `mode`, `motion`); effect-specific behavior is tuned via internal constants for v1.

## 2. The 14 effects

Grouped by vibe. Each row gives the **rendering approach** (so the work per effect is clear), the **animation behavior**, and the **reduced-motion / static** fallback the effect must honor.

### 2.1 Energy & impact

| Effect | Render | Animation | Reduced-motion |
|---|---|---|---|
| `lightning` | Canvas overlay (like sparks). Every ~`speed/4` ms, draw a jagged bolt from one perimeter point to another with random Bezier-zigzag midpoints; ~50% chance of a single fork. Stroke = `params.color`; `shadowBlur` for glow. Bolt fades over ~150ms. | Continuous bolt spawn. | A single static jagged stroke around the perimeter (no flashes). |
| `flames` | Canvas overlay. Spawn particles along the perimeter (sample N points via `roundedRectSampler`). Each particle has outward+upward velocity, lifetime ~`speed/5` ms, color animated red→orange→yellow→transparent. | Continuous spawn. | Static gradient outline (red→orange) along the perimeter. |
| `glitch` | SVG: three stroked paths (R, G, B) of the perimeter, each offset by a small random `transform: translate(dx, dy)`. Every ~`speed` ms, randomize offsets + a clip-path slice. | Periodic offset shuffles. | Static slight RGB-offset triplet. |

### 2.2 Organic & growing

| Effect | Render | Animation | Reduced-motion |
|---|---|---|---|
| `grass` | Canvas overlay. Sample N points along the perimeter; at each, draw a curved blade (Bezier) growing outward perpendicular to the tangent. Color: gradient base→tip (derived from `params.color`). | Grow 0→full length over `speed/2` ms on init; then gentle sin-noise sway. | Blades at full length, no sway. |
| `vines` | SVG: thick stroked path along the perimeter (vine). Small leaf shapes (`<path>` polygons) placed at intervals via the sampler. | Stroke-dasharray growth (like `draw`) over `speed` ms — vine grows; leaves fade in as the vine passes them. | Vine fully grown, leaves visible. |
| `fireflies` | Canvas overlay (like `sparks` but: fewer particles, slower velocity, larger radius with `shadowBlur` halo, occasional alpha-blink). | Continuous drift around perimeter. | Static blurred dots at sampled points. |

### 2.3 Retro / craft / typographic

| Effect | Render | Animation | Reduced-motion |
|---|---|---|---|
| `ascii` | **DOM** (no SVG/Canvas). Position character `<span>`s around the perimeter via the sampler. Top/bottom edges = `═`; left/right = `║`; corners = `╔ ╗ ╚ ╝`. Char count = `perimeter / charWidth`. | On init, type characters one-at-a-time over `speed` ms (sequenced reveal via opacity). | All chars visible immediately. |
| `stitching` | SVG: short stroked segments oriented as X-shaped cross-stitches placed at intervals along the sampler. | Optional slow march (`stroke-dashoffset`) — disabled by default; turn on via `animate`. | Static. |
| `typewriter` | DOM, same positioning as `ascii` but the chars come from `params.mode` or a fallback string (`"hello world …"` repeated). Char count covers the perimeter. | Reveal one-at-a-time over `speed` ms (cursor blink at the active position). | All text visible immediately. |

### 2.4 Pattern / industrial

| Effect | Render | Animation | Reduced-motion |
|---|---|---|---|
| `barbed-wire` | SVG: two thin sinusoidal strokes (twisted wire); barb glyphs (small X polygons) placed every N px via the sampler. | Optional slow phase-shift of the twist; barbs static. | Static. |
| `rope` | SVG: two intertwined sinusoidal strokes (braid) along the perimeter; thicker stroke + earthy color. Optional small knot circles at corners. | Optional shimmer (phase translate); static by default. | Static. |
| `scallop` | SVG: a path that replaces each straight edge of the perimeter with a row of semi-circle arcs (scallops) outside the host's edge. | Optional gentle wave (per-scallop y-bob via `Math.sin`). | Static. |

### 2.5 Trippy / chromatic

| Effect | Render | Animation | Reduced-motion |
|---|---|---|---|
| `psychedelic` | SVG: perimeter path stroked with a `<linearGradient>` of rainbow stops. The gradient's `gradientTransform` animates `translate(t, 0)` so the rainbow flows. | Continuous gradient translate; speed = `params.speed`. | Static rainbow gradient stroke. |
| `plasma` | Canvas: along the perimeter, draw small overlapping radial color blobs whose hue comes from a noise function `noise(s, t)` (s = perimeter param, t = time). Additive blend. | Continuous noise advance. | Static noise snapshot. |

## 3. Architecture

### 3.1 Effect module shape (unchanged)
Each effect ships as `src/effects/<name>.js`, exporting `create<Name>(host, params) => cleanup`. The cleanup function removes the overlay element and disconnects any observers / cancels rAF.

### 3.2 `src/registry.js` — extend
Add all 14 new lazy loaders to `EFFECTS`:
```js
export const EFFECTS = {
  draw:        () => import('./effects/draw.js').then((m) => m.createDraw),
  squiggle:    () => import('./effects/squiggle.js').then((m) => m.createSquiggle),
  sparks:      () => import('./effects/sparks.js').then((m) => m.createSparks),
  lightning:   () => import('./effects/lightning.js').then((m) => m.createLightning),
  flames:      () => import('./effects/flames.js').then((m) => m.createFlames),
  glitch:      () => import('./effects/glitch.js').then((m) => m.createGlitch),
  grass:       () => import('./effects/grass.js').then((m) => m.createGrass),
  vines:       () => import('./effects/vines.js').then((m) => m.createVines),
  fireflies:   () => import('./effects/fireflies.js').then((m) => m.createFireflies),
  ascii:       () => import('./effects/ascii.js').then((m) => m.createAscii),
  stitching:   () => import('./effects/stitching.js').then((m) => m.createStitching),
  typewriter:  () => import('./effects/typewriter.js').then((m) => m.createTypewriter),
  'barbed-wire': () => import('./effects/barbed-wire.js').then((m) => m.createBarbedWire),
  rope:        () => import('./effects/rope.js').then((m) => m.createRope),
  scallop:     () => import('./effects/scallop.js').then((m) => m.createScallop),
  psychedelic: () => import('./effects/psychedelic.js').then((m) => m.createPsychedelic),
  plasma:      () => import('./effects/plasma.js').then((m) => m.createPlasma),
};
```
`EXTREME = Object.keys(EFFECTS)` automatically includes the new names, so `<border-wc>` and the `data-border-effect` binder both recognize them with **no other code change**.

### 3.3 Shared helpers (where worth extracting)

Many of the new effects sample the perimeter and either spawn particles or position glyphs. To keep modules small and DRY, introduce two small helpers in `src/effects/_helpers.js`:

- `attachCanvas(host)` → returns `{ canvas, ctx, fit }`. `fit` resizes the canvas to the host with `devicePixelRatio` and re-samples; observers connect this. Used by `lightning`, `flames`, `fireflies`, `plasma`, `grass`.
- `attachOverlaySvg(host, dataAttr)` → returns the appended `<svg>` configured per the existing pattern (position:absolute, inset:0, pointerEvents:none, overflow:visible). Used by `vines`, `glitch`, `barbed-wire`, `rope`, `scallop`, `psychedelic`, `stitching`.
- Reuse the existing `roundedRectSampler` and `roundedRectPath` from `src/perimeter.js`.

The existing 3 effects already follow this pattern with inline code; refactor opportunity (not required) is to migrate them to the helpers in the same PR. **Decision for v1:** introduce the helpers and use them in the 14 new effects; leave `squiggle.js` / `draw.js` / `sparks.js` untouched to minimize regression risk. Refactor in a follow-up.

### 3.4 Params surface (unchanged)
All effects read `params` from `src/params.js` (already returns `color`, `thickness`, `speed`, `radius`, `animate`, `mode`). No new param keys for v1. Effect-specific tuning (particle count, blade count, etc.) lives as internal constants in each module — easy to externalize later if needed.

`params.mode` is honored where it makes sense (e.g. `typewriter` uses it as the source string when set; otherwise the default loop string).

### 3.5 Reduced motion contract
Every effect must honor `params.reduce` — render a coherent **static** state rather than an animated one. Pattern in each module:
```js
if (params.reduce) { /* render static state; no rAF / no interval; return cleanup */ }
```

## 4. Gallery playground

The playground at `docs/index.html` currently has 3 effect cards in a single grid. With 17 cards it'd be a tall scroll, but the structure still works.

**Layout**: extend the existing `.playground` grid to all 17, with **section headings** (`<h2>` per vibe-group: Energy, Organic, Retro/craft, Pattern, Trippy/chromatic) interleaved as full-row separators. Each effect retains its card pattern (border-wc sample + 4 knobs + copyable snippet).

Add a small **table of contents** at the top (links to each section) so visitors can jump.

The Replay-button pattern from `draw` extends to **any effect that has a clear "start" moment** (init animation that completes): `draw`, `vines`, `ascii`, `typewriter`. Add a Replay button to each of those cards. Continuous-loop effects (`squiggle`, `sparks`, `lightning`, `flames`, `glitch`, `grass`-sway, `fireflies`, `psychedelic`, `plasma`, `barbed-wire`-shimmer, `rope`-shimmer, `scallop`-wave, `stitching`-march) don't get Replay (no discrete start).

## 5. API docs (`docs/api.html`)

Update the `effect` attribute description to list all 17 values. Add a brief, scannable **catalog table** in a new section "Effects":
- Two columns: effect name (with link to its gallery card via `#sq-card`-style anchors) + one-line concept.

No other `api.html` change.

## 6. Tests

Two layers, both in `test/`:

### 6.1 Per-effect smoke tests
For each of the 14 new effects, add a test that:
1. Sets `effect="<name>"` on the test page's `<border-wc>`.
2. Waits ~80ms.
3. Asserts the expected overlay element exists (`svg[data-border-wc="<name>"]` or `canvas[data-border-wc="<name>"]` or for `ascii`/`typewriter`, the DOM container).
4. Asserts no console errors during the apply.

Group into category specs: `lightning.spec.js`, `flames.spec.js`, … etc. — one file per effect, 8–12 lines each (mirrors the existing `squiggle.spec.js`/`draw.spec.js`/`sparks.spec.js` pattern).

### 6.2 Reduced-motion coverage
Extend `test/reduced-motion.spec.js` (currently covers `draw` only) with one assertion per effect: with `motion="reduce"` set, the effect's overlay appears (so the user gets the visual), no rAF is leaked (a sample wait + then assert no further repaint via a count of frames captured — or simpler, just assert the overlay exists and rendered something).

### 6.3 Registry test (new)
Add `test/registry.spec.js`:
- Imports `EFFECTS` and `EXTREME` from `src/registry.js`.
- Asserts the expected list of 17 keys is present.
- Asserts each lazy loader resolves to a function (sample-load one or two; full coverage is via the per-effect specs).
- Asserts the `data-border-effect` binder picks up every extreme value when applied.

## 7. Files

**New:**
- `src/effects/_helpers.js` (`attachCanvas`, `attachOverlaySvg`)
- `src/effects/{lightning, flames, glitch, grass, vines, fireflies, ascii, stitching, typewriter, barbed-wire, rope, scallop, psychedelic, plasma}.js` (14 files)
- `test/{lightning, flames, glitch, grass, vines, fireflies, ascii, stitching, typewriter, barbed-wire, rope, scallop, psychedelic, plasma}.spec.js` (14 files)
- `test/registry.spec.js`

**Modified:**
- `src/registry.js` — register the 14 new effects.
- `docs/index.html` — extend the playground to 17 cards in 5 vibe-sections + TOC; add Replay buttons to `vines`, `ascii`, `typewriter`.
- `docs/playground.js` — handle the new card variants (mostly the same `apply()` loop, accepting any effect by name; Replay wired to any card with a `[data-replay]` button).
- `docs/api.html` — list all 17 in the `effect` row; add the Effects catalog section.
- `test/reduced-motion.spec.js` — extend to cover the new effects.
- `README.md` — bump the one-liner to mention "17 extreme border effects" and the catalog.

**Unchanged:**
- `src/border-wc.js`, `src/data-border-effect.js`, `src/perimeter.js`, `src/params.js`, `src/color.js` — the architecture takes new effects without code changes there. The existing 3 effect modules stay as-is (refactor to helpers in a separate PR).

## 8. Verification

- `npm run build` (library) — emits `dist/border-wc.js` + `dist/data-border-effect.js` + the 17 lazy effect chunks.
- `npm run site:build` — site builds.
- `npm test` — full Playwright suite green: existing tests + 14 new per-effect specs + extended reduced-motion + registry spec. **Aiming for ~36 total tests** (up from 18).
- Headless on the dev server:
  - Gallery `/docs/`: all 17 cards render; each has a working `<border-wc>` upgrade + non-empty `code-block`; Replay buttons fire on the discrete-animation cards.
  - API `/docs/api.html`: effect attribute row lists all 17; new "Effects" section table renders.
  - Demos `/demos/`: unchanged behavior (existing 3 themed demos still work; no overlay regression).
  - No console errors anywhere.
- After Pages deploy: live URL responds 200 across all pages; spot-check a few effects render visibly.

## 9. Out of scope (v1) / follow-ups

- New themed demos (Lightning storm, Garden, Comic panels, Tarot card, Glitch-CRT, …) — separate spec, comes after.
- Refactoring `squiggle.js` / `draw.js` / `sparks.js` to use `_helpers.js`.
- Per-effect custom param attributes (intensity, particle count, etc.).
- A version bump to `0.2.0` on npm — landing this PR is enough for Pages to update; the npm bump is a separate decision (it's a substantial new-feature release, so 0.2.0 makes sense at some point).

## 10. Open questions

- None blocking. Tuning constants (particle counts, blade counts, default fonts) baked per effect — adjustable post-merge based on how each looks live. The acceptance bar is "renders the intended concept + honors reduced motion + has tests"; pixel-perfection is iterative.
