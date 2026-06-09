# Dot-art presets: `dotwork`, `stipple`, `tapestry`

**Date:** 2026-06-09
**Status:** Approved (brainstorm) — pending implementation plan
**Author:** brainstormed with ProfPowell

## Motivation

Two reference paintings (Pacific-Northwest / Aboriginal dot-painting / pointillism
crossover) are built almost entirely from dots: concentric dot rosettes, hand-stippled
color fields, dotted spirals and whorls, and dots tracing the contour of every shape.
`<bg-wc>` already has grid-regular dot screens (`halftone`, `benday`, `dither`) but
nothing with the organic, hand-painted dot quality of these works. This adds three
canvas2d presets that capture the motifs while honoring the component conventions
(theme-driven color, seeded layout, `t` pre-scaled by speed, reduced-motion fallback).

All three are **canvas2d**, so none consume WebGL contexts (no impact on the ~16-context
cap or the gallery's `MAX_WEBGL` budget).

## Presets

### 1. `dotwork` — radial dotted structures
Group: `ornamental` (beside `mandala`, `girih`, `op-art`).

Discrete dotted motifs placed on a theme-`bg` field, each gently rotating on its own
slow cycle.

- **`mode`** (host attribute, existing convention): `rings` (default) · `spiral` ·
  `double` · `whorl` · `waterholes`
  - `rings` — scattered concentric dot rosettes (the signature "starry sky" motif).
  - `spiral` — phyllotaxis (golden-angle) dot spirals radiating from centers.
  - `double` — paired counter-rotating spiral arms.
  - `whorl` — scattered single Archimedean spirals traced in dots (fingerprint/cloud swirls).
  - `waterholes` — concentric dot rings joined by meandering dotted paths (songline map).
- **Params:** `intensity` → vibrancy + ring/arm count per motif · `density` → number of
  motifs and packing · `speed` → rotation rate · `seed` → placement · `quality` → caps
  dots-per-structure (low/med/high).
- **Caching:** layout (centers, motif kinds, per-motif params) cached keyed by
  `mode|seed|density|WxH`; `frame()` only recomputes dot angles for rotation.
- **`staticFrame`:** draws the cached layout with rotation frozen at phase 0.

### 2. `stipple` — pointillist fields
Group: `texture` (beside `halftone`, `dither`, `grain`).

Dots filling the whole area.

- **`mode`:** `field` (default) · `contour` · `vortex`
  - `field` — graded pointillism; dot color sampled from a smooth spatial gradient over
    the palette, with size/position jitter.
  - `contour` — dots tracing streamlines of a flow field (dots follow shape contours).
  - `vortex` — dots caught in currents around hidden vortices; each particle carries a
    lifespan and respawns before collapsing into a center (keeps the field evenly filled
    at any size).
- **Params:** `intensity` → vibrancy/contrast · `density` → dot/particle count · `speed`
  → flow/shimmer rate · `seed` · `quality` → particle cap.

### 3. `tapestry` — dense dot-art composite
Group: `ornamental`.

A densely filled, full-bleed composite — a `stipple` `field` base with `dotwork` rings
and whorls packed edge to edge, like the source paintings. Designed as a rich backdrop
that page content (ordinary DOM) layers on top of. v1 has no `mode`; composition richness
scales with `density`/`intensity`.

- **Params:** `intensity` → vibrancy + structure share · `density` → overall packing ·
  `speed` → slow rotation/shimmer · `seed` · `quality` → dot/particle cap.

## Rendering & performance strategy

- **`stipple field` and `tapestry`:** render the dense base field to an **offscreen
  canvas once** (cached by `seed|density|palette|WxH`) and blit it each frame; animate
  only a sparse "shimmer" set and slow structure rotation on top. Avoids re-issuing
  thousands of `arc()` calls per frame.
- **`stipple contour` / `stipple vortex`:** live particle simulation, redrawn each frame.
  Particle count gated by `quality` × `density` (≈ 600 low / 1500 med / 3000 high).
  Vortex particles respawn on lifespan-expiry or proximity to a vortex center.
- **`dotwork`:** per-frame cost is bounded by the cached structure count × dots-per-
  structure (low thousands at high quality); only angles recompute.
- **Reduced motion / paused:** all three implement `staticFrame` so they never surface
  the blank fallback slot. Flow modes (`contour`, `vortex`) draw a single integrated
  snapshot.

## Color

Full multicolor, all from the theme (read every frame via `getColors()`):

- Dots cycle through `[primary, accent, info, success, warning, error]` (filtering
  falsy) over the `bg` field; ring highlights use `fg`/white.
- `intensity` controls saturation: higher = colors stay saturated, lower = softened
  toward `bg` (the `mix(col, bg, amt)` approach from `scandi.js`).
- If `bg` is transparent (`bg[3] < 0.01`), the field stays transparent so the page
  background shows through; dots draw directly.

## Shared code

Factor the common dot primitives (concentric-ring, phyllotaxis, Archimedean whorl,
stipple-fill, palette-build) into a small internal helper module
`src/presets/_dots.js` so `dotwork`, `stipple`, and `tapestry` share them without
duplication. This keeps each preset file focused on its own composition and animation.

## Integration

- 3 `REGISTRY` entries in `src/presets/index.js` + `src/presets/dotwork.js`,
  `src/presets/stipple.js`, `src/presets/tapestry.js`, `src/presets/_dots.js`.
- Gallery picks them up automatically via `listPresets`.
- `cem:check` after changing exports (manifest is committed + CI-gated).

## Testing & quality gates

- Playwright suite (`npm test`) — extend the generic preset coverage to include the
  three new names (smoke: mounts, draws, `staticFrame` works under reduced motion).
- Node units (`npm run test:node`) — SSR import of the new modules.
- `npm run lint`, `npm run format:check`, `npm run cem:check` all green.
- Update README preset count / groups and `docs/api.html` if it enumerates presets.

## Out of scope (YAGNI / follow-ups)

- WebGL ports for performance — only if canvas2d profiling shows a problem.
- `tapestry` `mode` variants — start with one composite; add modes later if wanted.
- Representational formline figures (the eagle/dragonfly) — these are illustrations,
  not generative backgrounds.

## Tracking

Work tracked in **beads** (`bd`), per repo convention — not TodoWrite. Implementation
issues created at plan time.
