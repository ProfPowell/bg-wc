# Decorated Layers — cross-library design (umbrella)

**Date:** 2026-05-25
**Status:** Draft for review (umbrella / decomposition doc — not a single implementation plan)
**Scope:** Cross-library: `vanilla-breeze`, `gl-wc`→`bg-wc`, new `border-wc`, and a future extreme-effects package. Lives in gl-wc for now; may relocate to a planning repo.
**Source thinking:** `gl-wc/docs/border-idea/border-wc-spec.md`, `gl-wc/docs/border-idea/borders-cursors-scrollbars.html`, `gl-wc/src/data-bg.js`, vanilla-breeze `data-effect` engine.

---

## 1. Vision

The web platform under-styles several visual surfaces — borders, backgrounds, scrollbars, cursors, and motion/content treatments. Designers reach for After Effects, Figma plugins, or framework-coupled recipes to decorate them. **Decorated Layers** is a family of platform-first, theme-aware, attribute/token-driven systems that decorate those surfaces with the cheapest viable platform technique, no build step required.

The organizing model has two strata, applied symmetrically to every surface:

- **Base — shipped by vanilla-breeze.** CSS-first, token-driven, themeable, zero/minimal JS. The common 80%. Same pattern as VB's existing extension tokens (`--glass-blur`, `--motion-hover-lift`).
- **Extreme — opt-in packages you bring in.** The ambitious/heavy effects that need SVG, Canvas, or WebGL, packaged as standalone vanilla-breeze-friendly web components.

**vanilla-breeze provides the shape; extreme packages lean into it.** VB defines the contract — the **complete token vocabulary**, attribute conventions, trigger model, reduced-motion rules, and (optionally) the shared geometry primitive. Extreme packages conform to that contract and extend it for theme or purpose. A page that only loads VB gets tasteful, themed decoration; a page that wants more pulls in `bg-wc`/`border-wc`/etc.

Three rules make this precise:

1. **VB is the single source of truth for tokens, and ships the *complete* set — even tokens only an extreme package consumes.** A theme can set any decorated-layer token and have it recognized whether or not the extreme package is loaded. The accepted downside: VB always carries the full token set, a small CSS-weight cost for users who never load the extras. This is deliberate — a stable, total token vocabulary is worth more than shaving bytes.
2. **The base tier lives in VB.** The CSS-tier implementations for every surface ship in vanilla-breeze.
3. **Each extreme package embeds its own copy of the base so it works standalone (without VB).** When both VB and a package are loaded, their base declarations coincide (same token names/defaults) and must not conflict — idempotent declarations, VB's theme values winning via the cascade. Implementation implication: the base should have a single authored source built into both VB and each package (not hand-duplicated and drifting).

## 2. The surface matrix

| Surface | Base (vanilla-breeze, CSS/token) | Extreme (opt-in package) | Author hook |
| --- | --- | --- | --- |
| **Motion / content** | `data-effect` — 40+ CSS effects, slots, triggers (exists today) | *future* extreme-effects package (WebGL/Canvas text & content FX) | `data-effect` (+ `data-trigger`, `data-stagger`) |
| **Background / field** | base background tokens / simple CSS gradients (light) | **`bg-wc`** (today `gl-wc`) — 55 WebGL/Canvas presets | `data-background` (binder) |
| **Border / frame** | border tokens: spin, pulse, march, hue-cycle, breathe, corner-trace (CSS `@property`/conic-gradient/box-shadow) | **`border-wc`** — squiggle (SVG), draw (SVG), sparks (Canvas), liquid (WebGL) | `data-border` (binder) |
| **Scrollbar** | `--scrollbar-thumb/track/width` (Baseline `scrollbar-color`/`scrollbar-width`) | *(none anticipated — CSS suffices)* | tokens only |
| **Cursor** | `--cursor-custom-*`, `--cursor-text`; opt-in JS spotlight (`--spotlight-*`) | *(maybe later)* | tokens only |

