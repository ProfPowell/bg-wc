# Demos hub adopts the site header (nav consistency, phase 1)

**Date:** 2026-05-26
**Status:** Approved (design)
**Bead:** (to be created)
**Target:** `~/src/gl-wc/demos/index.html` (the demos hub), served by `vite.site.config.js`, deployed to Pages at profpowell.github.io/bg-wc/demos/.

Phase 1 of the demos-page work. Phase 2 (prototype `<browser-window>` on ~2 cards) is a separate, later spec.

---

## 1. Problem

The demos hub is a fully bespoke page: hardcoded dark palette (`:root { --bg/--fg/--surface/--border/--accent }`), Inter font, and a custom `.topbar` (h1 + two text links). It loads **none** of the site infrastructure — no vanilla-breeze, no `<theme-picker>`, no `site.css`. So it doesn't match the gallery/docs top bar (sticky `<header class="site">` with brand + Gallery/Docs/Demos/GitHub nav + theme picker) and has no theme control.

## 2. Goal

The demos hub carries the **identical sticky site header + theme picker** as the gallery and docs, and its page chrome (background, text, font) follows vanilla-breeze theming. The demo grid is preserved; each card keeps its fixed per-aesthetic preview palette.

## 3. Design

Make `demos/index.html` a first-class site page, mirroring how `docs/index.html` (gallery) loads the infrastructure.

### 3.1 Head
- Add the VB theme-base script (identical to `api.html`; `../vb` resolves to the site-root `/vb`):
  ```html
  <script>
    (() => {
      const vb = new URL('../vb', document.baseURI).href.replace(/\/$/, '');
      window.__VB_THEME_BASE = vb;
      document.documentElement.dataset.iconPath = vb + '/icons';
    })();
  </script>
  ```
- Add `<link rel="stylesheet" href="../docs/site.css">`.
- Remove the Google-Fonts (Inter) preconnect + stylesheet links (VB/`site.css` drive the font, matching the other pages).
- Add `data-mode="dark"` to `<html>` (matching gallery/api; `prefer-dark` also nudges it).

### 3.2 JS entry
- Create `demos/demos-hub.js`:
  ```js
  import 'vanilla-breeze';
  import 'vanilla-breeze/css';
  import '../src/bg-wc.js';
  import '../docs/prefer-dark.js';
  ```
- Change the page's `<script type="module" src="../src/bg-wc.js">` to `<script type="module" src="./demos-hub.js">`.
- (No `vite.site.config.js` change: `demos/index.html` is already a build input; its module script is bundled. Bare specifiers resolve from `node_modules` exactly as in `gallery.js`.)

### 3.3 Header markup
Replace the bespoke `<header class="topbar">…</header>` with the standard site header (Demos marked current; paths relative to `demos/`):
```html
<header class="site" data-sticky data-layout="cluster" data-layout-justify="between" data-layout-gap="m">
  <a href="../docs/index.html" class="brand"><strong>&lt;bg-wc&gt;</strong></a>
  <nav class="horizontal pills" aria-label="Site">
    <ul>
      <li><a href="../docs/index.html">Gallery</a></li>
      <li><a href="../docs/api.html">Docs</a></li>
      <li><a href="./" aria-current="page">Demos</a></li>
      <li><a href="https://github.com/ProfPowell/bg-wc" target="_blank" rel="noopener">GitHub</a></li>
    </ul>
  </nav>
  <theme-picker compact>
    <button type="button" data-trigger class="ghost">
      <icon-wc name="palette" size="sm"></icon-wc>
      Theme
    </button>
  </theme-picker>
</header>
```

### 3.4 Style reconciliation (the page `<style>` block)
- **Remove** the page-chrome rules now owned by VB/`site.css`: the `--bg`/`--fg` custom props; `html, body { … background: var(--bg); color: var(--fg) }`; the `body { font-family: Inter … }`; and all `.topbar*` rules.
- **Redefine** the card-frame vars in `:root` as VB-token aliases (so the many `var(--surface/--border/--accent)` references in the grid keep working but follow the theme):
  ```css
  :root {
    --surface: var(--color-surface, color-mix(in oklab, var(--color-foreground) 6%, var(--color-background)));
    --border: var(--color-border);
    --accent: var(--color-primary);
  }
  ```
- **Keep** unchanged: `* { box-sizing }`, `main { … }`, `h2`, `p.lede`, `.demos`, `a.demo`, `.preview`, `.label`, `.meta`, every `.demo[data-theme="…"]` palette, and `footer`. (`site.css` scopes its content rules to `main.content`/`main.content h2`, which the hub's class-less `<main>`/`h2` don't match — no collision.)

### 3.5 What stays fixed
The per-card `.demo[data-theme="…"] { --color-* }` palettes are the demos' whole point (each card previews a distinct aesthetic), so they remain hardcoded. Only the page chrome and the card *frame* (border/surface/hover-accent) follow the theme picker.

## 4. Files

- `demos/index.html` — head (§3.1), header markup (§3.3), `<style>` reconciliation (§3.4), script tag (§3.2).
- `demos/demos-hub.js` — new entry (§3.2).

## 5. Verification

- `npm run build:site` succeeds.
- Headless check (dev server) of `/demos/index.html`:
  - `header.site` exists; `.topbar` does not.
  - The header contains the four nav items (Gallery/Docs/Demos/GitHub) with exactly one `aria-current="page"` (Demos), and a `<theme-picker>` element is present (upgraded).
  - `document.documentElement.dataset.mode === 'dark'` on load (prefer-dark parity).
  - The four header links resolve: Gallery → `/docs/` (200), Docs → `/docs/api.html` (200), Demos → `/demos/` (current), GitHub external.
  - The demo grid still renders (`a.demo` count unchanged; `bg-wc` previews present).
  - No console errors.
- Visual sanity: page background/text are VB-themed (not the old `#0b0d12`/Inter), cards intact.

## 6. Out of scope / YAGNI

- `<browser-window>` integration (phase 2 — separate spec).
- No change to the individual full-bleed demo pages (they're fine as-is).
- No change to the demo grid layout or the per-card preview palettes.
- The demos hub keeps its own `<main>`/grid styling (not converted to `main.content`).

## 7. Open questions

- None. The `../vb` and `../docs/*` relative paths are confirmed against the served structure (demos/ and docs/ are siblings one level under the site root).
