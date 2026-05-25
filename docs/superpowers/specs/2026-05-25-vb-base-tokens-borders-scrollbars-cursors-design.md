# VB base tokens: borders · scrollbars · cursors (Decorated Layers #2)

**Date:** 2026-05-25
**Status:** Draft for review
**Parent:** `2026-05-25-decorated-layers-design.md` (umbrella) — this is sub-project #2, the **base tier** for three surfaces.
**Target repo:** `vanilla-breeze` (spec centralized in gl-wc for now).
**Source POC:** `gl-wc/docs/border-idea/borders-cursors-scrollbars.html` (complete working exploration).

---

## 1. Scope

Add three **base-tier** extension-token categories to vanilla-breeze, CSS-first and theme-driven, matching VB's existing extension-token pattern (`--glass-blur`, `--motion-hover-lift`):

1. **Animated borders** — `spin`, `pulse`, `march`, `hue-cycle`, `breathe`, `corner-trace`. Pure CSS (`@property`, conic-gradient, box-shadow, background-position, transitions).
2. **Scrollbars** — `scrollbar-color` / `scrollbar-width` (Baseline). Zero JS.
3. **Cursors** — keyword + SVG-data-URI custom cursors; opt-in JS spotlight.

Per the umbrella, **VB ships the complete token vocabulary for these surfaces — including the tokens the extreme `border-wc` package will consume** — even though VB only implements the CSS tier. Extreme border values (`squiggle`, `draw`, `sparks`, `liquid`) are *recognized names* here but rendered by `border-wc` (#4).

**Out of scope:** the `border-wc` component (#4), the `data-border` binder's extreme routing (#5), background/effect surfaces.

## 2. Author surface

**Decision (flagged for review): use the family attribute `data-border`, not utility classes**, so the base tier is consistent with `data-effect`/`data-background` and so the *same attribute* spans base (CSS, here) and extreme (component, #4/#5) values.

```html
<article data-border="spin">…</article>            <!-- base: pure CSS in VB -->
<article data-border="pulse" class="danger">…</article>
<article data-border="squiggle">…</article>          <!-- extreme: needs border-wc (#4); no-op until loaded -->
```

VB ships CSS rules keyed on the base values:

```css
[data-border~="spin"]   { /* conic-gradient + @property --ba */ }
[data-border~="pulse"]  { /* box-shadow keyframes */ }
[data-border~="march"]  { /* ::before repeating-linear-gradient + position */ }
[data-border~="hue-cycle"] { /* filter: hue-rotate */ }
[data-border~="breathe"]   { /* ::before scale/opacity */ }
[data-border~="trace"]     { /* staggered side transitions on hover */ }
```

Per-instance tuning via the tokens below (CSS var → default). Scrollbars and cursors are **theme-level** (tokens on `:root`/`[data-theme]`), with a small per-element opt-in (`data-scrollbar="…"`, `data-cursor="…"`) for variants.

> Open question O1: attribute (`data-border`) vs utility classes (`.border-spin`, as the POC used) vs both. Recommendation: attribute primary; reconsider classes only if authors ask.

## 3. Token vocabulary

Lifted from the POC, namespaced and defaulted to "off." These live in VB's extension-token layer (the POC notes `llm-theme-reference.css` "Extension Tokens (opt-in)").

**Borders** — required `@property` declarations at top level (cannot be nested in `@layer`): `--ba <angle>`, `--border-hue <number>`, `--pulse-size <length>`.

```
--border-anim-spin-duration   3s     --border-anim-spin-width  2px     --border-anim-spin-stops  <conic stop list, default uses --color-primary/secondary/accent>
--border-anim-pulse-duration  2s     --border-anim-pulse-color --color-primary   --border-anim-pulse-size 8px
--border-anim-march-duration  1s     --border-anim-march-color --color-primary   --border-anim-march-gap 8px   --border-anim-march-width 2px
--border-anim-hue-duration    4s     --border-anim-hue-width   3px
--border-anim-breathe-duration 2s
--border-anim-trace-duration  0.18s  (per side; total 4×)
```

**Scrollbars**
```
--scrollbar-thumb        --color-border-strong
--scrollbar-thumb-hover  --color-primary        (future; ::-webkit fallback only)
--scrollbar-track        --color-surface-sunken
--scrollbar-width        thin                    (auto | thin | none)
--scrollbar-color        var(--scrollbar-thumb) var(--scrollbar-track)   (composite, applied to :root)
```

**Cursors**
```
--cursor-custom-default  default      --cursor-custom-pointer  pointer     --cursor-text  text
--spotlight-enabled      0            --spotlight-color  oklch(60% .10 var(--hue-primary))   --spotlight-size 300px
```

## 4. Architecture (in vanilla-breeze)

- **`@property` block** at top level of the base stylesheet (required for animating `--ba` etc.).
- **Token defaults** in the extension-token layer; all default to disabled/off so loading VB changes nothing until a theme or `data-border`/`data-scrollbar`/`data-cursor` opts in.
- **CSS modules**: `decor-borders.css`, `decor-scrollbars.css`, `decor-cursors.css` (names TBD), included in VB's base bundle (and re-used as the embedded base in `bg-wc`/`border-wc` — one authored source, per the umbrella).
- **Root application**: `:root { scrollbar-color: var(--scrollbar-color); scrollbar-width: var(--scrollbar-width); cursor: var(--cursor-custom-default); }` + interactive-element cursor rules.
- **Spotlight JS** (only JS in this sub-project): a tiny module in VB's base JS — if `getComputedStyle(document.documentElement).getPropertyValue('--spotlight-enabled')` is `1`, attach a throttled `mousemove` that sets `--spotlight-x/y` on `[data-spotlight]` hosts; the radial-gradient render is pure CSS in `::before`. No rAF, no canvas.
  > Open question O2: spotlight in VB base (tiny opt-in JS) vs deferred to an extreme package. POC treats it as base; recommendation: keep in base.

## 5. Reduced motion / print / forced-colors

Per POC §4 — zero the animation-duration tokens under both the media query and the explicit user toggle:

```css
@media (prefers-reduced-motion: reduce) { :root { --border-anim-*-duration: 0s; --spotlight-enabled: 0; } }
:root[data-motion-reduced]               { :root { --border-anim-*-duration: 0s; --spotlight-enabled: 0; } }
```

`duration: 0s` freezes spin/hue at the start angle (visually fine), removes pulse glow (static border). Document print behavior per the Decision Guide (POC §5): spin/march/hue/border print as static; pulse/spotlight do not.

## 6. Theming

Themes set the tokens (the POC's `neon-preview`/`kawaii-preview` show the pattern): a theme can opt every card into a spin border, recolor scrollbars to brand hue, swap the cursor — all by setting tokens, no per-element classes. This is exactly "the shape VB provides."

## 7. Phasing

- **P1:** borders (spin, pulse, march, hue-cycle, breathe, trace) + scrollbars + cursors tokens & CSS; reduced-motion; docs page + a specimen demo (port the POC).
- **P2:** spotlight JS; `data-scrollbar`/`data-cursor` per-element variants; theme presets wired into a few shipped VB themes.
- **P3:** `::-webkit-scrollbar` enhanced path (thumb hover, SVG thumbs) for browsers that want it; reconcile with Baseline `scrollbar-*`.

## 8. Open questions

- O1 (author surface): `data-border` attribute vs utility classes vs both.
- O2 (spotlight home): VB base vs extreme package.
- O3: do base borders also expose utility classes for non-attribute use (e.g. inside component shadow DOM)?
- O4: which shipped VB themes adopt these by default (showcase vs restraint).
- O5: confirm the embedded-base build path (one source → VB + packages) with VB's build.
