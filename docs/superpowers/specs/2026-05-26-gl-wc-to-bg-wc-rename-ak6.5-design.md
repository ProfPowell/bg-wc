# gl-wc → bg-wc rename + data-background alignment (Decorated Layers #6 / ak6.5)

**Date:** 2026-05-26
**Status:** Approved (design)
**Parent:** `2026-05-25-decorated-layers-design.md` (umbrella §7).
**Target repo:** the existing `gl-wc` repo (`~/src/gl-wc`), renamed in place to `bg-wc`. **No new repo.**
**Depends on:** nothing blocking; sequenced after border work to avoid churn.

---

## 1. Scope & intent

In-place rename of the package, custom element, CSS variables, and binder attribute from the `gl-wc` family to the `bg-wc` family, with a **backward-compatible alias layer** so existing usage keeps working (warning once). Canonical surface becomes `bg-wc`; legacy `gl-wc`/`data-bg`/`--gl-wc-*` are deprecated aliases shipped from the same package.

This aligns the background package with the Decorated Layers naming (`data-background` is the canonical family attribute, sibling to `data-border-effect`) and the `bg-wc` name referenced across the umbrella, border-wc README, and vanilla-breeze.

**Not in scope:** publishing a separate `@profpowell/gl-wc` shim package (decided: skip — effectively no external consumers at 0.1.0; `npm deprecate` the old name is a manual follow-up). The 55 lazy presets, renderer, and util internals are unchanged except for references to renamed symbols.

## 2. Backward-compat aliasing (the nuanced core)

Three alias surfaces. Every deprecation warning is **single-fire** per page (module-level guard) and uses `console.warn`.

### 2.1 Element tag
- `<bg-wc>` is canonical: `class BgWc extends HTMLElement`, `customElements.define('bg-wc', BgWc)`.
- `<gl-wc>` is a deprecated alias: `class GlWcAlias extends BgWc {}` that warns once on first `connectedCallback`, then `customElements.define('gl-wc', GlWcAlias)`.
- Both are registered when the package's main entry is imported (the alias lives in `src/legacy-alias.js`, imported by `src/bg-wc.js`). Each `customElements.define` is guarded by `customElements.get(...)`.

### 2.2 CSS custom properties
- Canonical `--bg-wc-*`; legacy `--gl-wc-*` works as a fallback.
- In the element's `STYLE` string, every gl-wc var becomes a nested fallback: e.g. `z-index: var(--bg-wc-z-index, var(--gl-wc-z-index, 0));` and `background: var(--bg-wc-color-bg, var(--gl-wc-color-bg, var(--color-background, transparent)));`.
- In JS (`COLOR_MAPPING` overrides + any `tokens.js` reads), wherever a `--gl-wc-color-N` override is read via `getComputedStyle`, read `--bg-wc-color-N` first and fall back to `--gl-wc-color-N`. A small helper `readVar(cs, canonical, legacy)` centralizes this.
- No deprecation warning for legacy CSS vars (they are silent fallbacks — warning on every computed-style read would be noisy and unreliable).

### 2.3 Binder attribute (`data-background.js`)
- `data-background` is canonical; the binder scans both `[data-background]` and `[data-bg]`.
- An element annotated only with the legacy `data-bg` triggers a single-fire `console.warn`.
- Param attributes: read `data-background-*` first, fall back to `data-bg-*`.
- The created element is `<bg-wc>` (not `<gl-wc>`).

## 3. Package (`package.json`)

- `name`: `@profpowell/gl-wc` → `@profpowell/bg-wc`
- `description`: keep meaning; reword to "bg-wc".
- `main` / `module`: `dist/gl-wc.js` → `dist/bg-wc.js`
- `sideEffects`: `["dist/bg-wc.js", "dist/data-background.js"]`
- `exports`:
  ```json
  {
    ".": "./dist/bg-wc.js",
    "./data-background": "./dist/data-background.js",
    "./data-bg": "./dist/data-background.js",
    "./presets/*": "./dist/presets/*.js"
  }
  ```
  (`./data-bg` aliases the same built binder for back-compat.)
- `repository.url` → `git+https://github.com/ProfPowell/bg-wc.git`
- `homepage` → `https://profpowell.github.io/bg-wc/`
- `keywords`: move `background` toward the front; otherwise unchanged.
- `version`: bump to `0.2.0` (breaking rename).

