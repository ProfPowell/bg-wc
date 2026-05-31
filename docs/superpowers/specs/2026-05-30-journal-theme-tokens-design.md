---
title: Journal Theme — Tokens (sub-project A)
description: A `journal` Vanilla Breeze showcase theme — palette, fonts, shape/shadow/motion, light + "night journal" dark variants, registered and on-demand loadable.
author: Claude Code + ProfPowell (brainstorm)
date: 2026-05-30
status: approved
tags:
  - vanilla-breeze
  - theme
  - journal
  - tokens
---

# Journal Theme — Tokens (sub-project A)

The token foundation for a bullet-journal theme. Everything else in the journal
program (component recipes, the showcase page) wears these tokens.

## Background

This is **sub-project A** of the "full journal demo reproduction" effort,
decomposed as:

- **A — Journal theme tokens** (this spec): the `journal` VB theme.
- **B — Journal component recipes**: rapid log, habit tracker, sticky note,
  taped photo, index tabs, highlighter, doodle dividers, notebook chrome.
- **C — Canonical showcase + integration**: reproduce the research demo wired to
  real packages (border-wc `washi`, bg-wc dot-grid surface + doodles, VB
  `rough-borders` sketch).

What already exists and is reused (not rebuilt): the **washi-tape layer** is the
`border-wc` `washi` effect (`<border-wc effect="washi">`, pattern/torn/placement
options); the **dot-grid substrate** is bg-wc's `[data-surface="dots"]`; the
**hand-drawn sketch border** is VB's `rough-borders` extension. The reference
visual is `~/src/vanilla-breeze/admin/research/journal-theme/journal-theme.html`.

This spec covers **A only**. B and C get their own specs.

## Architecture

A standard VB showcase theme, modeled on `src/tokens/themes/_extreme-cottagecore.css`:

- **File:** `src/tokens/themes/_extreme-journal.css` (repo: `~/src/vanilla-breeze`).
- **Selectors:** `:root[data-theme~="journal"], [data-theme~="journal"]` (the
  `~=` attribute match lets it compose with `data-mode` and accessibility themes).
