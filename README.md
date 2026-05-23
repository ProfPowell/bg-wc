# `<gl-wc>`

Theme-aware graphics-layer web component. Renders an animated WebGL or
Canvas2D background behind any HTML content, picking the right renderer
per preset.

Vanilla JS. No build step. Reads design tokens (`--color-primary`,
`--color-accent`, …) via shadow-DOM inheritance — no coupling to any
particular CSS system.

```html
<script type="module" src="./src/gl-wc.js"></script>

<gl-wc preset="mesh-gradient" intensity="0.65">
  <h1>Hero headline</h1>
  <p>This content sits above the rendered layer.</p>
  <img slot="fallback" src="hero-static.webp" alt="">
</gl-wc>
```

## Live demo

[**profpowell.github.io/gl-wc**](https://profpowell.github.io/gl-wc/) — preset
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

## Run the test site locally

The `/site` folder imports the component from `../src/gl-wc.js`. Serve the
repo root with any static server and open `/site/`:

```sh
npx serve .
# or
python3 -m http.server
# then visit http://localhost:8000/site/
```

A GitHub Action (`.github/workflows/deploy-pages.yml`) assembles `dist/`
on push to `main` and publishes it to GitHub Pages.

## License

MIT
