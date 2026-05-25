# border-wc component (Decorated Layers #4)

**Date:** 2026-05-25
**Status:** Draft for review
**Parent:** `2026-05-25-decorated-layers-design.md` (umbrella) — sub-project #4, the **extreme tier** for the border surface.
**Depends on:** #3 (shared perimeter/shape primitive), #2 (VB border base tokens — the CSS tier this component defers to).
**Target repo:** new `~/src/border-wc`, npm `@profpowell/border-wc` (spec centralized in gl-wc for now).
**Source:** `gl-wc/docs/border-idea/border-wc-spec.md` (detailed draft) + prototype/demo in `docs/border-idea/`.

---

## 1. Scope & reconciliation with the umbrella

The original `border-wc-spec.md` lists six effects across CSS→SVG→Canvas→WebGL. Under the two-strata model, the **CSS-expressible effects move to the VB base tier (#2)** and are *not* reimplemented here:

| Original spec effect | Renderer | Home now |
| --- | --- | --- |
| gradient | CSS | → VB base `spin` (#2) |
| glow | CSS | → VB base `pulse` (#2) |
| dash | CSS | → VB base `march` (#2) |
| **squiggle** | SVG | **border-wc (this)** |
| **draw** | SVG | **border-wc (this)** |
| **sparks** | Canvas | **border-wc (this)** |
| liquid (deferred) | WebGL | border-wc, Phase 3 (shares shaders with `bg-wc`) |

So **border-wc owns only what CSS can't do**: SVG-distortion, vector draw-in, perimeter particles, and (later) shader borders. This is the cheapest-viable-technique principle (umbrella §3) made concrete. The component still *accepts* the base effect names and degrades to a no-op / defers to VB tokens for them (so `effect="spin"` works when VB is present), but does not own their implementation.

## 2. Element API

Per source §3 (unchanged): light-DOM custom element, wraps content, sets `position:relative; display:block` if unset.

```html
<border-wc effect="squiggle" color="var(--ink)" thickness="2" speed="1000" radius="6" animate mode="center">
  <blockquote>…</blockquote>
</border-wc>
```

- **Attributes:** `effect` (squiggle|draw|sparks [+ base names deferred]), `color` (default `currentColor`), `thickness` (px), `speed` (ms, per-effect meaning), `radius` (px), `animate` (bool), `mode` (inset|outset|center).
- **CSS custom properties (override attributes):** `--border-wc-color|thickness|speed|radius`. Resolution: CSS var → attribute → default (umbrella contract).
- **Events:** `border-wc:effect-applied {effect}`, `border-wc:draw-complete {}`.
- **JS:** `el.effect` (reflects), `el.refresh()` (re-apply current effect).

## 3. Architecture

Per source §5/§7. One dispatcher; each effect is a pure function `(host) => cleanup`. The dispatcher caches the cleanup and runs it before applying a new effect.

- **SVG overlay** (`squiggle`, `draw`): absolutely-positioned `<svg pointer-events:none overflow:visible>` with a `<rect>` whose `rx/ry` match `radius`, inset by `thickness`. `squiggle` = `feTurbulence`→`feDisplacementMap`, seed re-attributed on rAF; `draw` = `stroke-dasharray`=perimeter, `stroke-dashoffset` len→0, emits `draw-complete`.
- **Canvas 2D overlay** (`sparks`): DPR-scaled `<canvas>`; N particles with parametric `t∈[0,1]` sampled along the perimeter each frame.
- **WebGL overlay** (`liquid`, Phase 3): perimeter-masked shader, shared with `bg-wc`'s registry.
- **Lifecycle:** `connectedCallback`→apply; `attributeChangedCallback`→teardown(prev)→apply(new); `disconnectedCallback`→teardown. Each effect owns its `ResizeObserver` + rAF and cancels both in cleanup. **`sparks` adds an `IntersectionObserver` pause** when off-screen (fixes source §10.6).

## 4. Shared perimeter primitive (#3)

`perimeterPath(host, inset=0)` → SVG path for the host's outer shape; `perimeterSampler(host, inset=0)` → `(t)=>[x,y]`. MVP: axis-aligned rounded rects. Per the umbrella base rule, this is **authored once, lives in VB ("the shape"), and is embedded in border-wc for standalone use** (and reused by `bg-wc` to mask shaders to a perimeter). Phase 2: asymmetric radius, `clip-path: shape()/path()` hosts.

## 5. Standalone vs. with VB

border-wc **embeds the VB border base tier** so a page using only `<border-wc>` (no vanilla-breeze) still gets the CSS-tier border effects + tokens. With VB present, declarations coincide; VB's theme values win via the cascade (umbrella §1, rule 3).

## 6. data-border binder (relationship to #5)

This spec defines the **component**. Sub-project #5 adds the `data-border` binder mirroring `data-bg.js`: `data-border="squiggle"` on any element scans + injects a `<border-wc effect="squiggle">` wrapper (or annotates — source §11.1 open question). Base values (`spin`, etc.) need no injection — pure VB CSS handles them. So `data-border` routes: base value → CSS (no JS); extreme value → inject border-wc.

## 7. Degradation

`prefers-reduced-motion`: dispatcher forces `animate` off, renders each effect's static fallback (source §11.6 — implement the guard). Print: squiggle/draw print (SVG), sparks does not. forced-colors: documented per effect.

## 8. Carried-over risks & open questions (from source §10/§11)

- Color parsing must handle **oklch** (source §10.9 / clang) — reuse gl-wc's pixel-readback `parseColor` approach, not hex-only string parsing. (We already hit and fixed this in gl-wc.)
- `mode="inset"` painting not in MVP (forward-compat attribute).
- CSS-var override re-evaluation needs `refresh()` (no `style.observe()` primitive).
- Wrap vs annotate (§11.1) — MVP wraps.
- Light DOM vs shadow DOM (§11.5) — MVP light DOM.
- Effect composition / per-side (§11.2/§11.4) — deferred.

## 9. Phasing

- **P0 (exists):** POC demo + spec.
- **P1 (MVP):** `border-wc.js` dispatcher + `squiggle`, `draw`, `sparks`; consume shared perimeter primitive; reduced-motion guard; IO pause for sparks; embed VB base.
- **P2:** `events`, `refresh()`, CSS-var override path; asymmetric radius in perimeter.
- **P3:** `liquid` (WebGL, shared shader with bg-wc); `beam`/`scallop`/`ticket-edge` (SVG); `shape()`/`path()` hosts; `mode="inset"`.
- **P4:** pluggable `glow` modifier; per-side overrides (only if asked).

## 10. Repo & packaging

New repo `~/src/border-wc`, sibling-standard toolchain (Vite lib build, eslint/prettier, Playwright, cem analyze, docs/+demos/, Pages deploy) — same as bg-wc/browser-window. npm `@profpowell/border-wc`. Listed on vanilla-breeze's integrations page.
