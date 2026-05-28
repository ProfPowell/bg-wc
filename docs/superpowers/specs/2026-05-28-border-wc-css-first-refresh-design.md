# border-wc — CSS-first effects refresh

**Date:** 2026-05-28
**Author:** Tom (with Claude)
**Status:** Draft, awaiting review

## Goal

Lift the average visual quality of border-wc's catalog by leaning on modern CSS (conic-gradient + `@property`, `mask-composite`, oversized-pseudo gradient scroll, `box-shadow` chromatic stacks, animated `clip-path`) instead of canvas particles. Retire effects that read as "art project" rather than crisp UI. Refactor two existing effects to use the same modern stack so they stop feeling out of place.

Net change: **17 → 19 effects**, but with a much higher per-effect "would actually ship this" rate.

## Non-goals

- No new params surface — every effect keeps the same `color / thickness / speed / radius / animate / mode / motion` knobs.
- No registry-shape changes; `EXTREME = Object.keys(EFFECTS)` continues to drive the binder.
- No vanilla-breeze changes; this is a border-wc-internal refresh.
- No bg-wc / demos changes in this PR (a follow-up PR adds new themed demos that lean on the new effects).

## What we learned from the references

The six pens (inyoung1, yukulele, Huhtamaki, exah, comehope, Chester) all win on the same axes:

- CSS-only, GPU-cheap.
- Single visual idea expressed with confidence — light, color, stripes, or chromatic split.
- Scale across element sizes without re-tuning.
- Theme by cascade (the colors are just gradient stops).

My current canvas-particle effects (grass, vines, flames, fireflies) fail all four.

## Effects retired

| Effect | Why |
|---|---|
| `grass` | "Blade growth" doesn't read as a border at typical card sizes; looks like a kids' illustration. |
| `vines` | Sparse, leaves look amateur, doesn't scale. The reveal is the only thing carrying it. |
| `flames` | Particle fire is fun but reads as canvas art, not UI accent. |
| `fireflies` | Replaced by the new `marquee` effect, which does the same orbit-of-points idea better with `offset-path`. |

Migration: each retired key is removed from `EFFECTS` and from gallery/docs. README and api.html drop them from the catalog table. No deprecation alias — these are dev-tier APIs; we accept the breaking change in 0.x.

## Effects added

All six are CSS-first. Each spec below covers: visual goal, render strategy, params honored, reduced-motion behavior, file plan.

### `aurora` — rotating conic-gradient halo

**Visual goal:** A soft rotating multi-color halo around the card, with a blurred sibling for the neon-card glow. Same family as Huhtamaki's pen + Chester's pen, but smoother because we use `@property --angle` instead of `transform: rotate`.

**Render:** Two absolutely-positioned overlay divs (`canvas`-free). One is the crisp gradient ring, the other is the same gradient with `filter: blur(--thickness*8)` for the halo. Both use `conic-gradient(from var(--bwc-angle), ...)`. `@property --bwc-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }` is registered once globally. The animation rotates `--bwc-angle` from 0deg → 360deg over `speed * 4`ms, linear, infinite. The ring is masked with `mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; padding: thickness;` so the center stays transparent.

**Params:** `color` accepts a CSS color or a comma list (multi-stop). Default palette uses theme tokens (`oklch`-based). `thickness` controls border width. `speed` controls one revolution. `radius` matches `border-radius`. `animate` toggles rotation.

**Reduced motion:** stop rotation; render the gradient at a fixed angle.

**File plan:** `src/effects/aurora.js` (~80 lines), `src/effects/aurora.css` lazy-injected once via the helper.

### `barber` — diagonal scrolling stripes

**Visual goal:** Warning-tape / candy-stripe / racing-flag border. comehope's pen at production polish.

**Render:** Single overlay div with `background: repeating-linear-gradient(var(--angle, 45deg), c1 0 var(--s), c2 var(--s) calc(var(--s)*2))`, oversized by `--thickness * 8` outside the host. Mask out the center with `mask-composite: exclude` so only the stripes at the border show. Animate via `background-position` shift (translates along the stripe normal so the stripes appear to march along the border).

**Params:** `color` accepts two-color list (defaults to theme `--color-accent` + `--color-surface`). `thickness` = border width. `speed` = one stripe-cycle period. `mode` accepts `warning | candy | racing` for built-in palettes. `radius` honored.

