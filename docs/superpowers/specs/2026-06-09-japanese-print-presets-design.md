# Japanese + print-art presets: `sumi-e`, `kintsugi`, `ukiyo-e`, `sakura`, `risograph`, `plotter`, `linocut`

**Date:** 2026-06-09
**Status:** Approved (brainstorm) — pending implementation plan
**Author:** brainstormed with ProfPowell

## Motivation

The catalog (76 presets, 12 groups) is strong on retro tech, dot-art, and
ornamental geometry, but has exactly one Japanese-aesthetic preset (`seigaiha`)
despite that being a stated design interest — and nothing in the
riso/plotter/linocut "printed art" space between the texture and pop groups.
This round adds seven high-impact presets in two new groups, plus a showcase
demo page for each, mirroring the dot-art round.

All but two (`sumi-e`, `risograph`) are canvas2d, so the round adds only one
WebGL preset per new group — far below the gallery's `MAX_WEBGL = 8` budget.

## Registry & grouping

Two new groups in `src/presets/index.js` / `GROUP_LABELS`, inserted after
`ornamental`:

- **`japanese` ("Japanese")** — `seigaiha` (moved from `geometric`), `sumi-e`,
  `kintsugi`, `ukiyo-e`, `sakura`.
- **`print` ("Print art")** — `risograph`, `plotter`, `linocut`.

The gallery picks both groups up automatically via `listGroups()`; no
`docs/gallery.js` changes.

## Presets

### 1. `sumi-e` — ink-wash blooms (WebGL, `japanese`)

Fragment shader. 3–5 seeded bloom centers on staggered grow/hold/fade cycles;
ink density from domain-warped fbm noise, soft-thresholded so edges bleed and
granulate (bokashi). Paper tone from `bg`; ink from `fg` with a whisper of
`primary` in the mid-tones.

- **Params:** `density` → bloom count/scale · `intensity` → ink darkness +
  accent tint · `seed` → bloom placement/phase offsets · `quality` → fbm octave
  count.
- **`staticFrame`:** one mature bloom at a fixed phase.
- **`dispose`:** releases program/buffers.

### 2. `kintsugi` — gold crack veins (canvas2d, `japanese`)

Near-black slab (derived from `bg`, with faint seeded speckle so it reads as
stone) where gold veins grow, branch, and shimmer. Cracks are seeded recursive
random-walk polylines; rendered as layered strokes (wide soft glow under a
bright core) in `warning`/`accent` gold. A slow highlight pulse travels along
each vein. Lifecycle: grow → hold shimmering → crossfade to a new seed.

- **Params:** `density` → vein count/branching · `intensity` → glow strength ·
  `seed` → crack topology · `quality` → segment resolution.
- **Caching:** crack polylines generated once per `seed|density|WxH`; frame()
  only animates reveal length and the traveling highlight.

### 3. `ukiyo-e` — woodblock waves (canvas2d, `japanese`)

3–4 parallax layers of flat-color wave silhouettes built from bezier paths,
each crest carrying scalloped foam "claws" (arc fans) and a darker outline
stroke, drifting horizontally at different rates with a slow vertical swell.
Water from `primary`/`info` tints, foam from `fg`, sky from `bg` with a bokashi
gradient band at the horizon. Flat fills + outlines, deliberately print-like —
distinct from the `waves` shader and `seigaiha` tiling.

- **Params:** `density` → layer count + claw frequency · `intensity` → contrast
  between layers, outline weight · `seed` → wave shapes.

### 4. `sakura` — drifting petals (canvas2d, `japanese`)

Three depth layers (size/speed/alpha). Each petal is a notched-teardrop path
with per-petal flutter (rotation + sway oscillators) riding a global
time-varying gust field that occasionally surges. Petal color blends
`primary` → white per depth layer so it follows the theme but reads as blossom.

- **Params:** `density` → petal count · `intensity` → color saturation + petal
  size · `seed` → spawn layout · `quality` → particle cap.
