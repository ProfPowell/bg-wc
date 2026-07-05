# Dimensional wave: 8 CSS-3D presets + 2 demo homes

**Date:** 2026-07-05
**Status:** spec pending review

## Goal

The `dimensional` group is the catalog's runt — two presets. This wave adds
eight CSS-3D scenes (group: 2 → 10; registry: 179 → 187). All use the css3d
renderer: DOM planes/boxes under `transform-style: preserve-3d`, motion in
CSS `@keyframes`, JS only builds the scene and reconciles vars.

## The css3d preset contract (follow explode/fly-through exactly)

- `create({ host, css3d, getColors, getParams })` → `{ setPlaying, frame,
  resize, dispose }`; `frame()` is the reconcile hook (re-read
  colors/params, `css3d.setVars` keyed to skip no-ops); `setPlaying`
  delegates to `css3d.setPlaying`; `dispose` → `css3d.dispose()`.
- Styles via `css3d.mountStyle(STYLE)` and STYLE must include the shared
  PAUSE_RULE (`.stage[data-playing="0"] * { animation-play-state: paused
  !important; }`).
- **Paused-still rule** (frozen-t's css3d equivalent): every animation gets
  a negative `animation-delay` so a paused frame (reduced-motion, gallery
  hover-off, visual baselines) lands mid-motion, never on a degenerate 0%
  keyframe (explode's `--ex-delay` precedent).
- **Card scaling**: `resize(w, h)` sets `stage.style.fontSize =
  min(16, max(3, min(w,h)/30))px` and all scene geometry is in `em`.
- Colors: `rgbCss` tuples written into CSS custom properties during
  reconcile; layouts seeded with `mulberry32(params.seed)` — import it from
  `../util/pause.js` (do NOT copy explode's local duplicate).
- Element budget ≤ ~220 DOM nodes per scene (fly-through scale). `density`
  maps to element count, `speed` to animation duration vars
  (`--dur: calc(Xs / var(--speed))` pattern or JS-computed duration),
  `intensity` to opacity/glow strength. No `mode` attributes.

## New presets (all renderer `css3d`, group `dimensional`)

| name | design |
|---|---|
| `carousel` | A ring of 10–14 theme-gradient cards (two-stop gradients cycling primary/accent/info) orbiting the camera rolodex-style; ring tilts a few degrees and precesses slowly. Cards double-sided (backface visible, dimmer). |
| `gyroscope` | 3–5 nested wireframe rings (bordered circles, `border-radius: 50%`) each spinning on a different axis at a different period around a glowing core dot; a faint equatorial disc grounds it. |
| `monolith` | 3–5 dark slab boxes (6-face cuboids, fg-derived near-black with a primary edge sheen) floating over explode's floor-grid idiom, each tumbling very slowly on its own axis with staggered negative delays. |
| `shards` | 16–28 translucent gradient triangles/quads (clip-path) scattered on a sphere-ish shell, the whole cloud rotating; each shard shimmers (opacity keyframes, staggered). |
| `cube-wave` | An n×n grid (5–8 per side by density) of small cubes on a tilted plane, each bobbing in translateZ with `animation-delay` proportional to Manhattan distance from center — the traveling-wave classic. Cube tops primary, sides mixed toward bg. |
| `skyline` | ~24 extruded blocks (4 side faces + top) in two depth rows on a ground plane, heights seeded; the camera pans laterally past them on a long loop; windows as repeating-linear-gradient on faces, accent glow on a few. |
| `chamber` | Camera INSIDE a slowly rotating room: 4 walls + floor + ceiling as inward-facing gradient planes (primary/accent washes, fg rule lines like wainscoting); a soft light square drifts across the walls (background-position keyframes). |
| `satellites` | A small central planet (stacked translucent discs approximating a sphere) with 3 tilted orbit rings, each carrying 2–4 small cards that orbit at different periods; rings faint fg, cards themed. |

## Demos (vocabulary idiom, all conventions apply)

Two pages, four presets each (coverage stays total at 187/187):

1. **`sculpture-hall.html`** — a gallery of kinetic sculpture, four cover
   sections with pedestal-placard vocabulary: `carousel`, `gyroscope`,
   `shards`, `monolith`.
2. **`diorama.html`** — model worlds under glass, four cover sections with
   case-label vocabulary: `cube-wave`, `skyline`, `chamber`, `satellites`.

## Tests & docs

- New `test/dimensional-wave.spec.js`: per preset assert (a) stage div
  mounts, no canvas, no fallback (css3d.spec.js shape); (b) the stage holds
  a non-trivial scene (>= 10 descendant elements); (c) the mounted <style>
  text contains the pause rule marker `data-playing="0"` (guards the
  PAUSE_RULE requirement per preset).
- NOT in time-rule (CSS keyframe motion, not JS-t). Container visual
  baselines for all 8 (explode/fly-through precedent — paused stills are
  deterministic thanks to negative delays); light-ground + paused-still
  inspection per preset.
- api.html: add rows to the existing "Dimensional / CSS-3D presets" table.
- Extend the DIMENSIONAL/groups pinning in `test/groups-unit.mjs` with a
  DIMENSIONAL_WAVE map test (same shape as MUSIC_WAVE, but no exact-count
  assertion — the group has the 2 pre-existing presets).
- bd issue per preset and per demo; close as landed.

## Out of scope

- No changes to explode/fly-through (their local mulberry32 duplicate is
  noted on gl-wc-e9z1's family of cleanups, not this wave).
- No new groups; no gallery changes (dimensional tab already exists).
