# Changelog

All notable changes to `@profpowell/bg-wc` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/) (pre-1.0, so a minor bump may break).

## [Unreleased]

### Fixed

- **Stateful presets step from elapsed time** (reaction-diffusion, slime-mold,
  spectrum, boids, mycelium, radar, oscilloscope, drip, matrix, mystify). They
  advanced once per `frame()` call, so refresh rate and `quality` changed the
  simulation speed, `speed="0"` kept animating, and every repeated `t`
  (snapshot, reduced-motion still) mutated the picture. A shared fixed-step
  clock (`src/presets/_clock.js`) now derives a bounded whole number of steps
  from the absolute elapsed `t`; 60 Hz and 120 Hz converge pixel-for-pixel.
- **`snapshot()` is observational and has defined semantics.** It resolves
  `null` when there is nothing to capture (css3d, no preset, removed, failed,
  disconnected, lost context) instead of throwing a `TypeError`, and rejects
  (after the element goes inert with one `bg-wc:error`) if the re-render
  throws, instead of swallowing the error and returning stale pixels.
- **One error boundary.** Throws from a preset's `resize()`, from css3d
  `setPlaying()`, and from the snapshot re-render now flow through the same
  inert-on-failure path as `frame()`; no silent catches remain.
- **Stills stay correct while stopped.** A resize while paused / under reduced
  motion / at `speed="0"` redraws a still instead of leaving the cleared
  canvas; `intensity`, `palette`, `quality`, `density`, `seed`, and `text`
  changes re-render the still; `speed="0"` schedules no animation frames and
  pauses css3d animations; resuming is reliable. `text` is now an observed
  attribute.
- **slime-mold on WebGL1.** Trail textures are power-of-two at every quality
  (WebGL1 samples a wrapping NPOT texture as black), the agent heading is
  stored normalised so no format clamps it, the agent count scales with the
  trail (a 128² trail saturated to a flat field), and the shared ping-pong
  helper now walks a format ladder (WebGL2 half-float → WebGL1
  `OES_texture_half_float` → `OES_texture_float` → bytes), validating each
  framebuffer and throwing (→ fallback slot) if none renders.
- **`data-background` binder hardening.** Only an explicit allowlist of params
  is forwarded to the injected element (`BINDER_PARAM_ATTRS`); anything else
  (`data-background-onclick`, `-style`, `-class`, …) is dropped with a
  one-time console warning. Param attributes now reconcile live, the injected
  element is re-injected if a framework re-render removes it, and
  `stopWatching()` cancels the queued DOMContentLoaded startup.
- **Published manifest and package surface.** `custom-elements.json` paths
  point at the shipped `dist/` files and omit internal modules;
  `@profpowell/bg-wc/presets/_*` and `/presets/index` are blocked in
  `exports`; `prepack` builds and analyzes so `npm pack` works from a clean
  checkout; the pack smoke test verifies every manifest path in the tarball.
- **Site assets.** The production build now emits every `<icon-wc>` icon the
  pages reference (the GitHub icon was missing) and fails on a missing one; a
  browser test serves the built site and checks every page for 4xx, page
  errors, unrendered icons, and element registration.
- **Pages deploy.** The deployment builds the exact CI-approved commit
  (`workflow_run.head_sha`), holds Pages/OIDC write permissions only in the
  deploy job, never persists the token, and verifies the live site reports
  the deployed SHA.

## [0.5.1] — 2026-11-04

### Added

- **`data-bg` is a first-class twin of `data-background`.** `data-bg="mosaic"`,
  `data-bg-intensity`, `data-bg-color-1`, and `data-bg-skip` work exactly like
  the long spelling, with the same parameter mapping, positioning, and
  lifecycle tracking. One spelling per element; `data-background` wins if
  both are present. It was a deprecated alias in 0.4.0 and absent in 0.5.0;
  it is now a permanent part of the surface.

## [0.5.0] — 2026-11-03

### Breaking

- **The legacy `gl-wc` surface is gone.** Only the canonical names remain:
  the `<bg-wc>` element, the `data-background` binder attribute, `--bg-wc-*`
  custom properties, and `bg-wc:*` events. `<gl-wc>`, `data-bg`,
  `data-bg-skip`, `--gl-wc-*`, and `gl-wc:*` no longer work (they warned as
  deprecated in 0.4.0; `data-bg` returns as a first-class spelling in 0.5.1).
  The module's named export is `{ BgWc }`.

### Added

