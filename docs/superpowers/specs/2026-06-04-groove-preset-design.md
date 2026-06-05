# Design: `groove` preset — 70s groovy looping stripe background

**Date:** 2026-06-04
**Issue:** gl-wc-dks
**Status:** Approved design, ready for implementation plan

## Summary

A new `canvas2d` background preset, `groove`, that renders the retro 1970s
"groovy pipe" aesthetic: bundles of parallel theme-colored stripes that run as
continuous routes, take rounded corners and tight U-turns, and terminate by
spiraling inward to a concentric bullseye target. Layouts are **seed-driven**
(deterministic per `seed`) and **density-driven**, scaling from a clean
edge-hugging frame (reference Image 1) to a dense all-over tangle (reference
Image 2). The route **draws itself on** progressively (a snaking reveal), then
holds and loops.

Reference look: nested rainbow stripes that travel together as a single "pipe,"
all sharing one consistent bend radius, ending in a bullseye spiral.

## Goals

- Reproduce the groovy-stripe-route aesthetic of both reference images from one
  preset, varying by `density` and `seed`.
- Pull all colors from the active theme — no hardcoded palette.
- Animate as a draw-on (snake) reveal; honor static / reduced-motion by
  rendering the route fully drawn and still.
- Fit the existing preset contract with no changes to `bg-wc.js`, the registry
  shape, or the renderer.

## Non-goals

- True over/under woven crossings (depth weaving). Routes simply overlap in
  paint order; a background-colored casing keeps crossings legible.
- Author-supplied custom path geometry. Geometry is procedural from the seed.
- WebGL. This is a Canvas2D preset.

## Registry & contract

- **Name:** `groove`
- **File:** `src/presets/groove.js`
- **Registry entry** in `src/presets/index.js`, `pop` group (next to `deco`,
  `atomic`, `supergraphics`):
  ```js
  groove: { renderer: 'canvas2d', group: 'pop', loader: () => import('./groove.js') },
  ```
- **Module shape:** `export function create({ c2d, getColors })` returning
  `{ resize(w, h), frame(t, params), staticFrame(params), dispose() }` — same
  contract as `flowlines.js` / `ribbons.js`.
- **Params consumed:** `seed`, `density`, `intensity`, `speed` (read fresh each
  frame, per the existing convention). `intensity` modulates stripe count /
  casing emphasis; `speed` sets draw-on rate.

## Architecture

Four cooperating pieces inside the one module:

### 1. Palette builder — `buildStripes(colors, intensity)`

- Input: the theme color object from `getColors()` (`primary`, `accent`,
  `info`, `bg`, `fg`, …), each an RGBA tuple in `[0..1]`.
- Core stripes: `[primary, accent, info]`.
- Pad to ~5 stripes by inserting auto-derived **tints** (a lightened and a
  darkened variant of core colors) so the bundle is full even on themes that
  define only three colors. A small `lighten(rgb, amt)` / `darken(rgb, amt)`
  helper mixes toward white / black.
- `intensity` may scale the final stripe count within ~3–6.
- Returns an ordered array of RGBA tuples, outermost → innermost.

### 2. Path generation — `buildRoutes(seed, density, w, h)`

- Deterministic via `mulberry32(seed)` (imported from `../util/pause.js`, as
  `flowlines.js` does).
- Grid: a coarse cell size derived from canvas size and the bundle width; the
  **bend radius ≈ half a cell**, giving every corner the same radius.
- Route count scales with `density`: low → 1 long route, high → up to 3.
- Each route is an **axis-aligned random walk** on the grid:
  - Steps are horizontal/vertical; immediate 180° reversal is disallowed except
    as an intentional **U-turn** (a deliberate tight reversal with a rounded
    cap — the signature move), whose probability rises with `density`.
  - Low density biases walks toward the canvas edges (framed look); high
    density allows interior wandering and more turns (tangle look).
  - Corners are rounded to the fixed bend radius (arc/quadratic joins).
- Each route **terminates in an inward spiral**: after the walk, append a
  decreasing-radius spiral that winds into a center point (the bullseye), drawn
  by the same nested-stroke pass so the stripes nest into concentric rings.
- Output per route: a point polyline (or `Path2D`) plus its cumulative arc
  length, cached per `(seed, density, w, h)` so frames don't rebuild geometry.

### 3. Bundle renderer — `drawRoute(route, stripes, reveal)`

The core trick — **stroke the same path repeatedly with decreasing width**,
outermost → innermost, instead of computing offset curves:

- Compute total bundle width `W` from canvas size.
- Draw a **casing** stroke first at width `W + casingPad` in theme `bg` color so
  overlapping routes stay separated.
- Then for each stripe `i`, stroke the path at width `W - i*stripeW` with
  `stripes[i]`. Nesting around U-turns and the spiral is automatic.
- `lineCap = 'round'`, `lineJoin = 'round'`.
- **Draw-on reveal:** `reveal ∈ [0..1]` controls how much of the path is
  painted, via `setLineDash([len, len])` + `lineDashOffset = len*(1 - reveal)`.
  All nested strokes share one path and length, so they reveal together as a
  unit. `reveal = 1` (static / reduced-motion) paints the whole route.

### 4. Frame loop

- `frame(t, params)`: ensure palette + routes for current params (rebuild only
  when `seed`/`density`/size change); fill `bg`; compute `reveal` from `t` and
  `speed` (ramp 0→1, hold fully drawn, then loop — exact cadence settled in the
  plan); draw each route in order.
- `staticFrame(params)`: same, with `reveal = 1`.
- `dispose()`: clear cached routes / `Path2D`.

## Data flow

```
getColors() ──▶ buildStripes() ──▶ stripes[]
params.seed/density/size ──▶ buildRoutes() ──▶ routes[] (cached)
t, params.speed ──▶ reveal
(stripes, routes, reveal) ──▶ drawRoute() per route ──▶ canvas
```

## Edge cases & error handling

- **Reduced motion / static:** `staticFrame` and the reduced-motion path render
  `reveal = 1`. No animation loop dependency for correctness.
- **Tiny canvases:** clamp cell size and bundle width to sane minimums so a
  route always has ≥1 visible stripe; spiral radius clamps to ≥ bend radius.
- **Themes with duplicate roles:** tints guarantee visible separation even when
  `primary`/`accent`/`info` are near-identical.
- **Transparent `bg`:** casing falls back to `fg` at low alpha (or is skipped)
  so crossings remain legible without a fill.
- **Resize:** invalidates the route cache; geometry rebuilds at the new size.

## Testing

Mirror the existing Playwright preset smoke pattern:

- Add `'groove'` to the `PRESETS` array in `test/new-presets.spec.js` (loads,
  renders to a canvas with `width/height > 0`, no `data-fallback`).
- One targeted test: toggling `density` low→high and `seed` produces non-empty
  `snapshot()` blobs (deterministic render, no throw) — following the
  `system7`/`doodles` examples in that file.
- No new harness page needed; `test/new-presets-page.html` already defines theme
  tokens and a `<bg-wc id="wc">`.

## Open questions (resolve during planning)

- Exact draw-on cadence (ramp duration, hold time, whether the loop re-seeds a
  fresh layout or replays the same one).
- Final default stripe count and bundle-width fractions (tune visually against
  the references).
