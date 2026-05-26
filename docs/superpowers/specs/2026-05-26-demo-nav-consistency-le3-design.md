# Consistent demo navigation (gl-wc-le3)

**Date:** 2026-05-26
**Status:** Approved (design)
**Bead:** gl-wc-le3
**Target:** the bg-wc docs/demos site under `~/src/gl-wc/` (`index.html`, `docs/`, `demos/`), served via `vite.site.config.js` (root `.`, `base './'`), deployed to Pages at profpowell.github.io/bg-wc.

---

## 1. Site map (as built)

- `/index.html` (repo root) — a `<meta http-equiv="refresh">` redirect to `./docs/index.html`.
- `/docs/index.html` — **the gallery** (title "bg-wc — preset gallery").
- `/docs/api.html` — **the API docs**.
- `/demos/index.html` — **the demos hub** (bespoke `.topbar`, grid of demo cards).
- `/demos/<name>.html` — 32 bespoke full-screen demos.

## 2. Problems found

1. **Broken/indirect hub links.** `demos/index.html` topbar: "← Gallery" → `../` (root redirect, indirect) and "Docs →" → `../docs/` — but `../docs/` *is the gallery*, so the "Docs" link lands on the gallery and **api.html is unreachable from the demos hub**.
2. **Inconsistent per-demo back-links.** All 32 demos correctly target `./` (the hub) but with scattered labels: `← demos`, `[← /demos]`, `[← /DEMOS]`, `← DEMOS`, `← INDEX`, `< DEMOS`.
3. **Stale root copy.** `index.html` still says "gl-wc" (title + link text) — a rename leftover.
4. **Nav-item drift.** Gallery header lists Docs/Demos/GitHub; api lists Gallery/Demos/Docs/GitHub — different items and order.

## 3. Design

A consistent breadcrumb hierarchy: **Gallery ⇄ Docs ⇄ Demos hub**, with each individual demo linking up to the hub.

### 3.1 Per-demo back-links (32 files)
Normalize each demo's back-link **text** to `&larr; Demos` and its target to `href="./"`, **preserving the existing `<a>` attributes** (class, etc.) so each demo's bespoke styling/position is untouched. Mechanically: in each `demos/<name>.html` (excluding `index.html`), the single anchor with `href="./"` has its inner content replaced with `&larr; Demos`; the opening `<a …>` tag is left as-is.

### 3.2 Demos hub (`demos/index.html`) topbar
Fix the two links (keep the bespoke topbar styling), in this order:
- `<a href="../docs/">&larr; Gallery</a>` (direct to the gallery, not the root redirect)
- `<a href="../docs/api.html">Docs &rarr;</a>` (the actual API docs)

### 3.3 Root redirect (`index.html`)
Update stale copy: `<title>gl-wc</title>` → `<title>bg-wc</title>`; link text "Open the gl-wc preset gallery →" → "Open the bg-wc preset gallery →". Keep the redirect target `./docs/index.html` and the link `./docs/`.

### 3.4 Site header parity (gallery + api)
Both `docs/index.html` and `docs/api.html` headers carry the same four nav items in the same order — **Gallery, Docs, Demos, GitHub** — with the current page marked `aria-current="page"`:
- Gallery → `./index.html` (api) / current (gallery)
- Docs → `./api.html` (gallery) / current (api)
- Demos → `../demos/` (both)
- GitHub → `https://github.com/ProfPowell/bg-wc` (both, `target="_blank" rel="noopener"`)

The gallery currently omits a "Gallery" item and orders Docs/Demos; api orders Demos/Docs. Reorder both to Gallery/Docs/Demos/GitHub and add the gallery's self item (marked current). Brand link stays (gallery brand → `./`, api brand → `./index.html`).

## 4. Files

- `demos/*.html` (32, excluding `index.html`) — normalize back-link text §3.1.
- `demos/index.html` — fix topbar targets §3.2.
- `index.html` — stale copy §3.3.
- `docs/index.html` — header nav parity §3.4.
- `docs/api.html` — header nav order/`aria-current` parity §3.4.

## 5. Verification

- `npm run build:site` succeeds.
- **Link integrity (no 404s)** — a headless crawl against the dev server: from `/demos/index.html`, "← Gallery" resolves to the gallery (200, title contains "gallery") and "Docs →" resolves to api.html (200, title contains "API"/"docs"); from a sample of demos, the back-link resolves to `/demos/` (the hub, 200). All four site-header links on gallery + api resolve 200.
- **Consistency assertions:** every `demos/<name>.html` (excluding index) contains exactly one anchor `href="./"` whose text is `← Demos`; grep finds zero remaining `INDEX`/`/demos`/`/DEMOS`/`< DEMOS`/`[← ` back-link variants.
- Gallery + api headers each contain the four items Gallery/Docs/Demos/GitHub in order, with exactly one `aria-current="page"`.
- No console errors on the crawled pages.

## 6. Out of scope / YAGNI

- No change to demo content, aesthetics, or the bg-wc component.
- The demos hub keeps its bespoke `.topbar` (not converted to the VB site `<header class="site">`) — only its link targets change.
- Demos link to the hub (`./`), not directly to the gallery — the hub is the consistent "up" level (it links onward to Gallery + Docs).

## 7. Open questions

- None. Verify during implementation that each demo has exactly one `href="./"` anchor (the back-link); if any demo has additional `href="./"` anchors, scope the text replacement to the back-link specifically.