- **127 new presets, 72 → 199**, across six preset waves. New groups: `art`,
  `classic`, `japanese`, `kitsch`, `lounge`, `music`, `nature`, `print`,
  `science`, `tech`. Highlights by group:
  - `dimensional` (css3d renderer): carousel, chamber, cube-wave, gyroscope,
    monolith, satellites, shards, skyline
  - `science`: boids, chladni, helix, mycelium, orbital, phyllotaxis,
    reaction-diffusion, slime-mold
  - `tech`: blueprint, circuit, gyroid, hologram, lidar, neon-city,
    oscilloscope, radar, spectrum, swarm
  - `music`: airbrush, bluenote, chrome, laser-show, liquid-light, prism,
    scanimate, stage-lights, starburst, video-feedback, vinyl
  - `classic`: alchemy, art-nouveau, bauhaus, cave, clockwork, constructivism,
    damask, de-stijl, hieroglyph, illuminated, meander, morris, stained-glass,
    swiss
  - `art`: brushstroke, colorfield, cutouts, drip, graffiti, mobile, oil-sky,
    terrace, watercolor
  - `nature`: komorebi, leaves, lily-pond, meadow, migration, palms, reeds,
    tide
  - `japanese`: kintsugi, origami, sakura, sumi-e, ukiyo-e, zen-garden
  - `print`: cyanotype, linocut, plotter, risograph, screenprint
  - `particles`: bubbles, constellation, embers, fireflies, lanterns, rain
  - `atmospheric`: cumulus, fog, lightning, moonrise, nebula, summit
  - `ornamental`: azulejo, celtic-knot, dotwork, gilded, mudcloth, paisley,
    tapestry
  - `kitsch`: crochet, disco, domino, neon-sign, pegboard, quilt
  - `lounge`: barkcloth, breezeblock, lanai, tiki
  - `pop`: deco-spires, fan-deco, peacock, psychedelia
  - `dataviz`: ledticker, nixie, splitflap, transit-diagram
  - `geometric`: delaunay, hilbert, moire, truchet
  - `retro`: equalizer, metaballs, vumeter
  - `texture`: stipple, terrazzo; `gradient`: halcyon; `text`: bootlog
- **`data-background` is now live for the element's whole lifecycle.** Late
  annotation binds, changing the value re-points the preset, and removing the
  attribute (or adding `data-background-skip`) unbinds and removes the
  injected element.
- **Ping-pong framebuffer helper** in the WebGL renderer for stateful
  simulation presets (reaction-diffusion, slime-mold, oscilloscope). Prefers
  half-float on WebGL2 and degrades to RGBA8.
- **Demo pages** for every wave (31 demo commits) and API-reference rows for
  every new preset.

### Changed

- **Runtime errors leave the element inert.** A preset that throws from
  `frame()` or `staticFrame()` is now handled exactly like a failed load:
  instance disposed, fallback slot shown, one `bg-wc:error`, `ready`
  settled. Pause/resume, visibility, and reduced-motion changes no longer
  restart a broken instance. Recovery is a preset change or a WebGL context
  restore. Previously the two error paths behaved differently.
- **css3d animation phase is speed-invariant.** Negative animation delays in
  chamber, carousel, skyline, satellites, shards, explode, and fly-through
  are now fractions of the duration instead of fixed seconds, matching
  gyroscope, monolith, and cube-wave. The resting pose at the default speed
  is unchanged. If a page overrides a css3d duration variable, the phase now
  scales with it.
- `--bg-wc-*` parameter overrides are clamped to the documented ranges.
- Preset-load races and error paths consistently leave the element inert;
  orphaned `ready` promises settle instead of hanging.
- Pixel ratio is clamped; css3d scenes rebuild on seed change.

### Fixed

- Trail presets (matrix, mystify) no longer burn in old ink.
- Moonrise base paint covers the full canvas (frame-purity seam).
- Screenprint stays legible on dark themes; fireflies dusk-darken per spec.
- Demo hub back-links escape the preview iframe; source-listing separators
  restored.
- Gallery accessibility: real `h1`, ordered headings, honest pill semantics.
- Library build declares source entry side effects so live demos keep the
  element registered.

### Internal

- Shared `seededPool` helper replaces 35 hand-copied rebuild/ensure/lastKey
  scaffolds in particle and layout presets (pixel-identical output).
- The css3d pause rule is defined once in the renderer and imported by every
  css3d preset.
- Visual baselines for every wave; the visual project runs in the pinned
  Playwright container in CI.

## [0.4.0] — 2026-06-08

First release under the `@profpowell/bg-wc` name (renamed from
`@profpowell/gl-wc`). Legacy `gl-wc` aliases still worked with a one-time
deprecation warning.

[0.5.1]: https://github.com/ProfPowell/bg-wc/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/ProfPowell/bg-wc/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ProfPowell/bg-wc/releases/tag/v0.4.0
