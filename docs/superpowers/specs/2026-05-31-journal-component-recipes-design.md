---
title: Journal Component Recipes (sub-project B)
description: A CSS-only Vanilla Breeze pack of journal component recipes (rapid log, habit tracker, sticky note, taped photo, index tabs, highlighter, doodle dividers, notebook chrome), layered on the journal token theme.
author: Claude Code + ProfPowell (brainstorm)
date: 2026-05-31
status: approved
tags:
  - vanilla-breeze
  - journal
  - pack
  - recipes
---

# Journal Component Recipes (sub-project B)

The distinctive journal widgets the demo needs beyond what tokens alone provide,
packaged as a CSS-only Vanilla Breeze **pack** layered on the journal token theme
(sub-project A, shipped: `vanilla-breeze@…/_extreme-journal.css`).

## Background

**Sub-project B** of the journal program (A — tokens ✅ done; B — recipes [this
spec]; C — showcase page). The reference visual is
`~/src/vanilla-breeze/admin/research/journal-theme/journal-theme.html`.

Reused, not rebuilt: **washi tape** = `border-wc` `washi` effect (C wires it);
**sketch border** = VB `rough-borders` (C wires it); **dot-grid surface** =
bg-wc `[data-surface="dots"]` / the theme's `--page-bg-*`. The journal **palette
and fonts** come from sub-project A (`--_journal-*`, `--color-*`, `--_journal-hand`).

## Architecture

A CSS-only pack mirroring `src/packs/kawaii/`:

