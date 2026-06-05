# Design: `scandi` + `seigaiha` pattern presets

**Date:** 2026-06-04
**Status:** Approved design, ready for implementation
**Group:** both `pattern`, renderer `canvas2d`

## Summary

Two new tiled Canvas2D background presets, both theme-colored and seed-driven,
both rendered with a **subtle drift** (alive but calm; `staticFrame` and
reduced-motion render a still tiling):

- **`scandi`** — a Scandinavian / Bauhaus geometric grid of arc primitives and
  curated floral motifs (Image 3 reference).
- **`seigaiha`** — the Japanese wave / fish-scale pattern of overlapping
  concentric-ring discs (Image 4 reference).

Each is one file + one registry line, following the existing preset contract:
`export function create({ c2d, getColors })` returning
`{ resize(w, h), frame(t, params), staticFrame(params), dispose() }`. Params
consumed: `seed`, `density`, `intensity`, `speed` (read fresh each frame; `t` is
already speed-scaled by the host). All drawing is in device-pixel space with
h-relative sizing, like the other canvas2d presets.

## Preset 1: `scandi`

### Geometry

A square grid of cells. Cell size derives from canvas height and `density`
(higher density → smaller cells / finer grid). Layout is deterministic via
`mulberry32(seed)`.

**Primitive vocabulary** (single cell, all built from arcs + rects clipped to
the cell):

- `dot` — inset full circle
- `half` — half-disc, one of 4 orientations
- `quarter` — quarter-disc / pie in a cell corner, one of 4 orientations
- `leaf` — a vesica/pointed-oval from two opposing arcs, axis-aligned or
  diagonal
- `square` / `bar` — solid cell or half-cell rectangle

**Curated motifs** (multi-cell, placed before the random fill):

- `petal-cross` — 4 leaves meeting at a shared point (the X-flower in the
  reference corners), spanning 2×2
- `tulip` — a half-circle cup over a stem with two leaves, spanning ~2×2
- `sprout` — two leaves rising from a short stem

### Placement

1. Seeded pass scatters a few curated motifs onto the grid (count scales with
   grid size), marking the cells they occupy.
2. Remaining unmarked cells each get a random single primitive.
3. `intensity` biases the motif-vs-primitive ratio and the pastel strength.

### Colors

Each shape picks a theme role (`primary`, `accent`, `info`, `success`,
`warning`) softened toward the theme `bg` to read as a pastel (a
`mix(color, bg, amt)` helper). Background filled with theme `bg`. On themes with
fewer roles the same softening still yields a varied pastel set.

### Drift

Each tile holds two seeded palette picks and **cross-fades** between them on its
own slow cycle (phase seeded per cell), so colors breathe without any layout
churn. A subset of `petal-cross` motifs slowly rotate in place. `staticFrame`
paints each tile at cross-fade phase 0.

## Preset 2: `seigaiha`

### Geometry

The seigaiha construction: discs laid on a grid in **offset rows** (alternate
rows shifted by half a column; vertical spacing is a fraction of the radius so
rows overlap). Discs are painted **back-to-front** (top rows first), each
**clipped to its own circle**, so a front disc covers the lower portion of the
disc behind it — leaving only the top "scallop" of each visible. This produces
the fish-scale rows.

Each disc is a set of **concentric rings** alternating two colors, ending in a
small center dot — the bullseye in the reference.

- `density` → disc radius (smaller discs → more scales).
- `intensity` → ring count per disc (~3–5).

### Colors

Default **two-tone**, faithful to the reference: rings alternate `primary` and
`bg`, center dot `primary`. (A colorful variant — rings cycling
`primary`/`accent`/`info` — is a possible later addition, out of scope here.)

### Drift

A slow phase shifts every disc's ring radii **outward and wraps**, so the
bullseyes read as gentle expanding ripples. `staticFrame` renders phase 0.

## Architecture (both)

Each module is self-contained with small helpers:

- `scandi`: `softPastel(role, bg, amt)`, `drawPrimitive(kind, cell, color, …)`,
  `placeMotifs(rng, grid)`, a per-cell record `{ kind, colors:[a,b], phase,
  rot }`, cached per `(seed, density, w, h)`; `frame` recomputes only the
  cross-fade/rotation from `t`.
- `seigaiha`: `discLayout(density, w, h)` → row/col positions cached per
  `(density, w, h)`; `drawDisc(cx, cy, r, rings, phase, colors)`; `frame`
  derives `phase` from `t` and paints discs back-to-front.

Both read colors fresh each frame via `getColors()` so theme changes apply
live; the expensive layout (grid records / disc positions) is cached and rebuilt
only when `seed`/`density`/size change. `dispose()` clears the cache.

## Registry

In `src/presets/index.js`, `pattern` group:

```js
scandi:   { renderer: 'canvas2d', group: 'pattern', loader: () => import('./scandi.js') },
seigaiha: { renderer: 'canvas2d', group: 'pattern', loader: () => import('./seigaiha.js') },
```

## Edge cases

- **Tiny canvases:** clamp cell size / disc radius to a minimum so at least one
  full tile renders.
- **Transparent `bg`:** `scandi` pastels fall back to softening toward `fg` at
  low alpha; `seigaiha`'s bg rings use `fg` at low alpha so the two-tone still
  reads.
- **Reduced motion / static:** both honor `staticFrame` with drift phase 0; no
  animation needed for correctness.
- **Resize:** invalidates the layout cache; rebuilds at the new size.

## Testing

Mirror the `groove` pattern:

- Add `'scandi'` and `'seigaiha'` to the `PRESETS` smoke array in
  `test/new-presets.spec.js` (load, render to a canvas with `width/height > 0`,
  no `data-fallback`).
- One targeted test each: toggling `density` low→high and `seed` produces
  non-empty `snapshot()` blobs without throwing.
- No new harness page needed; `test/new-presets-page.html` already defines theme
  tokens and a `<bg-wc>`.

## Open questions (resolve during implementation)

- Exact motif set sizing and the curated-motif placement density for `scandi`.
- `seigaiha` row-overlap ratio and ring count defaults, tuned visually against
  the reference.
