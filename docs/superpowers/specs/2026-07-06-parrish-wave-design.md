# Parrish wave: 12 luminous/calming/deco presets + 3 demo homes

**Date:** 2026-07-06
**Status:** approved direction (Parrish four explicitly selected; calming +
deco slates included per the user's standing all-offered pattern — trim by
exception)

## Goal

The feelings of Maxfield Parrish — idyllic rim-lit clouds, luminous
golden-hour light, painted skies — plus calming scenes and more deco
(registry: 187 → 199). Complements without overlapping: `summit` keeps
mountain ridgelines, `deco` keeps the sunburst, `brushstroke` keeps abstract
impasto flow, `airbrush` keeps prog-sleeve softness.

## New presets

Contract as all canvas waves (`src/presets/index.js` header): colors from
`getColors()` every frame; motion PURE in pre-scaled `t`; `mulberry32(seed)`
layouts; `staticFrame(params)`; `dispose()`; no `mode` attributes; colors
only via `rgbCss`/`rgbaCss` + `mix`. Light-ground rule (colored ink, never
fg-alpha-only) and frozen-`t` rule (envelopes visibly non-zero at t=0) both
apply. Parrish scenes may derive their luminous sky ramps by mixing theme
colors toward warm/cool anchors — the cyanotype-style documented deviation —
but every derived tone must still move with the theme.

### Parrish light

| name | renderer | group | design |
|---|---|---|---|
| `cumulus` | canvas2d | atmospheric | Stacked billowing clouds: 3–5 seeded cloud masses, each a cluster of overlapping soft discs shaded flat-bottom/bright-top with a warm rim on the sun side; saturated two-stop sky behind (primary mixed toward deep blue above, accent mixed toward warm at the horizon). Clouds drift very slowly; rim light breathes. |
| `terrace` | canvas2d | art | The classical Parrish stage: dark column silhouettes (2–3, seeded placement, simple capital blocks) and an urn framing a luminous sky gradient; a low balustrade line; light breathes gently through the opening. Figures never — just architecture and light. |
| `oil-sky` | canvas2d | art | A skyscape built from visible strokes: horizontal banded brushwork (short overlapping rounded strokes, 3–5 bands from warm horizon to cool zenith), each stroke slightly misaligned; strokes shimmer subtly. Distinct from `brushstroke` (abstract swirl field). |
| `moonrise` | canvas2d | atmospheric | Calm night: a big low moon disc (mix of fg toward white) with soft halo, 2–3 thin luminous cloud bands crossing it, a dim reflection column below the horizon line; everything glacial. |

### Calming

| name | renderer | group | design |
|---|---|---|---|
| `lily-pond` | canvas2d | nature | Monet water: vertical reflection smears (soft columns of mixed sky tones), 5–9 seeded lily-pad clusters drifting imperceptibly, an occasional slow ripple ring expanding (`(t*v+phase) mod 1` cycles). |
| `meadow` | canvas2d | nature | Dusk grassland: 3 parallax layers of grass-blade silhouettes (seeded heights/curves) swaying gently, warm gradient sky, a few seed-head dots catching light. |
| `tide` | canvas2d | nature | A breathing shoreline: 2–3 translucent wave sheets advancing/retreating on offset `sin(t)` cycles over sand-tone ground, each leaving a brighter foam edge. |
| `halcyon` | webgl (`makeShaderPreset`) | gradient | Pure calm: enormous soft color fields (primary/accent/info mixed far toward bg) slowly breathing into one another via low-frequency fbm; no structure, mist-grade. The catalog's most restful entry. |

### Deco

| name | renderer | group | design |
|---|---|---|---|
| `fan-deco` | canvas2d | pop | Erté scalloped shell-fans: overlapping half-disc fans with radiating ribs in a staggered repeat, gold-derived (accent toward white) on a deep field; row-by-row shimmer. |
| `deco-spires` | canvas2d | pop | Stepped-setback skyscraper silhouettes (seeded heights, symmetric setbacks) against ray bursts from behind the tallest spire; thin gold outlines and window slits; rays rotate imperceptibly. |
| `peacock` | canvas2d | pop | Deco peacock: a fan of plume curves each ending in an eye (concentric ovals in accent/info/primary), gold ribs, on midnight-derived ground; plumes sway as one. |
| `gilded` | canvas2d | ornamental | Klimt-adjacent gold-leaf field: seeded mosaic of spirals, concentric squares, and fleck clusters in layered gold tones (accent/warning toward white/bg), shimmering patch by patch. |

Group tallies after: atmospheric 12, art 9, nature 8, gradient 9, pop 9,
ornamental 10.

## Demos (vocabulary idiom, all conventions apply)

Three pages, four presets each (coverage stays total at 199/199):

1. **`daybreak.html`** — one day in four paintings: `cumulus` (morning),
   `terrace` (golden hour), `oil-sky` (painted dusk), `moonrise` (night).
   Gallery-plate vocabulary, Parrish-blue pinned palette.
2. **`the-retreat.html`** — a quiet weekend: `lily-pond`, `meadow`, `tide`,
   `halcyon`. Journal-entry vocabulary, soft daylight palette.
3. **`grand-foyer.html`** — an evening at the Chrysler: `deco-spires` (the
   view), `fan-deco` (the ballroom), `peacock` (the lounge), `gilded` (the
   bar). Gold-on-midnight pinned palette, engraved-invitation vocabulary.

## Tests & docs

- New `test/parrish-wave.spec.js` (render-smoke shape as prior canvas waves);
  time-rule additions for the eleven canvas2d presets; PARRISH_WAVE map test
  in `test/groups-unit.mjs`.
- Container baselines for all 12; light-ground + frozen-`t` inspection per
  preset (halcyon especially — mist-grade must not mean blank; require a
  visible field structure at the baseline threshold, and remember the
  gl-wc-0eq6 blend lessons for anything luminous).
- api.html rows in the six group tables.
- bd issue per preset and per demo; close as landed.

## Out of scope

- No changes to summit/deco/brushstroke/airbrush; no new groups; no README
  changes.
