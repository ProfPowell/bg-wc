# border-wc test site

**Date:** 2026-05-28
**Status:** Approved (design)
**Target repo:** `@profpowell/border-wc` (`~/src/border-wc`), deployed to Pages at `profpowell.github.io/border-wc/`.
**Spec lives here** (in the central Decorated Layers spec store) to match the existing convention; the implementation work happens entirely in `~/src/border-wc`.

---

## 1. Scope & goals

border-wc was just published as `@profpowell/border-wc@0.1.0` with three extreme border effects (`squiggle`, `draw`, `sparks`) plus an opt-in `data-border-effect` binder (`./attr`). The current Pages site is the bare `demos/index.html` placeholder. Build a real test site so the package has a credible face — matching the family look of the bg-wc docs site so the two read as part of one Decorated Layers ecosystem.

**Goals:**
- A site visitor can (a) try each effect interactively, (b) read a clean API reference, (c) see the effects in real design contexts.
- Visual + interaction parity with the bg-wc docs site (header, theme picker, browser-window demo overlays, scroll/overlay safety we landed for bg-wc).
- Self-contained — no runtime dependency on the bg-wc repo. Infrastructure is *ported*, not linked.

**Non-goals (v1):** custom-elements-manifest UI, in-overlay live source view beyond what browser-window provides, search/Pagefind, demo-contribution scaffolding.

## 2. Pages

Three pages on a shared shell.

### 2.1 Gallery — `docs/index.html` (interactive playground)

Hero + **three effect cards**, one per effect (`squiggle`, `draw`, `sparks`). Each card:
- A real sample host (a card-shaped element with padding, a heading, and short copy) wrapped in `<border-wc effect="…">`.
- **Live knobs** below: `color`, `thickness` (px), `speed` (ms), `radius` (px). Each knob updates the `<border-wc>` element's attribute (or `--border-wc-*` custom property) live.
- A **copyable code-block** that shows the current `<border-wc>` HTML snippet (`<code-block language="html">` from `@profpowell/code-block`), updating as the knobs change. A "Copy" button (the code-block component supports it).

Default values match the component defaults so the cards work out of the box. The cards size sensibly on mobile (1-up) and desktop (3-up).

### 2.2 Docs — `docs/api.html` (plain API reference)

