---
title: css3d Renderer + Dimensional Presets (fly-through, explode)
description: A third bg-wc renderer that mounts DOM/CSS-3D scenes, plus two presets — a composable fly-through tunnel and a particle-burst — that work as theme-aware backgrounds.
author: brainstormed with Claude Code
date: 2026-06-02
tags:
  - bg-wc
  - renderer
  - css3d
  - presets
---

# css3d Renderer + Dimensional Presets

## Summary

Add a third renderer kind to `bg-wc`, `css3d`, that builds DOM scenes animated
with CSS `@keyframes` and `transform-style: preserve-3d` instead of drawing to a
canvas. Ship two presets on top of it:

- **`fly-through`** — a composable tunnel the camera flies through, varying along
  three independent axes (cross-section profile, flight path, repeated unit).
- **`explode`** — a field of theme-colored particles over a faint floor grid that
  periodically bursts outward and reassembles.

Both are theme-aware, honor reduced-motion and pause, and are proven as
*backgrounds* (content slotted on top) — not standalone art pieces.

These derive from the pure-CSS-3D reference pens in
`docs/superpowers/plans/found-demos/` (`fly-through/`, `explode-cube/`).

## Background & motivation

`bg-wc` today renders only to `canvas` — `webgl.js` and `canvas2d.js`, dispatched
by each preset's `renderer` field in `src/presets/index.js`. The reference pens
are a different medium: DOM + CSS transforms, zero canvas, zero JS animation loop.
They achieve their performance precisely by baking motion into CSS `@keyframes`
(GPU-composited) rather than writing transforms per frame.

Of the seven reference demos, two read as **backgrounds** (environments you
occupy): `fly-through` and `explode-cube`. The rest (`pendulum`, `caterpillar`,
`cubes`, `cube-of-cubes`, `tetrahelix`) are discrete *objects/subjects* and are
out of scope — they belong to a future decorative-object component, not `bg-wc`.

## Architecture decision: hybrid CSS-driven (approach C)

Three integration strategies were considered:

- **A. JS-driven per frame** — the rAF loop writes transforms onto every node each
  tick. Rejected: writing to thousands of nodes per frame is exactly the cost the
  pens avoid; it janks and reimplements baked trig for no benefit.
- **B. Pure-CSS** — JS mounts static markup + a stylesheet; CSS does 100% of motion.
  Rejected as the *sole* model: fights `bg-wc`'s `frame(t, params)` contract;
  `speed`/`density`/pause/reduced-motion have nowhere to live.
- **C. Hybrid (chosen)** — CSS `@keyframes` drive continuous motion (cheap, GPU);
  JS owns *parameters*. At build: node count from `density`, theme colors → CSS
  vars, profile/path/unit → which classes/vars apply. Live: `speed` →
  `animation-duration`, `intensity` → perspective/scale, pause →
  `animation-play-state`, reduced-motion → paused at a representative offset. The
  rAF loop does not run for css3d presets.

Approach C keeps the pens' fidelity and performance while honoring the component
contract (theme tokens, pause, reduced-motion, fallback) through CSS state instead
of per-frame JS.

### Accepted limitations

- `snapshot()` returns `null` for css3d presets (there is no canvas to `toBlob`).
- Structural parameter changes (`mode`, `density`) **rebuild** the scene rather than
  tween smoothly. Continuous params (`speed`, `intensity`, colors) update live.
- Very high `density` is capped for performance (see Performance).

## Component: the `css3d` renderer

### New file `src/renderer/css3d.js`

Parallels `webgl.js` / `canvas2d.js`. Exports `createCSS3DContext(host)` returning
a *stage* element plus helpers:

```js
// createCSS3DContext(host) -> {
//   stage,                      // <div> mounted in place of the canvas
//   mountStyle(scopedCss),      // inject a scoped <style> into the stage
//   setVars(map),               // write CSS custom properties on the stage
//   dispose(),                  // remove style + clear stage
// }
```

