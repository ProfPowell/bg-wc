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

[**profpowell.github.io/bg-wc**](https://profpowell.github.io/bg-wc/) — preset
gallery with live theme, palette, and motion controls.

## Presets

| Name            | Renderer  | Notes                                                          |
| --------------- | --------- | -------------------------------------------------------------- |
| `dither`        | WebGL     | Animated gradient between primary & accent, ordered-dither.    |
| `noise`         | WebGL     | Drifting fractal noise, two-color tint.                        |
| `mesh-gradient` | WebGL     | Soft blobs in primary / accent / info colors.                  |
| `warp`          | WebGL     | Displacement-warped grid over background.                      |
| `stars`         | Canvas2D  | Drifting starfield, optional parallax at intensity > 0.5.      |
| `snow`          | Canvas2D  | Falling flakes with horizontal drift.                          |
| `confetti`      | Canvas2D  | Continuous drop using the full semantic palette.               |
| `network`       | Canvas2D  | Connected-dots mesh — lines between near neighbors.            |
| `particles`     | Canvas2D  | Generic drift — honors `palette="theme"|"rainbow"|"mono"`.     |

## Attributes (summary)

`preset`, `palette`, `intensity` (0–1), `speed` (0–5), `density` (0–1),
`seed` (int), `paused`, `pixel-ratio`, `quality` (`low|med|high`),
`fit` (`cover|contain|stretch`), `motion` (`auto|reduce|force`).

See [`spec.md`](./spec.md) for the full design — public API, lifecycle
events, accessibility posture, performance budgets, and the reduced-motion
contract.

## data-background binder

For pages that prefer not to introduce a new element tag, import the optional
binder. It scans for `data-background` attributes and injects a `<bg-wc>`
behind each host element automatically.

```js
import '@profpowell/bg-wc/data-background';
```

```html
<section
  data-background="aurora"
  data-background-intensity="0.7"
  data-background-speed="0.3"
  data-background-color-1="#4dffa1">
  <h1>Northern lights, behind anything.</h1>
</section>
```

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
npm run dev   # opens the gallery at /docs/index.html
```


## License

MIT
