# gl-wc — vanilla-breeze site alignment

**Date:** 2026-05-24
**Status:** Approved (design)
**Branch:** `vanilla-breeze-site-alignment`

## Problem

The gl-wc repo's site does not follow the conventions used across the
author's other vanilla-breeze-adjacent packages, and it violates the rule
that the author's published packages must be **npm-installed and consumed as
released versions** — not loaded from a CDN, vendored, or hand-reimplemented.

Concretely, today:

- The site ships a hand-rolled `site/style.css` that **redefines its own
  `--color-*` design tokens** instead of sourcing them from `vanilla-breeze`,
  which is the author's token/theme engine.
- `@profpowell/code-block` is loaded from **unpkg** and only on `site/docs/`;
  the gallery and all 32 demo pages render snippets with raw
  `<pre><code>`/`<code>`.
- There is no `package.json` build or dependency wiring for any of this; a
  bespoke GitHub Action hand-assembles `dist/` with `cp` and a meta-refresh
  redirect.
- The repo diverges structurally from sibling repos
  (browser-window, terminal-window, code-block), which standardize on a Vite
  toolchain with top-level `docs/` + `demos/`, `custom-elements.json` via cem
  analyze, and Playwright + eslint + prettier.

## Goals

1. Consume `vanilla-breeze` and `@profpowell/code-block` as npm-installed,
   released versions across the product site (gallery + API docs).
2. Drive the product site's design tokens and themes from `vanilla-breeze`
   instead of a hand-rolled stylesheet.
3. Use `<code-block>` for every code snippet on the product site.
4. Bring the repo structurally in line with the sibling repos: Vite build,
   top-level `docs/` + `demos/`, `custom-elements.json` via cem analyze,
   Playwright + eslint + prettier, and a standard Pages deploy.
5. Keep the published library's lazy-loaded preset architecture intact.

## Non-goals (YAGNI)

- Redesigning demo aesthetics or converting the 32 demos to vanilla-breeze.
  Demos are intentionally bespoke — they demonstrate that gl-wc adapts to any
  design system. They are cleaned up structurally only.
- Adding a `gl-wc.d.ts` type declaration (can follow later).
- Adding new presets or changing preset behavior.

## Key decisions

These were settled during brainstorming and are authoritative:

| Decision | Choice |
| --- | --- |
| Scope | Full sibling toolchain (Vite, docs/+demos/, cem, Playwright, eslint, prettier, standard Pages deploy) |
| Build model | Vite builds the **library** too (not just the site), preserving lazy preset chunks |
| Library emit | Rollup `output.preserveModules: true` — `dist/` mirrors `src/` with stable, unhashed names |
| vanilla-breeze reach | Product site only (gallery + API docs); demos stay bespoke |
| code-block reach | Every snippet on the product site |

## Design

### 1. Build model — two Vite modes

The published library and the deployable site build separately.

**Library build (`npm run build`, lib mode):**
- Emits `dist/` with `rollupOptions.output.preserveModules: true` so `dist/`
  mirrors `src/`: `dist/gl-wc.js`, `dist/data-bg.js`, `dist/presets/*.js`,
  `dist/renderer/*.js`, `dist/util/*.js` — stable, unhashed filenames.
- The 55 dynamic `import('./<preset>.js')` calls in
  `src/presets/index.js` remain 1:1 with their source chunks, so lazy loading
  and the public `./presets/*` subpath export keep working.
- `package.json` updates:
  - `main`/`module` → `./dist/gl-wc.js`
  - `exports`: `.` → `./dist/gl-wc.js`; `./data-bg` → `./dist/data-bg.js`;
    `./presets/*` → `./dist/presets/*.js`
  - `files` → include `dist`
  - `sideEffects` path updated to `dist/gl-wc.js`
  - `prepublishOnly` runs `build` + `analyze`

**Site build (`npm run build:site`, MPA mode):**
- Bundles `docs/` + `demos/` into a deploy directory, resolving bare imports
  (`vanilla-breeze`, `@profpowell/code-block`) from `node_modules`. This is
  what satisfies the npm-installed/released-versions rule (no unpkg).

**Dev (`npm run dev`):** `vite` with `server.open: '/docs/index.html'`.

> Implementation note: lib mode and MPA mode are distinct Vite invocations.
> The implementation plan will decide whether to express them as two config
> files or one config switched by an env/mode flag, following whatever keeps
> the two builds cleanly separated.

### 2. Dependencies & scripts

