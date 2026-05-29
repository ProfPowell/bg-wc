---
title: Journal Surfaces & Animated Accents — design
description: Bullet-journal background foundation — static paper substrates in Vanilla Breeze plus two animated bg-wc presets (paper-grain, doodles).
author: Claude Code + ProfPowell (brainstorm)
date: 2026-05-29
status: approved
tags:
  - bg-wc
  - vanilla-breeze
  - surfaces
  - presets
  - journal
---

# Journal Surfaces & Animated Accents

Foundation for an eventual **bullet-journal inspired theme** for Vanilla Breeze.
This spec is the substrate + accent layer the theme will be built on. It does
**not** build the theme itself, the washi-tape layer, or the border-wc tier.

## Table of contents

- [Background](#background)
- [Architecture](#architecture)
- [Component 1 — VB journal substrate (CSS)](#component-1--vb-journal-substrate-css)
- [Component 2 — bg-wc `paper-grain` preset (WebGL)](#component-2--bg-wc-paper-grain-preset-webgl)
- [Component 3 — bg-wc `doodles` preset (Canvas2D)](#component-3--bg-wc-doodles-preset-canvas2d)
- [Composition](#composition)
- [Testing](#testing)
- [Token-naming decision](#token-naming-decision)
- [Scope boundaries](#scope-boundaries)
- [Acceptance criteria](#acceptance-criteria)
- [Clangs](#clangs)

## Background

The original handoff (`docs/superpowers/plans/washi-bg.md`) proposed adding a
pure-CSS pattern-token library and paper "surfaces" to **bg-wc**. Exploring the
codebase showed two things that reshape the plan:

1. **bg-wc has no CSS files.** Every "effect" is a JS preset rendering to WebGL
   or Canvas2D, wrapped in lifecycle machinery (visibility pausing,
   reduced-motion, battery, context-loss recovery). It draws pixels; it cannot
   *consume* a CSS gradient token. Static paper is the wrong shape for it.
2. **Vanilla Breeze already owns the static-surface layer.**
   `src/tokens/extensions/surfaces.css` already defines `--texture-dots`,
   `--texture-grid`, `--texture-lines`, `--texture-noise`, `--texture-grain`,
   a `--page-bg-*` system, and `src/utils/surface-types.css` applies surface
   variants via a `[data-surface="…"]` attribute convention.

So the work splits (hybrid): static substrate → VB; animated accents → bg-wc.

## Architecture

A journal background is two stacked layers:

| Layer | Lives in | Form | Rationale |
|-------|----------|------|-----------|
| **Substrate** — paper / dots / grid / lines / kraft | Vanilla Breeze | Static CSS via `[data-surface="…"]` | Resolution-independent, print-crisp, zero runtime cost; VB already owns surfaces |
| **Accents** — `paper-grain`, `doodles` | bg-wc | JS presets (WebGL + Canvas2D) | Genuinely need motion + a canvas — bg-wc's purpose |

The two halves are decoupled: VB surfaces work with no bg-wc present, and the
bg-wc presets render transparent accents that work over any background. The
eventual theme composes them.

## Component 1 — VB journal substrate (CSS)

**Repo:** `~/src/vanilla-breeze`. **No JS.**

### Tokens

Add journal tokens to `src/tokens/extensions/surfaces.css` (warm OKLCH, from the
handoff):

```css
:root {
  --surface-paper: oklch(0.965 0.018 88);
  --kraft:  oklch(0.81 0.06 72);
  --dot:    oklch(0.8 0.018 250);
  --rule:   oklch(0.86 0.015 70);
  --margin: oklch(0.64 0.16 25);
}
```

### Surfaces

Add new `[data-surface]` rules to `src/utils/surface-types.css`, following the
existing frosted/tinted/ghost/transparent pattern. Build on the **existing**
`--texture-*` primitives, retuned to journal metrics:

| `data-surface` | Recipe (essence) |
|----------------|------------------|
| `paper` | flat `--surface-paper` fill + faint grain overlay (`--texture-grain` at `--surface-texture-opacity`) |
| `dots`  | dot grid: `radial-gradient(circle, var(--dot) 1.3px, transparent 1.7px) 0 0 / 22px 22px` over paper |
| `grid`  | `--texture-grid` with `currentColor`→`--rule`, sized 22px |
| `lines` | horizontal ruled `repeating-linear-gradient` every 28px + optional vertical `--margin` line |
| `kraft` | warm mid `--kraft` fill + grain |

The `dots` surface must match a real journal spread: **22px tile, faint
blue-gray dot.** Dot/check inks read over transparency so they survive a
`mix-blend-mode: multiply` overlay (per handoff note).

### Demo & test

- A demo page under VB's demo system showing the five surfaces.
- A visual test in the style of the existing `tests/visual/theme-surfaces.spec.js`.

## Component 2 — bg-wc `paper-grain` preset (WebGL)

**File:** `src/presets/paper-grain.js`. **Registry:** add to `src/presets/index.js`
under group `pattern`. Modeled on `src/presets/grain.js`.

Differences from `grain`:

- **Warm tint.** Grain ink derives from the `fg`/ink color (via `getColors()`),
  not neutral grey, at very low alpha — so it textures warm paper.
- **Slow drift, not flicker.** `grain` quantizes to 24fps film strobe; paper
  fibers should *drift* slowly. Lower the temporal frequency substantially and
  keep default `intensity` low (paper should feel alive, not noisy).
- `density` controls fiber fineness (as in `grain`).
- `staticFrame(params)` renders one still grain field for reduced-motion.
- Standard `{ resize, frame, staticFrame, dispose }` return; SRC_ALPHA blend so
  it overlays whatever is beneath.

## Component 3 — bg-wc `doodles` preset (Canvas2D)

**File:** `src/presets/doodles.js`. **Registry:** add to `src/presets/index.js`.
Contract: `create({ host, c2d, getColors })` → `{ resize, frame, staticFrame, dispose }`
(mirrors `confetti.js`). Uses `mulberry32` (from `util/pause.js`) for seeded
determinism and `clearAndFill` is **not** used — the preset clears to
transparent so it overlays the substrate (clear with `c2d.clearRect`).

### Icon data

Each doodle is a set of strokes in a normalized 0..1 box. A stroke is a polyline
(array of points); curves approximated by densified points so a single
path-length reveal works uniformly. Each icon belongs to one **family**.

Families (the `mode` vocabulary):

- **`planner`** — star, arrow, checkbox (+ check), dotted underline, asterisk/sparkle, small banner.
- **`botanical`** — sprig, leaf, vine, heart.
- **`geometric`** — box, circle, triangle, divider, dot-cluster.

### Hand-drawn quality

- Seeded per-instance vertex jitter (small random offset per point) so repeats
  don't look identical.
- Slight per-stroke line-width variation; round line caps/joins.
- (Optional polish, not required v1: a faint second offset stroke for a
  pencil double-line.)

### Self-drawing animation

Per instance lifecycle: **draw → hold → fade**.

- **Draw** (~0.6–1.2s, scaled by `speed`): reveal strokes by cumulative
  path-length. Compute total length across the icon's strokes; at progress `p`,
  draw fully-revealed strokes plus the partially-revealed current stroke (lerp
  the final segment).
- **Hold**: fully drawn for a beat.
- **Fade**: alpha ramps to 0, then the instance is recycled.

New instances spawn to keep the on-screen count near target.

### Placement — margin marginalia

- Spawn positions **biased to edges/corners**; a central rectangle is kept
  mostly clear so doodles read as marginalia behind body content.
- Concurrent count: 2–5, scaled by `density`/`intensity` and capped by
  `quality` (low/med/high) the way `confetti` caps piece counts.

### Mode selection

Read `host.getAttribute('mode')` (same convention as `mosaic`). Parse as a
space/comma-separated list of family names. Active icon pool = union of selected
families. Default (absent/empty) = all three. Unknown tokens are ignored; if the
result is empty, fall back to all three.

```html
<bg-wc preset="doodles" mode="planner"></bg-wc>
<bg-wc preset="doodles" mode="planner botanical"></bg-wc>
<bg-wc preset="doodles"></bg-wc> <!-- all three -->
```

### Color & reduced motion

- Stroke color from `fg` (default ink); accent usage optional/secondary.
- `staticFrame(params)`: draw a fixed, fully-drawn, seeded scatter of doodles
  (no animation) so reduced-motion users still see marginalia.

## Composition

Author usage for the eventual theme:

```html
<article data-surface="dots">
  <bg-wc preset="doodles" mode="planner botanical"></bg-wc>
  <!-- or data-background="doodles" on the article itself -->
  <h1>Today</h1>
  …
</article>
```

`paper-grain` can be layered similarly (or the static `paper` surface's grain
overlay suffices for non-animated pages). A `demos/journal.html` demonstrates the
composed result; add a hub entry in `demos/index.html`.

## Testing

Mirror existing preset Playwright tests (`test/`):

- Each preset: mounts, `ready` resolves, renders a non-empty frame, calls
  `staticFrame` under `motion="reduce"`, and disposes without error.
- `doodles`: `mode` filtering selects the right families; absent/unknown `mode`
  → all three; edge-bias keeps the center comparatively clear.
- VB: visual test for the five surfaces; `dots` is 22px-tiled.

## Token-naming decision

Reuse VB's existing `--texture-*` vocabulary plus the new journal tokens
(`--surface-paper`, `--kraft`, `--dot`, `--rule`, `--margin`). **Do not**
introduce the handoff's parallel `--pattern-stripe|dot|check|grid|solid`
namespace — a second vocabulary for the same primitives violates "define once"
worse than aligning to what VB already ships. If border-wc/washi later require
the `--pattern-*` spellings, add them as thin aliases pointing at the `--texture-*`
definitions — explicitly out of scope here.

## Scope boundaries

**In scope:** the two bg-wc presets, the VB substrate surfaces, demos, tests.

**Out of scope:** the washi-tape layer, the border-wc tier, `--pattern-*`
aliases, and packaging an actual named theme. Those are the *eventual* theme,
built on this foundation.

## Acceptance criteria

- [ ] VB: five surfaces render via `[data-surface="paper|dots|grid|lines|kraft"]`;
      `dots` is a 22px tile with a faint blue-gray dot; no JS added.
- [ ] VB: journal tokens defined once; surfaces reuse existing `--texture-*`
      primitives (no `--pattern-*` namespace introduced).
- [ ] bg-wc: `paper-grain` registered, renders a warm low-motion grain overlay,
      supports `staticFrame`, disposes clean.
- [ ] bg-wc: `doodles` registered, draws hand-drawn marginalia edge-biased,
      animates draw→hold→fade, honors `mode` family selection (default all),
      supports `staticFrame`, disposes clean.
- [ ] Both presets are theme-aware via `getColors()` and overlay transparently.
- [ ] `demos/journal.html` composes a substrate + accents; hub entry added.
- [ ] Playwright tests pass for both presets.

## Clangs

- **`background-size` vs gradient stops.** `dots`/`grid` encode tile size in the
  gradient/`background-size`; a consumer that also sets `background-size` can
  desync them. Document: size journal surfaces via the surface's own properties.
- **Surfaces tile from the origin.** Dot grids won't register across two
  differently-padded boxes. Acceptable for decoration; note it.
- **Doodles clear to transparent, not to `bg`.** Unlike `confetti`, this preset
  must `clearRect` (not `clearAndFill`) so the substrate shows through.
- **Edge-bias vs. small viewports.** On a narrow element the "clear center" may
  be tiny; ensure spawn logic degrades gracefully rather than refusing to spawn.
- **`paper-grain` name** is deliberately hyphenated to avoid conceptual collision
  with VB's `[data-surface="paper"]`. They are different systems but share a word.
