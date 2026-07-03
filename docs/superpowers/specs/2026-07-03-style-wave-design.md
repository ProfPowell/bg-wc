# Style wave: 12 movement/pattern/technique presets + 5 demo homes

**Date:** 2026-07-03
**Status:** approved scope (gap analysis + selection in-session); spec pending review

## Goal

A catalog review against art/design history found the collection strong on
20th-century Western design, Japan, print, and retro-computing — but missing
several canonical movements, skewed Western in its pattern traditions, and
short a few iconic techniques. This wave adds 12 presets closing the
highest-value gaps, plus demos so the every-preset-demoed invariant holds
(registry: 150 → 162).

## New presets

All follow the preset contract (`src/presets/index.js` header): colors from
`getColors()` every frame, motion from pre-scaled `t` (dt idiom for canvas2d
integrators), `mulberry32(params.seed)` layouts, `staticFrame(params)`,
cleanup in `dispose()`. All must settle at `speed=0` for container visual
baselines. No `mode` attributes unless listed. Colors only via
`rgbCss`/`rgbaCss`.

### Movements

| name | renderer | group | design |
|---|---|---|---|
| `art-nouveau` | canvas2d | classic | Whiplash-curve botanical borders: seeded vine spines drawn as long S-curves with tapering stroke weight, leaf/bud flourishes at curvature peaks, corner-frame composition. Slow growth-drift of the tendril tips. primary = vine, accent = blooms, fg = frame lines. |
| `constructivism` | canvas2d | classic | Lissitzky/Malevich field: floating rectangles, circles, and one dominant diagonal wedge, composed on a rotated axis; seeded arrangement, slow orbital drift of the minor planes. primary (revolutionary red) leads, fg for bars/type-blocks, bg cream. |
| `psychedelia` | webgl (`makeShaderPreset`) | pop | Liquid 1960s poster warp: concentric contour bands around 2–3 drifting centers, domain-warped (fbm-lite) so bands melt; bands alternate primary/accent/info at full saturation (vibrating-complement look). Pure function of `u_time`. |
| `brushstroke` | canvas2d | art | Impasto flow field: short directional strokes (2–3 px wide ribbons with lighter top edge for relief) following a curl-noise field, Starry-Night swirl centers seeded; strokes redrawn per frame from `t`-advected positions using the boids dt pattern. primary/accent/info strokes over bg. |

### World patterns

| name | renderer | group | design |
|---|---|---|---|
| `celtic-knot` | canvas2d | ornamental | Interlaced strapwork: knotwork generated on a seeded grid with break-markers (standard knot algorithm), ribbons drawn with over-under gaps and a darker outline; slow phase shimmer along the strap highlights. fg straps, primary fills. |
| `paisley` | canvas2d | ornamental | Boteh block-print repeat: seeded half-drop grid of teardrop motifs (outline + interior dots/fronds), slight per-stamp rotation/offset misregistration like `linocut`; gentle row drift. primary motifs, accent details. |
| `azulejo` | canvas2d | ornamental | Glazed tile wall: quadrant-symmetric tile motif (radial petals/stars) stamped on a grid, cobalt-style primary on bg-white with thin fg grout lines; occasional accent tile variant; subtle glaze-sheen sweep. |
| `mudcloth` | canvas2d | ornamental | Bogolanfini bands: horizontal strips each filled with one seeded symbol row (zigzag, dots, ticks, diamonds, crosses) in fg on bg, hand-drawn jitter on every stroke; slow band scroll. |

### Techniques

| name | renderer | group | design |
|---|---|---|---|
| `terrazzo` | canvas2d | texture | Stone-chip speckle: seeded convex chips (3–6 gon) in primary/accent/info/fg tints scattered dense on bg ground, size mix per density; static field with a faint polish-sheen drift. |
| `cyanotype` | canvas2d | print | Botanical silhouettes on Prussian blue: seeded fern/sprig/seed-head silhouettes (white-on-blue), soft exposure halo around each, paper-edge vignette; slow exposure shimmer. Fixed blue ground derived by darkening the theme primary toward Prussian blue; fg for the silhouettes. |
| `screenprint` | canvas2d | print | Off-register screenprint: one seeded bold motif (star/portrait-blob/ring) stamped in 3 layers — primary/accent/info — each layer offset a few px with per-frame micro-drift, multiply-style overlap darkening, coarse halftone fill in one layer. |
| `transit-diagram` | canvas2d | dataviz | Beck/Vignelli map: seeded network of 45°/90° polyline routes in primary/accent/info/success/warning, white station ticks and interchange rings; small train dots travel the routes (dt-advected). bg map ground, fg station strokes. |

Group tallies after: classic 14, ornamental 9, pop 6, art 7, texture 6,
print 5, dataviz 10.

## Demos (vocabulary idiom, all conventions apply)

Four new pages + one extension keep every new preset demoed:

1. **`belle-epoque.html`** — Montmartre, 1899: `art-nouveau` hero (café-concert
   poster placard) + `brushstroke` night-sky scene. Two cover sections.
2. **`poster-century.html`** — three poster revolutions, stacked:
   `constructivism` (1920s agitprop), `psychedelia` (Fillmore 1967),
   `screenprint` (the Factory). Three cover sections with era placards.
3. **`atlas.html`** — an atlas of pattern places, five cover sections with
   location plaques: `celtic-knot` (Kells), `paisley` (Kashmir), `azulejo`
   (Lisbon), `mudcloth` (Mali), `terrazzo` (Venice).
4. **`interchange.html`** — a single-viewport metro-map hero for
   `transit-diagram` with line-legend vocabulary elements.
5. **`drawing-office.html` (extend)** — add Sheet 5: `cyanotype` ("the
   blueprint's photographic cousin"), same `<sheet-block>`/`<dl>` title-block
   idiom.

All pages: custom vocabulary elements + data-* variants, zero div/class,
`data-background` binder only, VB css import, `target="_top"` crumbs, hub
tiles for the four new pages. The existing conventions/idiom/smoke/parity
guards apply automatically.

## Tests & docs

- `test/gap-wave.spec.js`-style render smoke for the 12 (extend or add a
  `style-wave` spec); time-rule additions for the canvas2d integrators
  (`brushstroke`, `transit-diagram`, and any other preset that advects state);
  group-pinning updates in `test/groups-unit.mjs`.
- Container visual baselines for all 12 (anchored `-g` filter; verify run).
- api.html catalog rows (existing group tables; print/texture/dataviz grow).
- bd issue per preset and per demo page; close as landed.

## Out of scope

- The natural-phenomena set (embers, lightning, fog, constellation, bubbles,
  autumn leaves) — a separate lighter wave.
- No new registry groups; no README highlight-table changes.
