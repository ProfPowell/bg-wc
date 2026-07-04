# Handoff: Preset Wave 3 — Retro LED Instruments + Natural Scenes + Tiki/Atomic Exotica

Audience: Claude Code session in this repo. Read `CLAUDE.md` and the preset
contract at the top of `src/presets/index.js` first. Contract recap:
`create(ctx)` → `{ resize, frame, staticFrame, dispose }`; colors via
`getColors()` EVERY frame; layout seeded with `mulberry32(params.seed)`;
`t` arrives pre-scaled by `speed` (TIME RULE — never multiply by
`params.speed` again); W/H are device pixels. Per-preset extras only via the
existing host-attribute pattern (`mode`, `text`) — no new `<bg-wc>` attributes.

Registry is at **132 presets / 20 groups** after wave 2. This wave adds **~15
presets** in two thematic families, plus (optionally) two new groups.

Before writing any preset, skim 2–3 neighbours for idioms: `scandi.js` /
`circuit.js` (cached seeded `build()`), `oscilloscope.js` + `radar.js`
(persistence / instrument feel), `summit.js` (parallax scenes, sky gradients,
the bird primitive), `lanterns.js` (deterministic-from-`t` particles, glow
sprite), `morris.js` / `quilt.js` (tiling motifs), `neon-sign.js` (pre-rendered
glow layers, `text` cycling), and the frozen-frame clock-offset trick used by
`hilbert`/`bootlog`/`crochet` (`const START_OFF = …; frame(t0){ const t = t0 +
START_OFF }`) for any preset that "draws/fills on" over time.

## Two families

**A. Retro LED / instrument dataviz** — 70s–80s hi-fi and lab gear. The
graphic equalizer is the hero. These are the "calculation-like" pieces.

**B. Natural + Exotica** — illustrative outdoor scenes (reeds, bird
migration, dappled light, palms) and 1950s tiki-bar / atomic-ranch leisure
design.

## New groups (recommended; adjust if taste says otherwise)