The stage is `position:absolute; inset:0` filling the host. `perspective` and
`transform-style: preserve-3d` are scoped to the stage (not `body`, unlike the
pens). Each preset injects its own scoped stylesheet via `mountStyle`.

### Edits to `src/bg-wc.js`

Seven contained changes; the canvas path is otherwise untouched.

1. **Generalize the layer element.** `#canvas` is today always a `<canvas>`.
   Introduce a "layer element" abstraction: a canvas for `webgl`/`canvas2d`, a
   stage `<div>` for `css3d`. The existing `replaceWith` swap generalizes. Keep the
   `part="canvas"` exposure for canvas layers; the stage gets `part="stage"`.
2. **Dispatch branch** in `#loadCurrentPreset`: for `css3d`, build a stage via
   `createCSS3DContext(this)` instead of a GL/2D context, and pass `stage` into
   `create({ host, stage, getColors, getParams })` alongside the existing
   `gl`/`c2d` (which are `null` for css3d).
3. **`#resize`**: css3d branch writes size vars onto the stage (`--w`,`--h`); there
   is no drawing buffer to size and no `gl.viewport`.
4. **`#evalPlay`**: for `css3d`, do **not** start the rAF loop. Instead call
   `this.#instance.setPlaying(shouldPlay)`, which toggles `animation-play-state`
   via a var/attr on the stage. Pause, tab-hidden, power-save, and reduced-motion
   all route through this single call.
5. **`#updateFallbackVisibility`**: treat css3d instances as having a static
   representation (a paused scene is still visible), so reduced-motion shows the
   paused scene rather than swapping in the fallback slot.
6. **`snapshot()`**: returns `null` when `rendererKind === 'css3d'` (documented).
7. **`observedAttributes` += `mode`**; in `attributeChangedCallback`, re-init the
   preset on `mode` change **only when `rendererKind === 'css3d'`**. Canvas presets
   (e.g. `mosaic`) keep reading `mode` per frame and are unaffected.

The instance contract is otherwise reused verbatim
(`create`/`resize`/`frame`/`staticFrame`/`dispose`). The only new, optional method
is `setPlaying(bool)`. `frame(t, params)` is a no-op for these presets (or, at most,
reconciles a live var); it is not on the hot path.

## Preset: `fly-through`

`renderer: 'css3d'`. A composable tunnel read from `mode` as space-delimited
tokens: `mode="ring straight cube"` → `profile=ring path=straight unit=cube`.
Defaults (`ring straight cube`) reproduce the reference pen.

- **profile** (cross-section wall): `ring` (cubes in a circle — original),
  `corridor` (square tube), `hex`, `tube` (smooth cylinder of facets). Controls how
  units are placed around the cross-section.
- **path** (centerline flown): `straight` (original), `helix` (corkscrew), `wave`
  (sine drift). An extra per-segment rotate/translate layered onto each ring.
- **unit** (repeated element): `cube` (original), `sphere`, `pyramid`, `card`.
  Swaps the small element's markup/faces.

Build-time JS: `density` → ring/segment count (capped, see Performance); theme
colors → CSS vars cycled across depth (the per-face lightness steps that produce 3D
shading are preserved). Motion is the pen's `@keyframes flyThrough`. Live: `speed`
→ `animation-duration`; `intensity` → `--perspective`/scale. Structural axes and
`density` rebuild on change.

`palette="theme"` (default) cycles primary→accent→info across depth;
`palette="spectrum"` restores the original rainbow as an opt-in.

## Preset: `explode`

`renderer: 'css3d'`. A grid of points over a faint floor grid, the whole scene
slowly rotating; each point's `::before` explodes outward and fades on a loop, then
reassembles (from `explode-cube`).

- `mode="radial"` (default) — scatter outward.
- `mode="cube"` — burst into the cube formation of the reference pen.

Build-time JS: per-particle `--tx/--ty` from `seed` (deterministic), particle count
from `density`, colors from theme tokens. Live: `speed` → cycle duration;
`intensity` → burst distance + floor-grid prominence.

## Theming

