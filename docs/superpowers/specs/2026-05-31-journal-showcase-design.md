---
title: Journal Showcase + Publish (sub-project C)
description: The canonical journal-theme showcase page reproducing the research demo with the real packages, plus publishing journal's built CDN artifacts so the theme is live.
author: Claude Code + ProfPowell (brainstorm)
date: 2026-05-31
status: approved
tags:
  - vanilla-breeze
  - journal
  - showcase
  - demo
  - publish
---

# Journal Showcase + Publish (sub-project C)

The final piece of the journal program: a full-page showcase that reproduces the
research demo using the **real** shipped pieces, and the **publish** step that
makes the journal theme actually loadable on the live site/CDN.

## Background

**Sub-project C** of the journal program. Prior pieces (all shipped to
`vanilla-breeze` `origin/main`):
- **A — journal token theme:** `_extreme-journal.css` → `themes/journal.css` (light + night-journal dark); `data-theme="journal"`.
- **B — journal recipe pack:** `src/packs/journal/journal.effects.css` → `packs/journal.full.css`; 8 recipes scoped under `[data-theme~="journal"]`.

Reused as-is (pure consume, no source changes): **border-wc** `washi` effect
(`<border-wc effect="washi">`, published `@profpowell/border-wc@0.2.0`); VB
**rough-borders** extension (`filter: var(--filter-rough-*)` + the
`src/assets/rough-border-filters.svg` filter defs, already in `main.css`).
**bg-wc is NOT used** — the dot-grid is the journal theme's CSS `--page-bg-*`
(the "still / faithful" choice; no animated layer).

Reference visual: `~/src/vanilla-breeze/admin/research/journal-theme/journal-theme.html`.
**Repo:** `~/src/vanilla-breeze`.

## Why a publish step

`main.js`'s ThemeLoader (`src/lib/theme-loader.js`) loads a theme's tokens from
the **built** `/cdn/themes/{id}.css` (committed in `dist/`, as art-deco's are).
A and B verified the build but deliberately did **not** commit dist. So
`data-theme="journal"` does not yet work the production way. C publishes
journal's built artifacts so the theme is live and the showcase loads it
exactly as a real consumer would. (The loader auto-loads theme *tokens* and pack
*JS* only — **not** pack *CSS** — so the showcase links the pack CSS explicitly.)

## Architecture

### 1. Publish journal's CDN artifacts
Run `npm run build:cdn`, then commit **only** journal's outputs (discard all
other dist churn):
- `dist/cdn/themes/journal.css`, `journal.css.map`, `journal.tokens.json`, `journal-dark.tokens.json`
- `dist/cdn/packs/journal.full.css`, `journal.effects.css` (+ any `.map`)
- the `journal` entries added to `dist/cdn/themes/manifest.json` and `dist/cdn/packs/manifest.json`

Verify the manifest diff is journal-only additions (the manifests are
deterministic from sources); if other entries churn, discard those hunks.

### 2. Showcase page
`demos/examples/demos/journal-theme-showcase.html`, modeled on
`demos/examples/demos/art-deco-theme-showcase.html`:
- `<html lang="en" data-theme="journal">`
- `<link rel="stylesheet" href="/src/main.css">` + `<script type="module" src="/src/main.js">`
  — ThemeLoader fetches `/cdn/themes/journal.css` (tokens) the production way.
- `<link rel="stylesheet" href="/cdn/packs/journal.full.css">` — the recipe CSS
  (loader does not auto-load pack CSS).