- `nature` — illustrative living scenes: `reeds`, `migration`, `komorebi`,
  `palms` (+ room to grow: meadow, kelp, fireflies). Keeps these out of
  `atmospheric`, which is already at **7 WebGL members** (one under the
  gallery's `MAX_WEBGL = 8`) — do NOT add WebGL presets to `atmospheric`.
- `lounge` — mid-century exotica / leisure design: `tiki`, `breezeblock`,
  `barkcloth` (+ room: lanai, sunburst-clock). Alternative: fold these into
  the existing `kitsch` group (roadside/craft/nostalgia Americana) — they fit
  there too. Pick one and be consistent. NOTE the existing `atomic` (pop —
  boomerang/starburst *pattern*) and `deco`; the new pieces are *scenes*, not
  flat patterns, so they don't collide, but keep them visually distinct.

The LED/instrument family joins existing groups: most go to **`retro`**
(consumer electronics nostalgia) or **`dataviz`** (the user's "dataviz or
calculation like" framing). Assignments are per-preset below.

Keep WebGL ≤ 6 per new group; only `komorebi` and `spectrum` are candidate
WebGL pieces and they land in different groups, so no group nears the cap.

## Already covered — do NOT rebuild these (differentiate explicitly)

- `oscilloscope` (Lissajous/scope persistence), `waveform`, `radar` (sweep),
  `lidar` (point cloud) — the EQ/VU/spectrum pieces are bars/needles/waterfall,
  a different instrument vocabulary.
- `matrix` (falling glyphs), `crt`, `vhs`, `glitch`, `synthwave`, `gameboy`,
  `copperbars`, `bliss`, `mystify` — display-era effects already; the LED
  pieces are *physical hardware readouts* (segmented bars, needles, tubes,
  flaps), not screen FX.
- `atomic` (boomerang/starburst pattern), `deco`, `groove` — mid-century
  *patterns*; the exotica pieces are *scenes/screens*.
- `caustics` (underwater light) — `komorebi` is warm leaf-dappled sunlight,
  explicitly diverge (foliage edge, long shadows, warmer, slower).
- `boids` (tight chaotic flocking) and `summit` (ridgelines with a few
  incidental birds) — `migration` is organized high-altitude V-skeins over an
  autumn sky, birds are the subject.
- `lanterns`, `sakura`, `snow`, `confetti` — particle drifts; `reeds`/`palms`
  are rooted, wind-driven vegetation.
- `lava` (webgl metaballs) IS effectively a lava lamp — do not add one.
- `pegboard` (static lit-peg pictures) — `ledticker`/`equalizer` are animated
  signal readouts on an LED grid/columns; note the kinship, keep distinct.

---

## Phase 1 — anchors (one hero per direction)

### `equalizer` — retro, canvas2d  ★ hero
Classic 80s graphic EQ (Sony/Technics rack vibe). N vertical columns, each a
stack of discrete LED segments (rounded rects with dark gaps). No real audio:
synthesize a per-band level each frame from a sum of a few sines at musical
ratios plus a seeded slow-noise wander, so columns "thump" believably and
independently. Each column carries a **peak-hold cap** — a single bright
segment that jumps to the current max and then falls slowly under "gravity".
Segment colours ramp bottom→top through theme roles: `success`→`warning`→
`error` (green→amber→red), unlit segments a dim `fg`-on-`bg`. `density` = band
count (8–24), `intensity` = drive (how hard it thumps) + lit brightness.
`mode`: `bars` (default) | `mirror` (columns mirrored about a centre line,
hi-fi "spectrum" look) | `dots` (one floating dot + peak cap per band, no
stack). `staticFrame`: a frozen plausible spectrum with peak caps set.
Perf: pure `fillRect` grid; trivial. This is the centrepiece — make the bounce
feel rhythmic, not random (give bass bands slower/heavier motion than treble).

### `tiki` — lounge (or kitsch), canvas2d  ★ hero
Tiki bar at night. Seeded foreground of carved tiki-mask totems in silhouette
(stacked geometric face blocks — brow, eyes, nose, mouth from primitives),
flanked by **flickering torch flames** (layered warm flame shapes with a
pre-rendered radial glow sprite, seeded flicker — reuse the flame/flicker idea
from `lanterns`/`neon-sign` rather than per-frame shadowBlur), hanging
glass-float lamps, and bamboo/thatch texture along the top edge. Deep tropical
night gradient (`bg`→`primary`) behind. Torch `warning`/`accent` warmth; masks
near-black `fg`. `density` = totem/torch count, `intensity` = firelight.
`staticFrame`: torches lit mid-flicker. The exotica hero.

### `reeds` — nature, canvas2d
Illustrative reeds / cattails / tall grasses swaying in wind. Clusters of
tapered blades rooted at the bottom edge, each a quadratic curve whose tip
deflects with a **travelling wind gust** (a phase sweeping across x, magnitude
ebbing on a slow envelope so gusts come and go). Seeded heights, lean, and
clump positions; 2–3 depth layers (back paler/smaller, the `scandi` softening
toward `bg`). A few cattail heads / seed tufts on taller stalks. Colours from
`success`/`primary` greens softened toward `bg`; tufts in `warning`. `density`
= blade count, `intensity` = wind strength. `staticFrame`: a still, gently
leaned field.

### `nixie` — dataviz, canvas2d
Nixie-tube readout (50s–70s lab/computer counter). A row of glass tubes, each
showing a warm-orange numeral built from a stacked-wire digit glyph, with the
faint **unlit "ghost" digits** layered behind (the signature Nixie depth), a
fine anode-mesh overlay, and a soft side glow. Digits tick/roll like a
frequency counter or odometer (a value climbing, occasional fast spin). The
"calculation-like" anchor. `density` = tube count, `intensity` = cathode glow.
`text` overrides the displayed value/label (digits only; non-digits blank the
tube). Glow via pre-rendered sprite. `staticFrame`: a settled reading.

### `breezeblock` — lounge (or kitsch), canvas2d
Atomic-ranch architecture: a wall of mid-century **breeze-block** (decorative
concrete screen) — a tiled grid of one seeded geometric aperture motif
(hourglass, circle-in-square, leaf, double-Y), with warm light raking through
the openings from behind (a slow-drifting gradient + per-aperture glow that
brightens as the light crosses), and a single **starburst sunburst clock** or
boomerang accent floating over it. The light sweep reuses `shine.js`/`damask`
band logic. Block face in `fg`/`primary` muted toward `bg`; light in
`warning`/`accent`. `density` = aperture count, `intensity` = backlight.
`mode`: aperture motif select (`hourglass` | `circle` | `leaf` | `mixed`).
`staticFrame`: a lit wall, light mid-sweep. Distinct from `atomic` (that's a
scattered boomerang/starburst pattern; this is an architectural screen).

## Phase 2 — LED / instrument fill-out

- `vumeter` (retro, canvas2d) — analog VU meters: 2–N arc dials with a
  ballistic swinging needle (damped spring that overshoots then settles to the
  synthesized level), a red zone arc near full-scale, tick marks + small
  labels, a `PEAK` LED that lights on transients, and a glass reflection
  highlight. Needle motion shares the level synth with `equalizer` but reads
  analog. `density` = meter count, `intensity` = signal.
- `spectrum` (tech, webgl) — instrument spectrum **waterfall**: a live FFT-bar
  strip across the top feeding a scrolling time-frequency **spectrogram**
  heatmap below (frequency on x, time scrolling down, magnitude → `bg`→
  `primary`→`accent`→`warning` ramp). Reuses the ping-pong / scroll-texture
  idea (sample the column, shift down one row each step). Genuinely different
  from the EQ bars and from `oscilloscope`. `density` = bin count, `intensity`
  = gain/contrast. (Only WebGL piece in `tech` to add — `tech` has headroom.)
- `splitflap` (dataviz, canvas2d) — Solari split-flap board: rows of character
  cells that riffle through glyphs (top half folds down over the bottom) and
  settle on letters/numbers; the classic departure-board clatter, staggered
  per cell. `text` sets the board contents (lines split on `|`, cycling).
  Distinct from all `text` presets (those are CRT/scroll/teletype).
- `ledticker` (dataviz, canvas2d) — a single-colour dot-matrix LED sign: a
  fixed grid of round LEDs, lit/unlit with phosphor decay, scrolling `text`
  marquee-style **or** (no text) a scrolling scope/bar pattern across the dots.
  Amber/red period palette. Distinct from `pegboard` (static pictures) and
  `matrix` (glyph rain) — this is a hardware marquee board.

## Phase 3 — nature fill-out

- `migration` (nature, canvas2d) — birds migrating high in an autumn sky.
  Several **V-skeins** at different altitudes/depths drifting across a graded
  autumn gradient (`info` teal → `warning` gold → `accent` dusk), each V
  gently undulating and occasionally reshuffling lead birds; tiny silhouettes,
  far skeins smaller/paler (parallax). `density` = flock/bird count,
  `intensity` = sky saturation. Explicitly not `boids` (no steering swarm) and
  not `summit` (birds are the subject, autumn palette, no terrain).
- `komorebi` (nature, webgl) — dappled late-afternoon light through swaying
  trees. An fbm **sunfleck field**: soft warm light blobs that drift and
  breathe as if leaves move, over a foliage-shadow base, with a slow ripple
  and long raking shadow streaks; warm rim, cool shade. The user's "shadows of
  light… ripples cast as light diffuses through swaying trees." Diverge from
  `caustics` deliberately: warmer, slower, leaf-edged (not water-celled),
  gold-green palette. `density` = fleck density, `intensity` = light strength.
- `palms` (nature, canvas2d) — palm fronds swaying against a sky. A few palm
  silhouettes (trunk + radiating feather/fan fronds built from tapered
  curves), fronds bending in a breeze with seeded sway, parallax distant palms,
  over a sunset/tropical gradient. The daytime counterpart to `tiki`.
  `density` = palm count, `intensity` = breeze. `mode`: `silhouette` (dark on
  sunset, default) | `lit` (sunlit green fronds).
- *(optional)* `meadow` (nature, canvas2d) — wildflower field: layered swaying
  stems with simple bloom heads opening/closing, butterflies crossing. Defer
  unless wanted; `reeds` may cover the "swaying field" need.

## Phase 4 — exotica fill-out

- `barkcloth` (lounge/kitsch, canvas2d) — 1950s tiki/Hawaiian **barkcloth
  textile**: a repeating, gently drifting print of stylized monstera leaves,
  hibiscus, abstract fronds and pods in a muted period palette (avocado,
  mustard, burnt orange, teal — mapped from theme roles softened toward `bg`).
  The tropical answer to `morris`/`quilt`; tiles seamlessly, breathes slowly.
  Distinct from `seigaiha` (waves) and `damask` (flourish). `density` = motif
  scale, `intensity` = print saturation.
- `lanai` (lounge/kitsch, canvas2d) — mid-century pool/patio: a **kidney-shape
  pool** with animated caustic ripple sheen, amoeba/palette-shape stepping
  stones, a sunburst, and palm-frond shadows falling across the deck;
  Palm-Springs sky gradient. Combines the atomic-ranch leisure motifs into a
  scene. Distinct from `breezeblock` (wall vs poolside). `intensity` = ripple/
  sun. *(Lower priority — ship if the family wants a third.)*

(Cap the wave at the strongest ~15. If trimming: keep `equalizer`, `tiki`,
`reeds`, `nixie`, `breezeblock`, `vumeter`, `splitflap`, `migration`,
`komorebi`, `palms`, `barkcloth`; treat `spectrum`, `ledticker`, `lanai`,
`meadow` as stretch.)

## Cross-cutting requirements (same as prior waves)

1. Contract: `resize` + `frame` + `staticFrame` for all; `dispose` for every
   WebGL preset (`komorebi`, `spectrum`).
2. Theme tokens only via `getColors()` per frame; honour the transparent-`bg`
   fallback pattern (see `scandi.js`).
3. Determinism: layout/composition from `mulberry32(params.seed)`, cached on a
   seed/density/size key like scandi's `build()`. The EQ/VU "signal" is a
   deterministic function of `t` (sum of sines + seeded phases) — no `Math.random`.
4. Perf: steady 60fps at `quality=med` on integrated graphics. Pre-render glow
   sprites and textured substrates (torch glow, Nixie glow, breeze-block,
   barkcloth tile) offscreen; **no per-frame `shadowBlur`** across many
   elements. WebGL `mediump`.
5. No real typefaces beyond system font stacks; invented/segment glyphs for
   nixie/splitflap/sevenseg-style digits; no trademarked logos or brand marks
   (generic hi-fi, generic motel, generic tiki masks).
6. Registry entries alphabetised within each group block; run `npm run analyze`
   + `npm run cem:check` after export changes; update `docs/gallery.js` group
   ordering for any new group (`nature`, `lounge`); confirm `MAX_WEBGL`
   still covers the busiest group view.
7. Tests mirror the smoke pattern in `test/new-presets.spec.js` (load + no
   `data-fallback` + paints bytes) for every preset; add `mode`/`text`
   coverage for `equalizer`, `breezeblock`, `palms`, `nixie`, `splitflap`,
   `ledticker`. Update `test/groups-unit.mjs` if groups change.
8. README preset count + highlights table updated once, in a final commit at
   the end of the wave.
9. Per-session: beads issues first (`bd prime`; one epic, one issue per preset,
   phase-tagged); one preset = one issue = one conventional commit; full
   CLAUDE.md quality-gate + push protocol; validate every preset in a real
   browser (the pinned Playwright image) and review each visual baseline before
   committing; add stateful/never-settling presets (likely `splitflap`,
   `ledticker` if accumulating, `komorebi` if it accumulates) to the visual
   `NO_SNAPSHOT` set, and give "draw/fill-on" presets a `START_OFF` so frozen
   frames aren't empty.

## Demo ideas (after the presets land, browser-window hub)

- **Hi-Fi** — `equalizer` (mirror mode) behind a rack-stereo / streaming-app UI.
- **Calibration** — `vumeter` or `nixie` behind a studio / lab-instrument page.
- **Mahalo** — `tiki` behind a tiki-bar drinks menu (torch-lit).
- **Palm Springs** — `breezeblock` or `lanai` behind a mid-century real-estate /
  hotel landing.
- **Flyway** — `migration` behind an autumn travel / birding page.
- **Golden Hour** — `komorebi` behind a calm wellness / journal page.
- Two should exercise `text`: `splitflap` (an arrivals board) and `ledticker`
  (a stock/news crawl).

## Non-goals
- No new `<bg-wc>` attributes; per-preset extras via `mode`/`text` only.
- No new dependencies; no new renderer infrastructure (the ping-pong helper
  from wave 1 covers any accumulation `spectrum`/`komorebi` need).
