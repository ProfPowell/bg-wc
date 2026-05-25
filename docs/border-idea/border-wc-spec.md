# `<border-wc>` — A Platform-First Border Effects Component

> Sibling component to `<bg-wc>` (formerly `<gl-wc>`). Where `<bg-wc>` paints
> the field, `<border-wc>` paints the frame.

Status: **draft / proof-of-concept**
Stack: web platform · no build · vanilla JS · light DOM custom element

---

## 1. Motivation

Native `border` is impoverished. The CSS spec gives us five lines styles
(`solid dashed dotted double groove ridge inset outset`), one width per side,
one color per side, and `border-image` — which is powerful but underused,
finicky about slicing, and snapshots its source so it can't drive
animation. Past that, anything interesting (gradient stroke, marching ants,
hand-drawn squiggle, beam-traverse, sparks on the edge, draw-in on
intersection) is a manual recipe of one or more of: mask trickery, a stack
of `box-shadow`s, a hand-rolled SVG overlay, a Canvas overlay, a Houdini
worklet, or a wrapper element with negative-margin pseudo-element gymnastics.

The recipes work but the cognitive overhead is high enough that designers
default to `1px solid #ddd` and move on. `<border-wc>` is the component-shaped
hole in the platform: an element you wrap or annotate that gives you one
attribute (`effect`) and a small set of knobs, and produces a high-touch
border using the cheapest viable platform technique for that effect.

It is **not** a replacement for `border`. Native `border` continues to win
for thin rules, table cells, focus rings, anywhere the cascade and
inheritance are the right tools. `<border-wc>` is for decorated borders —
the kind designers reach to After Effects or Figma plugins to mock up.

## 2. Goals & Non-Goals

**Goals**

- One element, one attribute (`effect`), six initial effects.
- Each effect uses the cheapest platform tech that can render it
  (CSS-only → SVG → Canvas → WebGL).
- No build step, no dependencies, light DOM, themeable via CSS custom
  properties and HTML attributes.
- Effects degrade gracefully under `prefers-reduced-motion`, print, and
  high-contrast modes.
- Resize-aware. `ResizeObserver`-driven, per-effect.
- API symmetric with `<bg-wc>`: `effect="…"` + standard knobs.

**Non-Goals**

- Polyfilling CSS `border-image`. Authors who want that should use it.
- Replacing CSS `outline` or focus ring styling.
- A general SVG filter library. We expose a small fixed set of effects.
- A theme system. Themes are the host page's job; `<border-wc>` reads CSS
  custom properties and falls back to attributes.

## 3. API

### 3.1 Element

```html
<border-wc
  effect="squiggle"
  color="#3b6b3a"
  thickness="2"
  speed="1000"
  radius="6"
  animate
  mode="center">
  <!-- content -->
</border-wc>
```

The element is **its own bordered box**. Children render inside. No
shadow DOM. The element sets `position: relative` and `display: block`
on itself if those properties are not already set.

### 3.2 Attribute grammar (BNF)

```bnf
border-wc-attrs ::= effect color? thickness? speed? radius? animate? mode?

effect    ::= "effect"    "=" '"' effect-name '"'
effect-name ::= "gradient" | "glow" | "dash"
              | "squiggle" | "draw" | "sparks"

color     ::= "color"     "=" '"' css-color '"'        ; default: currentColor
thickness ::= "thickness" "=" '"' positive-number '"'  ; default: 2 (px)
speed     ::= "speed"     "=" '"' positive-number '"'  ; default: 1000 (ms)
radius    ::= "radius"    "=" '"' non-negative '"'     ; default: 0 (px)
animate   ::= "animate"                                ; boolean
mode      ::= "mode"      "=" '"' ("inset"|"outset"|"center") '"'  ; default: center
```

`speed` is interpreted per effect: ant period for `dash`, total draw
duration for `draw`, half-period for `glow` pulse, turbulence reseed period
factor for `squiggle`, ignored for `sparks` and `gradient`.

### 3.3 CSS custom properties (overrides win)

```css
border-wc {
  --border-wc-color:     <color>;   /* overrides attribute */
  --border-wc-thickness: <length>;
  --border-wc-speed:     <time>;
  --border-wc-radius:    <length>;
}
```

Resolution order per effect: CSS custom property → HTML attribute →
default.

### 3.4 Events

```
border-wc:effect-applied   { detail: { effect } }
border-wc:draw-complete    { detail: {} }            ; "draw" effect only
```

No bubbling-up of low-level animation events.