**Reduced motion:** static stripes, no scroll.

### `chroma` — chromatic aberration shadow

**Visual goal:** exah's premium RGB-split outline. No animation by default; subtle hover-pulse if `animate` is set.

**Render:** Zero overlay elements. The component sets `box-shadow` with 8 directional stops in three colors (R, G, B at offsets ±1px each direction). The shadow lives on the host via `host.style.boxShadow` (we already mutate `host.style.position`, so this fits the existing contract). `thickness` scales the offsets and shadow blur.

**Params:** `color` accepts a 3-color comma list (R, G, B accents; defaults derive from theme). `thickness` scales offset. `speed` (only when `animate`) controls the chroma drift cycle (subtle oscillation). `radius` ignored — it's the host's existing radius.

**Reduced motion:** drop animation; static shadow only.

### `wings` — oversized clip-path triangles

**Visual goal:** Two opposing clip-path triangles peeking out behind the card, swapping orientation. inyoung1's pen, productized.

**Render:** Two pseudo-overlay divs each sized to `host + thickness*8`, positioned `inset: -thickness*8`. Each gets a different solid color and a `clip-path: polygon(...)` keyframe that swaps between two orientations at `speed`ms. `mix-blend-mode: multiply` keeps them legible over any background.

**Params:** `color` = two-color list (default theme accent + accent-2). `thickness` controls the wing offset (how far the triangles extend behind). `speed` = swap cycle. `animate` toggles the swap.

**Reduced motion:** triangles freeze in their default orientation.

### `neon` — SVG glow stack

**Visual goal:** Crisp neon-sign outline with a real `feGaussianBlur` halo underneath. Replaces what `lightning` tried to do without the random-stripe distraction. Drama with restraint.

**Render:** Single SVG overlay with a `<defs>` filter:

```svg
<filter id="bwc-neon-${id}" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur stdDeviation="6" result="blur"/>
  <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
```

A single `<path>` traces the rounded-rect perimeter, with `filter="url(#bwc-neon-...)"`. If `animate` is set, a faint pulse cycles `stdDeviation` between 4 and 10 over `speed` ms via SMIL or a CSS-var animation on `style="--blur:Npx"` referenced from the filter (Chromium supports CSS var inside SMIL/filter primitives).

**Params:** `color` = stroke color (defaults to theme accent). `thickness` = stroke width. `speed` = pulse period when animated. `radius` honored.

**Reduced motion:** no pulse; static glow.

### `marquee` — chase-light bulbs