**dependencies:** `vanilla-breeze`, `@profpowell/code-block` (pinned to the
current released versions at implementation time).

**devDependencies:** `vite`, `@playwright/test`, `eslint`, `prettier`,
`@custom-elements-manifest/analyzer` — matching sibling-repo versions/config
style.

**scripts:** `dev`, `build`, `build:site`, `preview`, `test`, `lint`,
`lint:fix`, `format`, `format:check`, `analyze`, `prepublishOnly`.

### 3. Site restructure (top-level `docs/` + `demos/`)

- Move `site/index.html` (gallery) → `docs/index.html`.
- Move `site/docs/index.html` (API reference) → `docs/api.html`.
- Move `site/demos/` → `demos/`.
- Move/rename `site/app.js` to drive the gallery from `docs/`.
- Delete the token block in `site/style.css` and `site/docs/docs.css`.
  Replace with:
  - A per-page JS entry that imports `vanilla-breeze` + `vanilla-breeze/css`
    + `@profpowell/code-block` + gl-wc (from `../src/gl-wc.js` in dev).
  - A thin `docs/site.css` holding **only** gallery-grid/layout rules — no
    `--color-*` redefinition.
- **Theme switcher:** rebuilt on vanilla-breeze's `[data-theme]` engine using
  a curated subset of its theme catalog (e.g. `classic` / `dawn` /
  `midnight` plus an accessibility theme), replacing the bespoke
  dark/light/mint/a11y tokens. gl-wc reads the tokens those themes set with no
  further wiring. Themes are pulled via `vanilla-breeze/themes/*`.
- Every snippet on the gallery + API pages becomes `<code-block>`. Raw
  `<pre><code>` is removed from those pages.

### 4. Library token bridge

vanilla-breeze names the foreground/text token `--color-text`, whereas gl-wc
reads `--color-foreground`. The other 7 tokens gl-wc consumes
(`--color-primary`, `--color-accent`, `--color-info`, `--color-background`,
`--color-success`, `--color-warning`, `--color-error`) already match
vanilla-breeze natively.

Change: make the `fg` entry in the color mapping resolve a fallback chain —
`--color-foreground`, then `--color-text` — in `src/renderer/tokens.js`
(and the mapping in `src/gl-wc.js` as needed). This makes gl-wc natively
vanilla-breeze-compatible. It is the only library change required.

### 5. Demos

Stay bespoke; keep their per-aesthetic look. Changes are limited to:
- Fix relative `src/` import paths after the move from `site/demos/` to
  `demos/`.
- Remove any unpkg `code-block` script tags where present.

No vanilla-breeze styling is imposed on demo pages.

### 6. Tooling parity

- `eslint.config.js`, `.prettierrc`, `playwright.config.js`, and
  `custom-elements-manifest.config.mjs` copied from sibling-repo conventions.
- `npm run analyze` generates `custom-elements.json`.
- A small Playwright smoke suite covering: the `<gl-wc>` element upgrades, a
  preset loads and renders to canvas, and `snapshot()` resolves.

### 7. Deploy

Replace `.github/workflows/deploy-pages.yml` (the `cp` + meta-refresh hack)
with a standard flow: `npm ci` → `npm run build:site` → upload the built site
directory as the Pages artifact → deploy. No hand-assembled `dist/`.

### 8. README

- Install section → `npm install @profpowell/gl-wc`.
- Clarify that **consumers** still get zero-config ESM (now served from
  `dist/`), while the **repo** uses Vite/Playwright like the sibling repos.
- Drop the literal "no build step" repo-level claim.

## Risks & mitigations

- **preserveModules output drift:** verify after the first lib build that
  `dist/presets/*.js` filenames are stable and unhashed and that the
  `./presets/*` export resolves; covered by a Playwright/import smoke check.
- **Two Vite builds clashing:** keep lib mode and MPA mode in separate
  invocations so neither overwrites the other's output dir.
- **Theme token coverage:** confirm the chosen vanilla-breeze themes define
  all 8 tokens gl-wc reads (7 confirmed present; `fg` handled by the bridge).

## Verification

- `npm run build` produces `dist/` mirroring `src/`; `./presets/mesh-gradient`
  importable from the built package.
- `npm run build:site` produces a deployable site with vanilla-breeze and
  code-block resolved from `node_modules` (no unpkg references remain on the
  product site).
- Gallery + API pages render all snippets via `<code-block>` and pick up
  vanilla-breeze themes via the switcher.
- `npm run test` (Playwright smoke suite) passes.
- `npm run lint` and `npm run analyze` succeed.
