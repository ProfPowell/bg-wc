# Preset gap wave: 4 new presets + 4 group-showcase demos

**Date:** 2026-07-01
**Status:** approved (design discussion in-session)

## Goal

Two gaps surfaced by a coverage review:

1. The collection lacks several obvious background archetypes (rain, fireflies,
   metaballs, zen garden) despite having their nearest siblings (snow, lanterns,
   plasma, sumi-e).
2. 64 of 146 presets never appear in any `demos/` page. The weakest groups:
   art 1/6, classic 3/12, science 2/8, text 2/6, retro 5/12.

This wave adds **4 presets** and **4 themed demo pages** that together give
~18 never-demoed presets an in-context showcase.

## New presets

All four follow the preset contract (`src/presets/index.js` header): colors
from `getColors()` every frame, motion integrated from `t` via the dt pattern
(`let dt = t - lastT; lastT = t; if (!(dt >= 0) || dt > 1) dt = 0;`), layout
seeded with `mulberry32(params.seed)`, `staticFrame(params)` provided, cleanup
in `dispose()`. No `mode` attribute this round — `intensity`/`density`/`seed`
cover the variation.

| name | renderer | group | one-liner |
|---|---|---|---|
| `rain` | canvas2d | particles | Layered angled streaks (depth = speed/length/alpha) + seeded splash ripples at a ground line. `density` = drop count, `intensity` = storm strength (angle, streak length). fg/info-tinted streaks on theme bg. |
| `fireflies` | canvas2d | particles | Slow sin-field wander with individually phased brightness pulses; two-pass glow (large low-alpha disc under crisp core — the asteroids idiom, no shadowBlur). warning/accent glow on a dusk-darkened bg. |
| `metaballs` | webgl (`makeShaderPreset`) | retro | Classic demoscene lava-lamp: inverse-square field sum of 5–8 seeded orbiting blobs, smooth iso threshold, palette bands from primary/accent/info. |
| `zen-garden` | canvas2d | japanese | Seeded stones with concentric raked furrows over a straight rake field; furrows as paired highlight/shadow strokes for relief. Slow rake-phase breathing; `staticFrame` is the natural state. |

Registration: one `REGISTRY` entry each (groups exist already — no new
`GROUP_LABELS`).

## Demo pages

Four standalone pages in `demos/`, following the established demo idiom
(self-contained page, `--color-*` tokens defining the page's palette, Google
Fonts, full-bleed `bg-wc` hero, `.scrim` + content layers — see `alpine.html`),
each composing several never-demoed presets across its sections. Registered in
`demos/index.html` as `browser-window` tiles like the existing entries.

| page | theme | presets retired |
|---|---|---|
| `gallery-night.html` | fictional exhibition opening | `drip` (hero), `graffiti`, `colorfield`, `cutouts`, `mobile` |
| `scriptorium.html` | antiquarian archive | `illuminated` (hero), `hieroglyph`, `alchemy`, `cave` |
| `field-station.html` | research-lab landing | `chladni` (hero), `mycelium`, `phyllotaxis`, `orbital`, `boids` |
| `greenscreen.html` | terminal homage | `matrix` (hero), `crt`, `glitch`, `bootlog` + `source` (via `text` attr) |

Constraint: stay well under the live-WebGL budget per page (most of these are
canvas2d; no page composes more than ~4 WebGL presets, and sections below the
fold rely on `bg-wc`'s own viewport pausing).

Coverage after this wave: art 6/6, classic 7/12, science 7/8, text 4/6,
retro 8/12.

## Out of scope

- No `mode` attributes / gallery mode pills for the new presets.
- No demo placement for the new presets themselves (they appear in the gallery
  and API reference automatically once registered).
- No new preset groups.
- Remaining never-demoed presets (kitsch, geometric, dataviz tails) — later wave.

## Testing & docs

- **Visual suite is automatic:** `test/visual.spec.js` iterates
  `listPresets()`, so each new preset needs a container-generated baseline
  (`scripts/update-visual-baselines.sh` filtered with `-g <name>`), after
  confirming it settles at `speed=0`. If one doesn't settle, it goes in
  `NO_SNAPSHOT` with a reason — but all four are designed to be stable at
  frozen t.
- **Registry pinning:** group-membership assertions in the node manifest tests
  (`test/manifest.mjs` / `groups-unit.mjs`) extended like prior waves.
- **Time-rule:** the three canvas2d presets are added to
  `test/time-rule.spec.js`'s preset list (frame is a function of t).
- **Demos:** no per-page Playwright tests (matches existing demo convention);
  manual visual check via `npm run dev`.
- **Docs:** api.html catalog rows for the four presets (group tables exist);
  README preset-highlight table only if a natural row fits.
- **Tracking:** one bd issue per preset and per demo page, closed as each
  lands.

## Work breakdown

1. Presets: `rain`, `fireflies`, `metaballs`, `zen-garden` (+ registry, api
   rows, time-rule entries, manifest pinning).
2. Baselines: container run for the four names; verify with a no-update run.
3. Demos: four pages + hub tiles.
4. Session close: full gates, push.
