# Phenomena wave: 6 natural-phenomena presets + 3 demo homes

**Date:** 2026-07-03
**Status:** spec pending review

## Goal

The lighter follow-up wave deferred from the style wave: six natural
phenomena the catalog still lacks (registry: 162 → 168). Same architecture
as the style wave — every preset a pure function of `t`, so all join the
time-rule test and all get container baselines.

## New presets

All follow the preset contract (`src/presets/index.js` header): colors from
`getColors()` every frame, motion pure in pre-scaled `t` (no lastT/
accumulation — cyclic paths via `(x0 + t*v) mod 1` like rain/snow),
`mulberry32(params.seed)` layouts, `staticFrame(params)`, `dispose()`. No
`mode` attributes. Colors only via `rgbCss`/`rgbaCss` (+ `mix` from
`_dots.js`).

| name | renderer | group | design |
|---|---|---|---|
| `embers` | canvas2d | particles | Sparks rising off a fire below the frame: seeded particles on drifting sine paths, position `f(t)` cyclic; each cools as it climbs — accent (hot) → primary → transparent — with a soft warm glow pool at the bottom edge. density = spark count, intensity = glow strength. |
| `lightning` | canvas2d | atmospheric | Storm flashes: a seeded bolt (recursive displaced polyline with 1–2 branches) strikes on a schedule derived from `hash(floor(t/period))` — pure in t; the bolt's shape is seeded per strike index. Between strikes, faint cloud-glow pulses. Flash whites the sky briefly (fg at low alpha over bg). density = strike frequency, intensity = flash brightness. |
| `fog` | webgl (`makeShaderPreset`) | atmospheric | Layered fog banks: 3 octaves of value-noise fbm scrolled at different speeds/parallax, mixed between bg and fg-tinted mist; a soft horizon gradient anchors it. Pure `u_time`. density = bank thickness, intensity = mist opacity. |
| `constellation` | canvas2d | particles | A night sky with figures: seeded star field (twinkle = `sin(t·w+φ)`), plus 2–4 seeded constellation figures — small star chains joined by thin fg lines with a faint name-tag ring at the brightest star. accent for figure stars, fg lines, primary tint in the sky glow. |
| `bubbles` | canvas2d | particles | Underwater column: seeded bubbles rise on wobbling paths (`x + sin(t·w+φ)·amp`, `y` cyclic in t), radius-dependent speed, thin fg rim + offset highlight dot; faint caustic light shafts (rgbaCss primary, low alpha) sweep slowly. density = bubble count, intensity = shaft strength. |
| `leaves` | canvas2d | nature | Autumn fall: seeded leaves (3 shapes: oval, maple-ish 3-lobe, willow) tumble down on drifting paths, each rotating and flutter-swaying `f(t)`, drawn in primary/accent/warning tints; occasional slow gust skews all paths together (`sin(t·0.1)`). density = leaf count, intensity = size. |

Group tallies after: particles 13, atmospheric 10, nature 5.

## Demos (vocabulary idiom, all conventions apply)

Three new pages, two phenomena each, keep every preset demoed (168/168):

1. **`campsite.html`** — night at the fire: `embers` (hero, "sparks going
   up to meet the stars") + `constellation` (the sky above). Two cover
   sections, warm-dark pinned palette.
2. **`lighthouse.html`** — a storm watch: `lightning` (the squall) +
   `fog` (the bank that follows). Two cover sections, cold-dark palette,
   keeper's-log placard vocabulary.
3. **`field-notes.html`** — a naturalist's notebook: `bubbles` (the pond
   dip) + `leaves` (the autumn walk). Two cover sections, paper palette,
   notebook-entry vocabulary elements.

All pages: custom vocabulary elements + data-*, zero div/class, binder-only
backgrounds, VB css import (no theme JS), `target="_top"` crumbs, hub tiles.

## Tests & docs

- Extend `test/style-wave.spec.js`? No — new `test/phenomena-wave.spec.js`
  (same render-smoke shape) so wave specs stay self-contained; extend
  time-rule PRESETS with the five canvas2d newcomers; one new
  PHENOMENA_WAVE map test in `test/groups-unit.mjs`.
- The dark-theme legibility lesson (gl-wc-0eq6) applies: embers, lightning,
  constellation, bubbles are dark-native — verify each also reads on a
  LIGHT ground (the visual-baseline theme) before accepting its baseline;
  where a preset is inherently sky/night-bound, derive its ground the
  documented-deviation way (like cyanotype's Prussian pull) rather than
  vanishing on light themes. Decide per preset at implementation, document
  in the header.
- Container visual baselines for all 6 (anchored `-g`; determinism re-run;
  Read-and-inspect each PNG).
- api.html rows (particles/atmospheric/nature tables).
- bd issue per preset and per demo page; close as landed.

## Out of scope

- No new registry groups; no README changes; no gallery DARK_STAGE entries
  unless light-ground inspection shows a preset is invisible there (then
  treat like oscilloscope with a one-line gallery fix + test).