### 3.5 JavaScript surface

Only one method beyond the attribute setters:

```ts
interface BorderWCElement extends HTMLElement {
  effect: string;          // reflects attribute
  refresh(): void;         // re-apply the current effect (after a manual style change)
}
```

## 4. Effect Registry

Six effects, three renderers, one shared perimeter primitive.

| #  | Name      | Renderer     | What it does                                                       | Animatable | Print | Reduced-motion fallback |
|----|-----------|--------------|--------------------------------------------------------------------|------------|-------|--------------------------|
| 01 | gradient  | CSS          | Linear-gradient stroke around the border-box via mask compositing  | rotate     | yes   | static gradient          |
| 02 | glow      | CSS          | Stacked `box-shadow` rings; optional pulse animation               | pulse      | no    | static                   |
| 03 | dash      | CSS          | Four edge gradients composited as marching ants                    | march      | yes   | static dashes            |
| 04 | squiggle  | SVG          | Stroked rounded rect through `feTurbulence`+`feDisplacementMap`    | reseed     | yes   | static distortion        |
| 05 | draw      | SVG          | Stroked rect animated via `stroke-dashoffset`                      | one-shot   | yes   | rendered final state     |
| 06 | sparks    | Canvas 2D    | Particles parameterised along the perimeter path                   | continuous | no    | static dots              |

Each effect is a pure function `(host: BorderWCElement) => () => void`:
takes the host, mutates it (and/or appends an overlay), returns a cleanup
function. The component dispatcher caches the cleanup and runs it before
applying any new effect.

## 5. Rendering Architecture

Four orthogonal renderers; one dispatcher.

### 5.1 CSS layer

No overlay. Effects mutate inline styles on the host. Cheapest path; use
wherever an effect maps to native CSS:

- `gradient`: `background-image` with `background-clip: padding-box, border-box`.
- `glow`:     `box-shadow` stack + optional keyframes.
- `dash`:     four single-edge `linear-gradient` backgrounds + position keyframes.

Caveat: CSS effects depend on `background-clip` and `box-shadow` interacting
cleanly with any background the host already has. The dispatcher resets the
listed `HOST_PROPS` between effects.

### 5.2 SVG overlay

`<svg pointer-events="none" style="position:absolute;inset:0;overflow:visible">`
appended to the host, with `width="100%" height="100%"`. The shape inside is
a `<rect>` with `rx`/`ry` matching `radius` (and inset by `thickness` to
keep the stroke inside the box). Use cases:

- `squiggle`: `feTurbulence` → `feDisplacementMap`, displacing the stroked
  rect. `seed` re-attribute on rAF for animation. Cheaper than canvas, GPU
  composited.
- `draw`: `stroke-dasharray` set to the perimeter length, `stroke-dashoffset`
  animated from `len → 0`. One-shot by default; emit `draw-complete`.

SVG is the right layer for anything that wants vector strokes, smooth
re-rasterisation on resize, and CSS filter primitives. It is also where
future effects (beam, scallop, ticket-edge via `<pattern>`) will live.

### 5.3 Canvas 2D overlay

`<canvas>` sized to the host, `devicePixelRatio` scaled. Required only when
an effect generates per-frame content SVG can't cheaply express:

- `sparks`: N particles, each with a parametric position `t ∈ [0,1]` along
  the perimeter. Per frame, advance `t` and sample the perimeter point.

### 5.4 WebGL overlay (deferred)

Reserved for liquid-metal, plasma, caustic-on-the-edge effects. Implemented
later as a thin perimeter mask over a shader shared with `<bg-wc>`'s effect
registry. The point of this section is to flag the architectural seam:
`<border-wc>` and `<bg-wc>` should share shaders and only differ in the
mask applied.

## 6. Shape Primitive

Borders are perimeters. The single most important shared utility:

```ts
// returns a stroke-friendly SVG path string for the host's outer shape,
// inset by `inset` pixels so the stroke sits inside the box
perimeterPath(host: Element, inset = 0): string;

// returns a (t: number 0..1) => [x, y] sampler for the same path
perimeterSampler(host: Element, inset = 0): (t: number) => [number, number];
```

The MVP implementation handles axis-aligned rectangles with uniform
`border-radius`. Phase 2 handles:

- Asymmetric `border-radius` (8-value parsing).
- Hosts with `clip-path: shape(...)` or `clip-path: path(...)` — read
  `getComputedStyle(host).clipPath`, parse, trace.
- Hosts with non-zero `border-width` on a side — use the inner box edge.