## 4. File-level changes

| Path | Change |
| --- | --- |
| `src/gl-wc.js` → `src/bg-wc.js` | `git mv`; class `GlWc`→`BgWc`; define `bg-wc`; CSS vars → nested `--bg-wc-*`/`--gl-wc-*` fallbacks; `COLOR_MAPPING` overrides → `--bg-wc-color-*` with legacy fallback via `readVar`; import + register `legacy-alias.js`. |
| `src/data-bg.js` → `src/data-background.js` | `git mv`; canonical `data-background`, scan `data-bg` too (warn once); param `data-background-*` with `data-bg-*` fallback; create `<bg-wc>`. Public export keeps a back-compat name (see §4.1). |
| `src/legacy-alias.js` (new) | `GlWcAlias extends BgWc` (warn once on connect) + define `gl-wc`; export nothing required (side-effecting). |
| `src/renderer/tokens.js` | wherever `--gl-wc-*` overrides are read, add `--bg-wc-*`-first fallback via the shared `readVar` helper. |
| `vite.config.js` | lib `entry` → object `{ 'bg-wc': 'src/bg-wc.js', 'data-background': 'src/data-background.js' }`, `fileName: (_f,name)=>`${name}.js``. |
| `vite.site.config.js` | update any `src/gl-wc.js` / asset references. |
| `docs/index.html`, `docs/api.html`, `docs/gallery.js`, `docs/site.css` | `<gl-wc>`→`<bg-wc>`, `data-bg`→`data-background`, `--gl-wc-*`→`--bg-wc-*`, copy/titles `gl-wc`→`bg-wc`. |
| `README.md` | retitle `bg-wc`; document `<bg-wc>`, `data-background`, `--bg-wc-*`; note `<gl-wc>`/`data-bg`/`--gl-wc-*` are deprecated aliases that still work. Update badge/Pages links to `bg-wc`. |
| `custom-elements.json` | regenerate via `npm run analyze`. |
| `test/*` | rename tag/attr/var usages to canonical; add alias regression tests (§6). |

### 4.1 Binder export name
Confirmed: the binder already exports `bindDataBackgrounds(root = document)` and `stopWatching()`, and is SSR-guarded (`typeof document !== 'undefined'`). These names are already background-oriented, so **no export rename is needed** — keep them as-is. Only the scanned attribute (`data-background` canonical + `data-bg` legacy) and the created element (`<bg-wc>`) change.

## 5. Repo rename

- `gh repo rename bg-wc` (GitHub auto-redirects old URLs and clone paths).
- Update the local git remote URL to the new name (redirect works regardless, but keep it tidy).
- Pages moves to `https://profpowell.github.io/bg-wc/` automatically (the existing `pages.yml` is repo-relative).
- Local working directory stays `~/src/gl-wc` (in place; dir name need not match).
- Done at the **end** of the branch work (or at merge), so CI on the feature branch runs under a stable name first.

## 6. Testing (Playwright)

Update existing specs to canonical names, and add an **alias regression** spec `test/alias.spec.js`:
- `<bg-wc preset="…">` renders a canvas (canonical path still works — covered by renamed existing tests).
- `<gl-wc preset="…">` renders a canvas (alias subclass works) AND emits a single deprecation `console.warn`.
- `--gl-wc-color-1` set on a host still influences the rendered output the same as `--bg-wc-color-1` (legacy CSS var fallback). (Assert via the existing color-readback technique the suite already uses.)
- A `[data-background]` element gets a `<bg-wc>` child (binder canonical).
- A `[data-bg]` element still gets a `<bg-wc>` child and warns once (binder legacy).
- No unexpected console errors.

`npm run build` emits `dist/bg-wc.js` + `dist/data-background.js` + preset chunks. Site build (`npm run build:site`) succeeds.

## 7. Out of scope / follow-ups

- Separate `@profpowell/gl-wc` shim package — skipped.
- `npm deprecate @profpowell/gl-wc` — manual post-publish follow-up (file a bead).
- Eventually removing the alias layer in a future major — not now.
- ak6.6 (perimeter Phase 2) is independent and tracked separately.

## 8. Open questions

- None. (Binder export names confirmed in §4.1.)