- Distinct from `snow`/`confetti`: wind gusts, flutter physics, depth layers.

### 5. `risograph` — two-ink overprint (WebGL, `print`)

Two ink layers of big seeded shapes (low-frequency noise thresholded into
blobs/bars/discs), one in `primary`, one in `accent`, multiply-blended where
they overlap (the darker riso "third color"), each layer drifting slowly with
slight misregistration; heavy per-ink grain. Paper from `bg`.

- **Params:** `intensity` → ink coverage · `density` → shape scale/count ·
  `seed` → shape field · `quality` → grain sampling.
- **`dispose`:** releases program/buffers.
- Distinct from `halftone`/`benday` (dot screens) and `paper-grain` (texture
  only): this is shape-led overprint with misregistration.

### 6. `plotter` — self-drawing pen plots (canvas2d, `print`)

Generative pen-plotter art that draws itself. A seeded composition is picked
from a few motifs (flow-field stroke bundles, hatched discs, contour stacks);
strokes are revealed progressively with a visible pen head tracing the current
path. A finished sheet holds, then fades to a fresh seed. One or two pen colors
(`fg`, `primary`) on `bg` paper.

- **Params:** `density` → stroke count · `intensity` → pen weight/contrast ·
  `seed` → composition · `quality` → path resolution.
- Distinct from `spirograph` (single curve family, no progressive draw) and
  `flowlines` (instant, ambient).

### 7. `linocut` — carved-block print (canvas2d, `print`)

Bold seeded organic shapes (waves/leaves/suns) with deliberately rough,
jittered edges, flat-filled in `primary`/`fg`; interior gouge marks (curved
hatch strokes in `bg`) so it reads as cut linoleum. The composition drifts/rolls
slowly like a print cylinder.

- **Params:** `intensity` → contrast + gouge texture amount · `density` →
  shape count/scale · `seed` → composition.
- **Caching:** composition rendered to an offscreen canvas per
  `seed|density|palette|WxH`; frame() blits with slow roll transform.

## Shared conventions (all seven)

- Layout seeded with `mulberry32(params.seed)` — deterministic.
- Colors read every frame via `getColors()`; `intensity` softens toward `bg`
  (the `mix(col, bg, amt)` approach from `scandi.js`). No hardcoded palettes.
- `t` arrives pre-scaled by `speed`; never multiply by `params.speed` again.
- Every preset implements `staticFrame` (no blank reduced-motion fallback).
- WebGL presets implement `dispose`.

## Showcase demos

Seven pages in `demos/` following the `dotwork.html` pattern — full-bleed
`<bg-wc>`, page-pinned palette tokens, hero typography + telemetry strip,
vignette — each with an aesthetic-matched palette:

- `sumi-e.html` — washi neutrals, ink black, vermilion seal accent.
- `kintsugi.html` — charcoal + lacquer black + gold.
- `ukiyo-e.html` — Prussian blue (Hokusai), foam cream, indigo sky.
- `sakura.html` — blossom pinks over dusk indigo.
- `risograph.html` — fluorescent pink + medium blue on cream.
- `plotter.html` — india ink on bone white, technical-drawing typography.
- `linocut.html` — black + persimmon red on warm paper.

Plus seven cards in `demos/index.html`.

## Testing & quality gates

- Add all seven names to `PRESETS` in `test/new-presets.spec.js`
  (loads-and-renders coverage).
- `npm run lint`, `npm run format:check`, `npm run cem:check` (manifest picks
  up new modules; committed + CI-gated), both builds, full Playwright suite,
  `npm run test:node` (SSR import).

## Out of scope (YAGNI / follow-ups)

- `mode` variants for any of the seven — single strong look first; modes later
  if wanted (the dot-art round added modes as a follow-up).
- WebGL ports of canvas2d presets — only if profiling shows a problem.
- Gallery mode-pills or per-preset gallery tuning.

## Tracking

Work tracked in **beads** (`bd`) per repo convention — an epic with one issue
per preset plus one for the demo pages, created at plan time.