Sharing this between `<border-wc>` and `<bg-wc>` (for masking shaders to
the perimeter) is the integration point and the reason the two components
are siblings rather than one nested in the other.

## 7. Lifecycle

```
connectedCallback        → apply(current effect)
attributeChangedCallback → teardown(prev) → apply(new effect)
disconnectedCallback     → teardown()
```

Each effect manages its own `ResizeObserver` and `requestAnimationFrame`
loop when geometry or animation requires it, and cancels both in its
returned cleanup. The dispatcher does **not** observe size globally — it
delegates, because some effects (gradient, glow) don't need it.

Repeated `attributeChangedCallback` fires from a multi-attribute mutation
batch are inevitable; debouncing is an open question (§ 11.3).

## 8. Comparison vs. Platform Alternatives

| Need                     | Native CSS                 | `border-image`     | SVG by hand          | `<border-wc>`              |
|--------------------------|----------------------------|--------------------|----------------------|----------------------------|
| Thin rule                | `border: 1px solid`        | overkill           | overkill             | overkill                   |
| Gradient stroke          | mask trick (3 layers)      | yes, awkward       | yes                  | `effect="gradient"`        |
| Marching ants            | 4-layer gradient + keys    | partial            | dasharray + animate  | `effect="dash" animate`    |
| Hand-drawn squiggle      | impossible                 | snapshot only      | yes, verbose         | `effect="squiggle"`        |
| Draw-in on scroll        | impossible                 | impossible         | yes, verbose         | `effect="draw"`            |
| Particles on perimeter   | impossible                 | impossible         | very awkward         | `effect="sparks"`          |
| Inherits text color      | `currentColor` everywhere  | yes                | manual               | `color="currentColor"`     |
| Survives print           | yes                        | yes                | yes (SVG)            | depends on effect          |
| Cascades to children     | yes                        | yes                | n/a                  | n/a (light wrapper)        |

Native CSS wins for thin/inherited rules. `<border-wc>` wins everywhere a
designer wants the border to be a *figure*, not a *line*.

## 9. Comparison vs. Component Alternatives

- **TailwindCSS arbitrary borders / animated-borders plugins**: framework
  coupling, build step, no organic effects, no canvas/SVG layer.
- **shadcn-ui "shiny border" recipes**: hand-rolled per project, JSX-bound,
  no degradation story.
- **Aceternity / MagicUI "border beam"**: closest in spirit, but bound to
  React, ships its own DOM structure, JSX-only.
- **Lottie animated borders**: requires a player runtime, opaque files, no
  cascade, no theming, accessibility black box.

`<border-wc>` is portable HTML. Drops into any framework or none.

## 10. Clangs

Honest about what does not work, or works badly.

1. **`border-image` cannot host live animation.** Most browsers snapshot
   the source SVG on assignment; SMIL inside it will not drive. This is
   why animated effects use overlays, not `border-image`.

2. **The CSS gradient effect interacts with the host's existing
   background.** The technique uses `background-image` and `background-clip:
   padding-box, border-box`. Any inline `background` you set on the host
   before applying the effect gets clobbered, and any background set in a
   stylesheet may be overridden. The `<bg-wc>`/`<border-wc>` sibling
   relationship means we should document the precedence: `<border-wc>`
   loses to `<bg-wc>` for background painting; gradient effect is for
   bordered cards whose interior is the page paper.

3. **Glow leaks outside the box.** `box-shadow` with `mode="outset"` (the
   default for glow) extends beyond the element's box. If the host is in
   an `overflow: hidden` container, the glow clips. This is intentional
   in CSS, but users will hit it. `mode="inset"` mitigates by switching
   to `inset` shadows but the visual is different.

4. **Squiggle distorts the corners non-uniformly.** Because
   `feDisplacementMap` samples a noise texture, identical-radius corners
   look different. This is the *charm* of the effect, but it means the
   border can't be relied on for crisp grid alignment.

5. **Draw is one-shot.** It does not re-run on intersection by default.
   That's intentional — coupling to scroll/IO belongs to the page, not the
   component. We expose `refresh()` so author code (or a small companion
   `<scroll-trigger>` element) can re-trigger it.

6. **Sparks runs unconditionally at rAF.** Even with one tile off-screen
   the loop keeps ticking. We *should* pause via `IntersectionObserver`
   when the host is not visible. MVP doesn't.

7. **No `mode="inset"` painting yet.** The `mode` attribute is in the BNF
   for forward-compat, but only `center` and `outset` (for glow) are
   implemented in the MVP.