- **Web fonts:** `@import`ed at the top of the file (same as cottagecore's Lora import).
- **Registration:** an entry in `site/data/themeRegistry.js`.
- **On-demand load:** emitted to `dist/cdn/themes/journal.css` via the same build
  path as the other `_extreme-*` showcase themes (NOT bundled in `themes/index.css`).
  The implementation plan must verify the exact build wiring that turns
  `_extreme-*.css` into `dist/cdn/themes/{name}.css` and mirror it.

Three token tiers per VB convention:
- **Public contract tokens** (`--color-*`, `--font-*`, `--radius-*`, `--shadow-*`,
  `--duration-*`, `--ease-*`) — overridden.
- **Hint tokens** (`--theme-border-style`, `--theme-icon-set`).
- **Private helpers** (`--_journal-*`) — the full raw palette, for sub-projects B/C.

## Light palette → semantic mapping

The demo's raw palette (kept verbatim as `--_journal-*` private tokens):

```css
--_journal-paper:      oklch(0.965 0.018 88);
--_journal-paper-edge: oklch(0.99 0.01 88);
--_journal-kraft:      oklch(0.81 0.06 72);
--_journal-ink:        oklch(0.32 0.045 262);
--_journal-pencil:     oklch(0.56 0.012 270);
--_journal-dot:        oklch(0.8 0.018 250);
--_journal-margin:     oklch(0.64 0.16 25);
--_journal-mint:       oklch(0.86 0.09 160);
--_journal-blush:      oklch(0.86 0.08 18);
--_journal-butter:     oklch(0.91 0.1 96);
--_journal-sky:        oklch(0.85 0.08 232);
--_journal-lilac:      oklch(0.84 0.08 300);
--_journal-coral:      oklch(0.79 0.13 36);
```

Semantic mapping (light):

| Semantic token | Value | Notes |
|---|---|---|
| `--color-background` | `--_journal-paper` | + dot-grid page bg (below) |
| `--color-surface` | `--_journal-paper-edge` | near-white warm |
| `--color-surface-alt` | `oklch(0.95 0.015 88)` | deeper cream |
| `--color-surface-raised` | `oklch(1 0.004 88)` | white |
| `--color-surface-sunken` | `oklch(0.93 0.012 250)` | dot-tinted |
| `--color-text` | `--_journal-ink` | |
| `--color-text-muted` | `--_journal-pencil` | |
| `--color-text-subtle` | `oklch(0.66 0.012 270)` | |
| `--color-primary` (+`-hover`/`-subtle`) | `oklch(0.55 0.10 165)` / `0.48` / `0.93 0.03 160` | **contrast-safe deep mint**, not the pastel |
| `--color-accent` (+`-hover`/`-subtle`) | `oklch(0.62 0.16 36)` / `0.55` / `0.93 0.04 36` | **contrast-safe deep coral** |
| `--color-success` | `oklch(0.58 0.12 150)` | |
| `--color-warning` | `oklch(0.74 0.12 85)` | gold/butter, deepened |
| `--color-error` | `oklch(0.58 0.16 25)` | margin-red, deepened |
| `--color-info` | `oklch(0.62 0.10 232)` | sky, deepened |
| `--color-border` | `--_journal-dot` | |
| `--color-border-muted` | `oklch(0.88 0.012 250)` | |
| `--color-border-strong` | `oklch(0.7 0.02 250)` | |

**Contrast note (intentional refinement):** the demo's accent palette is *pastel*
(high lightness) because there it is used for decorative fills (washi, highlighter,
tracker dots), not for action color. Mapping a pastel directly to `--color-primary`
would yield low-contrast buttons/links. So the semantic action tokens use
**deeper variants of the same hues** (mint hue at L≈0.55, coral hue at L≈0.62),
while the original pastels live on as `--_journal-*` for B/C's decorative use.
This mirrors how `_extreme-cottagecore.css` maps sage/rose. (mint=primary,
coral=accent, margin-red=error — just at action-appropriate lightness.)

### Dot-grid page background (light)

Reuse VB's `--page-bg-*` system (consumed by `src/base/reset.css`) so any
`data-theme="journal"` page reads as paper with a faint dot grid by default:

```css
--page-bg-color: var(--_journal-paper);
--page-bg-image: radial-gradient(circle, var(--_journal-dot) 1.3px, transparent 1.7px);
--page-bg-size: 22px 22px;
```

(22px tile matches bg-wc's `[data-surface="dots"]` so substrate metrics agree.)

## Fonts & typography

```css
@import url("https://fonts.googleapis.com/css2?family=Shantell+Sans:ital,wght@0,400;0,600;0,700;1,500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=JetBrains+Mono:wght@400;700&display=swap");
```

- `--font-sans: "Newsreader", Georgia, serif;` — the journal body is serif. This
  is a *showcase* (dramatic) theme, so the serif body shift is intentional, not a
  bug. Robust fallbacks so it degrades gracefully if the web font is blocked.
- `--font-mono: "JetBrains Mono", ui-monospace, monospace;`
- Private `--_journal-hand: "Shantell Sans", "Comic Sans MS", cursive;`
- `--line-height-normal: 1.5;` (relaxed, journal-readable).
- **Component overrides** (same mechanism cottagecore uses — a second
  `[data-theme~="journal"]` block): `h1, h2, h3 { font-family: var(--_journal-hand); color: var(--color-text); }`.

## Shape / shadow / motion / hints

- **Shape (notebook-square, small radii):** `--radius-xs: 2px; --radius-s: 3px;
  --radius-m: 5px; --radius-l: 8px; --radius-xl: 12px; --radius-2xl: 16px;
  --radius-full: 9999px;`
- **Shadows (warm sepia, soft paper-lift):** map `--shadow-xs…2xl` to layered
  `oklch(0.4 0.04 60 / …)` shadows (escalating blur/alpha like cottagecore).
- **Motion (a journal sits still):** modest durations
  (`--duration-fast: 110ms; --duration-normal: 220ms; --duration-slow: 330ms;`),
  `--ease-out: cubic-bezier(0.22, 1, 0.36, 1);`
- **Hint tokens:** `--theme-border-style: rough;` (pairs with VB `rough-borders`
  for C's sketch look), `--theme-icon-set: lucide;`
- `color-scheme: light;` in the light block.

## Dark "night journal" variant

A complete override block — `:root[data-theme~="journal"][data-mode="dark"],
[data-theme~="journal"][data-mode="dark"]` plus a
`@media (prefers-color-scheme: dark) { :root[data-theme~="journal"]:not([data-mode="light"]) { … } }`
auto-block (VB convention) — with `color-scheme: dark`. Representative values
(finalized in implementation; `lint:theme-tokens` enforces completeness):

| Token | Night value |
|---|---|
| `--color-background` | `oklch(0.20 0.02 262)` (deep ink-navy desk) |
| `--color-surface` / `-raised` | `oklch(0.25 0.02 262)` / `0.29` |
| `--color-surface-alt` / `-sunken` | `0.23` / `0.18` |
| `--color-text` / `-muted` / `-subtle` | warm paper-white `0.92 0.01 88` / `0.72 0.012 270` / `0.6` |
| `--color-primary` / `-accent` | brighter mint `0.78 0.11 165` / coral `0.72 0.15 36` |
| `--color-success/warning/error/info` | same hues nudged for dark contrast |
| `--color-border` / `-strong` | `0.4 0.02 262` / `0.5 0.02 262` |
| `--shadow-sm` / `-md` (+xs/lg/xl/2xl) | darker, higher-alpha black |
| `--page-bg-color` / `--page-bg-image` dot | dark paper / lighter dot for visibility |

**Required in the dark variant** (lint-enforced): `--color-surface`,
`-surface-raised`, `-surface-sunken`, `--color-background`, `--color-text`,
`-text-muted`, `--color-border`, `-border-strong`, `--shadow-sm`, `--shadow-md`.

## themeRegistry entry

In `site/data/themeRegistry.js`:

```js
{
  id: 'journal',
  name: 'Journal',
  tier: 'showcase',
  category: 'extreme',
  character: 'Dot-grid paper, washi tape, and handmade warmth',
  colors: { huePrimary: 160, hueSecondary: 232, hueAccent: 36 },
  swatchBg: '#f3ecdc', // paper
  swatchFg: '#27313f', // ink
},
```

(Place with the other `extreme`/`showcase` entries; final swatch hexes derived
from the paper/ink oklch values.)

## Testing

- `npm run lint:theme-tokens` passes — light **and** dark variants provide every
  required token.
- A computed-style test (Playwright, server-independent injection like the
  journal-surfaces spec, or a theme-applied page): `data-theme="journal"` →
  `--color-text` resolves to ink and `--color-primary` to the deep mint;
  `data-theme="journal" data-mode="dark"` → `--color-background` flips to the
  night desk color and `--color-text` to paper-white.
- Existing theme visual/smoke tests still pass.

## Acceptance criteria

- [ ] `src/tokens/themes/_extreme-journal.css` defines the full light token block
      (colors, fonts, shape, shadow, motion, hints) per §2–§4.
- [ ] Raw palette preserved as `--_journal-*` private tokens.
- [ ] Semantic action colors are contrast-safe deep variants; pastels are private.
- [ ] Default dot-grid paper page background via `--page-bg-*` (22px tile), light + dark.
- [ ] Complete "night journal" dark variant; `lint:theme-tokens` passes.
- [ ] `themeRegistry.js` entry added; theme loads on demand from `dist/cdn/themes/journal.css`.
- [ ] Computed-style test confirms light and dark application; existing tests pass.

## Out of scope (later sub-projects)

- **B:** journal component recipes (rapid log, habit tracker, sticky note, taped
  photo, index tabs, highlighter, doodle dividers, binding/margin/ribbon/stamp).
- **C:** the canonical showcase page and wiring of washi / dot-grid / doodles /
  rough-borders.
- Any change to the `border-wc` `washi` effect or bg-wc surfaces (reused as-is).

## Clangs

- **Pastel-as-primary contrast.** Addressed by mapping deep hue variants to
  semantic action tokens; do not let B/C reach for `--color-primary` expecting the
  pastel — pastels are `--_journal-*`.
- **Web-font dependence.** Headings/body lean on Google Fonts; fallbacks
  (`cursive`, `Georgia, serif`, `ui-monospace`) must keep the theme legible when
  fonts are blocked. The `@import` lives in the theme file (matches cottagecore).
- **Dark dot grid.** The light dot color is near-invisible on the night desk;
  the dark variant must override `--page-bg-image`'s dot color, or the grid vanishes.
- **`--font-sans` semantics.** Setting `--font-sans` to a serif is intentional but
  surprising; documented in-file so future maintainers don't "fix" it.
- **On-demand build path.** If the `_extreme-*` → `dist/cdn/themes/*` build step
  isn't automatic, the theme will 404 on load. The plan must verify and wire it.