Not every surface needs an extreme tier: scrollbars and cursors are fully served by CSS today. Background and border clearly have both tiers. Effect has a strong base and a plausible future extreme package.

## 3. The routing principle

**"Cheapest viable platform technique."** For any requested decoration, use the lowest-cost layer that can render it:

```
CSS (incl. @property, conic-gradient, box-shadow, scrollbar-*, cursor) → VB base token
   ↓ (can't express it)
SVG (feTurbulence, stroke-dashoffset, <pattern>)                       → extreme package
   ↓
Canvas 2D (per-frame particles)                                        → extreme package
   ↓
WebGL (shaders; share with bg-wc)                                      → extreme package
```

This resolves the apparent tension between `border-wc-spec.md` (a JS component with a CSS→SVG→Canvas→WebGL tier list) and `borders-cursors-scrollbars.html` (CSS token effects): they are the **same tier list split across the two strata**. `border-wc`'s "CSS tier" *is* the VB border tokens; the component only owns the SVG/Canvas/WebGL tiers. We do not reimplement spin/pulse/march in JS.

## 4. The shared contract (what makes it a family)

Every surface, in both strata, agrees on:

1. **Tokens & resolution.** Read theme tokens (`--color-*`, oklch, `light-dark()`). Per-instance override order: **CSS custom property → HTML attribute → default**. (gl-wc's `--gl-wc-*`, border-wc §3.3, and the VB extension tokens all already follow this.)
2. **Degradation.** `prefers-reduced-motion` (zero animation-duration tokens + `[data-motion-reduced]`), print, and `forced-colors`. Each effect declares a static fallback.
3. **Activation.** VB's `data-trigger` model (scroll/hover/click/time/intersect/media/event/vt). CSS-base effects use native `:hover`/IO where possible; component effects map trigger to play/pause/one-shot.
4. **Geometry.** One shared **perimeter/shape primitive** — `perimeterPath()` / `perimeterSampler()` (border-wc §6). `border-wc` strokes it; `bg-wc` masks shaders/canvas to it (a background clipped to a rounded or `shape()` perimeter). Candidate to live in VB as part of "the shape VB provides," or as a tiny shared package.
5. **Namespacing & coexistence.** `data-effect` / `data-background`(`data-bg-*`) / `data-border`(`data-border-*`) are distinct namespaces, all valid on one element. Documented paint precedence where two layers compete (border's gradient *loses* to background painting — border-wc §10.2).
6. **Discovery (component tiers).** The opt-in binder pattern from `src/data-bg.js`: a stylesheet makes the host a positioning context, the binder scans for the attribute + watches via MutationObserver, and injects a light-DOM component behind/around content. `data-border` mirrors `data-background`.

## 5. Components & packages

- **`bg-wc`** — `gl-wc` renamed/repositioned (see §7). Paints the field; `data-background` injects it behind content (`z-index:-1`). 55 presets. npm `@profpowell/bg-wc`.
- **`border-wc`** — new sibling repo `~/src/border-wc`. Paints the frame, heavy effects only. npm `@profpowell/border-wc`.
- **Shared geometry** — `perimeterPath()`/`perimeterSampler()`, consumed by both. Decision pending: ship inside vanilla-breeze (as "the shape"), publish as its own micro-package, or vendor a copy in each. (Leaning: VB-provided, since VB "provides the shape.")
- **vanilla-breeze** — gains base token categories for borders, scrollbars, cursors (per `borders-cursors-scrollbars.html`); already owns `data-effect`. Ships the **complete** decorated-layer token vocabulary (including extreme-only tokens) and the base CSS tier. Documents the family + lists the extreme packages on its integrations page (like browser-window).

**Standalone base.** `bg-wc` and `border-wc` each embed the base tier so they render correctly with no VB on the page. The base is one authored source compiled into both VB and the packages, so the duplication never drifts. Loaded together, the package's base and VB's base declare the same tokens; VB's theme values win via the cascade, package defaults fill gaps — no conflict.

## 6. Decomposition & sequencing

Each is its own spec → plan → beads → build cycle.

1. **Umbrella (this doc)** — the contract + decomposition. *Now.*
2. **VB base tokens: borders + scrollbars + cursors** (Stratum 1) — implement the `borders-cursors-scrollbars.html` proposal as real vanilla-breeze extension tokens + utility classes + reduced-motion. *Highest value, lowest risk, pure CSS, benefits every VB site (incl. gl-wc's own docs) immediately.*
3. **Shared perimeter/shape module** — extract `perimeterPath()`/`perimeterSampler()` from the border POC; decide its home (§5).
4. **`border-wc` component** (Stratum 2) — squiggle/draw/sparks (+ deferred liquid). Depends on #3. Its CSS tier delegates to #2.
5. **`data-border` binder** — attribute layer mirroring `data-bg.js`. Depends on #4.
6. **gl-wc → bg-wc rename + `data-background` alignment** — see §7. Breaking; planned carefully; sequenced late to avoid churn during border work.

**Suggested order:** 1 → 2 → (3, 4) → 5 → 6.

A possible 7th, later: **extreme-effects package** paralleling `data-effect` for WebGL/Canvas content FX — kept out of the initial scope (YAGNI) until a concrete need appears.

## 7. gl-wc → bg-wc rename plan

The border spec already calls gl-wc "`<bg-wc>` (formerly `<gl-wc>`)"; the rename is intended so "bg paints the field, border paints the frame" are visibly siblings.

- **Breaking changes:** npm `@profpowell/gl-wc` → `@profpowell/bg-wc`; element `<gl-wc>` → `<bg-wc>`; CSS vars `--gl-wc-*` → `--bg-wc-*`; attribute family `data-bg-*` → `data-background-*` (with `data-bg-*` kept as an alias).
- **Migration:** publish `@profpowell/bg-wc`; ship a final `@profpowell/gl-wc` that re-exports and defines `<gl-wc>` as a thin subclass of `<bg-wc>` with a one-time deprecation `console.warn`, plus a README pointer. Keep `data-bg`/`--gl-wc-*` working as aliases for at least one minor cycle.
- **Repo:** prefer renaming in place (`git mv`, preserve history, update remotes) over a fresh repo, unless a clean cut is wanted.
- **Open:** whether `data-bg` → `data-background` is worth the churn now or stays an alias indefinitely.

## 8. Resolved decisions (2026-05-25)

1. **Author hook = the `data-border` attribute** (family-consistent with `data-effect`/`data-background`). Base values render via VB CSS (`[data-border~="…"]`); extreme values are handled by the `data-border` binder injecting `<border-wc>` — a binder, not a VB-registry effect.
2. **Geometry: authored in VB, embedded in packages for standalone.** (Confirmed; not a separate micro-package.)
3. **`data-background` is canonical; `data-bg` (and `--gl-wc-*`) kept as deprecated aliases.**
4. **Background gets a light CSS base tier in VB** (token-driven gradients/patterns); `bg-wc` is the extreme. Background is symmetric with the other surfaces.
5. **"Decorated Layers" is an internal organizing term**, not a public brand. Packages ship as `@profpowell/bg-wc`, `@profpowell/border-wc`, etc.
6. **JS cursor spotlight lives in VB base** as opt-in (`--spotlight-enabled`).

Remaining (implementation-time, settle in per-piece plans): which shipped VB themes adopt these by default; the one-source embedded-base build path; wrap-vs-annotate for the `data-border` binder.

## 9. Non-goals (YAGNI)

- Building the extreme-effects (motion) package now.
- Polyfilling `border-image`; replacing `outline`/focus rings; a general SVG filter library.
- A new theme system — vanilla-breeze remains the theme authority; everything reads its tokens.