- `<script type="module" src="https://unpkg.com/@profpowell/border-wc@0.2.0/dist/border-wc.js">`
  — for `<border-wc effect="washi">` (matches the sibling bg-wc integration demos' unpkg pattern).
- Inline the contents of `src/assets/rough-border-filters.svg` (the `#vb-rough-*`
  filter defs) near the top of `<body>` so `filter: var(--filter-rough-light)` resolves.

### 3. Page content — faithful reproduction via real recipes

| Research-demo piece | Real implementation |
|---|---|
| Notebook page, binding holes, red margin | `<div data-journal="page">` (B) |
| Ribbon bookmark, date stamp | `[data-journal="ribbon"]`, `[data-journal="stamp"]` (B) |
| Washi tape (corners + scattered swatches) | `<border-wc effect="washi" mode="corner\|scatter">` with `--washi-pattern`/`--washi-color`/`--washi-torn` set per strip (border-wc) |
| Title highlighter | `<mark data-tint="mint\|butter\|coral">` (B) |
| Rapid log + key legend | `<ul data-journal="rapid-log"><li data-bullet="task\|done\|dropped\|migrated\|event\|note">` + `[data-journal="key"]` (B) |
| Doodle divider | `<hr data-ornament="doodle">` (B) |
| Habit tracker w/ sketch border | `<table data-journal="tracker">` (B) with `<td data-mark="done">`, `<td data-lab>`, per-row `--_c`; wrapped element gets `filter: var(--filter-rough-light)` (rough-borders) |
| Sticky note | `<div data-callout="sticky">` (B) |
| Taped photo | `<figure data-journal="photo"><img><figcaption>` (B) |
| Paper / ink / pastels / fonts | journal theme tokens (A) |

Plus the lead intro and a **"How it maps to Decorated Layers"** footer that names
the *actual* packages and attributes (so the page documents the architecture).

### 4. Discoverability
`build-demos.js` auto-discovers `examples/demos/**`, so the page is built without a
manifest edit. If sibling `themeRegistry` entries carry a demo-link field (e.g.
`demoUrl`/`showcase`), add the showcase URL to the `journal` entry; otherwise no
registry change (do not invent a field the schema doesn't have).

### 5. Testing
A Playwright spec (`tests/visual/journal-showcase.spec.js`, `from 'playwright/test'`)
against the VB server:
- `data-theme="journal"` applied; the **local** stack renders: `[data-journal="page"]`
  has the dot-grid `background-image`; `[data-callout="sticky"]` `transform` contains
  `rotate`; `<mark>` `background-image` contains a gradient; the tracker wrapper's
  `filter` references a `#vb-rough` url.
- **Resolves B's deferred layer clang:** with full VB loaded, `<hr data-ornament="doodle">`
  overrides the base ornament — its `::before` content does not contain `"doodle"` and
  it has a `mask`/`-webkit-mask` url. If `@layer` ordering does not win, fix the page's
  load order (or flag a small B follow-up) — caught here, not silently shipped.
- **External-asset robustness:** assert the `<border-wc effect="washi">` element's
  *presence* in the DOM (it exists regardless of the unpkg script), NOT its rendered
  internals; the no-console-error assertion ignores network/`unpkg` failures so the
  test is not flaky offline.

## Acceptance criteria

- [ ] `dist/cdn/themes/journal.css` (+ map + both tokens.json) and `dist/cdn/packs/journal.full.css` (+ effects.css) are committed; `themes/manifest.json` + `packs/manifest.json` list `journal`; no unrelated dist churn committed.
- [ ] `demos/examples/demos/journal-theme-showcase.html` reproduces the research demo using the real recipes/packages per §3, loading the theme via `data-theme="journal"` + ThemeLoader and the pack via an explicit `/cdn/packs/journal.full.css` link.
- [ ] Washi tape uses `<border-wc effect="washi">` (unpkg); sketch border uses `rough-borders` (`filter: var(--filter-rough-*)` + inlined filter defs).
- [ ] The page renders correctly in light and `data-mode="dark"` (a mode toggle or a second framed instance is optional; at minimum it must not break in dark).
- [ ] "How it maps to Decorated Layers" footer names the real packages/attributes.
- [ ] `tests/visual/journal-showcase.spec.js` passes (local stack asserted, doodle override verified under full VB, border-wc presence-only); existing journal-theme/recipes/surfaces tests still pass.

## Out of scope
- Any change to A (theme), B (pack), border-wc, or rough-borders source — C purely
  consumes them. If the doodle layer-override needs a real source fix, that's a
  small, separately-flagged B follow-up, not bundled silently.
- bg-wc (not used in the still/faithful showcase).
- A live deploy of vanilla-breeze.com (committing the dist artifacts is the publish
  boundary; actual site deploy is the user's release process).

## Clangs
- **ThemeLoader needs built dist.** The showcase's `data-theme="journal"` only loads
  the theme if `dist/cdn/themes/journal.css` is committed (§1). If §1 is skipped the
  page renders unthemed — §1 must land with the page.
- **Pack CSS is not auto-loaded.** The loader fetches theme tokens + pack JS, never
  pack CSS — the explicit `/cdn/packs/journal.full.css` link is required; don't assume
  `data-theme` pulls in the recipes.
- **`@layer` override for the doodle hr.** The pack's `bundle-effects` layer must
  out-rank the base `hr[data-ornament]::before` once full `main.css` is loaded; the
  test asserts this. If it loses, adjust the page's stylesheet order (pack link after
  `main.css`) or escalate a B fix.
- **unpkg/network in tests.** border-wc loads from unpkg; the test must not depend on
  it (presence-only + console-error filtering), or CI will flake offline.
- **Manifest churn.** `build:cdn` rewrites both manifests; commit only the journal
  additions, not regenerated noise for other themes/packs.
- **Hardcoded versions.** The unpkg URL pins `border-wc@0.2.0`; if that version lacks
  the expected `washi` API, bump the pin (verify against the published package).