**Visual goal:** Movie-theater marquee. Round bulbs around the perimeter, with a chase-light wave traveling around (each bulb's `opacity` ramps up then down, staggered by position along the path). Replaces `fireflies`.

**Render:** SVG overlay with N `<circle>` elements positioned via the existing `roundedRectSampler`. CSS handles the wave: each bulb gets `style="--t:${i/N}"` and `animation: bwc-marquee-pulse ${speed}ms linear infinite; animation-delay: calc(var(--t) * -${speed}ms);`. The keyframe pulses opacity 0.2 → 1 → 0.2 with a brief flash, so a wave chases around. Bulb size = `thickness * 2`, glow via `filter: drop-shadow` on the parent SVG.

**Params:** `color` = bulb color (defaults to theme accent). `thickness` controls bulb size. `speed` = wave period. `mode` = `chase | sparkle | random` (sparkle = random staggered, random = arrhythmic). `radius` matches host.

**Reduced motion:** all bulbs at full opacity, no wave.

## Effects refactored in place

### `lightning`

Current: random bolts at random perimeter points with `shadowBlur` glow. Too sparse, too random.

Refactor: keep the jagged-bolt motif but anchor bolts at fixed points spaced evenly along the perimeter (4–8 anchors based on perimeter length / 100px). Use the same `feGaussianBlur + feMerge` filter as `neon` for the glow, so the bolts read as electric arcs rather than smudged canvas blurs. Drop `shadowBlur` entirely. Reduced motion: render static jagged outline (unchanged behavior).

### `sparks`

Current: comet-tail along the perimeter; works fine but is canvas-only.

Refactor: switch to an SVG `<circle>` traveling via `offset-path: path('M…rounded-rect…')` and `offset-distance: 100%` animated. Two trailing circles with lower opacity for the comet tail. Lower CPU, fewer pixels, themeable by cascade. Reduced motion: hide trail, show a single static dot at start of path.

The refactors live in the same files (`src/effects/lightning.js`, `src/effects/sparks.js`) and keep the same `createLightning` / `createSparks` signatures.

## Helper additions

Two small additions to `src/effects/_helpers.js`:

```js
// Inject a <style> tag once for a given CSS string (deduped by data-key).
export function ensureStyles(key, css) { ... }

// Register a CSS @property once (no-op if already registered or if @property unsupported).
export function ensureAngleProperty() { ... }
```

`aurora`, `barber`, `marquee` use `ensureStyles`. `aurora` also uses `ensureAngleProperty`.

## Gallery restructure (`docs/index.html`)

Sections become:

1. **Modern CSS** — aurora, barber, chroma, wings (new)
2. **Energy** — lightning, neon (new), glitch
3. **Retro / Craft** — ascii, stitching, typewriter
4. **Pattern** — barbed-wire, rope, scallop
5. **Trippy** — psychedelic, plasma
6. **Marquee** — sparks (refactored), marquee (new)
7. **Originals** — squiggle, draw

19 cards total. TOC at the top mirrors the section order.

Each new effect gets a per-effect demo card with the same knob set as today (`color / thickness / speed / radius`), plus Replay buttons on one-shot effects (existing pattern). Where an effect supports a `mode` enum (barber, marquee), the gallery exposes a small `<select>` next to the knobs.

## API + README updates

- `api.html` catalog table updated: drop 4 retired rows, add 6 new rows, mark `lightning` and `sparks` notes as "SVG filter (since 0.2)".
- README's effect list updated.
- A new sub-section "Modern CSS techniques" in api.html briefly documents that `aurora` registers a global `@property --bwc-angle`, and that `chroma` mutates `host.style.boxShadow` (an exception to the overlay-only pattern). Authors who already set `box-shadow` on their host should know.

## Tests

- Drop 4 spec files (grass/vines/flames/fireflies) and their registry-test entries.
- Add 6 spec files (aurora/barber/chroma/wings/neon/marquee) following the existing pattern: `setAttribute('effect', name)` → assert overlay element exists.
- Update `test/registry.spec.js`'s `ALL_EFFECTS` list to 19 names and refresh the reduced-motion sweep.
- Add one new test per refactored effect verifying the new structure: `lightning.spec.js` asserts an SVG with `<filter>` exists; `sparks.spec.js` asserts an SVG circle with `offset-path` style.

Expected test count: 50 - 4 (retired) - 4 (reduce-motion sweep entries) + 6 (new) + 6 (new reduce-motion) + 0 (refactors keep existing tests) = **54 passing**.

## Browser support notes

- `@property` (Chromium, Safari 16.4+, Firefox 128+). For Firefox <128 the gradient stays at angle 0deg — still looks OK, just doesn't rotate. Detect via `CSS.registerProperty` feature-check; if missing, skip the animation registration.
- `mask-composite: exclude` (all modern browsers as of 2024). Acceptable.
- `offset-path` (all evergreen). Acceptable.
- `corner-shape` (Chromium experimental). **Not used in this PR.** Listed as a future-work followup once support broadens.
- `mix-blend-mode: multiply` (universal). Used by `wings`.

## Risks + open questions

- **`box-shadow` collision in `chroma`:** the host might already have a `box-shadow` for its own styling. We capture `host.style.boxShadow` at create-time, append our shadows comma-separated, and restore on cleanup. Worth a test.
- **`@property` global registration:** registering twice throws. The helper wraps in try/catch.
- **Theme palette defaults:** `aurora`, `barber`, `wings` benefit from 2–3 colors but the existing `color` attribute is single-valued. For this PR we accept a comma-list in `color` (`color="oklch(.7 .2 30), oklch(.7 .2 200)"`) and fall back to theme accents if a single color is passed. Documented in api.html.

## Out of scope (filed as follow-ups)

- New themed demos in bg-wc/demos that lean on aurora + marquee + wings.
- `corner-shape` superellipse playground once Safari/Firefox ship support.
- A "preset palettes" system (`mode="warning"`, `mode="racing"`) — partially in this PR for `barber` only.
- A `data-border-effect` binder docs refresh.
