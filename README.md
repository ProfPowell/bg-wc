# `<bg-wc>`

Theme-aware graphics-layer web component. Renders an animated WebGL or
Canvas2D background behind any HTML content, picking the right renderer
per preset.

Vanilla JS — consumers get zero-config ESM from `dist/`; the repo builds
with Vite. Reads design tokens (`--color-primary`, `--color-accent`, …)
via shadow-DOM inheritance — no coupling to any particular CSS system, but made for
Vanilla Breeze by default.

```html
<script type="module">
  import '@profpowell/bg-wc';
</script>

<bg-wc preset="mesh-gradient" intensity="0.65">
  <h1>Hero headline</h1>
  <p>This content sits above the rendered layer.</p>
  <img slot="fallback" src="hero-static.webp" alt="">
</bg-wc>
```

## Install

```sh
npm install @profpowell/bg-wc
```

## Live demo

[**profpowell.github.io/bg-wc**](https://profpowell.github.io/bg-wc/) —
gallery of every preset, plus themed demos showing presets composed
into real-looking pages.

## Preset highlights

A handful of the 60+ presets. Each adapts to whatever theme tokens you
set.

| Name             | Renderer | Notes                                                   |
| ---------------- | -------- | ------------------------------------------------------- |
| `mesh-gradient`  | WebGL    | Soft blobs in primary / accent / info colors.           |
| `aurora`         | WebGL    | Drifting aurora bands; the canonical "ambient" preset.  |
| `mosaic`         | Canvas2D | Squares; four modes via `mode` attribute (see below).   |
| `ribbons`        | Canvas2D | Stacked Bezier ribbons with crisp top-edge strokes.     |
| `supergraphics`  | Canvas2D | Mural-scale curved bands (Sea Ranch / Stauffacher).     |
| `flowlines`      | Canvas2D | Thin streamlines through a slow vector field.           |
| `source`         | Canvas2D | Faded HTML source listing; pass `text` to override.     |
| `system7`        | Canvas2D | Classic Mac windows on 50% stipple.                     |
| `matrix`         | Canvas2D | Falling digital rain; pass `text` to override glyphs.   |
| `confetti`       | Canvas2D | Continuous drop using the full semantic palette.        |

[**Full preset catalog →**](https://profpowell.github.io/bg-wc/docs/api.html#presets)

## Attributes

`preset` `palette` `intensity` (0–1) `speed` (0–5) `density` (0–1)
`seed` (int) `paused` `pixel-ratio` `quality` (`low|med|high`)
`fit` (`cover|contain|stretch`) `motion` (`auto|reduce|force`)

Some presets read additional attributes from the host: `mosaic` reads
`mode` (`isometric` | `flat` | `sparse` | `stacked` | `blocks`);
`system7` reads `use-theme` (boolean — when present, sources colors
from theme tokens instead of hard black-on-white). `mosaic`, `source`,
and a few others accept `text` to override default content.

[**Full API reference →**](https://profpowell.github.io/bg-wc/docs/api.html)

## `data-background` binder

For pages that prefer not to introduce a new element tag, import the
optional binder. It scans for `data-background` attributes and injects
a `<bg-wc>` behind each host element automatically. The binder is
fully open — any `data-background-X` becomes attribute `X` on the
injected canvas, including preset-specific attrs like `mode`.

```js
import '@profpowell/bg-wc/data-background';
```

```html
<section
  data-background="mosaic"
  data-background-mode="blocks"
  data-background-density="0.55"
  data-background-intensity="0.7">
  <h1>Squares, behind anything.</h1>
  <p>Zero custom elements in the markup.</p>
</section>
```

No `<bg-wc>` tag. No wrapper divs. The binder installs a tiny
stylesheet that positions the injected canvas behind the host's
content via `z-index: -1` inside an isolated stacking context.

## CSS custom properties

Override tokens per instance without touching the global theme:

```css
bg-wc {
  --bg-wc-color-1: hotpink;    /* beats --color-primary */
  --bg-wc-color-bg: #0a0a0a;   /* beats --color-background */
  --bg-wc-intensity: 0.8;      /* beats the intensity attribute */
  --bg-wc-speed: 0.5;
}
```

## Run the site locally

```sh
npm install
npm run dev   # serves the gallery + demos
```

## Migrating from gl-wc

The package was previously `@profpowell/gl-wc`; the old tag
(`<gl-wc>`), binder attributes (`data-bg-*`), CSS variables
(`--gl-wc-*`), and events (`gl-wc:*`) still work as deprecated aliases
and emit a one-time console warning. The deprecated aliases ship
through the `0.x` series; planning to remove them in `1.0`.

## License

MIT
