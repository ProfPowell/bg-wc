---
title: Ornamental Geometry preset pack (girih, mandala, atomic, op-art)
description: Four new theme-aware bg-wc background presets — Islamic star-polygon strapwork, layered mandala, mid-century atomic shapes, and optical-illusion op-art.
author: brainstormed with Claude Code
date: 2026-06-02
tags:
  - bg-wc
  - presets
  - ornamental
  - geometry
---

# Ornamental Geometry preset pack

## Summary

Add four new `<bg-wc>` background presets, themed as an "ornamental geometry"
pack, each reading theme tokens like the existing 60+:

- **`girih`** — Islamic periodic star-polygon strapwork lattice (WebGL).
- **`mandala`** — layered concentric, counter-rotating radial symmetry (WebGL).
- **`atomic`** — mid-century / atomic-age scattered shapes (Canvas2D).
- **`op-art`** — optical-illusion patterns with false motion (WebGL).

A new registry group **`ornamental`** holds `girih` + `mandala` + `op-art`;
`atomic` joins the existing **Pop art** (`pop`) group with `deco`.

## Background & motivation

These fill genuine gaps in the catalog — each has a neighbor but none duplicate:

| Preset | Closest existing | How it differs |
|--------|------------------|----------------|
| `girih` | `kaleidoscope`, `deco`, `conic` | True star-polygon *tessellation* + interlaced strapwork; none tile |
| `mandala` | `spirograph`, `kaleidoscope` | Concentric *layered* radial motifs, not rosettes / mirror-folds |
| `atomic` | `deco`, `supergraphics` | 1950s atomic: boomerangs, kidneys, starbursts, harlequin |
| `op-art` | `warp`, `dither` | Real op-art — moiré, café-wall, peripheral drift |

The work composes entirely from settled patterns: the preset registry
(`src/presets/index.js`), the WebGL/Canvas2D renderers, the `getColors()` token
resolver, the `frame`/`staticFrame` instance contract, and the gallery/docs
surfacing built earlier this cycle.

## Shared conventions

- **Renderers.** `girih`, `mandala`, `op-art` are WebGL fragment-shader presets
  (crisp at any scale, cheap subtle motion). `atomic` is Canvas2D (discrete
  decorative shapes on a flat field).
- **Theming.** Every preset reads `getColors()` (primary / accent / info /
  background / foreground). No hardcoded palettes.
- **Params.** All honor `intensity` and `speed`; pattern presets use `density`
  for frequency/count; `atomic` and modal presets use `seed` / `mode`.
- **Motion (per-preset tuned).** `girih`/`mandala` lean calm (slow rotation,
  counter-rotating rings, breathing line-weight); `op-art` is more active (slow
  drift that triggers the peripheral-motion illusion); `atomic` is a lazy bob /
  parallax. `speed` scales all; defaults are gentle.
- **Reduced motion.** Each preset implements `staticFrame(params)` — a still
  frame is fully representative of a pattern, so `prefers-reduced-motion` shows a
  frozen frame, never the fallback slot.
- **Grouping.** New group `ornamental` (label "Ornamental") for the three WebGL
  presets; `atomic` → `pop`. The gallery renders one group at a time, so at most
  3 simultaneous WebGL contexts from this group — well under the ~16 cap.

## Preset designs

### `girih` — Islamic star-polygon strapwork (WebGL)

A periodic star-polygon lattice with interlaced strapwork. The fragment shader
folds UV into a repeating tile, and within each cell computes SDF distance to an
n-pointed star plus the connecting "girih" lines, drawing crisp anti-aliased
strokes (the strapwork) over filled star centers.

- **mode:** `8fold` (classic 8-point khatam star + cross, default) / `12fold` /
  `6fold`. Scoped to **periodic** lattices — not full aperiodic quasicrystal
  girih, which is out of shader scope (see Out of scope).
- **params:** `density` → tile count / pattern scale; `intensity` → line contrast
  & subtle glow.
- **tokens:** primary (strapwork lines), accent (star fills), info (secondary
  motif), background.
- **motion:** very slow whole-lattice rotation + faint breathing of line weight.

### `mandala` — layered radial symmetry (WebGL)

Polar coordinates from the center with N-fold rotational symmetry (angle fold).
Concentric radius bands each carry a repeated SDF motif (petals / arcs / dots)
keyed to the ring index; colors cycle primary → accent → info outward. Adjacent
rings counter-rotate for a layered, calm-but-mesmerizing effect.

- **params:** `density` → ring count / symmetry order; `intensity` → motif detail
  & contrast. (No `mode`; density + symmetry provide the variety.)