- **`src/packs/journal/journal.effects.css`** — all recipes, in `@layer bundle-effects`.
- **`src/packs/journal/journal.budget.json`** — size budget (mirror kawaii's).
- Build: `scripts/build-cdn.js` auto-discovers `src/packs/*` → emits
  `dist/cdn/packs/journal.full.css`. The plan verifies the exact pack-build wiring.
- Export: a `./journal-css` entry in `package.json` `exports`
  (`./dist/cdn/packs/journal.full.css`), following the `./kawaii-css` precedent.
- **No JS** (recipes are pure CSS; the demo's only script — the sketch border —
  is VB `rough-borders`, wired in C).

### Scoping rule (load-order-independent, leak-proof)

Every selector is prefixed `[data-theme~="journal"]`. The recipes consume
`--_journal-*` tokens that only exist under the journal theme, so this is both
necessary (tokens resolve) and protective (no bleed into other themes). Example:
`[data-theme~="journal"] [data-callout="sticky"] { … }`.

## Recipe → API mapping (concern-aligned hybrid)

| Recipe | Opt-in hook | Built on / treatment |
|---|---|---|
| Highlighter | `<mark>` (ambient) + `[data-tint="mint\|butter\|coral\|sky\|lilac\|blush"]` | multiply linear-gradient mark, `box-decoration-break: clone`; default tint butter via `--_hl` |
| Doodle divider | `<hr data-ornament="doodle">` | extends the `[data-ornament]` hr system; squiggle SVG via `mask`, filled by `--color-text` (themes light/dark automatically) |
| Sticky note | `[data-callout="sticky"]` | extends the `[data-callout]` system; butter tint, gloss top, slight `rotate(-2deg)`, curl-corner `::after` |
| Rapid log | `<ul data-journal="rapid-log">` + `<li data-bullet="task\|done\|dropped\|migrated\|event\|note">` | bullet-key glyphs via `li::before`; strike states on done/dropped; optional `[data-journal="key"]` legend |
| Habit tracker | `<table data-journal="tracker">`, cells `<td data-mark="done\|miss">`, rows tinted via `--_c` | builds on native `table`; circular filled/empty cells via `td::before` |
| Taped photo | `<figure data-journal="photo">` (with `<img>` + `<figcaption>`) | white frame, two tape corners (`::before`/`::after`), lift shadow, `rotate(2deg)` |
| Index tabs | `<nav data-journal="tabs">` (children `<a>`/`<button>`) | asymmetric radius `0 8px 8px 0`, pastel cycle via `:nth-child`, hover-slide (reduced-motion-gated) |
| Notebook chrome | `[data-journal="page"]` + child `[data-journal="ribbon"]`, `[data-journal="stamp"]` | dot-grid bg + red margin line (`::before`) + binding holes (`::after`); ribbon/stamp as positioned child hooks |

### Representative treatments (full CSS finalized in the plan)

- **Highlighter:** `mark { --_hl: var(--_journal-butter); background: linear-gradient(transparent 8%, var(--_hl) 8% 86%, transparent 86%); mix-blend-mode: multiply; box-decoration-break: clone; }`; `mark[data-tint="mint"] { --_hl: var(--_journal-mint); }` (and the other five tints).
- **Doodle divider:** `hr[data-ornament="doodle"]` uses a `mask` of an inline squiggle SVG over `background: var(--color-text)` so it inks correctly in both light and dark — no second dark asset needed.
- **Sticky note / taped photo / ribbon / stamp / tabs:** transforms, tints, and curl/tape pseudo-elements taken from the research demo, retuned to `--_journal-*` tokens and `--shadow-*`.
- **Rapid log glyphs:** `task`→•, `done`→✓, `dropped`→✗, `migrated`→›, `event`→○, `note`→—; `done` strikes through in `--_journal-coral`.
- **Tracker cell:** `td[data-mark]::before` is a 16px circle, `border-radius: 50%`; `data-mark="done"` fills with `var(--_c, var(--_journal-mint))`.

### Conventions & constraints
- **Imperfection:** small `rotate()` values for the handmade feel.
- **Motion:** the only motion is the tabs' hover-slide; it MUST be gated behind
  `@media (prefers-reduced-motion: reduce)` (transition + transform reset).
- **Extend, don't fork core:** `sticky` (callout) and `doodle` (ornament) variants
  live in the journal pack, scoped to the theme — core `shapes/callouts.css` and
  `native-elements/hr/styles.css` are NOT modified.
- **Tokens only:** recipes reference `--_journal-*` / `--color-*` / `--shadow-*` /
  `--_journal-hand` from sub-project A; no new palette.

## Testing

Server-independent computed-style tests (`tests/visual/journal-recipes.spec.js`,
`from 'playwright/test'`), mirroring the journal-theme/surfaces specs: inject the
theme CSS **and** the pack CSS from disk, set `data-theme="journal"` on the
document element, render representative markup, and assert each recipe's defining
computed styles — including pseudo-elements via `getComputedStyle(el, '::before')`.
Examples:
- `[data-callout="sticky"]` → `transform` contains `rotate`; `::after` exists (curl).
- `<mark>` → `background-image` contains `linear-gradient`; `[data-tint="mint"]` differs.
- `hr[data-ornament="doodle"]` → a `mask`/`-webkit-mask` referencing a data URI.
- `li[data-bullet="done"]` → `text-decoration-line: line-through`; `::before` content `"✓"`.
- `[data-journal="tracker"] td[data-mark="done"]::before` → `border-radius: 50%`.
- `[data-journal="tabs"] a` → asymmetric `border-radius`; reduced-motion removes the transition.
- Pack builds: `dist/cdn/packs/journal.full.css` emitted; size within `journal.budget.json`.

## Acceptance criteria

- [ ] `src/packs/journal/journal.effects.css` defines all 8 recipes in `@layer bundle-effects`, every selector scoped under `[data-theme~="journal"]`.
- [ ] Recipes reuse `[data-callout]` (sticky), `[data-ornament]` (doodle hr), and `<mark>`; composites use the `data-journal="…"` namespace + `li[data-bullet]` / `td[data-mark]`.
- [ ] Doodle divider and any color-bearing recipe read correctly in both light and night-journal dark (mask/`currentColor`-style theming, no hardcoded one-mode colors that vanish in dark).
- [ ] Tabs hover-slide is the only motion and is disabled under `prefers-reduced-motion`.
- [ ] Core `callouts.css` / `hr/styles.css` are unmodified (journal variants live in the pack).
- [ ] `journal.budget.json` added; `dist/cdn/packs/journal.full.css` builds within budget.
- [ ] `package.json` `./journal-css` export added.
- [ ] `tests/visual/journal-recipes.spec.js` passes; existing journal-theme/surfaces tests still pass.

## Out of scope (other sub-projects)
- **C:** the showcase page; wiring `border-wc` washi, bg-wc dot-grid/doodles, and
  VB `rough-borders`; any registry "demo" link.
- New palette tokens (A owns those); changes to border-wc / bg-wc.

## Clangs
- **Two pseudo-elements per element.** Sticky (curl `::after`), photo (two tapes
  `::before`/`::after`), and page chrome (margin `::before` + binding `::after`)
  each consume both pseudo-elements — recipes can't also use a pseudo for
  something else. Keep ribbon/stamp as real child elements (they are).
- **Data-URI colors don't theme.** A squiggle drawn with a hardcoded stroke color
  won't flip in dark mode; use `mask` + `background: var(--color-text)` instead so
  it inks from the theme. (Binding-hole pseudo uses a fixed paper-gray; acceptable
  as it sits on paper in both modes — verify it reads on the dark desk, override if not.)
- **`mix-blend-mode: multiply`** (highlighter, tape) tints whatever's beneath; on
  the night-journal dark surface multiply can darken to near-invisibility — verify
  and, if needed, switch the dark variant to `screen`/`lighten` for those recipes.
- **Tracker/rapid-log markup.** These need a small author contract (`data-bullet`
  on `<li>`, `data-mark` on `<td>`, `--_c` on `<tr>`); document it in the pack
  header and the showcase (C) so authors know the structure.
- **Pack build discovery.** If `build-cdn.js` requires a pack to be listed
  somewhere (not just present in `src/packs/`), the plan must wire that; otherwise
  `journal.full.css` won't emit.