Both presets default `palette="theme"`. `getColors()` returns colors as 0–1 float
arrays (the GL uniform shape); the presets convert to `rgb()` strings for CSS vars.
Primary/accent/info are cycled across depth (fly-through) or across particles
(explode), replacing the pens' rainbow `hsl(var(--hue))`. `bg`/`fg` tint the floor
and shadows.

## Reduced motion

There is no rAF loop to stop. `setPlaying(false)` sets
`animation-play-state: paused`. Each preset applies an initial `animation-delay` so
the paused pose is a representative mid-scene frame, not a degenerate start. The
scene stays visible; the fallback slot is not surfaced.

## Performance

Fly-through's DOM node count is the principal risk (~3,500 in the pen). `density`
maps to a capped ring/segment count, with a default well under the pen's. Animation
touches only `transform`/`opacity`, so it stays on the GPU compositor. The demo page
is the perf proof; if a capped default still strains low-end devices, lower the cap.

## Files to add or edit

```text
bg-wc/
  src/renderer/css3d.js        # NEW — stage factory + style/var helpers
  src/presets/fly-through.js   # NEW — composable tunnel
  src/presets/explode.js       # NEW — particle burst
  src/presets/index.js         # EDIT — register both; new "dimensional" group
  src/bg-wc.js                 # EDIT — seven css3d changes above
  demos/dimensional.html       # NEW — both presets with slotted content on top
  test/css3d.spec.js           # NEW — Playwright
  test/new-presets-page.html   # EDIT — add the two presets for the test harness
```

New registry group `dimensional` (label "Dimensional / 3D"), both entries
`renderer: 'css3d'`.

## Testing (Playwright, real browser)

- Renderer mounts a stage `<div>` (not a canvas) with `part="stage"`.
- Theme vars resolve onto the stage; changing tokens updates the CSS vars.
- `paused` and visibility toggles flip `animation-play-state` on the stage.
- Reduced-motion shows the paused scene, **not** the fallback slot.
- `mode` change rebuilds the scene (new node count / structure); canvas-preset
  `mode` behavior is unchanged.
- `dispose()` removes the stage and its injected `<style>`.
- Both presets register, load, and emit `bg-wc:ready` with `renderer: 'css3d'`.
- `snapshot()` returns `null` for css3d.
- Visual sanity: screenshot `demos/dimensional.html` with content slotted on top.

## Acceptance criteria

- [ ] A `css3d` preset mounts a DOM scene into the shadow root and renders.
- [ ] `fly-through` reproduces the reference pen at its defaults and composes
      profile × path × unit via `mode`.
- [ ] `explode` reproduces the reference burst and supports `radial`/`cube`.
- [ ] Both are theme-aware (`palette="theme"` default; `spectrum` opt-in for
      fly-through) and legible with content slotted on top.
- [ ] `paused`, tab-hidden, power-save, and reduced-motion all stop motion via
      `setPlaying`; reduced-motion leaves a static scene, not the fallback.
- [ ] The canvas renderers and existing presets (esp. `mosaic` `mode`) are
      behaviorally unchanged.
- [ ] `npm test` (Playwright) and `npm run lint` pass.

## Out of scope

- The object/subject pens (`pendulum`, `caterpillar`, `cubes`, `cube-of-cubes`,
  `tetrahelix`) — these are decorative objects, not backgrounds.
- Rasterizing css3d to an image for `snapshot()`.
- Smooth tweening of structural parameter changes.
- Any change to the in-progress cross-repo journal work (separate, in
  vanilla-breeze).

## Clangs

- **`perspective` scope.** The pens set `perspective` on `body`; scoping it to the
  stage is essential or the 3D breaks when the component is not full-viewport.
- **`mode` dual meaning.** `mode` already drives canvas presets per frame (mosaic).
  The css3d-only re-init must be gated on `rendererKind` so mosaic is not regressed.
- **Color format.** `getColors()` yields 0–1 floats for GL; CSS needs `rgb()`
  strings — convert, don't pass through.
- **Node budget.** Uncapped `density` on fly-through can mount thousands of nodes;
  cap it and document the ceiling rather than letting a consumer wedge the page.