Mirror the bg-wc api.html structure exactly: site header + `<main class="content">` leading with `<h1>API Reference</h1>` + one-line lede, **no marketing hero** (the same decision we landed for bg-wc). Sections:
1. **Install** — `npm install @profpowell/border-wc`; `import '@profpowell/border-wc'`; unpkg `<script>`; the `./attr` sub-entry for the binder.
2. **Element — `<border-wc>`** — attributes table (`effect`, `color`, `thickness`, `speed`, `radius`, `animate`, `mode`, `motion`); `--border-wc-*` CSS custom properties; events (`border-wc:effect-applied`, `border-wc:error`, `border-wc:draw-complete`).
3. **Attribute binder — `data-border-effect`** — what it is (the family attribute shared with vanilla-breeze's CSS base values), how to opt in (`@profpowell/border-wc/attr`), which values border-wc honors (extreme: `squiggle`/`draw`/`sparks`) vs which vanilla-breeze CSS handles (base: `spin`/`pulse`/`march`/`hue-cycle`/`breathe`/`corner-trace`), how params flow from `--border-wc-*` CSS vars.
4. **Theming / used with vanilla-breeze** — short note that border-wc is the extreme-tier sibling of vanilla-breeze's base tier (Decorated Layers), reads design tokens, ships with no required peer deps.

### 2.3 Demos hub — `demos/index.html` (3 themed demos in browser-window tiles)

Grid of three `<browser-window data-demo-src="./<name>.html">` tiles (one per themed demo, §3), each wrapped in a `.bw-card` with the transparent overlay link (`a.bw-open`) per the bg-wc pattern. Every UX lesson from the bg-wc hub is reused:
- `<browser-window>` mounts on intersect, unmounts off-screen (IntersectionObserver, `rootMargin: '0px'`).
- Click → unmount others + force-reload this + `toggleMaximize()` → maximized overlay (live demo at 90vw/90vh).
- Document scroll locked while any overlay is open (MutationObserver on `.browser-window-maximized`).
- Visible tiles remounted on overlay close.
- Each themed demo's "← Demos" back-link uses `target="_top"` to break out of the iframe (no nesting).

## 3. The three themed demos

Each is a small bespoke full-bleed HTML page (own palette/typography/layout), shown in the hub via the browser-window iframe pattern.

| File | Effect | Aesthetic / concept |
|---|---|---|
| `demos/notebook.html` | `squiggle` | Handwritten quote cards & sticky notes — a notebook page with squiggly card borders, hand-drawn vibe. |
| `demos/sketchbook.html` | `draw` | Designer portfolio — project cards reveal via the `draw` stroke effect on hover and page load (`animate`/`speed` tuned for a draftsman feel). |
| `demos/achievement.html` | `sparks` | Gamification — "Achievement unlocked" badge/trophy cards with `sparks` chasing the perimeter; possibly two states (locked → unlocked) on a click. |

Each page also includes a `← Demos` back-link (`<a href="./" target="_top">`) for the no-nesting safety.

## 4. Infrastructure ported into border-wc

The bg-wc docs site is the reference. Port (don't link) these into `~/src/border-wc`:

- **`docs/site.css`** — adapt bg-wc's `docs/site.css`: the site header, `.page-head` + `main.content`, the `.bw-card` / `.bw-open` overlay rules. Strip rules that don't apply to border-wc (e.g., bg-wc-specific gallery card styles).
- **`docs/prefer-dark.js`** — verbatim from bg-wc (auto-dark nudge, respects explicit choice).
- **`docs/docs-entry.js`** — the docs/gallery JS entry, imports `vanilla-breeze` + `vanilla-breeze/css` + `@profpowell/code-block` + the local `border-wc` + `prefer-dark`.
- **`docs/playground.js`** — new, drives the gallery's live knobs and code-block.
- **`demos/demos-hub.js`** — verbatim *pattern* from bg-wc (the mount/unmount IntersectionObserver, scroll-lock observer, click-handler with unmount-others-force-reload-toggleMaximize, remount-visible-on-close). Imports `vanilla-breeze` + `vanilla-breeze/css` + the local `border-wc` + `@profpowell/browser-window` + `prefer-dark`.
- **Root `/index.html`** — meta-refresh redirect to `./docs/index.html` (same as bg-wc), titled "border-wc".

New devDependencies for the site only: `vanilla-breeze`, `@profpowell/code-block`, `@profpowell/browser-window`. Build via Vite multi-page (mirror `vite.site.config.js` from bg-wc, adapted for border-wc's structure). The library build (`vite.config.js`) for the npm package is **untouched**.

## 5. Files

**New (in border-wc):**
- `index.html` (root redirect)
- `docs/index.html` (gallery / playground)
- `docs/api.html` (API reference)
- `docs/site.css`
- `docs/docs-entry.js`
- `docs/playground.js`
- `docs/prefer-dark.js`
- `demos/notebook.html`, `demos/sketchbook.html`, `demos/achievement.html`
- `demos/demos-hub.js`
- `vite.site.config.js`

**Modified:**
- `package.json` — add dev deps (`vanilla-breeze`, `@profpowell/code-block`, `@profpowell/browser-window`); add `dev`/`build:site`/`preview` site scripts; ensure the existing `vite.config.js` (library build) and `build` script are unchanged.
- `.github/workflows/pages.yml` — switch the deploy from copying `demos/index.html` placeholder to building the full site (`npm run build:site`) and uploading `dist-site/`. (The current workflow assembles `_site` ad-hoc; replace with Vite build output.)
- `README.md` — add "Live demo" / "Docs" links pointing at the new pages.

**Removed:** the current `demos/index.html` placeholder (the demos hub at `demos/index.html` is the same path; new content replaces it).

## 6. Verification

- `npm run build:site` succeeds.
- `npm test` (existing Playwright suite) still passes — the library build and component code are untouched.
- **Headless on the dev server:**
  - `/docs/index.html`: three effect cards render with `<border-wc>` upgraded; tweaking a knob updates both the live element and the code-block snippet.
  - `/docs/api.html`: site header present, `<h1>API Reference</h1>` near top, no marketing hero, no console errors.
  - `/demos/`: three tiles, click any → maximized overlay shows the themed demo, Escape closes; **scroll-lock holds** (wheel over open overlay doesn't move the page); **back-link target=_top** (no nesting); mount/unmount IO bounds live iframes to the visible set; no console errors.
- After Pages deploy: live URL responds 200, all three themed demos load in the overlay, no broken cross-links.

## 7. Out of scope (v1)

- Custom-elements-manifest browser; in-overlay source-view; Pagefind/search.
- More themed demos beyond the three (more arrive as more effects ship).
- Mobile-specific art direction beyond the responsive layout.
- Tagging / release automation (separate, optional follow-up).

## 8. Open questions

- None blocking. If `@profpowell/browser-window` exposes a clean event for maximize/restore in a newer version than the bg-wc demo hub uses, we can swap the MutationObserver for the event later — not required for v1.