- **tokens:** primary / accent / info / background.
- **motion:** slow, gentle, adjacent rings counter-rotating.

### `atomic` — mid-century / atomic age (Canvas2D)

A seeded scatter of 1950s atomic-age shapes on a flat token field: boomerangs
(curved tapered forms), kidney / amoeba blobs, starbursts / atomic spokes, and a
diamond / harlequin grid. Deterministic placement from `seed` so `staticFrame` is
exact.

- **mode:** `mixed` (default) / `boomerangs` / `starbursts` / `harlequin`.
- **params:** `density` → shape count; `intensity` → size / contrast; `seed` →
  arrangement.
- **tokens:** primary / accent / info over background.
- **motion:** lazy bob / slow rotate / slight parallax drift.

### `op-art` — optical illusion (WebGL)

Classic op-art in a fragment shader using a high-contrast token pair.

- **mode:** `riley` (sine-warped high-contrast wavy bands, default) / `cafewall`
  (offset-checker café-wall illusion) / `moire` (two drifting gratings → moiré +
  false motion) / `drift` (peripheral-drift asymmetric luminance steps).
- **params:** `density` → frequency (stripe / grid count); `intensity` → contrast
  & warp amount.
- **tokens:** high-contrast pair — foreground / background (fallback
  primary / background).
- **motion:** slow drift / phase producing the illusion of movement;
  `staticFrame` freezes it (still reads as op-art).

## Integration

- **`src/presets/<name>.js`** — one file per preset, exporting `create()`
  returning `{ frame, staticFrame, resize, dispose }` per the existing contract.
- **`src/presets/index.js`** — register all four; add `ornamental` to
  `GROUP_LABELS` (placed near `pop`); `girih`/`mandala`/`op-art` → `ornamental`,
  `atomic` → `pop`.
- **Gallery (`docs/gallery.js`)** — auto-enumerates the new group. Add `atomic`
  and `op-art` to `MODE_OPTIONS` so their mode pills appear on the cards (first
  option = each preset's default mode).
- **Docs (`docs/api.html`)** — add catalog rows (a new "Ornamental presets"
  `<h3>` for the three; `atomic` under the existing pop/pattern area), and extend
  the `mode` attribute row to mention `atomic` and `op-art` mode values.
- **`custom-elements.json`** — regenerate via `npm run analyze`.
- **Tests (`test/`)** — extend the `new-presets.spec.js` pattern: each preset
  loads and renders to a sized canvas; each `mode` value loads without error
  (`atomic`, `op-art`); reduced-motion shows a static frame, not the fallback.

## Acceptance criteria

- [ ] Four presets render as theme-aware backgrounds reading `getColors()`.
- [ ] `girih` (8/12/6-fold), `mandala`, `atomic` (mixed/boomerangs/starbursts/
      harlequin), `op-art` (riley/cafewall/moire/drift) all load and render.
- [ ] Each honors `intensity`/`speed` (and `density`/`seed`/`mode` where listed)
      and provides a `staticFrame` for reduced motion (no fallback swap).
- [ ] New `ornamental` group appears in `listGroups()` and the gallery; `atomic`
      shows under Pop art. Mode pills appear for `atomic`/`op-art`.
- [ ] `api.html` documents all four; `custom-elements.json` regenerated.
- [ ] `npm test` and `npm run lint` pass; existing presets unchanged.

## Out of scope

- Aperiodic / quasicrystal girih tilings (Penrose-like) — `girih` ships periodic
  lattices only.
- Dedicated full-bleed demo pages on the demos hub (optional follow-up; the
  gallery is the showcase for v1).
- Any change to existing presets, renderers, or the component core beyond
  registry/group additions.

## Clangs

- **WebGL context budget.** Three WebGL presets in one gallery group is fine
  (one group mounts at a time), but a page that hand-mounts all of `ornamental`
  plus other WebGL presets must mind the ~16-context cap — same caveat as today.
- **Token contrast for `op-art`.** Op-art needs a genuinely high-contrast pair;
  if a theme's foreground/background are close, the illusion weakens. Use
  foreground/background, fall back to primary/background, and let `intensity`
  push contrast.
- **`girih` authenticity.** Periodic star-polygon lattices read as "Islamic
  geometric" but are not true historical girih (which is often aperiodic).
  Document the name as evocative, not academic.
- **`atomic` determinism.** Placement must derive from `seed` only (no
  `Math.random` after build) so `staticFrame` matches the animated frames and
  renders identically across reloads.
