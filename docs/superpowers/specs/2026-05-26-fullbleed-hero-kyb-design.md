# Full-bleed docs hero + api dark-default (gl-wc-kyb)

**Date:** 2026-05-26
**Status:** Approved (design)
**Bead:** gl-wc-kyb
**Target:** the bg-wc docs site in `~/src/gl-wc/docs/` (served via `vite.site.config.js`; deployed to GitHub Pages at profpowell.github.io/bg-wc).

---

## 1. Problem

From the bead plus the full-bleed ask:
1. **api.html dark default:** the gallery (`index.html`) nudges first-load to dark via `preferDarkByDefault()` in `gallery.js`; `api.html` (which loads `docs-entry.js`) has only the static `data-mode="dark"` and no JS nudge, so it isn't guaranteed to hold once `<theme-picker>` initializes.
2. **Washed-out animation:** the api hero's `.hero-inner` glass panel is centered (`margin: … auto; text-align: center; max-width: 760px`), covering the middle where the `data-background` animation is most visible.
3. **Not full-bleed:** the gallery hero is a contained, bordered, rounded 14px card *inside* `<main>` (`max-width: 1200px`); it doesn't span the viewport. The two heroes look inconsistent.

## 2. Goals

- Both heroes are **full-bleed** (edge-to-edge background, no contained card), unified on one `.hero` style.
- The glass text panel is **offset/left-aligned**, its left edge aligned to the page's 1200px content column, so the animation reads in the open space beside it (showcasing the component) in light **and** dark.
- The themed glass scrim keeps **guaranteed text contrast** in every theme/mode.
- `api.html` gets the **same first-load dark nudge** as the gallery, with the logic de-duplicated.

## 3. Design

### 3.1 Full-bleed structure
- Move the gallery `<section class="hero">…</section>` **out of `<main>`** to be a direct child of `<body>` (immediately after `<header>`), matching api.html's structure. (api.html's hero is already body-level.)
- `.hero` becomes the single full-bleed style for both pages:
  - `position: relative; overflow: hidden;`
  - `border: 0; border-radius: 0; border-bottom: 1px solid var(--color-border);`
  - `min-height: clamp(360px, 60vh, 560px); display: flex; align-items: center;`
  - `margin: 0 0 40px;`
- The existing `.hero[data-background]` block (api) folds into the unified `.hero` rules; its remaining api-specifics (centered panel) are removed in favor of the shared offset panel. Keep the comment explaining the `[data-background]` scope only if still needed.
- The animated background fills the hero full-width: on the gallery, the `<bg-wc id="heroBg">` element *is* the hero's sized child (`#heroBg { position:absolute; inset:0; }` so it fills, with `.hero-inner` on top); on api, the `data-background` binder injects an absolutely-positioned `<bg-wc>` at `inset:0; z-index:-1` (already full-bleed).
  - Note: the gallery currently nests `.hero-inner` *inside* `<bg-wc id="heroBg">`. Keep that nesting; size `#heroBg` to fill the hero (`position:absolute; inset:0; display:block;`) and lift `.hero-inner` above it (`position:relative; z-index:1`). Verify the gallery hero markup still places `.hero-inner` inside `#heroBg`; if so, this works without markup change beyond moving the section out of `<main>`.

### 3.2 Offset glass panel aligned to the content column
`.hero-inner` (the glass scrim, shared by both heroes):
- Keep the scrim: `background: color-mix(in oklab, var(--color-background) ~72-74%, transparent)`, `backdrop-filter: blur(8-10px)`, `border: 1px solid var(--color-border)`, `border-radius: var(--radius-l)`.
- Offset to the left, aligned to the content column:
  - `max-width: 600px;`
  - `margin-inline-start: max(clamp(16px, 4vw, 24px), calc((100% - 1200px) / 2 + clamp(16px, 4vw, 24px)));`
  - `margin-inline-end: clamp(16px, 4vw, 24px);` (so it never hugs the right edge on narrow screens)
  - `margin-block: clamp(20px, 6vh, 64px);`
  - `text-align: left;` (remove the api centering)
  - `padding: clamp(28px, 4vw, 44px);`
- The `100%` here is the full-bleed hero's width (≈ viewport), so `(100% - 1200px)/2 + pad` is the gutter outside the centered 1200 column plus the column's own padding → the panel's left edge lands where page content starts. `max(pad, …)` keeps it at the screen padding on viewports narrower than 1200px.
- `.hero-inner .meta-row` (api) reverts to default (left) justification.

### 3.3 api dark-default parity (DRY)
- Create `docs/prefer-dark.js` exporting `preferDarkByDefault()` — the logic currently inline in `gallery.js` (click the `<theme-picker>` dark radio on first load, else set `documentElement.dataset.mode = 'dark'`; respect a stored user choice exactly as the current gallery code does — preserve its existing guard behavior).
- `gallery.js`: import and call it instead of the inline copy (remove the inline function + its `window.addEventListener('load', …)`; the shared module self-registers or gallery calls it — match the existing trigger timing on `load`).
- `docs-entry.js`: import `./prefer-dark.js` so api.html gets the same nudge.

### 3.4 Visibility polish
- Bump the api hero to `data-background-intensity="0.72"` (from 0.65) so the animation is clearly lively beside the offset panel. Gallery keeps `intensity="0.65"`. No other preset/param changes.

## 4. Files

- `docs/index.html` — move `<section class="hero">` out of `<main>` to a body-level position after `<header>`.
- `docs/api.html` — bump `data-background-intensity` to 0.72; no structural change (already body-level).
- `docs/site.css` — unify `.hero` (full-bleed) and `.hero-inner` (offset, column-aligned) rules; fold/remove the `.hero[data-background]` centered-panel overrides; keep `#heroBg` filling the hero.
- `docs/prefer-dark.js` — **new**, shared first-load dark nudge.
- `docs/gallery.js` — use the shared module (remove inline `preferDarkByDefault`).
- `docs/docs-entry.js` — import the shared module.

## 5. Verification

- `npm run build:site` succeeds (no unresolved imports; `prefer-dark.js` resolves from both entries).
- Manual/automated check in a browser (Playwright via the site dev server) at desktop width:
  - **api.html** first load: `documentElement.dataset.mode === 'dark'`.
  - Both heroes: `.hero` spans the full viewport width (its bounding rect ≈ `innerWidth`), has no border-radius, and `min-height ≥ 360px`.
  - `.hero-inner` left edge aligns to the content column (its `left` ≈ the `<main>` content's left padding at ≥1200px width), `max-width ≤ 600px`, and the injected/`#heroBg` background is wider than the panel (animation visible beside it).
  - Contrast: `.hero-inner` computed `background-color` is a (semi-opaque) themed color, not transparent, in both light and dark.
- No console errors on either page.

## 6. Out of scope / YAGNI

- No changes to presets, the bg-wc component, or the data-background binder.
- No new hero copy/content; text stays as-is.
- `gl-wc-le3` (demo navigation consistency) is separate.
- Mobile-specific art direction beyond the responsive clamps already specified.

## 7. Open questions

- None blocking. If the gallery's `.hero-inner` turns out **not** to be nested inside `#heroBg` (markup drift), the plan adjusts `#heroBg` positioning accordingly — verified during implementation.
