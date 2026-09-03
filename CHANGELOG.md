# Changelog

All notable changes to `@profpowell/bg-wc` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/) (pre-1.0, so a minor bump may break).

## [0.5.0] — 2026-09-03

### Breaking

- **The legacy `gl-wc` surface is gone.** Only the canonical names remain:
  the `<bg-wc>` element, the `data-background` binder attribute, `--bg-wc-*`
  custom properties, and `bg-wc:*` events. `<gl-wc>`, `data-bg`,
  `data-bg-skip`, `--gl-wc-*`, and `gl-wc:*` no longer work (they warned as
  deprecated in 0.4.0). The module's named export is `{ BgWc }`.

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

[0.5.0]: https://github.com/ProfPowell/bg-wc/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ProfPowell/bg-wc/releases/tag/v0.4.0
