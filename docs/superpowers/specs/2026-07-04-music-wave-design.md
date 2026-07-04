# Music wave: 11 album-art / music-video presets + 3 demo homes

**Date:** 2026-07-04
**Status:** spec pending review

## Goal

Late-1960s through 1980s music visual culture: album-sleeve design languages
and analog music-video effects (registry: 168 → 179). The catalog already
flanks the era (psychedelia, synthwave, vhs/crt, disco); this wave fills the
middle. All eleven presets ship in a **new registry group `music`** — the
wave is cohesive enough to be a gallery tab of its own (the gallery derives
tabs from `listGroups()`, so no UI work beyond the group string).

## New presets

Contract as ever (`src/presets/index.js` header): colors from `getColors()`
every frame, motion pure in pre-scaled `t`, `mulberry32(params.seed)`
layouts, `staticFrame(params)`, `dispose()`, no `mode` attributes, colors
only via `rgbCss`/`rgbaCss` (+ `mix`). Light-ground rule (gl-wc-0eq6):
beams/glows must be **colored** ink, never fg-alpha-only, so the dark-native
presets still read on the light baseline theme; frozen-`t` frames must show
the effect (the lightning lesson — check every envelope at `t=0`).

### Late 60s — sleeves & light shows

| name | renderer | design |
|---|---|---|
| `liquid-light` | webgl (`makeShaderPreset`) | Joshua Light Show oil projection: 2–3 domain-warped metaball-ish dye blobs in saturated primary/accent/info, translucent where they overlap (additive-ish mixing toward white), slowly breathing and swirling. Pure `u_time`. density = blob count/scale, intensity = dye saturation. |
| `bluenote` | canvas2d | Reid Miles jazz sleeve: seeded off-grid composition of duotone tone blocks, thick rules, and oversized dot accents; one block slides slowly (`f(t)`). primary duotone field, accent dots, fg rules on bg. |
| `starburst` | canvas2d | Funk/Motown burst: concentric rings of radiating spokes in alternating primary/accent/warning, slowly counter-rotating ring by ring; a hot core glow. density = spoke count, intensity = ray length. |
| `vinyl` | canvas2d | A spinning record: concentric groove rings (fine fg-alpha circles with seeded band spacing), rotating two-tone label with a spindle hole, and a light sheen that stays fixed while the grooves' micro-texture rotates under it. density = groove fineness, intensity = sheen. |

### 70s — album-art languages

| name | renderer | design |
|---|---|---|
| `prism` | canvas2d | The Hipgnosis triangle: a thin fg beam enters a centered prism outline, refracts, and fans out as a 6-band spectrum (primary→accent→info→success→warning + a mixed 6th); the spectrum shimmers gently and the beam's entry angle drifts a few degrees (`f(t)`). Spectrum bands are colored — reads on any ground. |
| `laser-show` | canvas2d | Laserium: 2–4 colored beams sweeping as lissajous fans through haze — each beam drawn as a fan of glowing lines between two `f(t)` endpoints, plus a soft haze gradient. Colored beams (primary/accent/info), never plain fg. |
| `scanimate` | canvas2d | Analog motion graphics: 3–4 glowing horizontal ribbon curves (stacked sine harmonics) swept across the frame with hot cores and colored falloff, staggered phases; the 70s TV-ident title sweep. |
| `airbrush` | canvas2d | Prog-sleeve airbrush: soft radial-gradient orbs, a horizon band, and 2–3 sweeping arcs in muted mixed tints; everything large, soft-edged, and slowly drifting. Roger-Dean-adjacent without figuration. |

### 80s — the video age

| name | renderer | design |
|---|---|---|
| `video-feedback` | canvas2d | Camera-at-monitor recursion rendered PURELY: per frame, draw N (~10) nested layers, each scaled/rotated a bit more and tinted a step further through primary→accent→info; the innermost layers spin with `t`. No accumulation buffer — the recursion is re-rendered each frame, so frozen frames are stable. density = layer count, intensity = zoom/rotate step. |
| `stage-lights` | canvas2d | Concert opener: a dark stage edge with 3–5 par-can beams sweeping (`sin(t)` angles) in colored cones (primary/accent/info at low alpha, additive-feel via overlap), haze gradient, and seeded dust motes drifting in the beams. |
| `chrome` | webgl (`makeShaderPreset`) | Airbrushed 80s logo metal: mirrored horizon-band gradient (sky-to-ground reflection split), a hot specular sweep traveling the band (`f(u_time)`), and thin scanline-ish highlight streaks. Bands derive from theme colors mixed toward white/black, so it reads chrome in any theme. |

Group tally after: `music` 11 (new group; no other groups change).

## Demos (vocabulary idiom, all conventions apply)

Three pages, 11/11 coverage (registry stays fully demoed at 179/179):

1. **`record-shop.html`** — "Crate Digging": `prism` hero (the sleeve
   everyone owns), then four crate finds as full-bleed sleeve sections:
   `bluenote`, `starburst`, `airbrush`, `vinyl`. Five cover sections,
   sleeve-card vocabulary (artist/title/label credits).
2. **`the-tour.html`** — one night, three acts: `stage-lights` (doors),
   `laser-show` (the planetarium set), `liquid-light` (the encore's oil
   projection). Three cover sections, tour-laminate placard vocabulary.
3. **`video-age.html`** — the ident reel: `video-feedback`,
   `scanimate`, `chrome`. Three cover sections, broadcast-slate vocabulary.

## Tests & docs

- New `test/music-wave.spec.js` (render-smoke shape as prior waves);
  time-rule additions for the nine canvas2d presets; MUSIC_WAVE map test in
  `test/groups-unit.mjs` plus the new group appears in `listGroups()` (extend
  the existing groups test if it pins the group list).
- Container baselines for all 11; light-ground inspection per preset (the
  four dark-native ones especially: prism, laser-show, stage-lights,
  liquid-light); frozen-`t` visibility check (lightning lesson).
- api.html: a new "Music" table section matching the existing group-table
  markup, 11 rows.
- Gallery: verify the new `music` tab appears and cards mount within the
  WebGL budget (only 2 of 11 are WebGL).
- bd issue per preset and per demo; close as landed.

## Out of scope

- memphis (declined in selection); no README changes; no changes to existing
  groups or presets.
