# `<bg-wc>` — Design Overview

> The canonical, always-current API reference is **[docs/api.html](docs/api.html)**
> (attributes, properties, methods, events, custom properties, the full preset
> catalog, and the `data-background` binder). This file is the higher-level
> design rationale; when in doubt, the docs and the code win.

## Positioning

`<bg-wc>` is a theme-aware, graphics-layer web component that renders an animated
background — WebGL shaders, Canvas2D effects, or DOM/CSS-3D scenes — behind any
HTML content. It reads design tokens (`--color-primary`, `--color-accent`, …) by
shadow-DOM inheritance, so it has no build-time coupling to any CSS system, though
it's made for Vanilla Breeze by default. Consumers get zero-config ESM from
`dist/`; the repo builds with Vite.

```html
<bg-wc preset="mesh-gradient" intensity="0.65">
  <h1>Hero headline</h1>
  <img slot="fallback" src="hero.webp" alt="">
</bg-wc>
```

The element is `pointer-events: none` and `aria-hidden`; slotted content lives in
the light DOM (accessible) and renders above the canvas/stage.

## Why it exists

Hand-wiring `ctx.fillText`/shaders per project is repetitive and rarely
theme-aware or reduced-motion-correct. `<bg-wc>` packages 100+ themeable
background presets behind one tag, each adapting to whatever color tokens are in
scope, with motion, visibility, battery, and accessibility handling built in.

## Architecture

- **`src/bg-wc.js`** — the custom element. Owns the lifecycle, the rAF loop,
  attribute reflection, the fallback slot, and the renderer dispatch. Registers
  `<bg-wc>` only — the legacy `<gl-wc>` alias was removed (see the README
  migration table; `test/legacy-removed.spec.js` guards it).
- **`src/renderer/`** — three renderer kinds:
  - `webgl.js` — fullscreen-quad fragment-shader presets.
  - `canvas2d.js` — 2D drawing presets.
  - `css3d.js` — mounts a `<div>` stage for DOM/CSS-3D scenes (motion in CSS
    `@keyframes`; JS only reconciles parameters).
  - `tokens.js` — resolves CSS color tokens (incl. `oklch()` and `light-dark()`)
    to RGBA via a canvas round-trip / DOM probe; see `resolveTokens`/`getColors`.
- **`src/presets/index.js`** — the preset registry: `name → { renderer, group,
  loader }`. Adding a preset is one entry plus one file. `group` drives the
  catalog UI and caps simultaneous WebGL contexts (the gallery mounts one group
  at a time).
- **`src/data-background.js`** — optional binder that injects a `<bg-wc>` behind
  any element carrying a `data-background` attribute (namespace distinct from
  VB's `data-effect`).

### Preset contract

A preset module exports `create(ctx)` and returns an instance:

```js
export function create({ host, gl, c2d, css3d, getColors, getParams }) {
  return {
    resize(w, h) {},
    frame(t, params) {},      // t is already speed-scaled — never multiply by speed again
    staticFrame(params) {},   // a representative still frame for reduced motion
    setPlaying(bool) {},      // css3d only — toggles animation-play-state
    dispose() {},
  };
}
```

`getColors()` returns theme colors as 0–1 float triples
(`primary/accent/info/bg/fg/…`). Preset-specific variants are read live from the
`mode` attribute via `host.getAttribute('mode')`.

### Behaviors

- **Render loop** — one shared rAF; time is speed-scaled centrally so every
  preset gets `speed` for free via its `t` argument.
- **Reduced motion** — `motion="auto"` honors `prefers-reduced-motion`. A preset
  with `staticFrame()` shows a still frame; otherwise the `fallback` slot
  surfaces. css3d freezes via `animation-play-state` and stays visible.
- **Visibility / power** — IntersectionObserver, tab-visibility, and a
  battery/power-save observer pause the loop when off-screen, backgrounded, or on
  low power. WebGL contexts are freed on disconnect (browsers cap ~16).
- **Theming** — colors are read fresh each frame, so theme/dark-mode switches
  apply live (`light-dark()` tokens included).

## Out of scope

- Interactive or accessible content *inside* the canvas (that's the HTML-in-Canvas
  direction, tracked in the sibling `canvas-text` repo).
- Object/character "scenes" that are subjects rather than backgrounds.

## Cross-references

- **API reference (canonical):** [docs/api.html](docs/api.html)
- **Preset gallery:** [docs/index.html](docs/index.html) ·
  **Demos:** [demos/index.html](demos/index.html)
- **Internal specs & plans:** `docs/superpowers/` (not deployed)
