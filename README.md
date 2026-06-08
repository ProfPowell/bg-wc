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

A handful of the 70+ presets, grouped into a dozen families (Gradients,
Geometric, Texture, Atmospheric, Retro, Vector, Pop art, Ornamental, and
more). Each adapts to whatever theme tokens you set.

| Name             | Renderer | Notes                                                   |
| ---------------- | -------- | ------------------------------------------------------- |
| `mesh-gradient`  | WebGL    | Soft blobs in primary / accent / info colors.           |
| `aurora`         | WebGL    | Drifting aurora bands; the canonical "ambient" preset.  |
| `mosaic`         | Canvas2D | Squares; four modes via `mode` attribute (see below).   |
| `groove`         | Canvas2D | 70s looping rainbow-stripe routes that draw on and spiral.|
| `scandi`         | Canvas2D | Scandinavian geometric grid of arcs + floral motifs.    |
| `seigaiha`       | Canvas2D | Japanese overlapping-circle "wave" (fish-scale) pattern.|
| `supergraphics`  | Canvas2D | Mural-scale curved bands (Sea Ranch / Stauffacher).     |
| `source`         | Canvas2D | Faded HTML source listing; pass `text` to override.     |
| `matrix`         | Canvas2D | Falling digital rain; pass `text` to override glyphs.   |
| `confetti`       | Canvas2D | Continuous drop using the full semantic palette.        |

[**Full preset catalog →**](https://profpowell.github.io/bg-wc/docs/api.html#presets)

## Attributes

`preset` `palette` `intensity` (0–1) `speed` (0–5) `density` (0–1)
`seed` (int) `paused` `pixel-ratio` `quality` (`low|med|high`)
`fit` (`cover|contain|stretch`) `motion` (`auto|reduce|force`)
`power-save` (`off` to keep animating on a low battery — defaults to
throttling when the device reports power-save)

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

The package was previously `@profpowell/gl-wc`. The legacy aliases have
been **removed** — if you're upgrading, rename:

| Old (gl-wc)                       | New (bg-wc)                                 |
| --------------------------------- | ------------------------------------------- |
| `<gl-wc>` element                 | `<bg-wc>`                                    |
| `data-bg` / `data-bg-*` attrs     | `data-background` / `data-background-*`      |
| `--gl-wc-*` CSS variables         | `--bg-wc-*`                                  |
| `gl-wc:*` event listeners         | `bg-wc:*`                                    |

## License

MIT
