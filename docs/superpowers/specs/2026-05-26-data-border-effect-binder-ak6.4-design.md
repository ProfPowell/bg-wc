# data-border-effect binder (Decorated Layers #5 / ak6.4)

**Date:** 2026-05-26
**Status:** Approved (design)
**Parent:** `2026-05-25-decorated-layers-design.md` (umbrella) + `2026-05-25-border-wc-component-design.md` §6.
**Target repo:** `border-wc` (`~/src/border-wc`, published `@profpowell/border-wc`). Spec centralized in gl-wc.
**Depends on:** ak6.3 (border-wc effects) — done.

---

## 1. Scope

An **opt-in** module that lets authors apply border-wc's extreme effects to *any* element via the `data-border-effect` attribute — no `<border-wc>` wrapper — mirroring `@profpowell/gl-wc/data-bg`. The same attribute is the family hook (sibling to VB's `data-border-style`/`-shape`); **base** values (`spin`/`pulse`/`march`/`hue-cycle`/`breathe`/`corner-trace`) are vanilla-breeze CSS and the binder ignores them, while **extreme** values (`squiggle`/`draw`/`sparks`) are rendered by border-wc.

## 2. Author surface

```html
<!-- opt in once -->
<script type="module" src="https://unpkg.com/@profpowell/border-wc/attr"></script>

<article data-border-effect="squiggle">…</article>   <!-- binder applies squiggle -->
<article data-border-effect="spin">…</article>        <!-- ignored here: VB CSS owns spin -->
```
Params come from `--border-wc-*` CSS custom properties (themeable; same knobs `<border-wc>` reads) with the component defaults; reduced motion honored. No per-element param attributes in MVP.

## 3. Mechanism

The effects are `create(host, params) => cleanup` that append an SVG/Canvas overlay to `host` (inset:0). So the binder applies the effect **directly to the annotated element** (element = host):

- On scan/observe, for each `[data-border-effect~="<v>"]` where `v ∈ {squiggle, draw, sparks}`: ensure the element is a positioning context (`position:relative` if static — reuse the component's host-styling), read params (`--border-wc-*` → defaults), run the matching effect's `create(el, params)`, store the returned cleanup in a `WeakMap<el, cleanup>`.
- Base values (and unknown values) → no-op.
- **MutationObserver** on `document.documentElement` (`childList`, `subtree`, `attributeFilter:['data-border-effect']`): newly added `[data-border-effect]` nodes are bound; an attribute change tears down the old cleanup and re-applies; removing the attribute or node tears down.
- Idempotent: a `WeakMap`/guard prevents double-binding the same element+value.

## 4. Architecture / files (in border-wc)

- **`src/registry.js`** (new) — the shared effect registry mapping name → lazy loader, extracted from `border-wc.js` so the element and the binder share one source (DRY). `EXTREME = ['squiggle','draw','sparks']`.
- **`src/border-wc.js`** — refactor to import the registry from `registry.js` (no behavior change).
- **`src/host.js`** (new, small) or a shared helper — the `position:relative if static` host-styling, shared by element + binder. (May fold into registry.js to avoid a tiny file.)
- **`src/data-border-effect.js`** (new) — the binder: `bindBorderEffects(root = document)`, `stopWatching()`, auto-runs on import (scan on DOMContentLoaded or immediately if already parsed; start the observer). Reuses `readParams`/`reducedMotion` from `params.js` and the registry.
- **`package.json`** `exports`: add `"./attr": "./dist/data-border-effect.js"`. **`vite.config.js`**: make the lib build emit both entries (`border-wc` + `data-border-effect`) via `lib.entry` object.
- **Demo + tests**: a `demos` section + Playwright specs.

## 5. Testing (Playwright)

`test/binder.spec.js` (imports `/src/data-border-effect.js` on a fixture page):
- `<div data-border-effect="squiggle">` → after bind, the div has an `svg[data-border-wc="squiggle"]` overlay and `position:relative`.
- `<div data-border-effect="spin">` → **no** overlay (base value ignored).
- Dynamically inserted `[data-border-effect="draw"]` node → gets bound (overlay appears).
- Changing the attribute (`squiggle` → `sparks`) tears down the SVG and adds the canvas.
- Removing the attribute tears down the overlay.
- No console errors; reduced-motion still renders a static result (no throw).

## 6. Out of scope (YAGNI)

- Per-element param attributes (`data-border-effect-color`, …) — CSS vars suffice for MVP; add later only if asked.
- Wrapping/annotating semantics beyond direct overlay.
- The `gl-wc → bg-wc` rename (ak6.5) and `data-background` naming (separate).

## 7. Open questions

- Sub-entry path: `./attr` (short) vs `./data-border-effect` (matches the attribute, like gl-wc's `/data-bg` matches `data-bg`). Leaning `./attr`; confirmable at build time.
- Whether to also auto-load the matching effect lazily (smaller bundle) vs static-import the three in the binder bundle. MVP: lazy via the shared registry (consistent with the element).