8. **CSS custom property override is read at apply-time, not
   re-evaluated on cascade change.** Changing `--border-wc-color` at
   runtime won't re-render the border without a `refresh()` call. A
   `MutationObserver` on style changes is too coarse; a `style.observe()`
   primitive does not exist on the platform.

9. **Color parsing is rgb-hex only in the gradient `shift()` helper.**
   `oklch`, `hsl`, named colors fall through and get passed verbatim.
   Fine for hex-heavy design systems, broken for OKLCH-first ones. Real
   solution: a `CSS.color()` call via `OffscreenCanvas` or `computedStyleMap`
   — both have rough edges.

10. **Print fidelity is uneven.** Gradient, dash, squiggle, draw print
    (they're CSS or SVG). Glow and sparks do not. Authors who care must
    pick CSS/SVG effects or accept the loss.

## 11. Open Questions

11.1 **Should `<border-wc>` wrap content or annotate a sibling element?**
The current design is "wrap" — the element *is* the box. An alternative is
"annotate" — `<border-wc for="#card">` styles the element with that id.
Annotate is friendlier to ARIA structure but adds a query and a
synchronisation problem. Wrap wins for now; revisit if real users hit it.

11.2 **Effect composition.** Can `effect="glow+dash"` work? Glow + dash
yes (different layers), gradient + glow no (both write `background-image`
and `box-shadow` is independent). Probably not worth supporting as a
matrix; better to expose two slots: `effect="…"` for the perimeter stroke
and `glow="…"` as a separate boolean+color modifier.

11.3 **Attribute mutation batching.** Setting `effect`, `color`,
`thickness` in one tick fires three `attributeChangedCallback`s.
Debouncing via `queueMicrotask` is straightforward but masks bugs.
Decision: don't debounce in MVP; instrument later if a real cost shows up.

11.4 **`shape()` integration.** When the host is given an arbitrary
`clip-path: shape(…)` shape, should `<border-wc>` trace it? Yes — that's
the whole reason perimeterPath is its own primitive. But MVP only handles
rounded rectangles.

11.5 **Light DOM vs. shadow DOM.** Light DOM lets authors style children
trivially and lets the host's own background show through cleanly. Shadow
DOM would isolate the overlay slot. Pick light DOM for MVP; reverse only
if real isolation problems surface.

11.6 **Reduced-motion enforcement.** Right now the spec promises
fallbacks but the MVP code does not yet honour
`window.matchMedia('(prefers-reduced-motion)')`. Add as a single guard in
the dispatcher: if `reduce`, force `animate` off.

## 12. MVP Roadmap

**Phase 0 — proof of concept (this doc + demo)**
- 6 effects working in isolation
- Single self-contained HTML demo (specimen sheet)

**Phase 1 — extract & package**
- Move dispatcher and effect registry to `border-wc.js`
- Extract `perimeterPath()` / `perimeterSampler()` into a shared shape
  module reusable by `<bg-wc>`
- Reduced-motion guard
- IntersectionObserver pause for `sparks`

**Phase 2 — surface area**
- `events`: `effect-applied`, `draw-complete`
- `refresh()` method
- CSS custom property override path

**Phase 3 — depth**
- Honour `shape()` and `path()` on the host
- Add `beam`, `scallop`, `ticket-edge` (all SVG)
- Add `liquid` (WebGL, shared shader with `<bg-wc>`)
- `mode="inset"` painting for non-glow effects

**Phase 4 — composition**
- Pluggable `glow` modifier independent of `effect`
- Per-side overrides via `effect-top`, `effect-right`, etc. (only if
  authors ask)

## 13. Sample uses

```html
<!-- editorial pull-quote -->
<border-wc effect="squiggle" color="var(--ink)" animate>
  <blockquote>The shape around the thing is the thing.</blockquote>
</border-wc>

<!-- focus state -->
<button class="cta">
  <border-wc effect="glow" color="var(--accent)" animate>
    Subscribe
  </border-wc>
</button>

<!-- card revealed on scroll -->
<border-wc effect="draw" speed="1500" id="card-1">
  <article>…</article>
</border-wc>
<script>
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) e.target.refresh();
  }, { threshold: 0.4 }).observe(document.getElementById("card-1"));
</script>
```

---

**End of draft.** Iterate from this. Most contentious sections are likely
§ 5.4 (the `<bg-wc>` integration story), § 10.2 (the gradient/background
conflict), and § 11.1 (wrap vs annotate).
